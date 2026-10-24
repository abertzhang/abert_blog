---
title: Node.js 使用 Prometheus 学习文档
create:2026-10-21
update:2026-10-21
category:nodejs
cover:https://img-common.aknot.uk/cover/land-30.jpg
tags:[node,prometheus,monitoring,devops,metrics,observability]
summary:Node.js 使用 Prometheus 监控的学习文档，覆盖 prom-client 指标类型、Exporter、PromQL 与告警
keywords:[node,prometheus,monitoring,metrics,observability,exporter]
top:1
copyright:true
---

# Node.js 使用 Prometheus 学习文档

> 适用客户端：`prom-client`（事实标准，最新稳定 **15.1.3**） / 更名后的 `@prometheus-io/client`（v16+，2026-08 起）。
> 本文聚焦「在 Node.js 应用里**埋点并暴露指标**，再交给 Prometheus 抓取」，接口尽量齐全，每个主题都给可运行示例。
> 示例采用 ESM（`import`）写法（与本项目 `type: module` 一致）；若用 CommonJS 把 `import` 换成 `require()` 即可。`prom-client` 与 `@prometheus-io/client` 的 API 完全一致。

---

## ⚠️ 先澄清：Prometheus 是什么

和前面几篇一样，先纠一个常见误解：

- **Prometheus 是一套「监控系统 + 内置时序数据库（TSDB）」**，不是传统的关系型/文档型数据库。
- 它用 **Pull（拉）模型**：Prometheus 服务端定时 HTTP 抓取你的 `/metrics` 端点，而不是你主动写库。
- 你的 Node 应用只负责**产生并暴露指标文本**；存储、查询（PromQL）、告警（Alertmanager）、可视化（Grafana）都由 Prometheus 生态完成。
- 它适合「纯粹的数值型时序数据」（请求数、延迟、内存……），**不适合 100% 精确的计费场景**（官方明确说明）。

---

## 目录

- [1. 核心概念](#1-核心概念)
- [2. 环境准备与安装](#2-环境准备与安装)
- [3. 快速开始：暴露 /metrics](#3-快速开始暴露-metrics)
- [4. Registry（注册表）](#4-registry注册表)
- [5. 默认指标 collectDefaultMetrics](#5-默认指标-collectdefaultmetrics)
- [6. Counter（计数器）](#6-counter计数器)
- [7. Gauge（ gauge 仪表盘）](#7-gauge-仪表)
- [8. Histogram（直方图）](#8-histogram直方图)
- [9. Summary（摘要）](#9-summary摘要)
- [10. Labels（标签）与基数陷阱](#10-labels标签与基数陷阱)
- [11. 自定义采集（collect 函数）](#11-自定义采集collect-函数)
- [12. Pushgateway（短任务/批处理）](#12-pushgateway短任务批处理)
- [13. 框架集成（Express / Koa / Fastify / 原生 http）](#13-框架集成express--koa--fastify--原生-http)
- [14. 集群 / 多进程聚合（ClusterRegistry）](#14-集群--多进程聚合clusterregistry)
- [15. 实战：HTTP 请求全量埋点中间件](#15-实战http-请求全量埋点中间件)
- [16. Prometheus Server 配置与部署](#16-prometheus-server-配置与部署)
- [17. PromQL 速查](#17-promql-速查)
- [18. 告警规则与 Alertmanager](#18-告警规则与-alertmanager)
- [19. Grafana 可视化简介](#19-grafana-可视化简介)
- [20. 最佳实践清单](#20-最佳实践清单)
- [21. 参考文档](#21-参考文档)

---

## 1. 核心概念

### 1.1 四种 Metric 类型

| 类型 | 语义 | 典型用途 | 关键方法 |
|---|---|---|---|
| `Counter` | 只增不减的累计值（进程重启归零） | 请求总数、错误总数 | `inc()` |
| `Gauge` | 可增可减的瞬时值 | 在线人数、内存、温度 | `set()` / `inc()` / `dec()` |
| `Histogram` | 观测值分桶统计（含 `_bucket`/`_sum`/`_count`） | 请求延迟、响应大小 | `observe()` / `startTimer()` |
| `Summary` | 滑动窗口分位数（客户端计算 φ-quantile） | 分位数延迟 | `observe()` / `startTimer()` |

### 1.2 数据模型

- **Time series（时间序列）** = `metric name` + 一组 `labels`（键值对）+ 带时间戳的样本值。
- 例：`http_requests_total{method="GET",status_code="200"} 1234` @ timestamp。
- **Labels 是多维度的关键**：`sum by (status_code) (rate(...))` 就能按状态码聚合。
- **基数（cardinality）陷阱**：标签取值组合爆炸会拖垮 Prometheus（见 §10）。

### 1.3 生态组件

| 组件 | 作用 |
|---|---|
| Prometheus Server | 抓取 + 存储时序 + 执行 PromQL + 触发告警 |
| Client Libraries | 各语言埋点库（Node 用 `prom-client`） |
| Exporter | 把第三方系统指标转成 Prometheus 格式（node_exporter、redis_exporter…） |
| Pushgateway | 承接**短生命周期任务**（如 cron、批处理）的推送 |
| Alertmanager | 去重、分组、路由告警（邮件/钉钉/Slack…） |
| Grafana | 可视化仪表盘 |

---

## 2. 环境准备与安装

```bash
# 传统包名（仍可用，最新稳定 15.1.3）
npm install prom-client

# 2026-08 起官方更名后的新包（v16+），两者 API 完全一致
npm install @prometheus-io/client
```

> **版本与包名说明**：`prom-client` 长期是事实标准（最新 15.1.3）。2026-08-24 起，官方将其纳入 Prometheus 子项目并更名为 `@prometheus-io/client`（v16 起）。本文示例统一用 `prom-client` 书写（兼容性最好），把 `import ... from 'prom-client'` 换成 `'@prometheus-io/client'` 即可无缝切换。

两种引入方式：

```js
// ESM
import * as client from 'prom-client';

// CommonJS
const client = require('prom-client');
```

---

## 3. 快速开始：暴露 /metrics

prom-client **不绑定任何 Web 框架**。所谓“暴露指标”，就是让一个 HTTP 路由返回 `await register.metrics()` 的字符串。

```js
import express from 'express';
import * as client from 'prom-client';

const app = express();

// 1) 收集 Node/进程级默认指标（CPU、内存、GC、事件循环…）
client.collectDefaultMetrics();

// 2) 自定义一个计数器
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method'],
});

app.get('/', (req, res) => {
  httpRequests.inc({ method: 'GET' });   // 每次请求 +1
  res.send('Hello World');
});

// 3) 暴露指标端点（Prometheus 会定时来抓这里）
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType); // ⚠️ Prometheus 3.x 必须
  res.end(await client.register.metrics());
});

app.listen(3000, () => console.log('listening on :3000/metrics'));
```

> **⚠️ 内容类型（2026 新坑）**：Prometheus 3.x（2024-11 发布，2026 主流为 3.13 LTS）会**拒绝**没有正确 `Content-Type` 的抓取目标。务必用 `client.register.contentType` 设置响应头，不要手写旧字符串。

---

## 4. Registry（注册表）

Registry 是指标的容器。默认所有指标注册到**全局默认 registry**（`client.register`），多租户/多进程时可自建。

```js
// 全局默认注册表（最常用）
const defaultReg = client.register;

// 自定义注册表
const myReg = new client.Registry();
myReg.setDefaultLabels({ app: 'checkout' });     // 该注册表下所有指标附加静态标签
const c = new client.Counter({ name: 'x', help: 'y', registers: [myReg] });

// 暴露时指向它
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', myReg.contentType);
  res.end(await myReg.metrics());
});
```

### 4.1 Registry 关键方法/属性

| API | 作用 |
|---|---|
| `await register.metrics()` | 渲染全部指标为 exposition 文本（**异步**，记得 `await`） |
| `register.contentType` | 当前内容类型字符串（Prometheus / OpenMetrics） |
| `register.getSingleMetricAsString(name)` | 单个指标的文本 |
| `register.getSingleMetric(name)` | 取指标引用（用于手动操作） |
| `register.clear()` | 清空所有指标与默认标签 |
| `register.removeSingleMetric(name)` | 删除单个指标 |
| `register.resetMetrics()` | 重置所有指标值（指标仍保留，无需重建） |
| `register.setDefaultLabels(obj)` | 给注册表下所有指标加静态标签 |
| `register.setContentType(type)` | 切换为 OpenMetrics 格式 |
| `client.Registry.PROMETHEUS_CONTENT_TYPE` | 常量：Prometheus 文本格式 |
| `client.Registry.OPENMETRICS_CONTENT_TYPE` | 常量：OpenMetrics 格式 |
| `client.Registry.merge([r1, r2])` | 合并多个注册表为一个 |

---

## 5. 默认指标 collectDefaultMetrics

`collectDefaultMetrics()` 自动收集 Prometheus 推荐 + Node 专属指标（事件循环延迟、GC、活跃句柄、内存等），**在 scrape 时采集**（非定时轮询，零额外开销）。

```js
client.collectDefaultMetrics({
  register: client.register,                  // 指定注册表，默认全局
  prefix: 'myapp_',                           // 指标名前缀
  gcDurationBuckets: [0.1, 0.2, 0.3],         // GC 直方图自定义桶（秒）
  eventLoopMonitoringPrecision: 10,           // 事件循环采样率（ms，默认 10）
  eventLoopUtilizationBuckets: [0.5, 0.9],    // 事件循环利用率桶
  eventLoopUtilizationPercentiles: [0.5, 0.99],
  eventLoopUtilizationMaxAgeSeconds: 60,      // 滑动窗口时长
  eventLoopUtilizationAgeBuckets: 5,          // 滑动窗口桶数
  labels: { NODE_APP_INSTANCE: process.env.NODE_APP_INSTANCE }, // 全部默认指标附加标签
});
```

### 5.1 常见默认指标（部分）

| 指标名 | 含义 |
|---|---|
| `process_cpu_user_seconds_total` | 用户态 CPU 累计（秒） |
| `process_resident_memory_bytes` | 常驻内存（字节） |
| `nodejs_eventloop_lag_seconds` | 事件循环延迟 |
| `nodejs_eventloop_utilization` | 事件循环利用率 |
| `nodejs_gc_runs_total` / `nodejs_gc_pause_seconds_total` | GC 次数 / 暂停时长 |
| `nodejs_active_handles` / `nodejs_active_requests` | 活跃句柄 / 请求 |
| `nodejs_heap_size_total_bytes` / `nodejs_heap_space_size_used_bytes` | 堆内存 |

> 注：文件描述符、部分内存指标**仅在 Linux 可用**；完整清单见 `client.collectDefaultMetrics.metricsList`。

---

## 6. Counter（计数器）

只增不减的累计量。进程重启归零。适合“发生了多少次”。

```js
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status_code'],   // 必填参数为 name + help；labelNames 可选
});

// 基础 +1
httpRequestsTotal.inc();

// 指定标签值 +1
httpRequestsTotal.inc({ method: 'GET', status_code: '200' });

// 一次增加多个
httpRequestsTotal.inc({ method: 'POST', status_code: '500' }, 3);

// 带标签的句柄（高频时更高效，避免重复解析标签）
const post500 = httpRequestsTotal.labels({ method: 'POST', status_code: '500' });
post500.inc();
```

**Counter API**：`inc(value?)`（默认 +1）、`reset()`（重置为 0）、`labels(...)`。

> 命名约定：计数器一律加 `_total` 后缀（Prometheus 会自动识别，PromQL 里 `rate(http_requests_total[5m])` 才有意义）。

---

## 7. Gauge（仪表）

可增可减的瞬时值。适合“当前是多少”。

```js
const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Number of currently active users',
});

activeUsers.set(42);          // 直接设值
activeUsers.inc();            // +1
activeUsers.dec(3);           // -3
activeUsers.setToCurrentTime(); // 设为当前 Unix 时间（秒）

// 计时：返回 end() 函数，调用时记录耗时（秒）
const end = activeUsers.startTimer();
doSomething();
end();

// 用 collect 函数做“采样型”gauge（推荐，而非 setInterval）
const heapGauge = new client.Gauge({
  name: 'nodejs_heap_used_bytes',
  help: 'Process heap used',
  async collect() {
    const used = process.memoryUsage().heapUsed;
    this.set(used);           // `this` 指向该 gauge
  },
});
```

**Gauge API**：`set(v)` / `inc(v?)` / `dec(v?)` / `setToCurrentTime()` / `startTimer()` / `labels(...)` / `collect`（构造参数，点采样函数）/`reset()`。

> **不要用 `setInterval` 定时去 `set` gauge**（官方明确反对）。对于点采样（内存、CPU）改用 `collect()` 函数——它会在每次 scrape 时执行。

---

## 8. Histogram（直方图）

把观测值分桶统计，自动产出 `_bucket` / `_sum` / `_count`。客户端开销低，分位数在**查询端**用 `histogram_quantile` 算。最常用作“延迟”。

```js
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // 自定义桶（默认覆盖常规 Web/RPC）
});

// 方式一：observe 直接记录一个观测值
httpDuration.observe({ method: 'GET', route: '/users', status_code: '200' }, 0.237);

// 方式二：startTimer（最常用，自动算耗时）
const end = httpDuration.startTimer({ method: 'GET', route: '/users' });
// ... 处理请求 ...
end({ status_code: '200' });   // 结束时传入剩余标签
```

**Histogram API**：`observe(value)` / `startTimer(labels?)` / `labels(...)` / `zero(labels?)`（显式零化某标签组合以便导出）。

**查询端算 P95 延迟**：

```promql
histogram_quantile(
  0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
)
```

> 桶选择是直方图的核心权衡：桶太粗丢失精度，桶太细基数爆炸。Web 延迟常用 `[0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2.5,5,10]`。

---

## 9. Summary（摘要）

与 Histogram 类似记录观测分布，但**分位数在客户端计算**（滑动窗口）。不适合跨实例聚合（`_sum/_count` 可聚合，φ-quantile 不可）。

```js
const respSize = new client.Summary({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses',
  percentiles: [0.5, 0.9, 0.99],  // 要计算的分位数（默认 7 个）
  maxAgeSeconds: 600,             // 滑动窗口时长（默认 600）
  ageBuckets: 5,                  // 滑动窗口桶数（默认 5）
  pruneAgedBuckets: true,
});

respSize.observe(1234);
const end = respSize.startTimer();
end();
```

**Summary API**：`observe(value)` / `startTimer()` / `labels(...)`。

> **Histogram vs Summary 选型**：要跨多个实例/多段时间聚合分位数 → 用 **Histogram**（在服务端算）。只要单实例近似分位数、不跨实例聚合 → 用 **Summary**。

---

## 10. Labels（标签）与基数陷阱

标签是多维度的核心，但**基数爆炸是 Prometheus 的头号性能杀手**。

```js
// 正确：标签取值有限（方法、状态码、路由）
const c = new client.Counter({
  name: 'api_calls_total',
  help: '...',
  labelNames: ['method', 'status_code'],
});

// 危险：把用户 ID / 请求 ID / 时间戳当标签 → 每来一个不同值就新建一条时间序列
const bad = new client.Counter({
  name: 'bad_metric_total',
  help: '...',
  labelNames: ['user_id'],   // ❌ user_id 基数可能百万级，直接拖垮 Prometheus
});
```

**规则**：
- 标签取值应是**有限、可枚举**的（method、status_code、route、region）。
- 永远不要把**用户 ID、订单号、UUID、时间戳、IP**当标签。
- 标签组合总数建议控制在**万级以内**，超十万要警惕。
- 高频路径上的标签会增加聚合成本——非必要时不加。

### 三种设置标签的方式

```js
// 1) 方法参数里带标签
counter.inc({ method: 'GET', status_code: '200' });

// 2) labels() 拿句柄（高频推荐）
const h = counter.labels('GET', '200');  // 位置参数（按 labelNames 顺序）
h.inc();
// 或对象参数
const h2 = counter.labels({ method: 'GET', status_code: '200' });

// 3) startTimer 结束时补标签
const end = histogram.startTimer({ method: 'GET' });
end({ status_code: '200' });
```

---

## 11. 自定义采集（collect 函数）

当指标来自外部系统（如数据库、缓存、文件），用 `collect()` 在 scrape 时拉取，而不是提前轮询。

```js
const queueSize = new client.Gauge({
  name: 'job_queue_size',
  help: 'Number of pending jobs in the queue',
  async collect() {
    const size = await db.query('SELECT count(*) FROM jobs WHERE status=$1', ['pending']);
    this.set(Number(size.rows[0].count));
  },
});
```

> `collect()` 可以是同步函数，也可以返回 Promise（如上）。**不要在里面做太重的阻塞操作**，否则会拖慢 `/metrics` 响应。

---

## 12. Pushgateway（短任务/批处理）

短生命周期的任务（cron、批处理脚本）来不及被 Prometheus 抓取，需要**主动推送**到 Pushgateway，再由 Prometheus 去抓 Pushgateway。

```js
import * as client from 'prom-client';

// 第二参数可传自定义 registry（新版支持）
const gateway = new client.Pushgateway('http://localhost:9091');

const jobCounter = new client.Counter({ name: 'batch_rows_processed', help: '...' });

async function runBatch() {
  // ... 处理数据，jobCounter.inc(n) ...
  jobCounter.inc(1000);

  // pushAdd：累加同名指标（推荐）；push：替换
  await new Promise((resolve, reject) => {
    gateway.pushAdd({ jobName: 'nightly_etl', groupings: { instance: 'worker-1' } },
      (err, res, body) => err ? reject(err) : resolve(body));
  });
}

// 任务结束清理（可选）
// gateway.delete({ jobName: 'nightly_etl' });
```

**Pushgateway API**：

| 方法 | 作用 |
|---|---|
| `gateway.pushAdd({ jobName, groupings })` | 累加推送（同名指标叠加） |
| `gateway.push({ jobName, groupings })` | 替换推送（覆盖） |
| `gateway.delete({ jobName, groupings })` | 删除该 job 的指标 |

> Pushgateway 不是“时序的中转站”，**它只保留最后一次 push 的值**，不适合长期时序存储。

---

## 13. 框架集成（Express / Koa / Fastify / 原生 http）

底层都是「一个路由返回 `register.metrics()`」。下面给几种常见框架。

### Express

```js
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

### Koa

```js
router.get('/metrics', async (ctx) => {
  ctx.set('Content-Type', client.register.contentType);
  ctx.body = await client.register.metrics();
});
```

### Fastify

```js
fastify.get('/metrics', async (req, reply) => {
  reply.header('Content-Type', client.register.contentType);
  return await client.register.metrics();
});
```

### 原生 http（无框架）

```js
import http from 'node:http';
import * as client from 'prom-client';

http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': client.register.contentType });
    res.end(await client.register.metrics());
    return;
  }
  res.end('ok');
}).listen(3000);
```

> **安全提示**：`/metrics` 可能暴露内部细节。生产环境建议：
> - 用单独的端口/路径暴露，或加 `Authorization` 校验（Bearer token）；
> - 不要让外部公网直接访问；
> - Kubernetes 里通过 `NetworkPolicy` 限制仅 Prometheus 可访问。

---

## 14. 集群 / 多进程聚合（ClusterRegistry）

Node 用 `cluster` 模块起多 worker 时，每个进程有独立指标。需把各 worker 的指标**聚合**到 master 再暴露。

```js
import cluster from 'node:cluster';
import * as client from 'prom-client';

if (cluster.isPrimary) {
  // 旧名 AggregatorRegistry（已弃用），新名 ClusterRegistry，用法一致
  const registry = new client.ClusterRegistry();

  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', registry.contentType);
      res.end(await registry.clusterMetrics()); // 聚合所有 worker
      return;
    }
    res.end('primary');
  });
  server.listen(9090);

  for (let i = 0; i < 4; i++) cluster.fork();
} else {
  // worker：正常写指标，prom-client 会自动通过 IPC 上报给 master
  client.collectDefaultMetrics();
  // ... 业务指标 ...
}
```

> 新版还引入 `WorkerRegistry` 支持 worker_threads。API 一致：master 侧用 `clusterMetrics()` 聚合。

---

## 15. 实战：HTTP 请求全量埋点中间件

一个可直接用的 Express 中间件，覆盖**请求计数 + 延迟直方图 + 在途请求 gauge**。

```js
import * as client from 'prom-client';

// 1) 请求总数（按 method / route / status_code）
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// 2) 请求延迟直方图（按 method / route / status_code）
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// 3) 在途请求数（瞬时 gauge）
const httpInflight = new client.Gauge({
  name: 'http_requests_inflight',
  help: 'In-flight HTTP requests',
});

export function metricsMiddleware(req, res, next) {
  const route = req.route?.path ?? req.path; // 用路由模板而非原始 URL（防基数爆炸）
  httpInflight.inc();
  const end = httpRequestDuration.startTimer({ method: req.method, route });

  res.on('finish', () => {
    httpInflight.dec();
    httpRequestsTotal.inc({ method: req.method, route, status_code: String(res.statusCode) });
    end({ status_code: String(res.statusCode) });
  });
  next();
}
```

```js
// app.js
import express from 'express';
import { metricsMiddleware } from './metrics.js';
import * as client from 'prom-client';

const app = express();
client.collectDefaultMetrics();

app.use(metricsMiddleware);              // 全局埋点
app.get('/users', (req, res) => res.json([]));
app.get('/orders', (req, res) => res.json([]));

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(3000);
```

> 注意 `route` 用 `req.route.path`（如 `/users/:id`）而非 `req.url`（如 `/users/123`），**避免把每个 ID 变成一条时间序列**（基数陷阱）。

---

## 16. Prometheus Server 配置与部署

### 16.1 prometheus.yml（抓取配置）

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'node-app'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3000']   # Docker 里访问宿主机的 Node 服务
    # 若标签需补充：
    # relabel_configs:
    #   - target_label: env
    #     replacement: production
```

### 16.2 Docker Compose（含 Prometheus）

```yaml
services:
  prometheus:
    image: prom/prometheus:v3.13.2
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  node-app:
    build: .
    ports:
      - '3000:3000'
```

启动后访问 `http://localhost:9090` 的 Graph 页面即可用 PromQL 查询；Targets 页面确认 `node-app` 为 `UP`。

---

## 17. PromQL 速查

| 需求 | 查询 |
|---|---|
| QPS（每秒请求数） | `rate(http_requests_total[5m])` |
| 按状态码聚合 QPS | `sum by (status_code) (rate(http_requests_total[5m]))` |
| P95 延迟 | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))` |
| 平均在途请求 | `avg(http_requests_inflight)` |
| 5xx 比例 | `sum(rate(http_requests_total{status_code="500"}[5m])) / sum(rate(http_requests_total[5m]))` |
| 实例是否存活 | `up{job="node-app"}` |
| 常驻内存 | `process_resident_memory_bytes` |
| 事件循环延迟 | `nodejs_eventloop_lag_seconds` |

> `rate()` 只看 Counter；`irate()` 用最后两个点算瞬时速率（更灵敏）；`histogram_quantile` 必须配合 `..._bucket`。

---

## 18. 告警规则与 Alertmanager

### 18.1 告警规则（rules.yml）

```yaml
groups:
  - name: api-alerts
    rules:
      - alert: High5xxRate
        expr: |
          sum(rate(http_requests_total{status_code="500"}[5m]))
            / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: page
        annotations:
          summary: "5xx 错误率超过 5%"
          description: "job={{ $labels.job }} 5xx 比例 {{ $value | humanizePercentage }}"

      - alert: HighP95Latency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
          ) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "P95 延迟超过 1s（route={{ $labels.route }}）"
```

### 18.2 Prometheus 关联 Alertmanager

```yaml
# prometheus.yml 片段
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
rule_files:
  - /etc/prometheus/rules.yml
```

> Alertmanager 负责去重、分组、静默，并把告警推到邮件 / 钉钉 / Slack / Webhook。具体路由配置属于运维侧，可参考官方文档。

---

## 19. Grafana 可视化简介

Grafana 是看 Prometheus 数据最常用的前端：

1. 加数据源：Data Sources → Prometheus → URL 填 `http://prometheus:9090`。
2. 新建 Dashboard → Panel → 查询框写 PromQL（见 §17）。
3. 常用面板：QPS 折线、P95/P99 延迟、错误率、内存/CPU、在途请求。
4. 官方社区有大量现成 Dashboard（搜 “Node.js” / “Express”）。

典型面板查询（P95 延迟）：

```
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
```

---

## 20. 最佳实践清单

1. **用 `prom-client`（`@prometheus-io/client`）**，这是 Node 事实标准，不要自己拼文本。
2. **必须设置 `Content-Type`**（`register.contentType`）—— Prometheus 3.x 会因缺头拒绝抓取。
3. **Counter 命名加 `_total` 后缀**，Histogram/Summary 单位用 `_seconds` / `_bytes`。
4. **标签基数要可控**：禁止把 user_id / UUID / 时间戳 / IP 当标签。
5. **路由埋点用 `req.route.path` 模板**，不用 `req.url`，防止每个资源 ID 成一条序列。
6. **Gauge 点采样用 `collect()` 函数**，不要用 `setInterval` 定时 `set`。
7. **Histogram 桶要提前规划**，兼顾精度与基数。
8. **跨实例分位数用 Histogram**（服务端算），不要跨实例聚合 Summary 的分位数。
9. **短任务用 Pushgateway**，但记住它只保留最后一次 push 的值。
10. **多进程用 ClusterRegistry** 聚合 worker 指标，再统一暴露 `/metrics`。
11. **`/metrics` 要保护**：加鉴权 / 限制仅 Prometheus 可访问，别暴露公网。
12. **千万不要用 Prometheus 做 100% 精确计费**（官方明确不适合）。
13. **`collect()` / 默认指标在 scrape 时采集**，无需自己起定时任务，零额外常驻开销。
14. **指标名、help 必填**，help 写明单位与含义，便于他人理解。
15. **聚合维度提前想好**：`sum by (...)` 的维度应与你排查问题的维度一致。

---

## 21. 参考文档

- **Prometheus 官网**：[prometheus.io](https://prometheus.io)
- **Prometheus 概览（组件/数据模型）**：[Introduction | Overview](https://prometheus.io/docs/introduction/overview/)
- **客户端库总览**：[Client libraries](https://prometheus.io/docs/instrumenting/clientlibs/)
- **指标命名规范**：[Metric and label naming](https://prometheus.io/docs/practices/naming/)
- **Prometheus 抓取配置**：[Configuration | scrape_config](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- **PromQL 基础**：[Querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- **Histogram 分位数查询**：[histogram_quantile](https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile)
- **告警规则**：[Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- **Pushgateway 官方仓库**：[prometheus/pushgateway](https://github.com/prometheus/pushgateway)
- **prom-client（npm，最新 15.1.3）**：[prom-client](https://www.npmjs.com/package/prom-client)
- **@prometheus-io/client（npm，更名后 v16+）**：[@prometheus-io/client](https://www.npmjs.com/package/@prometheus-io/client)
- **prom-client GitHub（含示例与 changelog）**：[siimon/prom-client](https://github.com/siimon/prom-client)
- **Prometheus 3.0 变更（Content-Type 强校验）**：[Prometheus 3.0 release notes](https://prometheus.io/blog/2024/11/14/prometheus-3-0/)
- **Grafana 官网**：[grafana.com](https://grafana.com)
- **Alertmanager 官方文档**：[Alerting | Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)
- **本项目配套：Node + Kubernetes 文档**：[md/zh-cn/node18_k8s.md](./node18_k8s.md)
