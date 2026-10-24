---
title: Node.js 使用 Grafana 学习文档
create:2026-10-21
update:2026-10-21
category:nodejs
cover:https://img-common.aknot.uk/cover/land-03.jpg
tags:[node,grafana,monitoring,devops,dashboard,observability]
summary:Node.js 配合 Grafana 做监控可视化的学习文档，覆盖数据源、面板、告警与仪表盘
keywords:[node,grafana,monitoring,dashboard,observability,alert]
top:1
copyright:true
---

# Node.js 使用 Grafana 学习文档

> 适用对象：已掌握 Node.js、想把自己的应用接入 Grafana 做监控/日志/告警，或用 Node 程序自动化管理 Grafana 的开发者。
> 本文分四条主线：**A. Node 应用接入可观测体系**（指标/日志）→ **B. 用 Node 调用 Grafana HTTP API**（自动化管理）→ **C. 接收 Grafana 告警 Webhook**（Node 服务端）→ **D. 用 @grafana 前端库做插件**。所有示例可直接使用。

---

## 目录

1. [Grafana 是什么](#1-grafana-是什么)
2. [核心概念](#2-核心概念)
3. [环境准备](#3-环境准备)
4. [A 线：Node 应用接入可观测体系](#4-a-线node-应用接入可观测体系)
5. [B 线：Node 调用 Grafana HTTP API 完整速查](#5-b-线node-调用-grafana-http-api-完整速查)
6. [C 线：接收 Grafana 告警 Webhook](#6-c-线接收-grafana-告警-webhook)
7. [D 线：@grafana 前端库（插件/面板开发）](#7-d-线grafana-前端库插件面板开发)
8. [实战：自动化发布 Dashboard + 抓取指标看板](#8-实战自动化发布-dashboard--抓取指标看板)
9. [常见坑与最佳实践](#9-常见坑与最佳实践)
10. [速查表 & 推荐学习路径](#10-速查表--推荐学习路径)

---

## 1. Grafana 是什么

**Grafana** 是开源的**可观测性（Observability）平台**，核心能力是**数据可视化、监控告警与统一看板**。它本身**不存储业务数据**，而是连接各种数据源（Prometheus、Loki、Tempo、MySQL、Elasticsearch 等）把数据画成图表。

⚠️ **重要澄清**：Grafana **不是数据库**。本文的「Node 使用 Grafana」包含三层含义：
- **A 线（接入）**：Node 应用产出**指标（metrics）**和**日志（logs）**，经 Prometheus / Loki 后由 Grafana 展示。
- **B 线（控制）**：用 Node 通过 Grafana **HTTP API** 自动创建/管理 Dashboard、DataSource、告警等。
- **C 线（接收）**：Grafana 触发告警时，Node 服务端作为 **Webhook** 接收通知。

> 一句话：A 线是「Node 把数据喂给 Grafana 看」，B 线是「Node 去管 Grafana」，C 线是「Grafana 把告警推给 Node」。

---

## 2. 核心概念

| 概念 | 说明 |
|---|---|
| **DataSource（数据源）** | Grafana 连接的后端，如 Prometheus（指标）、Loki（日志）、Tempo（链路） |
| **Dashboard（看板）** | 一组 Panel 的集合，JSON 模型可版本化管理 |
| **Panel（面板）** | 单个图表/表格/文本，绑定某个数据源的查询 |
| **Prometheus** | 指标时序数据库，Node 用 `prom-client` 暴露 `/metrics`，Prometheus 拉取 |
| **Loki** | 日志聚合系统，Node 用 `winston-loki` 等推日志 |
| **Alert（告警）** | 基于查询阈值触发；v9+ 为统一告警（Unified Alerting） |
| **Contact Point（通知渠道）** | 告警发往哪里：Webhook / 邮件 / 钉钉 / Slack |
| **Annotation（标注）** | 在图上打时间点标记（如"发布时刻"） |
| **Org / User** | Grafana 多租户与权限模型 |

---

## 3. 环境准备

```bash
# 1) 起一个本地 Grafana（默认账号 admin/admin，端口 3000）
docker run -d --name grafana -p 3000:3000 grafana/grafana:11.0.0

# 2) 起依赖数据源（指标 + 日志）
docker run -d --name prometheus -p 9090:9090 prom/prometheus
docker run -d --name loki -p 3100:3100 grafana/loki:3.0.0

# 3) Node 侧包
pnpm add prom-client          # 指标暴露（A 线）
pnpm add winston winston-loki # 日志推 Loki（A 线）
pnpm add axios                # 调用 Grafana HTTP API（B 线）可选，Node18+ 也可直接用 fetch
```

**创建 API Token（B 线鉴权）**：Grafana UI → Administration → Service Accounts → Add service account → Add token（勾选所需权限如 `dashboards:write` / `datasources:write`）。拿到 token 后所有请求带 `Authorization: Bearer <token>`。

---

## 4. A 线：Node 应用接入可观测体系

### 4.1 暴露指标给 Prometheus（prom-client）

```ts
// metrics.ts —— 在 Express 应用里挂载 /metrics 端点
import express from 'express'
import client from 'prom-client'

const register = new client.Registry()
client.collectDefaultMetrics({ register })   // 采集 Node 默认指标（内存/事件循环等）

// 自定义计数器：HTTP 请求数（按 method + status 标签拆分）
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status'],
  registers: [register],
})

// 自定义直方图：请求耗时
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 3],
  registers: [register],
})

const app = express()
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    httpRequests.inc({ method: req.method, status: res.statusCode })
    httpDuration.observe({ method: req.method, route: req.path }, (Date.now() - start) / 1000)
  })
  next()
})

// Prometheus 通过此端点拉取（scrape）
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})
```

> 部署后，在 Grafana 的 Prometheus 数据源里就能查询 `rate(http_requests_total[5m])` 等。

### 4.2 推送日志到 Loki（winston-loki）

```ts
// logger.ts
import { createLogger, transports, format } from 'winston'
import LokiTransport from 'winston-loki'

export const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new LokiTransport({
      host: 'http://localhost:3100',          // Loki 地址
      labels: { app: 'node-api', env: 'dev' }, // 固定标签，便于 Grafana 过滤
      json: true,
      format: format.json(),
      replaceTimestamp: true,
      onConnectionError: (e) => console.error('Loki 推送失败:', e),
    }),
  ],
})

// 使用
logger.info('用户登录成功', { userId: 123, ip: '1.2.3.4' })
logger.error('数据库连接失败', { err: 'ECONNREFUSED' })
```

> 也可直接 HTTP 推 Loki：`POST http://loki:3100/loki/api/v1/push`，body 为 `{ streams: [{ stream: {app:'node-api'}, values: [['<ns时间戳>','<日志JSON>']] }] }`。

### 4.3 完整可观测架构

```
Node 应用 ──/metrics──> Prometheus ──> Grafana(图表)
    │
    └──winston-loki──> Loki ──> Grafana(日志面板)
                                      │
Grafana 告警 ──webhook──> Node 接收端(C 线)
```

---

## 5. B 线：Node 调用 Grafana HTTP API 完整速查

### 5.1 客户端封装（鉴权 + 基础请求）

```ts
// grafana.ts
const GRAFANA_URL = process.env.GRAFANA_URL ?? 'http://localhost:3000'
const TOKEN = process.env.GRAFANA_TOKEN!   // Service Account Token

async function grafanaFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${GRAFANA_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Grafana API ${res.status} @ ${path}: ${text}`)
  }
  return res.status === 204 ? null : res.json()
}
export { grafanaFetch, GRAFANA_URL }
```

> 也可用社区封装 `grafana-client`（npm 包），但官方只维护 HTTP API，直接用 `fetch`/`axios` 最稳。

### 5.2 鉴权方式

| 方式 | 用法 | 场景 |
|---|---|---|
| Service Account Token | `Authorization: Bearer <token>` | 推荐，细粒度权限 |
| Basic Auth | `Authorization: Basic base64(admin:admin)` | 本地/测试 |
| Session Cookie | 先 `/login` 拿 `grafana_session` | 浏览器内操作 |

### 5.3 健康检查 & 当前用户

```ts
// GET /api/health
const health = await grafanaFetch('/health')
// { database: 'ok', version: '11.0.0', commit: '...' }

// GET /api/user —— 当前 token 对应的用户
const me = await grafanaFetch('/user')
```

### 5.4 DataSource（数据源） CRUD

```ts
// 列出
const dsList = await grafanaFetch('/datasources')

// 创建 Prometheus 数据源
await grafanaFetch('/datasources', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Prometheus',
    type: 'prometheus',
    url: 'http://prometheus:9090',
    access: 'proxy',          // proxy：经 Grafana 转发；server 同义
    isDefault: true,
    basicAuth: false,
  }),
})

// 读取单个（按 id 或 name）
const ds = await grafanaFetch('/datasources/name/Prometheus')

// 测试连通性
await grafanaFetch('/datasources/test', {
  method: 'POST',
  body: JSON.stringify({ url: 'http://prometheus:9090', type: 'prometheus' }),
})

// 删除
await grafanaFetch('/datasources/uid/<uid>', { method: 'DELETE' })
```

### 5.5 Dashboard（看板） CRUD

```ts
// 创建/更新：body 包一层 { dashboard, folderId, overwrite }
await grafanaFetch('/dashboards/db', {
  method: 'POST',
  body: JSON.stringify({
    dashboard: {
      title: 'Node API 监控',
      uid: 'node-api-monitor',        // 固定 uid 便于版本管理；省略则自动生成
      tags: ['node', 'production'],
      timezone: 'browser',
      schemaVersion: 39,
      panels: [
        {
          id: 1, type: 'timeseries', title: 'QPS',
          datasource: { type: 'prometheus', uid: 'prometheus' },
          gridPos: { h: 8, w: 12, x: 0, y: 0 },
          targets: [{ expr: 'rate(http_requests_total[5m])', legendFormat: '{{method}}' }],
        },
      ],
    },
    folderId: 0,
    overwrite: true,
  }),
})

// 读取（按 uid）
const board = await grafanaFetch('/dashboards/uid/node-api-monitor')
// board.dashboard 即完整 JSON 模型

// 删除
await grafanaFetch('/dashboards/uid/node-api-monitor', { method: 'DELETE' })

// 搜索
const found = await grafanaFetch('/search?query=Node&type=dash-db')
```

> Dashboard JSON 模型字段很多（panel 类型、gridPos、targets、字段映射等），建议先在 Grafana UI 画好再 `GET` 导出 JSON，改完再 `POST` 回去——比手搓更可靠。

### 5.6 Folder（文件夹）

```ts
// 创建文件夹（用于归类 dashboard）
const folder = await grafanaFetch('/folders', {
  method: 'POST',
  body: JSON.stringify({ title: 'Observability' }),
})
// folder.uid 用于 dashboard 的 folderUid

// 列出 / 读取 / 删除
await grafanaFetch('/folders')
await grafanaFetch(`/folders/${folder.uid}`)
await grafanaFetch(`/folders/${folder.uid}`, { method: 'DELETE' })
```

### 5.7 Annotation（标注）

```ts
// 在图上打一个"发布"时间点（常用于标记部署）
await grafanaFetch('/annotations', {
  method: 'POST',
  body: JSON.stringify({
    dashboardUID: 'node-api-monitor',
    time: Date.now(),            // 毫秒时间戳
    isRegion: false,
    text: 'v1.3.0 发布',
    tags: ['deploy', 'production'],
  }),
})

// 查询标注
const anns = await grafanaFetch('/annotations?dashboardUID=node-api-monitor')

// 删除
await grafanaFetch(`/annotations/${id}`, { method: 'DELETE' })
```

### 5.8 统一告警（Unified Alerting，v9+）

Grafana v9 起统一告警通过 **provisioning API**（v1）管理：

```ts
// 创建告警规则（alert rule）
await grafanaFetch('/v1/provisioning/alert-rules', {
  method: 'POST',
  body: JSON.stringify({
    title: 'HTTP 错误率过高',
    condition: 'C',
    data: [{
      refId: 'C',
      queryType: '',
      relativeTimeRange: { from: 600, to: 0 },
      datasourceUid: 'prometheus',
      model: { expr: 'rate(http_requests_total{status=~"5.."}[5m]) > 0.05', refId: 'C' },
    }],
    folderUID: '<folderUid>',
    noDataState: 'NoData',
    execErrState: 'Alerting',
  }),
})

// 创建通知渠道（contact point → webhook）
await grafanaFetch('/v1/provisioning/contact-points', {
  method: 'POST',
  body: JSON.stringify({
    name: 'node-webhook',
    type: 'webhook',
    settings: { url: 'http://node-alert-receiver:8080/alert', httpMethod: 'POST' },
  }),
})

// 创建通知策略树（根策略指向上面的 contact point）
await grafanaFetch('/v1/provisioning/policies', {
  method: 'POST',
  body: JSON.stringify({ receiver: 'node-webhook', group_by: ['alertname'] }),
})

// 列出 / 删除
await grafanaFetch('/v1/provisioning/alert-rules')
await grafanaFetch('/v1/provisioning/alert-rules/<uid>', { method: 'DELETE' })
```

> 旧版（`/api/alerts`、`/api/alert-notifications`）在 v11 已移除，新项目一律用 `/api/v1/provisioning/*`。

### 5.9 Org / User / Snapshot

```ts
// 当前组织
await grafanaFetch('/org')

// 用户列表（需 admin）
await grafanaFetch('/users')

// 组织列表
await grafanaFetch('/orgs')

// 创建快照（把看板静态化分享，不含实时数据）
await grafanaFetch('/snapshots', {
  method: 'POST',
  body: JSON.stringify({ dashboard: {...}, name: 'snapshot-demo' }),
})
```

### 5.10 API 端点速查表

| 资源 | 方法 + 路径 |
|---|---|
| 健康检查 | `GET /api/health` |
| 当前用户 | `GET /api/user` |
| 数据源列表 | `GET /api/datasources` |
| 创建数据源 | `POST /api/datasources` |
| 测试数据源 | `POST /api/datasources/test` |
| 删除数据源 | `DELETE /api/datasources/uid/:uid` |
| 创建看板 | `POST /api/dashboards/db` |
| 读取看板 | `GET /api/dashboards/uid/:uid` |
| 删除看板 | `DELETE /api/dashboards/uid/:uid` |
| 搜索 | `GET /api/search?query=&type=dash-db` |
| 文件夹 | `POST/GET/DELETE /api/folders[/:uid]` |
| 标注 | `POST/GET/DELETE /api/annotations[/:id]` |
| 告警规则 | `POST/GET/DELETE /api/v1/provisioning/alert-rules[/:uid]` |
| 通知渠道 | `POST/GET /api/v1/provisioning/contact-points` |
| 通知策略 | `POST/GET /api/v1/provisioning/policies` |
| 用户 | `GET /api/users` |
| 快照 | `POST /api/snapshots` |

---

## 6. C 线：接收 Grafana 告警 Webhook

Grafana 触发告警时，会向 contact point 配置的 webhook URL `POST` 如下 JSON：

```json
{
  "receiver": "node-webhook",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": { "alertname": "HTTP 错误率过高", "severity": "critical" },
      "annotations": { "summary": "5xx 错误率超过阈值", "description": "..." },
      "startsAt": "2026-10-21T09:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "fingerprint": "abc123"
    }
  ],
  "commonLabels": { "datasource": "prometheus" },
  "externalURL": "http://localhost:3000/"
}
```

Node 接收端（Express）：

```ts
// alert-receiver.ts
import express from 'express'

interface GrafanaAlert {
  receiver: string
  status: 'firing' | 'resolved'
  alerts: {
    status: string
    labels: Record<string, string>
    annotations: Record<string, string>
    startsAt: string
    fingerprint: string
  }[]
}

const app = express()
app.use(express.json())   // 解析 Grafana 的 JSON body

app.post('/alert', (req, res) => {
  const payload = req.body as GrafanaAlert
  console.log(`[告警] 状态=${payload.status}, 共 ${payload.alerts.length} 条`)

  for (const a of payload.alerts) {
    const title = a.annotations.summary ?? a.labels.alertname
    const severity = a.labels.severity ?? 'info'
    // 这里接你的通知逻辑：钉钉 / 飞书 / Slack / 短信
    notify({ title, severity, detail: a.annotations.description })
  }
  res.status(200).json({ status: 'ok' })   // 必须 2xx，否则 Grafana 会重试
})

function notify(m: { title: string; severity: string; detail?: string }) {
  // TODO: 实际推送
  console.log(`→ ${m.severity.toUpperCase()}: ${m.title}`)
}

app.listen(8080, () => console.log('告警接收端已启动 :8080/alert'))
```

> 注意：Grafana 期望 webhook 返回 `2xx`，否则会按退避策略重试。若需做耗时处理，先快速 `200` 再异步处理。

---

## 7. D 线：@grafana 前端库（插件/面板开发）

Grafana 插件（Panel / DataSource / App）用 `@grafana/data` 与 `@grafana/ui` 开发，运行在**浏览器/Grafana 前端**而非 Node 后端。这里仅列能力边界，供需要时查阅。

```ts
// 仅用于 Grafana 插件工程（不是普通 Node 后端代码）
import { PanelPlugin } from '@grafana/data'
import { MyPanel } from './MyPanel'

export const plugin = new PanelPlugin(MyPanel).setPanelOptions((b) => [
  b.fieldTextInput().setName('标题').setDescription('面板标题'),
])
```

常用包：
- `@grafana/data`：类型与工具（`PanelPlugin`、`DataFrame`、`MetricFindValue` 等）
- `@grafana/ui`：UI 组件（`Button`、`Graph`、`Table` 等）
- `@grafana/runtime`：运行时 API（数据源查询、后端调用）

> 普通"Node 使用 Grafana"场景用不到 D 线；仅当要**定制 Grafana 面板/数据源插件**时才涉及，且需 Grafana 插件开发脚手架（`@grafana/create-plugin`）。

---

## 8. 实战：自动化发布 Dashboard + 抓取指标看板

把"部署后自动确保看板存在"做成一段脚本（CI 或启动钩子均可调用）：

```ts
// sync-dashboards.ts
import { grafanaFetch } from './grafana'
import { readFileSync } from 'fs'

async function ensureDashboard(file: string, uid: string) {
  // 1) 已存在则跳过（或 overwrite）
  try {
    await grafanaFetch(`/dashboards/uid/${uid}`)
    console.log(`看板 ${uid} 已存在，跳过`)
    return
  } catch {
    // 2) 不存在 → 读取本地 JSON 模型并发布
    const model = JSON.parse(readFileSync(file, 'utf8'))
    await grafanaFetch('/dashboards/db', {
      method: 'POST',
      body: JSON.stringify({ dashboard: model, folderId: 0, overwrite: false }),
    })
    console.log(`看板 ${uid} 已创建`)
  }
}

// 用法：ts-node sync-dashboards.ts
ensureDashboard('dashboards/node-api.json', 'node-api-monitor').catch(console.error)
```

搭配 A 线的 `/metrics` + B 线的看板，即可实现"代码部署 → 指标自动可见 → 告警自动推送"的闭环。

---

## 9. 常见坑与最佳实践

1. **Grafana 不存业务数据**：所有指标/日志要先有 Prometheus/Loki 等数据源，Grafana 只是"展示层"。
2. **Dashboard JSON 别手搓**：先用 UI 画好 → `GET /api/dashboards/uid/:uid` 导出 → 纳入 Git 版本管理 → 再 `POST` 发布，最稳。
3. **uid 固定化**：给 dashboard/datasource 设固定 `uid`，便于跨环境引用和幂等发布（`overwrite: true`）。
4. **API Token 用 Service Account 而非旧 API Key**：v9+ API Key 已废弃，新项目一律 Service Account Token，并遵循最小权限。
5. **告警 API 用 v1 provisioning**：`/api/alerts` 在 v11 已移除，统一用 `/api/v1/provisioning/*`。
6. **Webhook 必须返回 2xx**：否则 Grafana 重试，可能造成重复通知。
7. **Loki 标签基数要低**：`labels` 里别放 user_id 这类高基数值，否则 Loki 性能崩；高基字段放日志内容里用 `| json` 解析。
8. **prom-client 的 Registry 单例**：`/metrics` 必须复用同一个 `register`，否则指标不累积。
9. **指标命名规范**：用 `_total` 后缀给 Counter、用单位后缀（`_seconds`/`_bytes`），Grafana 社区面板才好复用。
10. **敏感信息**：Grafana 数据源密码、token 用环境变量/Secret 注入，别硬编码进看板 JSON 或代码。

**最佳实践清单**：

- 指标走 Prometheus（`prom-client` + `/metrics`），日志走 Loki（`winston-loki`），链路走 Tempo（需要时）。
- 看板/Datasource/告警全部 IaC 化（API 或 Grafana provisioning 文件），进 Git。
- 告警分级（critical/warning）+ 多通知渠道（webhook + 钉钉/Slack）。
- Node 接收端做幂等（按 `fingerprint` 去重），避免告警风暴重复通知。
- 用 Annotation 在图上标记发布/故障时间点，复盘更高效。

---

## 10. 速查表 & 推荐学习路径

### 10.1 三件套对应关系

| 你想做的事 | 用到 | 走哪条线 |
|---|---|---|
| 暴露应用指标 | `prom-client` + `/metrics` | A 线 |
| 推日志到 Grafana | `winston-loki` → Loki | A 线 |
| 自动建看板/数据源 | Grafana HTTP API | B 线 |
| 自动建告警规则 | `/api/v1/provisioning/*` | B 线 |
| 接收告警通知 | Express webhook 服务端 | C 线 |
| 定制面板/插件 | `@grafana/data`/`ui` | D 线 |

### 10.2 关键命令/端点速查

| 操作 | 命令/端点 |
|---|---|
| 起 Grafana | `docker run -p 3000:3000 grafana/grafana` |
| 健康检查 | `GET /api/health` |
| 建数据源 | `POST /api/datasources` |
| 建看板 | `POST /api/dashboards/db` |
| 查看板 | `GET /api/dashboards/uid/:uid` |
| 打标注 | `POST /api/annotations` |
| 建告警规则 | `POST /api/v1/provisioning/alert-rules` |
| 建通知渠道 | `POST /api/v1/provisioning/contact-points` |
| Node 指标端点 | `GET /metrics`（prom-client） |
| Node 收告警 | `POST /alert`（Express） |

### 10.3 推荐学习路径

1. A 线：装 Grafana + Prometheus + Loki，`prom-client` 暴露指标、`winston-loki` 推日志。
2. UI 上手：在 Grafana 画一张看板，理解 Panel/DataSource/查询。
3. B 线：`GET` 导出看板 JSON，用 Node 脚本 `POST` 幂等发布；再自动化建数据源与告警。
4. C 线：配 webhook contact point + Node 接收端，打通"告警→Node"闭环。
5. 进阶：看板/告警全部 Git 化 + CI 自动同步（第 8 节）。

---

> 本文基于 Grafana v11 API 编写。各端点随版本可能调整（尤其告警 API 在 v9/v10/v11 迭代较大），以官方文档 https://grafana.com/docs/grafana/latest/developers/http_api/ 为准。
