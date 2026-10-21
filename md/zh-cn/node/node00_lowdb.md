---
title: lowdb
create:2026-10-21
update:2026-10-21
category:node
tags:[node,database,json,storage,local]
summary: Node 使用 lowdb 本地 JSON 数据库的学习文档，覆盖 v1 与 v3 两套 API、适配器、CRUD 实战与最佳实践
keywords:[node,lowdb,json,database,storage,local]
top:1
copyright:true
---

# Node 使用 lowdb 学习文档

> 本文档面向已掌握 Node.js 基础的开发者，系统讲解如何使用 **lowdb** 作为本地 JSON 数据库。
> 接口尽量齐全、示例均可直接运行。

---

## 目录

1. [lowdb 是什么](#1-lowdb-是什么)
2. [版本演进：v1 与 v3 的重大差异](#2-版本演进v1-与-v3-的重大差异)
3. [环境准备与安装](#3-环境准备与安装)
4. [v3 核心 API（最新，ESM）](#4-v3-核心-api最新esm)
5. [v3 适配器（Adapters）](#5-v3-适配器adapters)
6. [v1 核心 API（老版，CommonJS，仍广泛使用）](#6-v1-核心-api老版commonjs仍广泛使用)
7. [v1 适配器](#7-v1-适配器)
8. [CRUD 实战（以 users 集合为例）](#8-crud-实战以-users-集合为例)
9. [高级查询：链式（lodash）操作](#9-高级查询链式lodash操作)
10. [默认值与初始化](#10-默认值与初始化)
11. [TypeScript 支持](#11-typescript-支持)
12. [浏览器 / React Native / Electron 用法](#12-浏览器--react-native--electron-用法)
13. [自定义适配器](#13-自定义适配器)
14. [并发、原子写入与数据安全](#14-并发原子写入与数据安全)
15. [与同类方案对比](#15-与同类方案对比)
16. [常见坑与最佳实践](#16-常见坑与最佳实践)
17. [完整可运行示例](#17-完整可运行示例)

---

## 1. lowdb 是什么

**lowdb 是一个极小的本地 JSON 数据库**，把数据以 `.json` 文件形式持久化到磁盘，用类似 Lodash 的链式 API 读写。它和 PostgreSQL / MongoDB 不同——**没有服务端、没有查询语言、单文件存储**，专为以下场景设计：

- CLI 工具、桌面应用（Electron）、原型 / demo
- 配置存储、小型本地数据（待办、书签、缓存）
- 需要「开箱即用、零依赖、零配置」的本地持久化

**一句话定位**：lowdb = 把 JS 对象存进 JSON 文件，并给你 Lodash 风格的方法去操作它。

> ⚠️ **不适合**：高并发 Web 服务、需要索引/事务/多进程写入的生产数据库。这类场景请用 SQLite（`better-sqlite3`）或真正的数据库。

---

## 2. 版本演进：v1 与 v3 的重大差异

| 维度 | v1.x | v2.x / v3.x（当前） |
|---|---|---|
| 模块格式 | CommonJS | **ESM only**（需 `type: module`） |
| 引入方式 | `const low = require('lowdb')` | `import { Low } from 'lowdb'` |
| 数据操作 | `db.get().push().write()`（内置 lodash） | 直接改 `db.data` 对象 + `db.write()` |
| 适配器 | `low(new FileSync(...))` | `new Low(new JSONFile(...), default)` |
| 链式查询 | 内置 `db._.chain()` | 用 `lodash` + `db.chain()` 自行组合 |
| Node 要求 | ≥ 8 | v3 需 Node ≥ 18（ESM） |
| 维护状态 | 已归档，但大量存量项目在用 | 官方推荐 |

> **本文同时覆盖 v1 与 v3**，因为很多老项目/教程仍是 v1 写法。新项目请用 v3。

---

## 3. 环境准备与安装

```bash
# 最新版（v3，ESM）
pnpm add lowdb

# 老版（v1，CommonJS，仍想用旧 API 时）
pnpm add lowdb@1
```

Node 版本建议：

- v3：Node ≥ 18（ESM 原生支持）
- v1：Node ≥ 8 即可

```json
// package.json（使用 v3 必须）
{
  "type": "module"
}
```

---

## 4. v3 核心 API（最新，ESM）

v3 的设计更「显式」：**你直接操作 `db.data` 这个普通 JS 对象，改完调用 `db.write()` 落盘**。

```js
// db.mjs
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// 1. 创建适配器（指定 JSON 文件路径）
const adapter = new JSONFile('db.json')

// 2. 创建数据库实例，并传入默认值
const defaultData = { posts: [], user: {} }
const db = new Low(adapter, defaultData)

// 3. 启动时先读取（异步！必须 await）
await db.read()

// 4. 直接操作 db.data（就是一个普通对象）
db.data.posts.push({ id: 1, title: 'Hello' })

// 5. 改完写入磁盘
await db.write()
```

### Low 实例的 API 一览

| 成员 | 类型 | 说明 |
|---|---|---|
| `db.data` | `T` | 内存中的完整数据对象（直接读写） |
| `db.read()` | `Promise<void>` | 从适配器读取数据到 `db.data`（若不存在则使用默认值） |
| `db.write()` | `Promise<void>` | 将 `db.data` 写入适配器（磁盘/存储） |
| `db.chain()` | `lodash chain` | 返回 Lodash 链式包装，便于做筛选/排序（v3 自动用 lodash-es） |

### 使用 `db.chain()` 做查询

```js
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const db = new Low(new JSONFile('db.json'), { users: [] })
await db.read()

// 链式查询（返回的是 lodash 包装，用 .value() 取值）
const activeUsers = db.chain()
  .get('users')
  .filter(u => u.active)
  .sortBy('age')
  .value()

console.log(activeUsers)
```

> ⚠️ `db.chain()` 只读，不会自动写盘；若要持久化变更，仍需 `await db.write()`。

### Memory 适配器（不落盘，用于测试 / 临时）

```js
import { Low } from 'lowdb'
import { Memory } from 'lowdb'

const db = new Low(new Memory(), { count: 0 })
db.data.count++
// 不调用 db.write()，数据只存在于内存
```

---

## 5. v3 适配器（Adapters）

v3 把「数据从哪来」抽象成适配器，内置两种：

| 适配器 | 引入 | 用途 |
|---|---|---|
| `JSONFile` | `lowdb/node` | 异步读写 JSON 文件（**生产推荐**） |
| `Memory` | `lowdb` | 纯内存，不持久化 |

```js
import { JSONFile } from 'lowdb/node'
import { Memory } from 'lowdb'

new JSONFile('db.json') // 异步，性能好
new Memory()             // 内存
```

**同步版本 `JSONFileSync`**（需要同步阻塞 I/O 时）：

```js
import { LowSync } from 'lowdb'
import { JSONFileSync } from 'lowdb/node'

const db = new LowSync(new JSONFileSync('db.json'), { todos: [] })
db.read()       // 同步
db.data.todos.push({ id: 1, text: '买菜' })
db.write()      // 同步
```

---

## 6. v1 核心 API（老版，CommonJS，仍广泛使用）

v1 把 Lodash 深度集成：你通过 `db.get()` 拿到 lodash wrapper，调 lodash 方法后必须用 `.write()` 落盘。

```js
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

// 1. 创建适配器
const adapter = new FileSync('db.json')

// 2. 创建数据库（传入默认结构）
const db = low(adapter)

// 3. 设置/确保默认数据（lodash.set + write）
db.defaults({ posts: [], user: {}, count: 0 })
  .write()
```

### 增删改查（v1 写法）

```js
// 读取
db.get('posts').value()            // 取全部
db.get('posts').find({ id: 1 }).value()
db.get('user.name').value()        // 深层路径

// 新增
db.get('posts')
  .push({ id: 1, title: 'lowdb' })
  .write()                          // ⚠️ 必须 .write() 落盘

// 更新
db.get('posts')
  .find({ id: 1 })
  .assign({ title: 'updated' })
  .write()

db.set('user.name', 'Alice').write()

// 删除
db.get('posts')
  .remove({ id: 1 })
  .write()

// 清空集合
db.get('posts').remove().write()
```

### v1 关键 API 总览

| 方法 | 说明 |
|---|---|
| `db.get(path)` | 返回 lodash wrapper（可链式） |
| `db.set(path, value)` | 设置路径值 |
| `db.has(path)` | 判断路径是否存在 |
| `db.defaults(obj)` | 设置默认值（不存在的键才写入） |
| `db.read()` | 读取文件 |
| `db.write()` | 写入文件 |
| `db._` | 底层 lodash 实例 |
| `db.chain()` | 返回 lodash 链式包装 |

> ⚠️ **v1 的坑**：所有「会修改数据」的操作**必须以 `.write()` 结尾**才会落盘；只读操作用 `.value()` 取值。漏写 `.write()` 是新手最常犯的错误。

---

## 7. v1 适配器

```js
const FileSync = require('lowdb/adapters/FileSync')
const FileAsync = require('lowdb/adapters/FileAsync')
const Memory = require('lowdb/adapters/Memory')

new FileSync('db.json')    // 同步文件（默认）
new FileAsync('db.json')   // 异步文件（返回 Promise 的适配器）
new Memory()                // 内存
```

```js
// 异步适配器用法
const FileAsync = require('lowdb/adapters/FileAsync')
const db = low(new FileAsync('db.json'))

await db.defaults({ posts: [] }).write()
await db.get('posts').push({ id: 1 }).write()
```

---

## 8. CRUD 实战（以 users 集合为例）

下面用 **v3** 写一个完整的用户增删改查，体现「改 `db.data` + `db.write()`」范式。

```js
// users.mjs
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const db = new Low(new JSONFile('users.json'), { users: [] })

async function main() {
  await db.read()

  // Create
  db.data.users.push({ id: 1, name: 'Alice', age: 30, active: true })
  await db.write()

  // Read
  const all = db.data.users
  const one = db.data.users.find(u => u.id === 1)
  console.log(all, one)

  // Update
  const user = db.data.users.find(u => u.id === 1)
  if (user) user.age = 31
  await db.write()

  // Delete
  db.data.users = db.data.users.filter(u => u.id !== 1)
  await db.write()
}

main()
```

**v1 等价写法**：

```js
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const db = low(new FileSync('users.json'))
db.defaults({ users: [] }).write()

// Create
db.get('users').push({ id: 1, name: 'Alice', age: 30 }).write()
// Read
const one = db.get('users').find({ id: 1 }).value()
// Update
db.get('users').find({ id: 1 }).assign({ age: 31 }).write()
// Delete
db.get('users').remove({ id: 1 }).write()
```

---

## 9. 高级查询：链式（lodash）操作

无论是 v1 还是 v3，复杂查询都用 Lodash 方法（`.chain()` / `db._`）。

```js
// v3
import _ from 'lodash'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const db = new Low(new JSONFile('db.json'), { users: [] })
await db.read()

// 筛选 + 排序 + 分页
const result = _(db.data.users)
  .filter(u => u.age >= 18)
  .orderBy(['age'], ['desc'])
  .slice(0, 10)
  .value()

// 聚合
const avgAge = _.meanBy(db.data.users, 'age')
const groupByCity = _.groupBy(db.data.users, 'city')

// 用 db.chain()（v3 内置）
const top3 = db.chain()
  .get('users')
  .orderBy('score', 'desc')
  .take(3)
  .value()
```

```js
// v1：直接 db 上就是 lodash wrapper
db.get('users')
  .filter(u => u.age >= 18)
  .orderBy('age', 'desc')
  .take(10)
  .value()
```

常用 Lodash 方法：`filter` / `find` / `orderBy` / `sortBy` / `groupBy` / `map` / `uniqBy` / `sumBy` / `meanBy` / `take` / `drop` / `size`。

---

## 10. 默认值与初始化

```js
// v3：构造函数第二参即默认数据
const db = new Low(new JSONFile('db.json'), {
  users: [],
  settings: { theme: 'dark', lang: 'zh' },
  meta: { createdAt: new Date().toISOString() },
})

// 首次 read 若文件不存在，db.data 即为默认值
await db.read()

// 若想确保某些键一定存在（补充式）
if (!db.data.settings) {
  db.data.settings = { theme: 'dark' }
  await db.write()
}
```

```js
// v1：用 .defaults() 一次性兜底
db.defaults({
  users: [],
  settings: { theme: 'dark', lang: 'zh' },
}).write()
```

---

## 11. TypeScript 支持

lowdb 自带类型，配合泛型可获得完整类型提示。

```ts
// db.ts
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

interface User {
  id: number
  name: string
  age: number
}

interface DbSchema {
  users: User[]
  settings: { theme: string }
}

const adapter = new JSONFile<DbSchema>('db.json')
const db = new Low<DbSchema>(adapter, { users: [], settings: { theme: 'dark' } })

await db.read()
db.data.users.push({ id: 1, name: 'Alice', age: 30 }) // 有类型检查
await db.write()
```

> ⚠️ 若使用 `db.chain()`，其返回的是 `lodash-es` 的链式类型；复杂查询建议直接用 `lodash` 包操作 `db.data`。

---

## 12. 浏览器 / React Native / Electron 用法

lowdb 的 `db.data` 是普通对象，故可配合任意存储后端。

### 浏览器（localStorage 适配器）

```js
// 需自行实现适配器，或用第三方封装
import { Low } from 'lowdb'
import { LocalStorage } from 'lowdb/browser'  // 部分版本提供

const adapter = new LocalStorage('db')
const db = new Low(adapter, { todos: [] })
await db.read()
db.data.todos.push({ id: Date.now(), text: '学习 lowdb' })
await db.write()
```

### React Native（AsyncStorage 适配器）

```bash
pnpm add @react-native-async-storage/async-storage
```

```js
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Low } from 'lowdb'
import { TextFile } from 'lowdb/node' // 或用社区 async-storage 适配器

// 社区常用方案：封装一个 AsyncStorage 适配器
class AsyncStorageAdapter {
  constructor(key) { this.key = key }
  async read() {
    const data = await AsyncStorage.getItem(this.key)
    return data ? JSON.parse(data) : null
  }
  async write(data) {
    await AsyncStorage.setItem(this.key, JSON.stringify(data))
  }
}

const db = new Low(new AsyncStorageAdapter('app-db'), { notes: [] })
await db.read()
```

### Electron（主进程用 JSONFile 即可）

```js
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { app } from 'electron'

const path = require('path')
const db = new Low(
  new JSONFile(path.join(app.getPath('userData'), 'db.json')),
  { pref: {} }
)
await db.read()
```

---

## 13. 自定义适配器

适配器只需实现 `read()` 与 `write(data)` 两个异步方法，即可对接任意存储。

```js
// 自定义：把数据存到环境变量 / 任意后端
class CustomAdapter {
  constructor(key) { this.key = key }

  async read() {
    // 返回解析后的对象，或 null（表示用默认值）
    const raw = await someStore.get(this.key)
    return raw ? JSON.parse(raw) : null
  }

  async write(data) {
    // 接收 db.data，自行序列化存储
    await someStore.set(this.key, JSON.stringify(data))
  }
}

const db = new Low(new CustomAdapter('my-key'), { items: [] })
await db.read()
```

---

## 14. 并发、原子写入与数据安全

lowdb **不是为并发设计的**，这是它的核心限制：

- **单进程、串行写入**：同一时间多个 `db.write()` 会相互覆盖。务必 `await` 前一个完成再下一次写入。
- **多进程 / 多实例**：每个进程有各自的内存副本，写盘会丢数据。不要在多 worker（如 cluster）间共享同一 JSON 文件。
- **写中断风险**：`db.write()` 是「读-改-写整文件」。若进程在写盘中途崩溃，文件可能损坏（推荐定期备份）。
- **大规模数据**：数据会全部载入内存，JSON 文件过大（>几 MB）时读写变慢。

```js
// 安全写法：串行化所有写操作
let writing = Promise.resolve()

function safeWrite(db, mutator) {
  writing = writing.then(async () => {
    mutator(db.data)
    await db.write()
  })
  return writing
}

await safeWrite(db, d => d.users.push({ id: 2 }))
await safeWrite(db, d => d.users.push({ id: 3 }))
```

> 若你的场景需要并发安全 + 高性能，直接换 **SQLite**（`better-sqlite3`）或 **nedb**。

---

## 15. 与同类方案对比

| 方案 | 存储 | 优点 | 缺点 |
|---|---|---|---|
| **lowdb** | JSON 文件 | 零配置、API 直观、超轻量 | 无并发、无索引、全量内存 |
| **better-sqlite3** | SQLite 文件 | 同步、极快、支持 SQL/索引/事务 | API 偏底层 |
| **nedb** | 文件/内存 | 支持索引、查询、自动加载 | 单文件、已基本停止维护 |
| **leveldb (level)** | KV 引擎 | 高性能 KV | 无结构化查询 |
| **real DB（PG/Mongo）** | 服务端 | 并发、索引、事务 | 需部署、依赖重 |

**选型建议**：
- 本地配置 / 小型 CLI / demo → **lowdb**
- 需要 SQL 能力但不想起服务 → **better-sqlite3**
- 多进程 Web 服务 → **PostgreSQL / MongoDB**（见 `node11_postgre.md`）

---

## 16. 常见坑与最佳实践

1. **v3 必须 `await db.read()` 再读**：否则 `db.data` 是默认值/空，不报错但数据读不到。
2. **改完必须 `db.write()`**：v3 不会自动落盘；v1 必须 `.write()` 结尾。
3. **v3 是 ESM only**：项目 `package.json` 必须 `"type": "module"`，否则 `import` 报错。想用 CommonJS 就装 `lowdb@1`。
4. **`.write()` 是异步的**：务必 `await`，否则后续逻辑可能在落盘前读到旧数据。
5. **不要多进程共享同一 JSON 文件**：会丢数据，改 SQLite。
6. **默认值要在 `new Low(..., default)` 传入**（v3）或用 `.defaults()`（v1）。
7. **`db.data` 是引用**：直接 push/赋值后写盘即可，不要重新 `db.data = {...}` 覆盖整块（除非你确实要替换）。
8. **JSON 不支持 Date / Map / Set / 函数**：存前转成字符串/普通对象，读后解析回来。
9. **大文件性能**：数据量上万条或体积 > 几 MB 时，考虑换 SQLite。
10. **数据备份**：写盘非原子，定期备份 `.json` 防损坏。

---

## 17. 完整可运行示例

```json
// package.json
{
  "name": "lowdb-demo",
  "type": "module",
  "scripts": { "start": "node db.mjs" },
  "dependencies": { "lowdb": "^3" }
}
```

```js
// db.mjs
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const db = new Low(new JSONFile('db.json'), { users: [], count: 0 })

async function main() {
  await db.read()

  // 自增 id
  const nextId = () => (db.data.count += 1)

  // 创建
  db.data.users.push({ id: nextId(), name: 'Alice', age: 30 })
  db.data.users.push({ id: nextId(), name: 'Bob', age: 17 })
  await db.write()
  console.log('已创建', db.data.users)

  // 查询：成年用户
  const adults = db.data.users.filter(u => u.age >= 18)
  console.log('成年:', adults)

  // 更新
  const bob = db.data.users.find(u => u.name === 'Bob')
  if (bob) bob.age = 18
  await db.write()

  // 删除
  db.data.users = db.data.users.filter(u => u.name !== 'Alice')
  await db.write()
  console.log('最终:', db.data.users)
}

main().catch(err => console.error(err))
```

运行：

```bash
pnpm install
pnpm start
```

---

> 文档更新于 2026-10-21 · 基于 lowdb v3（含 v1 兼容说明） / Node 18+
