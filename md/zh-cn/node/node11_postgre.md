---
title: Node.js 操作 PostgreSQL 学习文档
create:2026-10-21
update:2026-10-21
category:database
tags:[node,postgresql,database,pg,sql,backend]
summary:Node.js 使用 node-postgres(pg) 操作 PostgreSQL 的详细学习文档，覆盖连接、查询、事务、连接池、批量与流式
keywords:[node,postgresql,database,pg,sql,query,transaction]
top:1
copyright:true
---

# Node.js 操作 PostgreSQL 学习文档

> 适用驱动：**[node-postgres](https://node-postgres.com)（npm 包名 `pg`）**，当前稳定版 **8.23.x**（2026-08 发布，8.x 全系 API 稳定）。
> 适用运行环境：Node.js 18 / 20 / 22 / 24（也支持 Bun、Deno、Cloudflare Workers）。
> 本文定位为「接口齐全、带可运行示例」的学习笔记/速查手册。所有示例基于 `pg` 原生驱动；文末 §17 简要对比 ORM/查询构建器，便于选型。
> 全文统一约定：示例以 **ESM（`import`）** 为主，并在 §2 给出 CommonJS 写法。数据库假设为本机 `postgres`，示例表为 `users` / `accounts`。

---

## 目录

- [0. 你会在本文学到什么](#0-你会在本文学到什么)
- [1. 驱动选型：为什么用 `pg`](#1-驱动选型为什么用-pg)
- [2. 安装与模块引入](#2-安装与模块引入)
- [3. 两个核心对象：Pool 与 Client](#3-两个核心对象pool-与-client)
- [4. 连接方式（4 种）](#4-连接方式4-种)
- [5. 执行查询 `query()`](#5-执行查询-query)
- [6. 增 / 改 / 删（INSERT / UPDATE / DELETE）](#6-增--改--删insert--update--delete)
- [7. 事务（Transaction）](#7-事务transaction)
- [8. 连接池配置与监控](#8-连接池配置与监控)
- [9. 批量操作](#9-批量操作)
- [10. 数据类型与类型解析](#10-数据类型与类型解析)
- [11. 监听与通知 LISTEN / NOTIFY](#11-监听与通知-listen--notify)
- [12. 游标与流式查询](#12-游标与流式查询)
- [13. 大批量导入导出 COPY](#13-大批量导入导出-copy)
- [14. 错误处理](#14-错误处理)
- [15. 建表与迁移](#15-建表与迁移)
- [16. 安全最佳实践](#16-安全最佳实践)
- [17. ORM / 查询构建器速览（选型参考）](#17-orm--查询构建器速览选型参考)
- [18. 综合实战：用户模块 CRUD + 事务转账](#18-综合实战用户模块-crud--事务转账)
- [19. 参考文档](#19-参考文档)

---

## 0. 你会在本文学到什么

| 能力 | 对应章节 |
|------|----------|
| 连上 PostgreSQL（4 种方式） | §4 |
| 安全地执行查询（防 SQL 注入） | §5.2 |
| 读懂查询结果对象 | §5.4 |
| 写增删改并拿回自增/受影响行 | §6 |
| 用事务保证多步操作原子性 | §7 |
| 调优连接池、监控空闲/等待连接 | §8 |
| 一次插多行、批量更新 | §9 |
| 处理日期/数组/JSON 等类型 | §10 |
| 实时推送（表变更通知） | §11 |
| 超大数据集游标/流式，不爆内存 | §12 |
| 百万行 COPY 高速导入 | §13 |
| 看懂 `error.code` 并排错 | §14 |
| 建表 + 简单迁移 | §15 |
| 生产级安全清单 | §16 |

---

## 1. 驱动选型：为什么用 `pg`

Node 生态里接 PostgreSQL 主要有三条路线：

| 方案 | 包 | 特点 | 适合 |
|------|-----|------|------|
| **原生驱动** | `pg`（node-postgres） | 最底层、最稳定、零抽象，API 贯穿整个 8.x；支持参数化、连接池、事务、LISTEN/NOTIFY、COPY、游标、流式 | 想完全掌控 SQL、做高性能服务、或作为 ORM 的底层 |
| **查询构建器** | `knex` / `pg-promise` / `slonik` | 在 `pg` 之上提供链式 SQL 构造、参数转义、事务封装 | 不想手写拼接 SQL、要跨库兼容 |
| **ORM** | `Prisma` / `TypeORM` / `Sequelize` | 模型即 Schema、自动迁移、关联查询 | 业务模型复杂、团队偏好声明式 |

> 本文聚焦 **`pg` 原生驱动**——它是绝大多数 Node ORM/工具（Prisma、TypeORM、Supabase 服务端、Knex 等）的底座，先把底层吃透，上 ORM 才不至于「黑盒」。

---

## 2. 安装与模块引入

```bash
# 安装（最新 8.x）
npm install pg
# 或 yarn / pnpm
pnpm add pg
```

引入方式（二选一）：

```js
// ✅ ESM（Node 14+ 推荐，本文示例默认此风格）
import pg from 'pg'
const { Pool, Client } = pg
// 也可：import { Pool, Client } from 'pg'

// ✅ CommonJS（老项目 / 无 "type":"module" 时）
const { Pool, Client } = require('pg')
```

> TypeScript 用户：`pg` 8.x **不自带类型声明**，需额外安装 `@types/pg`：
> ```bash
> npm install -D @types/pg
> ```

---

## 3. 两个核心对象：Pool 与 Client

`pg` 只暴露两个核心类，其余都是它们的能力：

| 对象 | 含义 | 何时用 |
|------|------|--------|
| **`Client`** | 一条数据库连接。需手动 `connect()` / `end()` | 单次脚本、一次性任务、或事务中持有「同一连接」 |
| **`Pool`** | 连接池，自动管理连接的借出/回收/重连 | **绝大多数服务端应用**（HTTP 请求并发时复用连接，避免频繁建连） |

> ⚠️ 经验法则：**Web 服务永远用 `Pool`**。每次请求 `pool.query(...)` 时，池会自动借一条空闲连接、用完归还，无需你手动管理生命周期。

最小可运行示例（Pool）：

```js
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/mydb',
})

const res = await pool.query('SELECT NOW() AS now')
console.log(res.rows[0].now) // 当前时间

await pool.end() // 程序退出前关闭池（应用常驻时可不调用）
```

---

## 4. 连接方式（4 种）

`Pool` 与 `Client` 的构造函数参数完全一致，下面以 `Pool` 为例。

### 4.1 环境变量（最推荐，无需硬编码密码）

`pg` 与 `psql` 共用同一套 `PG*` 环境变量，代码里完全不写连接信息：

```js
import { Pool } from 'pg'
const pool = new Pool() // 自动读取下方环境变量
```

运行程序时注入：

```bash
PGUSER=postgres \
PGPASSWORD=secret \
PGHOST=localhost \
PGPORT=5432 \
PGDATABASE=mydb \
node app.js
```

默认值：`PGHOST=localhost`、`PGPORT=5432`、`PGDATABASE=$USER`、`PGUSER=$USER`、`PGPASSWORD=null`。

### 4.2 编程式配置对象

```js
const pool = new Pool({
  user: 'postgres',
  password: 'secret',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  // 可选：连接后执行、字符集等
  // application_name: 'my-app',
  // options: '-c search_path=public',
})
```

### 4.3 连接字符串 URI

常见于 PaaS（Heroku / Supabase / Neon 等直接给你一个连接串）：

```js
const pool = new Pool({
  connectionString: 'postgresql://postgres:secret@localhost:5432/mydb',
  // SSL 在云数据库通常是必选项，见 §4.4
})
```

### 4.4 SSL / Unix Socket / 动态密码

```js
// SSL（云数据库常见；自签证书用 rejectUnauthorized:false）
const pool = new Pool({
  connectionString: 'postgresql://user:pass@db.host:5432/mydb',
  ssl: { rejectUnauthorized: false },
  // 或使用 CA 证书：ssl: { ca: fs.readFileSync('ca.pem') }
})

// Unix Domain Socket（Ubuntu 等靠 socket 认证时）
const client = new Client({ host: '/var/run/postgresql', database: 'mydb' })

// 动态密码（云厂商 IAM 短期令牌，回调可同步或异步返回字符串）
const pool = new Pool({
  user: 'iam-user',
  host: 'db.host',
  database: 'mydb',
  password: async () => await getAuthToken(), // 每次建连调用
})
```

---

## 5. 执行查询 `query()`

`pool.query()` 与 `client.query()` **API 完全相同**（`pool.query` 内部就是借一条 client 再委托给它）。有 4 种调用形态。

### 5.1 文本查询（无参数）

```js
const res = await pool.query('SELECT id, name FROM users LIMIT 10')
console.log(res.rows) // [{ id, name }, ...]
```

### 5.2 参数化查询（防 SQL 注入，必会）

绝不拼接用户输入到 SQL 字符串里。用 `$1`、`$2`… 占位，参数以数组传入，由 PostgreSQL 服务端安全替换：

```js
const text = 'SELECT * FROM users WHERE id = $1 AND active = $2'
const values = [42, true]
const res = await pool.query(text, values)
console.log(res.rows[0])
```

> ⚠️ PostgreSQL **不支持**用参数代替「标识符」（表名/列名/库名）。需要动态标识符（如 DDL）请用 [`pg-format`](https://www.npmjs.com/package/pg-format) 做转义，千万别字符串拼接。
>
> 参数类型转换规则：`null`/`undefined` → NULL；`Date` → UTC 字符串；`Buffer` 原样；数组 → Postgres 数组串；普通对象 → `JSON.stringify()`（若对象实现了 `toPostgres()` 方法则调它以自定义序列化）。

### 5.3 查询配置对象（高级形态）

把 `text` 和 `values` 包成一个对象，还能开启 **预备语句**（`name`）、**数组行模式**（`rowMode`）、**自定义类型解析**（`types`）：

```js
// 基础对象形态（等价于 5.2）
const res = await pool.query({
  text: 'INSERT INTO users(name, email) VALUES($1, $2)',
  values: ['alice', 'alice@example.com'],
})

// 预备语句：name 让服务端按连接缓存执行计划（复杂报表查询才值得）
const res2 = await pool.query({
  name: 'fetch-user-by-id',
  text: 'SELECT * FROM users WHERE id = $1',
  values: [42],
})

// 数组行模式：每行返回数组而非对象（省内存、按列序取值）
const res3 = await pool.query({
  text: 'SELECT id, name FROM users WHERE id = $1',
  values: [42],
  rowMode: 'array',
})
console.log(res3.rows[0]) // [42, 'alice']

// 自定义类型：本查询所有值都当字符串返回
const res4 = await pool.query({
  text: 'SELECT * FROM users',
  types: { getTypeParser: () => (val) => val },
})
```

> 预备语句是按 **连接** 缓存的（每条连接首次见到该 `name` 才解析一次）。绝大多数查询用不到，属「进阶优化」，别过早使用。

### 5.4 结果对象结构

`query()` 返回 `Promise<QueryResult>`，关键字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `rows` | `Array<Object>` | 结果行（SELECT）；INSERT/UPDATE/DELETE 带 `RETURNING` 时也有 |
| `rowCount` | `number \| null` | 受影响行数（INSERT/UPDATE/DELETE 有意义；SELECT 为 `null`） |
| `fields` | `Array<FieldInfo>` | 列元信息：`name`、`tableID`、`columnID`、`dataTypeID` 等 |
| `command` | `string` | 命令类型：`SELECT` / `INSERT` / `UPDATE` / `DELETE` 等 |
| `oid` | `number \| null` | 单行 INSERT 插入行的 OID（新版 PG 多为 `null`） |

```js
const res = await pool.query('UPDATE users SET active=$1 WHERE id=$2', [true, 42])
console.log(res.rowCount) // 1（受影响行数）
console.log(res.command)  // 'UPDATE'
console.log(res.fields.map(f => f.name)) // ['id','name',...]
```

### 5.5 取单行 / 单值的封装函数

实战常需要「只取一行」或「只取一个值」的便捷封装：

```js
// 取单行（无结果返回 null）
async function getRow(text, values) {
  const res = await pool.query(text, values)
  return res.rows[0] ?? null
}

// 取单个值（如 COUNT / 自增 id）
async function getValue(text, values) {
  const res = await pool.query(text, values)
  const first = res.rows[0]
  return first ? Object.values(first)[0] : null
}

const user = await getRow('SELECT * FROM users WHERE id=$1', [42])
const count = await getValue('SELECT COUNT(*) FROM users')
console.log(user, count)
```

---

## 6. 增 / 改 / 删（INSERT / UPDATE / DELETE）

PostgreSQL 强烈建议用 **`RETURNING`** 把刚插入/更新/删除的行返回，省去再查一次。

### 6.1 INSERT + RETURNING

```js
const res = await pool.query(
  'INSERT INTO users(name, email) VALUES($1, $2) RETURNING id, name, created_at',
  ['bob', 'bob@example.com']
)
console.log(res.rows[0]) // { id: 7, name: 'bob', created_at: ... }
```

### 6.2 UPDATE + RETURNING

```js
const res = await pool.query(
  'UPDATE users SET name=$1 WHERE id=$2 RETURNING id, name',
  ['bobby', 7]
)
if (res.rowCount === 0) throw new Error('用户不存在')
console.log(res.rows[0])
```

### 6.3 DELETE + RETURNING

```js
const res = await pool.query(
  'DELETE FROM users WHERE id=$1 RETURNING id',
  [7]
)
console.log('已删除', res.rowCount, '行')
```

### 6.4 插入「现在时间」/ 默认值

```js
// 让数据库填默认值（如 created_at 默认 now()），参数只传其余列
await pool.query(
  'INSERT INTO users(name) VALUES($1) RETURNING id, created_at',
  ['carol']
)
```

---

## 7. 事务（Transaction）

事务保证「多步操作要么全成功、要么全回滚」。**关键规则：事务内所有语句必须用 `pool.connect()` 借出的同一条 `client`，结束时 `release()` 归还。**

### 7.1 手写事务（BEGIN / COMMIT / ROLLBACK）

```js
const client = await pool.connect() // 借出一条专属于本次事务的连接
try {
  await client.query('BEGIN')
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id=$2', [100, 1])
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE id=$2', [100, 2])
  await client.query('COMMIT')
} catch (err) {
  await client.query('ROLLBACK') // 任一失败全部回滚
  throw err
} finally {
  client.release() // 必须归还，否则连接泄漏！
}
```

### 7.2 可复用的事务封装（回调式）

把样板代码封成工具函数，业务只写「在事务里做什么」：

```js
// withTransaction: 自动 BEGIN/COMMIT/ROLLBACK/release
async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client) // 业务回调，用传入的 client 执行
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// 用法：转账
const ok = await withTransaction(async (client) => {
  await client.query('UPDATE accounts SET balance=balance-$1 WHERE id=$2', [100, 1])
  await client.query('UPDATE accounts SET balance=balance+$1 WHERE id=$2', [100, 2])
  return true
})
```

> ⚠️ 常见坑：事务里又去调 `pool.query(...)`（而不是手里的 `client`）——这会用到**另一条连接**，事务直接失效。务必在回调里只用传入的 `client`。

---

## 8. 连接池配置与监控

### 8.1 构造选项

`new Pool({...})` 常用选项：

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `max` | `10` | 池中最大连接数（含使用中+空闲）。高并发调大，但要 ≤ 数据库 `max_connections` |
| `idleTimeoutMillis` | `10000` | 空闲连接多久（ms）后被回收 |
| `connectionTimeoutMillis` | `0`（无限） | 借连接超时（ms），超时抛错而非一直等 |
| `allowExitOnIdle` | `false` | `true` 时空闲池不阻止进程退出（无需手动 `pool.end()`） |
| `keepAlive` | `true` | 保活 TCP，避免中间件断连 |
| `statement_timeout` | 无 | 单条语句超时（ms），服务端中断慢查询 |
| `query_timeout` | 无 | 客户端等待查询超时（ms） |
| `application_name` | 无 | 在 `pg_stat_activity` 里标识你的应用，便于排查 |
| `maxUses` | 无 | 每条连接复用多少次后强制换新（防长连接内存泄漏） |

```js
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  allowExitOnIdle: true,
  application_name: 'abert-blog-api',
  statement_timeout: 5000,
})
```

### 8.2 监控池状态与错误

```js
// 实时监控（压测/排查连接不足时很关键）
setInterval(() => {
  console.log({
    total: pool.totalCount,     // 池创建过的总连接数
    idle: pool.idleCount,       // 当前空闲
    waiting: pool.waitingCount, // 因无空闲连接而在排队等待的请求数
  })
}, 1000)

// 捕获池中连接上的「意外错误」（不处理会导致进程崩溃）
pool.on('error', (err) => {
  console.error('池连接异常（空闲连接出错）:', err.message)
})
```

> `waitingCount` 持续 > 0 说明 **连接不够用**——要么调大 `max`，要么有连接泄漏（事务忘了 `release`、查询忘了 await）。

---

## 9. 批量操作

### 9.1 一次插入多行

```js
// 用 UNNEST 或 VALUES 多行；占位符按顺序编号
const users = [['a','a@x.com'], ['b','b@x.com'], ['c','c@x.com']]
const text = `
  INSERT INTO users(name, email)
  VALUES ($1,$2),($3,$4),($5,$6)
  RETURNING id`
const flat = users.flat()
const res = await pool.query(text, flat)
console.log('插入', res.rowCount, '行')
```

更通用的动态多行（用 `generate_series` 或程序拼占位）：

```js
// 用 Postgres 数组 + UNNEST，参数数量与行数解耦（推荐大批量）
const names = ['a', 'b', 'c']
const emails = ['a@x.com', 'b@x.com', 'c@x.com']
const res = await pool.query(
  `INSERT INTO users(name, email)
   SELECT * FROM UNNEST($1::text[], $2::text[])`,
  [names, emails]
)
```

### 9.2 批量 UPDATE（按条件分别更新）

```js
// 用 UPDATE ... FROM (VALUES) 一次更新多行不同值
await pool.query(`
  UPDATE users AS u SET name = v.name
  FROM (VALUES (1,'new-a'),(2,'new-b')) AS v(id, name)
  WHERE u.id = v.id::int`)
```

---

## 10. 数据类型与类型解析

### 10.1 常见类型自动转换

`pg` 内置类型解析（`pg-types`），常见映射：

| Postgres 类型 | JS 收到的值 |
|---------------|-------------|
| `int2/int4` | `number` |
| `int8`（bigint） | `string`（避免精度丢失，需手动 `BigInt()`） |
| `float4/float8/numeric` | `number` / `string`（numeric 默认 string，见 10.3） |
| `bool` | `boolean` |
| `text/varchar` | `string` |
| `json/jsonb` | 已 `JSON.parse` 的对象 |
| `date/timestamp` | `Date`（本地时区） |
| `bytea` | `Buffer` |

### 10.2 自定义解析（`pg.types`）

```js
import pg from 'pg'
const { types } = pg

// 把 TIMESTAMP 当成字符串而非 Date（避免时区转换）
types.setTypeParser(types.builtins.TIMESTAMP, (val) => val)

// 把 NUMERIC 转成 number（小金额可接受；大金额慎用，可能丢精度）
types.setTypeParser(types.builtins.NUMERIC, (val) => parseFloat(val))

// 也可按 OID 设置：OID 23 = int4
types.setTypeParser(23, (val) => parseInt(val, 10))
```

> 常见内置类型 OID：`BOOL=16`、`INT8=20`、`INT2=21`、`INT4=23`、`TEXT=25`、`FLOAT4=700`、`FLOAT8=701`、`NUMERIC=1700`、`DATE=1082`、`TIMESTAMP=1114`、`JSON=114`、`JSONB=3802`。

### 10.3 数组与 JSON 参数

```js
// 传数组 → 自动转 Postgres 数组
await pool.query('SELECT * FROM tags WHERE id = ANY($1)', [[1,2,3]])

// 传对象 → 自动 JSON.stringify 写入 jsonb/json 列
await pool.query('INSERT INTO profiles(data) VALUES($1)', [{ age: 30, vip: true }])
```

---

## 11. 监听与通知 LISTEN / NOTIFY

PostgreSQL 原生支持进程间实时消息。`pg` 通过 `Client`（注意：**LISTEN 要用独立 `Client`，别用 Pool 共用**）接收：

```js
import { Client } from 'pg'
const client = new Client()
await client.connect()

// 订阅通道
await client.query('LISTEN my_channel')

// 收到通知事件
client.on('notification', (msg) => {
  console.log('通道:', msg.channel)      // 'my_channel'
  console.log('载荷:', msg.payload)      // 任意字符串（JSON 自行解析）
  console.log('进程pid:', msg.processId)
})

// 在另一个连接/服务里发通知：
// await pool.query("NOTIFY my_channel, 'hello'")
// 或带 JSON 载荷：NOTIFY my_channel, '{"type":"order_created","id":9}'
```

> 用途：缓存失效广播、任务队列信号、跨服务轻量事件。复杂场景建议改用 Redis Pub/Sub 或消息队列。

---

## 12. 游标与流式查询

当结果集巨大（几十万行），一次性 `rows` 会爆内存。用 **游标** 分批读，或用 **流式** 边读边处理。

### 12.1 游标（pg-cursor）

```bash
npm install pg-cursor
```

```js
import Cursor from 'pg-cursor'
const client = await pool.connect()

const cursor = client.query(new Cursor('SELECT * FROM huge_table'))
const readBatch = () =>
  new Promise((resolve, reject) => {
    cursor.read(1000, (err, rows) => (err ? reject(err) : resolve(rows)))
  })

let rows
while ((rows = await readBatch()).length > 0) {
  console.log('处理一批', rows.length)
  // ... 逐批处理
}
client.release()
```

### 12.2 流式（pg-query-stream）

```bash
npm install pg-query-stream
```

```js
import QueryStream from 'pg-query-stream'
import { pipeline } from 'stream/promises'
import { Writable } from 'stream'

const qs = new QueryStream('SELECT * FROM huge_table')
const stream = pool.query(qs) // 返回可读流

await pipeline(
  stream,
  new Writable({
    objectMode: true,
    write(row, enc, cb) {
      // 逐行处理
      console.log(row.id)
      cb()
    },
  })
)
```

---

## 13. 大批量导入导出 COPY

百万行导入导出用 `COPY` 最快，配合 `pg-copy-streams` 走流：

```bash
npm install pg-copy-streams
```

```js
import copyFrom from 'pg-copy-streams' // 实际包名 pg-copy-streams
import fs from 'fs'

// 从 CSV 文件高速导入到表
const client = await pool.connect()
const ingest = client.query(
  copyFrom.from('COPY users(name,email) FROM STDIN WITH (FORMAT csv)')
)
const fileStream = fs.createReadStream('/tmp/users.csv')
fileStream.pipe(ingest)
await new Promise((res, rej) => {
  ingest.on('finish', res)
  ingest.on('error', rej)
})
client.release()

// 导出：COPY ... TO STDOUT 反向 pipe 到写文件流
```

> 比逐行 `INSERT` 快一个数量级，适合数据迁移、初始灌数。

---

## 14. 错误处理

`pg` 抛出的错误是标准 `Error`，带 Postgres 错误码（`err.code`，遵循 [SQLSTATE](https://www.postgresql.org/docs/current/errcodes-appendix.html)）：

| 错误码 | 含义 | 典型处理 |
|--------|------|----------|
| `23505` | 唯一约束冲突（duplicate key） | 提示「已存在」，做幂等/去重 |
| `23503` | 外键约束冲突（foreign_key_violation） | 提示「关联对象不存在」 |
| `23502` | 非空约束冲突（not_null_violation） | 校验入参 |
| `23514` | 检查约束冲突（check_constraint） | 校验业务规则 |
| `42703` | 列不存在（undefined_column） | 排查 SQL/迁移 |
| `42P01` | 表不存在（undefined_table） | 跑迁移 |
| `42P04` | 数据库已存在（duplicate_database） | 建库前判断 |
| `08006` / `08001` | 连接失败（connection failure） | 重试 / 检查网络与凭证 |
| `57P01` | 管理员终止连接 | 重连 |
| `57014` | 查询被 `statement_timeout` 取消 | 优化慢查询 |
| `53300` | 连接数过多（too_many_connections） | 调大 `max` 或降并发 |

```js
import { Pool } from 'pg'
const pool = new Pool()

try {
  await pool.query(
    'INSERT INTO users(email) VALUES($1)',
    ['exists@example.com'] // 假设 email 唯一
  )
} catch (err) {
  console.error('SQLSTATE:', err.code)   // 如 '23505'
  console.error('消息:', err.message)
  console.error('详情:', err.detail)     // 如 'Key (email)=(...) already exists.'
  console.error('约束:', err.constraint) // 如 'users_email_key'

  if (err.code === '23505') {
    // 业务处理：已存在
  }
}
```

简单重试封装（应对瞬时连接错误）：

```js
async function queryWithRetry(text, values, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      return await pool.query(text, values)
    } catch (err) {
      if (['08006', '08001', '57P01', '53300'].includes(err.code) && i < tries - 1) {
        await new Promise((r) => setTimeout(r, 200 * (i + 1))) // 退避
        continue
      }
      throw err
    }
  }
}
```

---

## 15. 建表与迁移

### 15.1 建表示例（在代码里跑一次）

```js
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL,
      email     TEXT NOT NULL UNIQUE,
      active    BOOLEAN NOT NULL DEFAULT true,
      data      JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `)
  console.log('schema ready')
}
```

### 15.2 迁移建议

`pg` 本身不含迁移工具（保持轻量）。可选：
- **手写 SQL 文件 + 上面的 `initSchema` 风格**（小项目足够）
- **`node-pg-migrate`**：基于 `pg` 的迁移器，命令式管理 up/down
- **ORM 自带**：Prisma Migrate / TypeORM migration

> 生产环境务必用带版本号、可回滚的迁移工具，不要每次启动 `CREATE TABLE IF NOT EXISTS` 硬扛结构变更。

---

## 16. 安全最佳实践

1. **永远参数化**：用 `$1/$2` + 数组，绝不字符串拼接用户输入（防 SQL 注入）。
2. **动态标识符用 `pg-format`**：表名/列名无法参数化，必须经 `pg-format` 转义。
3. **数据库账号最小权限**：应用连接账号只给 `SELECT/INSERT/UPDATE/DELETE`，不给 `SUPERUSER`、不给 `DROP`。
4. **凭证放环境变量 / 密钥管理**：绝不上车代码或提交到 Git。
5. **云库务必开 SSL**：`ssl: { rejectUnauthorized: false }` 或带 CA。
6. **事务必须 `release()`**：`pool.connect()` 借出的 client 用完一定 `release()`，否则连接泄漏→池耗尽。
7. **设 `statement_timeout`**：防慢查询拖垮连接。
8. **用 `Pool` 而非裸 `Client`** 跑 Web 服务，避免每条请求新建连接。
9. **捕获 `pool.on('error')`**：空闲连接异常不处理会导致进程退出。
10. **大结果集用游标/流式**（§12），别一次性 `rows` 拉全表。
11. **bigint / numeric 注意精度**：默认 `string`，按需 `BigInt()` 或在查询里 `::numeric` 时小心。
12. **`allowExitOnIdle: true`**（Node 14+）：常驻服务优雅退出时不必手动 `pool.end()`。

---

## 17. ORM / 查询构建器速览（选型参考）

`pg` 是底座，下面都是它的"上层糖衣"，按抽象程度由低到高：

| 工具 | 抽象度 | 一句话 | 片段 |
|------|--------|--------|------|
| **`pg-promise`** | 低 | 在 `pg` 上封装 Promise/事务/批量，仍手写 SQL | `db.one('SELECT * FROM users WHERE id=$1',[1])` |
| **`knex`** | 中 | 链式 SQL 构建器，跨数据库，自带迁移 | `knex('users').where({id:1}).first()` |
| **`slonik`** | 中 | 类型安全、防注入的 `pg` 封装，强调正确性 | `sql\`SELECT * FROM users WHERE id = ${id}\`` |
| **`Prisma`** | 高 | Schema 即模型，自动迁移 + 类型生成 | `prisma.user.findUnique({where:{id:1}})` |
| **`TypeORM`** | 高 | 装饰器定义实体，ActiveRecord/DataMapper 双模式 | `repo.findOneBy({id:1})` |

```js
// Prisma 示例（对比 §5 的 pg 写法）
// schema.prisma: model User { id Int @id @default(autoincrement()) name String email String @unique }
const user = await prisma.user.create({ data: { name: 'alice', email: 'a@x.com' } })

// Knex 示例
const rows = await knex('users').where('active', true).orderBy('created_at', 'desc').limit(10)
```

> 选型直觉：想完全掌控 SQL 与性能 → `pg` / `pg-promise` / `slonik`；模型驱动、要迁移与类型 → `Prisma` / `TypeORM`；跨库兼容 → `knex`。

---

## 18. 综合实战：用户模块 CRUD + 事务转账

整合上文要点，一个可照搬的小模块：

```js
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // 凭证放环境变量
  max: 10,
  allowExitOnIdle: true,
  application_name: 'demo',
})

// —— 查询封装 ——
const getRow = (text, values) => pool.query(text, values).then((r) => r.rows[0] ?? null)
const getValue = (text, values) =>
  pool.query(text, values).then((r) => (r.rows[0] ? Object.values(r.rows[0])[0] : null))

// —— CRUD ——
async function createUser(name, email) {
  return getRow(
    'INSERT INTO users(name, email) VALUES($1,$2) RETURNING id, name, email, created_at',
    [name, email]
  )
}
async function getUser(id) {
  return getRow('SELECT id, name, email, active FROM users WHERE id=$1', [id])
}
async function updateUser(id, name) {
  return getRow('UPDATE users SET name=$1 WHERE id=$2 RETURNING id, name', [name, id])
}
async function deleteUser(id) {
  const r = await pool.query('DELETE FROM users WHERE id=$1 RETURNING id', [id])
  return r.rowCount // 受影响行数
}

// —— 事务：账户转账（保证原子性）——
async function transfer(fromId, toId, amount) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const from = await client.query('SELECT balance FROM accounts WHERE id=$1 FOR UPDATE', [fromId])
    if (from.rows[0].balance < amount) throw new Error('余额不足')
    await client.query('UPDATE accounts SET balance=balance-$1 WHERE id=$2', [amount, fromId])
    await client.query('UPDATE accounts SET balance=balance+$1 WHERE id=$2', [amount, toId])
    await client.query('COMMIT')
    return true
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release() // 关键：归还连接
  }
}

// —— 使用 ——
// await createUser('alice', 'alice@example.com')
// await transfer(1, 2, 100)
```

> 注意 `FOR UPDATE`：转账里先锁住行（`SELECT ... FOR UPDATE`），防止并发两个转账同时读到旧余额导致超扣——这是真实金融场景的必备细节。

---

## 19. 参考文档

> 本文方法签名与默认行为以 `pg` 8.x 官方文档为准；以下是权威入口（均为可点击链接）。

### 19.1 官方与包

- **node-postgres 官方文档（连接/查询/类型/事务/SSL/游标/通知）**：[https://node-postgres.com](https://node-postgres.com)
- **`pg` npm 包（最新版 8.23.x）**：[https://www.npmjs.com/package/pg](https://www.npmjs.com/package/pg)
- **node-postgres GitHub 源码**：[https://github.com/brianc/node-postgres](https://github.com/brianc/node-postgres)
- **`@types/pg`（TypeScript 类型声明）**：[https://www.npmjs.com/package/@types/pg](https://www.npmjs.com/package/@types/pg)

### 19.2 分主题参考

- **连接（环境变量 / 配置项 / URI / SSL / 动态密码）**：[Connecting](https://node-postgres.com/features/connecting)
- **查询（参数化 / 配置对象 / 预备语句 / 行模式 / 类型）**：[Queries](https://node-postgres.com/features/queries)
- **连接池**：[Pooling](https://node-postgres.com/features/pooling)
- **事务**：[Transactions](https://node-postgres.com/features/transactions)
- **数据类型解析**：[Types API](https://node-postgres.com/apis/types)
- **异步通知 LISTEN/NOTIFY**：[Async Notifications](https://node-postgres.com/features/async-notifications)
- **游标（pg-cursor）**：[https://github.com/brianc/node-postgres/tree/master/packages/pg-cursor](https://github.com/brianc/node-postgres/tree/master/packages/pg-cursor)
- **流式（pg-query-stream）**：[https://github.com/brianc/node-postgres/tree/master/packages/pg-query-stream](https://github.com/brianc/node-postgres/tree/master/packages/pg-query-stream)
- **迁移工具 node-pg-migrate**：[https://www.npmjs.com/package/node-pg-migrate](https://www.npmjs.com/package/node-pg-migrate)
- **动态标识符转义 pg-format**：[https://www.npmjs.com/package/pg-format](https://www.npmjs.com/package/pg-format)

### 19.3 延伸（PostgreSQL 本体）

- **PostgreSQL 官方文档**：[https://www.postgresql.org/docs](https://www.postgresql.org/docs)
- **SQLSTATE 错误码表**：[https://www.postgresql.org/docs/current/errcodes-appendix.html](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- **libpq 环境变量**：[https://www.postgresql.org/docs/current/libpq-envars.html](https://www.postgresql.org/docs/current/libpq-envars.html)

> 说明：以上均为官方/权威域名。`pg` 8.x API 长期稳定，但若升级到跨大版本，请以官方文档最新说明为准。
