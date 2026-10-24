---
title: Node 使用 Elasticsearch 与 Elastic Stack 学习文档
create:2026-10-21
update:2026-10-21
category:nodejs
cover:https://img-common.aknot.uk/cover/land-10.jpg
tags:[node,elasticsearch,elastic-stack,search,logstash,kibana,database]
summary:Node 使用 Elasticsearch 与 Elastic Stack 的学习文档，覆盖索引、查询、聚合与日志检索
keywords:[node,elasticsearch,search,logstash,kibana,aggregation]
top:1
copyright:true
---

# Node 使用 Elasticsearch 与 Elastic Stack 学习文档

> 适用版本：Elasticsearch 8.x（含 8.11+ Security 默认开启）、官方 `@elastic/elasticsearch` 客户端 v8.x。
> 语言：TypeScript / JavaScript（示例以 TS 为主，可去类型直接当 JS 用）。

---

## 1. 先说清楚：Elasticsearch 是什么

**Elasticsearch（ES）是一个分布式搜索与分析引擎，本质上是一个面向文档的 NoSQL 数据存储。** 它常被当作“数据库”使用（尤其是全文检索、日志、指标场景），但它不是关系型数据库——没有 join、事务、外键这些概念，强项是**倒排索引 + 近实时聚合**。

**Elastic Stack（原 ELK Stack）** 是一整套可观测性 / 搜索数据平台：

| 组件 | 角色 | 与 Node 的关系 |
|---|---|---|
| **Elasticsearch** | 存储、索引、检索、聚合的核心引擎 | Node 通过 `@elastic/elasticsearch` 客户端读写 |
| **Kibana** | 可视化、仪表盘、Dev Tools 控制台 | Node 通过 Kibana REST API 管理 saved objects / 告警 |
| **Logstash** | 数据收集、转换、入库的管道 | 通常独立部署，Node 只管产出结构化日志 |
| **Beats** | 轻量采集器（Filebeat/Metricbeat 等） | 独立进程，Node 不直接调用 |
| **APM Server** | 应用性能监控 | Node 用官方 APM Agent 上报 trace |
| **Ingest Pipeline** | ES 服务端的数据预处理 | Node 调用 pipeline API 定义规则 |

本文主线：
- **A 线（数据面，核心）**：用 Node 客户端对 Elasticsearch 做索引管理、文档 CRUD、检索、聚合。
- **B 线（控制面）**：用 Node 调 Kibana / Elasticsearch 的 REST API 做自动化（创建索引模板、管理看板、告警规则）。
- **C 线（采集面）**：Node 应用产出日志/指标，经 Filebeat → ES → Kibana 形成可观测闭环。

---

## 2. 环境准备

### 2.1 用 Docker 一键起一套 8.x

```yaml
# docker-compose.yml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.15.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD=changeme          # 记住这个密码
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.15.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=changeme
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

```bash
docker compose up -d
# 验证：浏览器打开 https://localhost:9200 需要 https 自签证书 + 账号 elastic/changeme
curl -k -u elastic:changeme https://localhost:9200
```

> ⚠️ **8.x 默认开启 Security + TLS**。本地开发可用 `-k`/自签证书跳过校验；生产必须配置真正的证书。

### 2.2 安装 Node 客户端

```bash
pnpm add @elastic/elasticsearch
# 若用 TypeScript 类型推断（推荐）
pnpm add -D @types/node
```

---

## 3. 客户端初始化（Client）

```ts
import { Client } from '@elastic/elasticsearch'

// 基础：单节点 + 账号密码
const client = new Client({
  node: 'https://localhost:9200',
  auth: { username: 'elastic', password: 'changeme' },
  // 本地自签证书跳过 TLS 校验（仅开发！）
  tls: { rejectUnauthorized: false },
})

// 多节点 + 负载（生产）
const cluster = new Client({
  nodes: ['https://es1:9200', 'https://es2:9200', 'https://es3:9200'],
  auth: { apiKey: 'BASE64_API_KEY' },        // 推荐用 API Key 替代账号密码
  requestTimeout: 60000,
  maxRetries: 3,
  sniffOnStart: true,                        // 启动嗅探集群节点
  sniffInterval: 30000,                      // 定期刷新节点列表
})

// 8.x 还支持 Cloud ID（Elastic Cloud 托管）
const cloud = new Client({
  cloud: { id: '<your-cloud-id>' },
  auth: { apiKey: 'BASE64_API_KEY' },
})
```

### 3.1 三种鉴权方式

```ts
// 1) 用户名密码
auth: { username: 'elastic', password: 'changeme' }

// 2) API Key（推荐，可在 Kibana / API 创建，可随时吊销）
auth: { apiKey: 'VnVhZXJhb...base64==:longsecret==' }

// 3) Bearer Token（OIDC / service token）
auth: { bearer: '<jwt-or-service-token>' }
```

### 3.2 连接健康检查

```ts
// ping：探活
const alive = await client.ping()
console.log('ES 可达:', alive)   // true / 抛错

// info：集群基本信息
const info = await client.info()
console.log(info.version.number, info.cluster_name)

// 多节点时切换具体节点
const node = client.connectionPool.getConnection()
console.log('当前连接节点:', node?.url.href)
```

---

## 4. 索引（Index）管理

索引 ≈ 关系型数据库的“表”。ES 索引里存的是 JSON 文档。

### 4.1 创建索引（含 Mapping 与分词）

```ts
await client.indices.create({
  index: 'articles',
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        // 自定义中文 IK 分词（需装插件）或内置 standard
        my_ik: { type: 'ik_max_word' },
      },
    },
  },
  mappings: {
    properties: {
      title:       { type: 'text', analyzer: 'ik_max_word' },
      content:     { type: 'text' },
      author:      { type: 'keyword' },          // 精确匹配、聚合字段用 keyword
      tags:        { type: 'keyword' },
      views:       { type: 'integer' },
      score:       { type: 'float' },
      publishedAt: { type: 'date' },
      location:    { type: 'geo_point' },        // 经纬度
      comments:    {                              // 嵌套对象
        type: 'nested',
        properties: {
          user:  { type: 'keyword' },
          text:  { type: 'text' },
          likes: { type: 'integer' },
        },
      },
    },
  },
})
console.log('articles 索引已创建')
```

> **text vs keyword**：`text` 用于全文检索（会被分词）；`keyword` 用于精确匹配 / 排序 / 聚合（不分词）。这是 ES 建模最核心的区别。

### 4.2 索引存在性 / 获取 / 删除 / 开关

```ts
const exists = await client.indices.exists({ index: 'articles' })
console.log('存在:', exists)

// 获取 mapping + settings
const mapping = await client.indices.getMapping({ index: 'articles' })

// 关闭 / 打开（关闭后不可读写，省资源）
await client.indices.close({ index: 'articles' })
await client.indices.open({ index: 'articles' })

// 删除（危险！）
await client.indices.delete({ index: 'articles' })

// 多个索引通配
await client.indices.delete({ index: 'logs-*' })
```

### 4.3 动态更新 Mapping（仅能加字段）

```ts
// ES 不允许修改已有字段类型，只能新增字段
await client.indices.putMapping({
  index: 'articles',
  properties: {
    summary: { type: 'text' },
  },
})
```

### 4.4 别名（Alias）——生产必备

```ts
// 用别名做“零停机重建索引 / 版本切换”
await client.indices.putAlias({ index: 'articles_v1', name: 'articles' })

// 滚动切换：删除旧别名 -> 绑定新索引
await client.indices.updateAliases({
  actions: [
    { remove: { index: 'articles_v1', alias: 'articles' } },
    { add:    { index: 'articles_v2', alias: 'articles' } },
  ],
})

// 读别名指向的真实索引
const resolved = await client.indices.getAlias({ name: 'articles' })
```

### 4.5 索引模板（Index Template）

```ts
// 让 logs-2026-10-21 这类按日期滚动的索引自动套用 mapping
await client.indices.putIndexTemplate({
  name: 'logs-template',
  index_patterns: ['logs-*'],
  template: {
    settings: { number_of_shards: 1 },
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        level: { type: 'keyword' },
        message: { type: 'text' },
      },
    },
  },
  priority: 100,
})
```

---

## 5. 文档（Document）CRUD

文档是 ES 存的最小单元，JSON 格式，必须有 `_id`（可自定或由 ES 生成）。

### 5.1 写入

```ts
// index：若 _id 已存在则覆盖（全量替换）
const res1 = await client.index({
  index: 'articles',
  id: 'a100',                              // 可选，省略则 ES 自动生成
  document: {
    title: 'Elasticsearch 入门',
    content: '倒排索引是核心...',
    author: 'zhang',
    tags: ['es', 'search'],
    views: 0,
    score: 4.5,
    publishedAt: '2026-10-21T09:00:00Z',
    location: { lat: 31.23, lon: 121.47 },
  },
})
console.log('写入 _id:', res1._id, 'result:', res1.result)  // "created" | "updated"

// create：若 _id 已存在则报错（409），保证不覆盖
await client.create({
  index: 'articles',
  id: 'a100',
  document: { title: '重复会报错' },
})
```

### 5.2 读取

```ts
// get：按 _id 获取
const doc = await client.get({ index: 'articles', id: 'a100' })
console.log(doc._source, doc.found)

// exists：仅判断存在
const ok = await client.exists({ index: 'articles', id: 'a100' })

// mget：批量按 id 取（减少网络往返）
const many = await client.mget({
  docs: [
    { _index: 'articles', _id: 'a100' },
    { _index: 'articles', _id: 'a101' },
  ],
})
```

### 5.3 更新

```ts
// update：增量更新（只改传的字段，document 用 doc 包裹）
await client.update({
  index: 'articles',
  id: 'a100',
  doc: { views: 1, score: 4.6 },
})

// 带 upsert：不存在时插入
await client.update({
  index: 'articles',
  id: 'a102',
  doc: { views: 1 },
  upsert: { title: '新建并自增', views: 1 },
})

// 脚本更新：views + 1
await client.update({
  index: 'articles',
  id: 'a100',
  script: {
    source: 'ctx._source.views += params.inc',
    params: { inc: 1 },
  },
})

// 部分字段用 pipeline 处理
await client.update({
  index: 'articles',
  id: 'a100',
  doc: { raw: 'UPPER me' },
  pipeline: 'my-ingest',
})
```

### 5.4 删除

```ts
await client.delete({ index: 'articles', id: 'a100' })

// 按查询条件批量删除（删除 builder）
await client.deleteByQuery({
  index: 'articles',
  query: { term: { author: 'spam' } },
})
```

### 5.5 Bulk 批量（高吞吐写入核心）

```ts
// 单条 bulk 需严格一行 action、一行数据交替
await client.bulk({
  operations: [
    { index: { _index: 'articles', _id: 'b1' } },
    { title: '批量1', author: 'zhang' },
    { index: { _index: 'articles', _id: 'b2' } },
    { title: '批量2', author: 'li' },
    { delete: { _index: 'articles', _id: 'old' } },
  ],
})

// 从数组动态拼装（更常用）
const docs = loadFromDB()   // [{id, ...}, ...]
const ops = docs.flatMap(d => [
  { index: { _index: 'articles', _id: d.id } },
  d,
])
await client.bulk({ operations: ops, refresh: true })  // refresh 让写入立即可查
```

---

## 6. 检索（Search）与 Query DSL

ES 最强的能力。检索 API 返回一个命中列表 + 聚合结果。

### 6.1 最简检索

```ts
const { hits } = await client.search({
  index: 'articles',
  query: { match_all: {} },
  size: 10,
})
hits.hits.forEach(h => console.log(h._id, h._score, h._source.title))
```

### 6.2 常用查询类型（Query DSL）

```ts
// 全文检索：会分词 + 算分
const q1 = { match: { title: 'elasticsearch 检索' } }

// 短语匹配：词序一致才算
const q2 = { match_phrase: { content: '倒排索引' } }

// 精确匹配 keyword（不分词，走 term）
const q3 = { term: { author: 'zhang' } }

// 多值之一命中
const q4 = { terms: { tags: ['es', 'search'] } }

// 范围
const q5 = { range: { views: { gte: 100, lte: 1000 } } }
const q6 = { range: { publishedAt: { gte: 'now-7d' } } }

// 前缀 / 通配 / 模糊
const q7 = { prefix: { title: 'Elastic' } }
const q8 = { wildcard: { title: 'elastic*' } }
const q9 = { fuzzy: { author: { value: 'zhnag', fuzziness: 'AUTO' } } }

// 存在性
const q10 = { exists: { field: 'score' } }

// 布尔组合（and/or/not + 算分加权）—— 最常用
const boolQuery = {
  bool: {
    must: [ { match: { title: 'elasticsearch' } } ],          // 必须命中，参与算分
    should: [                                                 // 命中则加分
      { term: { tags: 'popular' } },
    ],
    filter: [                                                 // 必须命中，不参与算分（性能好）
      { range: { views: { gte: 10 } } },
      { term: { author: 'zhang' } },
    ],
    must_not: [ { term: { author: 'spam' } } ],               // 必须不命中
    minimum_should_match: 1,
  },
}
```

### 6.3 组合检索完整示例

```ts
const result = await client.search({
  index: 'articles',
  query: boolQuery,
  // 排序
  sort: [
    { views: { order: 'desc' } },
    { publishedAt: { order: 'desc' } },
  ],
  // 高亮
  highlight: {
    fields: { title: {}, content: { fragment_size: 50 } },
    pre_tags: ['<em>'], post_tags: ['</em>'],
  },
  // 指定返回字段（减少传输）
  _source: ['title', 'author', 'views'],
  from: 0,
  size: 20,
})

result.hits.hits.forEach(h => {
  console.log(h._source.title, h.highlight?.title?.[0] ?? '')
})
```

### 6.4 分页三方案

```ts
// ① from/size：简单但深翻页慢（默认上限 10000）
client.search({ index, query, from: 100, size: 20 })

// ② search_after：深翻页最优解（游标，需稳定排序）
let pitId
const init = await client.openPointInTime({ index: 'articles', keep_alive: '1m' })
pitId = init.id
let lastSort
do {
  const r = await client.search({
    pit: { id: pitId, keep_alive: '1m' },
    size: 100,
    query: { match_all: {} },
    sort: [{ _shard_doc: 'desc' }],
    search_after: lastSort,
  })
  // 处理 r.hits.hits ...
  lastSort = r.hits.hits.at(-1)?.sort
} while (lastSort)
await client.closePointInTime({ id: pitId })
```

> ⚠️ **禁止用 from/size 做深翻页**（from=10000 直接报错）。大数据量导出用 `scroll`（旧）或 `PIT + search_after`（新，推荐）。

### 6.5 聚合（Aggregation）——分析能力

```ts
const agg = await client.search({
  index: 'articles',
  size: 0,                       // 只要聚合结果，不要命中文档
  query: { range: { views: { gte: 1 } } },
  aggs: {
    // 按 author 分组计数
    by_author: { terms: { field: 'author', size: 10 } },
    // 平均 views
    avg_views: { avg: { field: 'views' } },
    // 时间直方图（按天）
    per_day: {
      date_histogram: { field: 'publishedAt', calendar_interval: 'day' },
    },
    // 嵌套聚合：每个作者下的最高分文章
    top_authors: {
      terms: { field: 'author', size: 5 },
      aggs: {
        top_score: { max: { field: 'score' } },
      },
    },
  },
})
console.log(agg.aggregations?.by_author.buckets)
```

---

## 7. Ingest Pipeline（服务端预处理）

写入前的字段转换、富化，省去在 Node 里手动处理。

```ts
// 定义 pipeline：把 message 转小写、加 ingest 时间戳
await client.ingest.putPipeline({
  id: 'my-ingest',
  processors: [
    { lowercase: { field: 'author' } },
    { set: { field: 'ingestedAt', value: '{{_ingest.timestamp}}' } },
    { gsub: { field: 'title', pattern: '\\s+', replacement: ' ' } },   // 去多余空格
  ],
})

// 写入时引用
await client.index({
  index: 'articles',
  id: 'x1',
  pipeline: 'my-ingest',
  document: { author: 'ZHANG', title: '  too   many   spaces' },
})
```

---

## 8. 客户端高级用法

### 8.1 bulkHelper 流式写入（官方推荐高吞吐）

```ts
// helpers 提供背压控制的流式批量写入
const result = await client.helpers.bulk({
  datasource: largeArrayOfDocs,           // 数组或可异步迭代对象
  onDocument(doc) {
    return { index: { _index: 'articles', _id: doc.id } }   // 返回 action
  },
  flushBytes: 5_000_000,                  // 累积到 5MB 刷一次
  concurrency: 4,                         // 并发 bulk 数
  onDrop(doc, error) {                    // 单条失败时回调
    console.error('写入失败:', doc._id, error.message)
  },
  refreshOnCompletion: true,
})
console.log('成功写入:', result.successful, '失败:', result.failed)
```

### 8.2 重试与错误处理

```ts
import { errors } from '@elastic/elasticsearch'

try {
  await client.search({ index: 'articles', query: { match_all: {} } })
} catch (err) {
  if (err instanceof errors.ResponseError) {
    // ES 返回的业务错误：404 索引不存在 / 409 版本冲突 / 429 限流
    console.log(err.statusCode, err.body.error.type)
    if (err.statusCode === 429) console.log('被限流，稍后重试')
  } else if (err instanceof errors.ConnectionError) {
    console.log('连不上 ES')
  } else if (err instanceof errors.TimeoutError) {
    console.log('请求超时')
  } else if (err instanceof errors.NoLivingConnectionsError) {
    console.log('所有节点不可用（触发重连 / 告警）')
  }
}
```

### 8.3 乐观并发控制（版本）

```ts
// 读取时拿到 _seq_no / _primary_term，更新时带上做 CAS
const doc = await client.get({ index: 'articles', id: 'a100' })
await client.update({
  index: 'articles',
  id: 'a100',
  if_seq_no: doc._seq_no,
  if_primary_term: doc._primary_term,
  doc: { views: 99 },
})
// 若期间被别人改过 -> 409 版本冲突，可重试
```

---

## 9. 实战：封装一个可复用的搜索服务

```ts
// search-service.ts
import { Client } from '@elastic/elasticsearch'

export class ArticleSearch {
  private client: Client
  constructor(client: Client, private index = 'articles') {
    this.client = client
  }

  // 确保索引与 mapping 存在（幂等初始化）
  async ensureIndex() {
    const exists = await this.client.indices.exists({ index: this.index })
    if (!exists) {
      await this.client.indices.create({ /* 见 4.1 */ })
    }
  }

  async create(id: string, data: Record<string, unknown>) {
    return this.client.index({ index: this.index, id, document: data, refresh: 'wait_for' })
  }

  async get(id: string) {
    try {
      const r = await this.client.get({ index: this.index, id })
      return r._source
    } catch (e: any) {
      if (e?.statusCode === 404) return null
      throw e
    }
  }

  // 关键词检索 + 分页 + 高亮
  async search(keyword: string, page = 1, size = 20) {
    const r = await this.client.search({
      index: this.index,
      query: {
        bool: {
          must: keyword
            ? [{ match: { title: { query: keyword, fuzziness: 'AUTO' } } }]
            : [{ match_all: {} }],
          filter: [{ range: { views: { gte: 1 } } }],
        },
      },
      sort: [{ views: 'desc' }],
      from: (page - 1) * size,
      size,
      highlight: { fields: { title: {}, content: {} } },
    })
    return {
      total: r.hits.total?.value ?? 0,
      items: r.hits.hits.map(h => ({
        id: h._id,
        ...(h._source as object),
        highlight: h.highlight,
      })),
    }
  }

  async delete(id: string) {
    await this.client.delete({ index: this.index, id, refresh: 'wait_for' })
  }
}
```

---

## 10. B 线：用 Node 调 Elastic Stack 的 REST API

### 10.1 Kibana Saved Objects API（自动化看板）

```ts
const kibana = (path: string, body?: unknown) =>
  fetch(`https://localhost:5601/api/saved_objects/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'kbn-xsrf': 'true',                          // Kibana API 强制要求
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from('elastic:changeme').toString('base64'),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

// 用 NDJSON 批量导入看板 / 索引模式 / 可视化
const ndjson = [
  '{"type":"index-pattern","id":"articles","attributes":{"title":"articles"}}',
  '{"type":"dashboard","id":"dash1","attributes":{"title":"文章看板"}}',
].join('\n') + '\n'

await fetch('https://localhost:5601/api/saved_objects/_import', {
  method: 'POST',
  headers: { 'kbn-xsrf': 'true', Authorization: 'Basic ' + auth },
  body: new Blob([ndjson], { type: 'application/x-ndjson' }),
})
```

### 10.2 利用 ES Template / ILM 做日志滚动

```bash
# 通过 Kibana Dev Tools 或 Node 调 ES API 创建 ILM 策略
curl -X PUT "https://localhost:9200/_ilm/policy/logs-policy" -u elastic:changeme -k -H 'Content-Type: application/json' -d '{
  "policy": {
    "phases": {
      "hot":  { "min_size": "5gb", "actions": { "rollover": { "max_age": "7d" } } },
      "warm": { "min_age": "30d", "actions": { "shrink": { "number_of_shards": 1 } } },
      "delete": { "min_age": "90d", "actions": { "delete": {} } }
    }
  }
}'
```

### 10.3 Elasticsearch SQL（用 SQL 查 ES）

```ts
const sql = await client.sql.query({
  query: 'SELECT author, COUNT(*) c FROM articles GROUP BY author ORDER BY c DESC',
  format: 'json',
})
console.log(sql.rows)
```

---

## 11. C 线：Node 应用产出日志供 Stack 采集

```ts
// 结构化日志，Filebeat 自动采集 -> ES
import winston from 'winston'
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),             // 关键：输出 JSON，便于 ES 解析
  ),
  transports: [new winston.transports.File({ filename: 'app.log' })],
})

logger.info('user login', { userId: 123, ip: '1.2.3.4', level: 'info' })
// Filebeat 读取 app.log -> ES 索引 logs-app-*
```

> **链路**：Node 写 JSON 日志 → Filebeat 采集 → ES 索引 → Kibana Discover / Dashboard 可视化。这是最经典的 Elastic Stack 用法。

### 11.1 APM 接入（应用性能监控）

```bash
pnpm add @elastic/apm-agent-nodejs
```

```ts
// 在应用最入口处第一行引入
const apm = require('elastic-apm-node').start({
  serviceName: 'article-api',
  serverUrl: 'http://localhost:8200',   // APM Server 地址
  secretToken: 'your-token',            // 若开启
})
// 之后所有 HTTP 请求、DB 调用自动形成 trace，可在 Kibana APM 看延迟火焰图
```

---

## 12. 常见坑与最佳实践

1. **8.x 必须处理 TLS + Security**：本地用 `tls.rejectUnauthorized=false` 临时绕过，生产必须配证书 + API Key。
2. **text / keyword 分不清**：检索用 `text`，精确匹配 / 排序 / 聚合用 `keyword`；需要两者就 `fields: { keyword: { type: 'keyword' } }` 多字段。
3. **深翻页别用 from/size**：`from > 10000` 报错，改用 `PIT + search_after`。
4. **`refresh` 慎用**：每次写都 `refresh: true` 会严重拖慢写入；批量导入用 bulk + 末尾一次 refresh。
5. **批量写入用 `helpers.bulk` 或 `bulk`**：逐条 `index()` 性能极差。
6. **Mapping 不可改类型**：建索引前规划好字段类型；要改只能重建索引 + reindex。
7. **不要用 `_id` 自增整数当业务 ID 还要排序**：ES 的 `_id` 是字符串，排序无意义；排序请放独立 `date` / `integer` 字段。
8. **`size: 0` 只看聚合**：聚合分析时设 `size:0` 省去传输命中文档。
9. **生产关掉 `sniffOnStart` 的盲目嗅探**：云托管 / 代理场景嗅探会拿到内网地址连不上，按环境配置。
10. **错误要区分类型**：`ResponseError`(业务) / `ConnectionError`(网络) / `TimeoutError` / `NoLivingConnectionsError`，分别处理重试与告警。
11. **中文必须用 IK 分词插件**：默认 `standard` 会把中文切成一个个字，检索效果差——装 `analysis-ik` 并用 `ik_max_word` / `ik_smart`。
12. **集群健康先看**：`GET /_cluster/health` 的 `status`（green/yellow/red），yellow 通常是副本数 > 节点数，单节点把 `number_of_replicas` 设为 0。

---

## 13. 速查表

### ES 客户端方法速查

| 能力 | 方法 |
|---|---|
| 探活 / 信息 | `client.ping()` / `client.info()` |
| 索引 | `client.indices.create/get/exists/delete/close/open/putAlias/updateAliases/putMapping/putIndexTemplate` |
| 文档写 | `client.index()` / `client.create()` / `client.bulk()` / `client.helpers.bulk()` |
| 文档读 | `client.get()` / `client.mget()` / `client.exists()` |
| 文档改 | `client.update()` / `client.delete()` / `client.deleteByQuery()` |
| 检索 | `client.search()` / `client.msearch()` / `client.count()` / `client.searchTemplate()` |
| 游标 | `client.openPointInTime()` / `client.closePointInTime()` |
| 聚合 | 在 `search({ aggs })` 内 |
| 管道 | `client.ingest.putPipeline()` / `client.ingest.getPipeline()` |
| SQL | `client.sql.query()` |
| 集群 | `client.cluster.health()` / `client.cat.indices()` |

### 核心概念对照（关系型 → ES）

| RDBMS | Elasticsearch |
|---|---|
| 数据库 Database | 索引 Index（逻辑） |
| 表 Table | 索引 Index（物理） |
| 行 Row | 文档 Document（JSON） |
| 列 Column | 字段 Field |
| Schema | Mapping |
| 索引（B+Tree） | 倒排索引 Inverted Index |
| JOIN | 不支持（用 nested / parent-child / 冗余宽表） |
| 事务 | 不支持（靠 `_seq_no` 乐观锁） |

---

## 14. 学习路径建议

1. **先跑通**：Docker 起 ES 8.x → 装客户端 → 写 10 条文档 → 搜出来。
2. **理解 Mapping**：text vs keyword、分词器（IK）、嵌套对象。
3. **掌握 Query DSL**：bool 组合 + term/match/range，这是 80% 场景的武器。
4. **聚合进阶**：terms / date_histogram / 嵌套聚合，做报表分析。
5. **性能与规模化**：bulk、PIT+search_after、ILM 滚动、别名零停机重建。
6. **接入 Stack**：Filebeat 采日志 → Kibana 看板 → APM 性能 → 告警。
7. **官方资源**：
   - 客户端文档：<https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html>
   - Query DSL：<https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html>
   - Kibana API：<https://www.elastic.co/guide/en/kibana/current/api.html>
