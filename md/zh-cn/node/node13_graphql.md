---
title: Node.js 使用 GraphQL 学习文档
create:2026-10-21
update:2026-10-21
category:nodejs
cover:https://img-common.aknot.uk/cover/land-59.jpg
tags:[node,graphql,api,backend,yoga,apollo]
summary:Node.js 使用 GraphQL 的学习文档，覆盖 Schema、Resolver、服务端、客户端、订阅与 DataLoader
keywords:[node,graphql,api,resolver,schema,subscription]
top:1
copyright:true
---

# Node.js 使用 GraphQL 学习文档

> 适用技术栈：**`graphql-js` v16/v17** + **`graphql-yoga` v5**（首选，最简单）或 **`@apollo/server` v5**（Apollo Server 5，v4 已 EOL）。
> 运行环境：Node.js 20+（Apollo 5 硬性要求）；Yoga 5 支持 Node/Bun/Deno/Workers/Cloudflare。
> 本文定位为「接口齐全、带可运行示例」的学习笔记/速查手册，覆盖 Schema、Resolver、服务端搭建、客户端调用、订阅、DataLoader、分页、错误处理、安全与实战。

---

## ⚠️ 先澄清一个常见误解

**GraphQL 不是数据库。** 它是 Facebook 提出的 **API 查询语言（query language）与运行时**：客户端用一份声明式查询精确描述「要哪些字段」，服务端在一个 HTTP 端点上按 Schema 解析并执行，把数据组装好返回。它**通常位于你的应用与数据库之间**——解析器（resolver）里才去查 PostgreSQL / MongoDB 等（正好衔接前面学的 [`node11_postgre.md`](./node11_postgre.md)）。

```
客户端 ──GraphQL 查询──▶ GraphQL 服务(Node) ──resolver──▶ 数据库(Postgres等)
                              ▲
                          Schema 定义「能查什么」
```

一句话：**REST 有多个 URL、服务端定响应形状；GraphQL 只有一个 `/graphql` 端点、客户端定响应形状。**

---

## 目录

- [0. 核心概念速记](#0-核心概念速记)
- [1. 技术选型：graphql-js / Yoga / Apollo 对比](#1-技术选型graphql-js--yoga--apollo-对比)
- [2. 安装](#2-安装)
- [3. Schema 定义（SDL 全类型）](#3-schema-定义sdl-全类型)
- [4. 解析器（Resolvers）](#4-解析器resolvers)
- [5. 查询（Query）：参数 / 变量 / 别名 / 片段](#5-查询query参数--变量--别名--片段)
- [6. 变更（Mutation）](#6-变更mutation)
- [7. 上下文（Context）：注入 db 与鉴权](#7-上下文context注入-db-与鉴权)
- [8. 服务端搭建](#8-服务端搭建)
- [9. 客户端调用（Node 侧）](#9-客户端调用node-侧)
- [10. 订阅（Subscription）：实时](#10-订阅subscription实时)
- [11. N+1 问题与 DataLoader](#11-n1-问题与-dataloader)
- [12. 分页（Pagination）](#12-分页pagination)
- [13. 错误处理](#13-错误处理)
- [14. 鉴权与授权](#14-鉴权与授权)
- [15. 安全与最佳实践（生产必读）](#15-安全与最佳实践生产必读)
- [16. 与数据库对接（接 PostgreSQL）](#16-与数据库对接接-postgresql)
- [17. 代码优先方案（type-graphql / Pothos / nexus）](#17-代码优先方案type-graphql--pothos--nexus)
- [18. 综合实战：博客用户+文章 GraphQL 服务](#18-综合实战博客用户文章-graphql-服务)
- [19. 参考文档](#19-参考文档)

---

## 0. 核心概念速记

| 概念 | 说明 |
|------|------|
| **Schema** | 用 SDL（Schema Definition Language）描述「能查什么、字段类型、参数」，是服务契约 |
| **Type** | 对象类型（`type User`）、标量（`String/Int/Boolean/ID/Float`）、枚举、接口、联合、Input |
| **Query** | 只读查询的入口类型（类比 GET） |
| **Mutation** | 写操作入口类型（类比 POST/PUT/DELETE） |
| **Subscription** | 实时推送入口类型（基于事件流） |
| **Resolver** | 每个字段对应的「取数函数」：`(parent, args, context, info) => data` |
| **单端点** | 所有操作都 POST 到 `/graphql`，靠请求体区分 |
| **Introspection** | 内置自省，客户端/工具（GraphiQL）可反向读取 Schema（生产应关闭） |

---

## 1. 技术选型：graphql-js / Yoga / Apollo 对比

| 方案 | 角色 | 当前版本 | 备注 |
|------|------|----------|------|
| **`graphql`**（graphql-js） | 核心引擎：解析/校验/执行 GraphQL | **v16.14.2（稳定兼容线）/ v17.0.2（需 Node 22+）** | 所有方案都基于它 |
| **`graphql-yoga`** | 全功能 HTTP 服务（The Guild） | **v5.18** | Fetch API 式、跨运行时、内置 GraphiQL/订阅(SSE)、Envelop 插件；**上手最简单** |
| **`@apollo/server`** | Apollo 官方服务 | **v5.5.x（生产就绪）** | 需 Node ≥20、`graphql ^16.11`；**v4 已于 2026-01-26 EOL，请勿新项目使用** |
| `graphql-http` | 底层 HTTP 传输协议库 | — | Yoga/Apollo 底层都用它；可裸用 |
| `graphql-request` | 极简 Node/浏览器客户端 | v7+ | 服务端调 GraphQL 或测试首选 |

> 本文示例以 **graphql-yoga 5 + graphql 16** 为主（最省心、兼容最广），并在 §8.2 给出 **Apollo Server 5** 等价写法。

---

## 2. 安装

```bash
# 首选：graphql-yoga（自带 graphql 依赖，但显式装一份更稳）
npm install graphql-yoga graphql

# 备选：Apollo Server 5（注意是 @apollo/server，不是旧版 apollo-server）
npm install @apollo/server graphql

# Node 侧调用 GraphQL 的轻量客户端
npm install graphql-request graphql

# N+1 批处理（§11）
npm install dataloader

# 若用 TS：graphql 自带类型；Yoga/Apollo 也自带
```

---

## 3. Schema 定义（SDL 全类型）

GraphQL Schema 用 **SDL** 声明。一共 6 种命名类型 + 修饰符：

```graphql
# —— 1) 对象类型 Object ——（业务实体）
type User {
  id: ID!            # ! 表示非空（non-null）
  name: String!
  email: String
  role: Role!        # 引用枚举
  posts: [Post!]!    # 非空列表，元素也非空
  createdAt: String!
}

# —— 2) 标量 Scalar ——（叶子类型，内置 5 种）
# Int / Float / String / Boolean / ID（ID 序列化同 String，但语义为标识符）
# 自定义标量需 graphql-scalars 或自建：scalar DateTime

# —— 3) 枚举 Enum ——
enum Role { ADMIN USER GUEST }

# —— 4) 接口 Interface ——（抽象、共享字段）
interface Node { id: ID! }

# —— 5) 联合 Union ——（结果是多种类型之一）
union SearchResult = User | Post

# —— 6) Input 类型 ——（专给参数用，不能含 resolver）
input CreateUserInput {
  name: String!
  email: String!
  role: Role = USER   # 默认值
}

# —— 入口类型 ——
type Query {
  user(id: ID!): User
  users(role: Role, limit: Int = 10): [User!]!
  search(keyword: String!): [SearchResult!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

# —— 指令 Directive ——（@deprecated 内置；@oneOf 为 2025 规范新增）
type Post {
  id: ID!
  title: String!
  legacyBody: String @deprecated(reason: "用 content 替代")
}
```

**类型修饰符速查**

| 写法 | 含义 |
|------|------|
| `String` | 可为 null |
| `String!` | 非空 |
| `[String]` | 可为 null 的列表（列表本身/元素都可能 null） |
| `[String!]!` | 非空列表，元素也非空 |

> 2025-09 规范新增 **`@oneOf` Input**（精确匹配其一），`graphql-js` v16.14+/v17 已支持；旧版用普通 input + 校验模拟。

---

## 4. 解析器（Resolvers）

每个 Schema 字段都需要一个 resolver 告诉 GraphQL「这个值怎么来」。函数签名四参数：`(parent, args, context, info)`。

```js
const resolvers = {
  // 顶层 Query 字段：parent 为 undefined/root
  Query: {
    user: async (_, { id }, ctx) => ctx.db.getUserById(id),
    users: async (_, { role, limit }, ctx) => ctx.db.listUsers(role, limit),
  },
  // 字段级 resolver：当 User.posts 需要另行取数时写
  User: {
    posts: async (parent, _, ctx) => ctx.db.getPostsByAuthor(parent.id),
    // 若 parent 已有该字段（如直接查出的对象），可省略，GraphQL 用默认 resolver 取 parent[field]
  },
  // 联合类型必须提供 __resolveType 告诉 GraphQL 实际是哪种
  SearchResult: {
    __resolveType: (obj) => (obj.email ? 'User' : 'Post'),
  },
  // Mutation
  Mutation: {
    createUser: async (_, { input }, ctx) => ctx.db.createUser(input),
    deleteUser: async (_, { id }, ctx) => ctx.db.deleteUser(id),
  },
}
```

> **默认 resolver**：若未显式定义某字段 resolver，GraphQL 默认返回 `parent[fieldName]`——所以「直接查出来的对象字段」无需逐个写 resolver。

---

## 5. 查询（Query）：参数 / 变量 / 别名 / 片段

### 5.1 服务端：Query 类型 + resolver（见 §3/§4）

### 5.2 客户端查询语法

```graphql
# 变量（$id: ID!）与参数（id: $id），避免把值拼进字符串（防注入/便于复用）
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {        # 嵌套：自动触发 User.posts resolver
      id
      title
    }
  }
}

# 别名（同一字段取两次不同条件）
query {
  admins: users(role: ADMIN) { name }
  guests: users(role: GUEST) { name }
}

# 片段（复用字段集）
fragment UserFields on User { id name email }
query { user(id: "1") { ...UserFields } }
```

---

## 6. 变更（Mutation）

写操作统一走 `Mutation` 类型，**参数优先用 `input` 类型**聚合，便于演进。

```graphql
mutation Create($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}
```

```js
// 变量（JSON）
{ "input": { "name": "alice", "email": "alice@example.com", "role": "USER" } }
```

```js
// resolver 侧（§4 Mutation.createUser 已定义）
// 返回创建出的对象，客户端即可按需选择返回字段
```

---

## 7. 上下文（Context）：注入 db 与鉴权

`context` 是每次请求共享的「全局对象」，常用于注入数据库连接、当前用户、配置。**这是 resolver 拿 db / 做鉴权的标准通道**。

```js
// graphql-yoga：createYoga({ schema, context: ... })
const yoga = createYoga({
  schema,
  context: async ({ request }) => {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const user = token ? verifyJwt(token) : null // 见 §14
    return { db, user } // 所有 resolver 的第三个参数 ctx 就是它
  },
})
```

```js
// Apollo Server 5（standalone）：
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const user = getUserFromReq(req)
    return { db, user }
  },
})
```

---

## 8. 服务端搭建

### 8.1 graphql-yoga v5（推荐，最简单）

```js
import { createServer } from 'node:http'
import { createYoga, createSchema } from 'graphql-yoga'

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query { hello: String! }
  `,
  resolvers: {
    Query: { hello: () => 'Hello from Yoga!' },
  },
})

const yoga = createYoga({ schema }) // Fetch 式 handler
const server = createServer(yoga)
server.listen(4000, () =>
  console.log('▶ http://localhost:4000/graphql')
)
```

### 8.2 Apollo Server 5（等价写法）

```js
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'

const server = new ApolloServer({ typeDefs, resolvers })
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => ({ db, user: getUserFromReq(req) }),
})
console.log('▶', url)
```

> Apollo 5 也可接入 Express（`expressMiddleware`，需 `@apollo/server/express4` + `express` + `cors` + `body-parser`）。**不要再装旧版 `apollo-server` 或 `apollo-server-express`（属于 EOL 的 v4）。**

### 8.3 纯 graphql-js + graphql-http（底层，可选）

```js
import { createHandler } from 'graphql-http/lib/use/http'
import { schema } from './schema.js' // 用 graphql 的 buildSchema 或 makeExecutableSchema

// 挂载到任意 Node http server 的 /graphql 路径
```

---

## 9. 客户端调用（Node 侧）

### 9.1 graphql-request（最简洁）

```js
import { GraphQLClient, gql } from 'graphql-request'

const client = new GraphQLClient('http://localhost:4000/graphql', {
  headers: { authorization: 'Bearer <token>' },
})

const data = await client.request(
  gql`
    query ($id: ID!) {
      user(id: $id) { id name email }
    }
  `,
  { id: '1' }
)
console.log(data.user)
```

### 9.2 原生 fetch（零依赖）

```js
const res = await fetch('http://localhost:4000/graphql', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    query: 'query($id:ID!){ user(id:$id){ name } }',
    variables: { id: '1' },
  }),
})
const { data, errors } = await res.json()
if (errors) throw new Error(errors[0].message)
```

---

## 10. 订阅（Subscription）：实时

GraphQL 支持服务端**主动推送**。Yoga 默认用 **SSE**（Server-Sent Events），开箱即用；WebSocket 需 `graphql-ws` 插件。

```graphql
type Subscription {
  userCreated: User!
}
```

```js
// resolver 用异步迭代器（Yoga 内置简易 pubsub 或 graphql-subscriptions）
import { createPubSub } from 'graphql-yoga'
const pubSub = createPubSub()

const resolvers = {
  Subscription: {
    userCreated: {
      subscribe: () => pubSub.subscribe('USER_CREATED'),
      resolve: (payload) => payload,
    },
  },
  Mutation: {
    createUser: async (_, { input }, ctx) => {
      const u = await ctx.db.createUser(input)
      pubSub.publish('USER_CREATED', u) // 发布事件
      return u
    },
  },
}
```

```js
// 客户端用 EventSource 订阅 SSE（浏览器/Node 均可）
const es = new EventSource('http://localhost:4000/graphql?query=subscription{userCreated{id name}}')
es.onmessage = (e) => console.log('新用户:', JSON.parse(e.data).data.userCreated)
```

> 生产要多客户端、断线重连、鉴权：用 `graphql-ws`（WebSocket）或网关（graphql-hive/gateway）。

---

## 11. N+1 问题与 DataLoader

经典坑：查 N 个 `user.posts`，若每个 `User.posts` resolver 各自打一次 DB，会变成 **1（用户列表）+ N（每人一次）** 次查询。用 **DataLoader** 把同批次的 ID 批量成一次查询并缓存。

```js
import DataLoader from 'dataloader'

// 1) 批量函数：接收 id 数组，必须按顺序返回等长结果数组
const batchPostsByAuthor = async (authorIds) => {
  const rows = await db.getPostsByAuthors(authorIds) // 一次 IN 查询
  return authorIds.map((id) => rows.filter((r) => r.authorId === id))
}

// 2) 每个请求 new 一个 loader（利用按请求缓存）
const context = async ({ request }) => ({
  db,
  loaders: { postsByAuthor: new DataLoader(batchPostsByAuthor) },
})

// 3) resolver 里调用 loader（自动批处理 + 同请求内缓存）
const resolvers = {
  User: {
    posts: (parent, _, ctx) => ctx.loaders.postsByAuthor.load(parent.id),
  },
}
```

> DataLoader 的 `load` 在同一次 tick 内的多次调用会被**合并**成一次批量，且按 key 缓存——是 GraphQL + SQL 的标配。

---

## 12. 分页（Pagination）

### 12.1 简单 offset 分页（适合小数据/后台）

```graphql
type Query {
  users(limit: Int = 10, offset: Int = 0): [User!]!
  userCount: Int!
}
```
```graphql
query { users(limit: 10, offset: 20) { id name } userCount }
```

### 12.2 游标分页（Relay Connection，适合无限滚动/大数据）

```graphql
type PageInfo { hasNextPage: Boolean! endCursor: String! }
type UserEdge { cursor: String! node: User! }
type UserConnection { edges: [UserEdge!]! pageInfo: PageInfo! totalCount: Int! }

type Query { users(first: Int!, after: String): UserConnection! }
```
```graphql
query { users(first: 10, after: "cursor==123") {
  edges { node { id name } cursor }
  pageInfo { hasNextPage endCursor }
} }
```

> 游标分页靠「上一页最后一条的游标」取下一页，避免 offset 在大表上越翻越慢。

---

## 13. 错误处理

```js
import { GraphQLError } from 'graphql'

const resolvers = {
  Mutation: {
    createUser: async (_, { input }, ctx) => {
      const exists = await ctx.db.findByEmail(input.email)
      if (exists) {
        // 抛出标准 GraphQLError，自动进入响应的 errors 数组
        throw new GraphQLError('邮箱已存在', {
          extensions: { code: 'DUPLICATE_EMAIL', field: 'email' },
        })
      }
      return ctx.db.createUser(input)
    },
  },
}
```

返回形态（客户端收到）：

```json
{ "data": null, "errors": [
  { "message": "邮箱已存在", "extensions": { "code": "DUPLICATE_EMAIL", "field": "email" } }
] }
```

> **错误屏蔽**：Yoga/Apollo 默认把「非预期内部错误」屏蔽成通用消息，避免泄露堆栈。**开发期**需开启 `maskedErrors: false`（Yoga）或 `includeStacktraceInErrorResponses`（Apollo）才能看到细节。

---

## 14. 鉴权与授权

- **鉴权（Authentication）**：在 `context` 里校验 token，把 `user` 放进 ctx（见 §7）。
- **授权（Authorization）**：在 resolver 里按 `ctx.user` 角色放行/拒绝。

```js
const resolvers = {
  Mutation: {
    deleteUser: async (_, { id }, ctx) => {
      if (!ctx.user) throw new GraphQLError('未登录', { extensions: { code: 'UNAUTHENTICATED' } })
      if (ctx.user.role !== 'ADMIN')
        throw new GraphQLError('无权限', { extensions: { code: 'FORBIDDEN' } })
      return ctx.db.deleteUser(id)
    },
  },
}
```

> GraphQL 没有内置权限模型——授权逻辑写在 resolver（或封装成 directive / 中间件）是你自己的事。

---

## 15. 安全与最佳实践（生产必读）

1. **关闭自省（introspection）**：生产环境禁止 `?query={__schema{...}}` 暴露 Schema。Yoga 用 `@graphql-yoga/plugin-disable-introspection`；Apollo 用 `ApolloServer({ introspection: false })`。
2. **关闭 GraphiQL IDE**：Yoga `createYoga({ graphiql: false })`；不要在生产暴露调试 UI。
3. **CSRF / XS-Search 防护**：Yoga 默认**不**防 CSRF，普通 `GET /graphql?query=...` 可执行——生产务必加 `@graphql-yoga/plugin-csrf-prevention`（Apollo 5.5+ 已默认更严）。
4. **查询深度/复杂度限制**：用 `graphql-depth-limit` + `graphql-query-complexity` 防止恶意超深/超复杂查询打垮服务。
5. **请求批处理（batching）**：Yoga 默认关闭；如开启务必设每请求上限（默认 10）。
6. **始终用变量而非字符串拼接**传参（GraphQL 变量天然防注入）。
7. **分页必需**：任何列表接口都要 `first/limit` 上限，防止一次性拉全表。
8. **用 DataLoader 防 N+1**（§11）。
9. **错误屏蔽开启**（默认即开），切勿把 DB 异常原样抛给客户端。
10. **Apollo 用户请直接上 v5**：v4 已 EOL 且存在未修复 CVE（如 GHSA-9q82-xgwf-vj6h，仅 5.5.0+ 修复）。
11. **HTTPS + 限流**：GraphQL 单端点更易被滥用，配合网关/反向代理做限流与 WAF。
12. **Schema 演进用 `@deprecated`**：删除字段先标记废弃、等客户端迁移再删，保持向后兼容。

---

## 16. 与数据库对接（接 PostgreSQL）

GraphQL 本身不碰数据——**数据在 resolver 里查**。下面是「GraphQL 层 → 前面学的 `pg` 层」的衔接示意（完整 Pool 用法见 [`node11_postgre.md`](./node11_postgre.md)）：

```js
import pg from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// 数据访问层（DAO）
const db = {
  getUserById: (id) => pool.query('SELECT * FROM users WHERE id=$1', [id])
    .then((r) => r.rows[0] ?? null),
  listUsers: (role, limit) => pool.query(
    'SELECT * FROM users WHERE ($1::text IS NULL OR role=$1) ORDER BY id LIMIT $2',
    [role ?? null, limit]
  ).then((r) => r.rows),
  createUser: (input) => pool.query(
    'INSERT INTO users(name,email,role) VALUES($1,$2,$3) RETURNING *',
    [input.name, input.email, input.role ?? 'USER']
  ).then((r) => r.rows[0]),
}

// 把 db 注入 context（§7），resolver 直接调用
const yoga = createYoga({
  schema,
  context: () => ({ db }), // 实际还应带 user 鉴权
})
```

> 要点：Schema 是「接口契约」，resolver 是「取数实现」。两者解耦，所以同一份 Schema 后面可以换数据源（PG → 微服务 → 缓存）。

---

## 17. 代码优先方案（type-graphql / Pothos / nexus）

SDL 是「Schema 优先」。如果你更喜欢 TypeScript 类直接生成 Schema（类型即代码），可选：

| 工具 | 风格 | 一句话 |
|------|------|--------|
| **Pothos** | 链式、类型安全 | 现代代码优先首选，零装饰器、`schemaBuilder` 链式拼装 |
| **type-graphql** | 装饰器 | 用 `@ObjectType`/`@Field` 装饰 TS 类生成 Schema |
| **nexus** | 链式 | Prisma 系常用，但维护趋缓，新项目更推荐 Pothos |
| **graphql-codegen** | 反向 | 从 Schema 生成 TS 类型，给 resolver/客户端用 |

```ts
// type-graphql 片段（示意）
@ObjectType()
class User {
  @Field(() => ID) id!: string
  @Field() name!: string
}
```

> 选型直觉：团队已有 TS 模型、要强类型 → Pothos / type-graphql；想手写灵活、快速原型 → SDL + Yoga。

---

## 18. 综合实战：博客用户+文章 GraphQL 服务

整合上文：Schema（§3 风格）+ resolver + context（db+鉴权）+ 接 Postgres + DataLoader 防 N+1。

```js
import { createServer } from 'node:http'
import { createYoga, createSchema, createPubSub } from 'graphql-yoga'
import pg from 'pg'
import DataLoader from 'dataloader'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const pubSub = createPubSub()

const db = {
  listUsers: (limit) => pool.query('SELECT * FROM users ORDER BY id LIMIT $1', [limit]).then(r => r.rows),
  getUserById: (id) => pool.query('SELECT * FROM users WHERE id=$1', [id]).then(r => r.rows[0] ?? null),
  getPostsByAuthors: (ids) => pool.query('SELECT * FROM posts WHERE author_id = ANY($1)', [ids]).then(r => r.rows),
  createUser: (input) => pool.query(
    'INSERT INTO users(name,email) VALUES($1,$2) RETURNING *', [input.name, input.email]
  ).then(r => r.rows[0]),
}

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type User { id: ID! name: String! email: String! posts: [Post!]! }
    type Post { id: ID! title: String! author: User! }
    type Query { users(limit: Int = 10): [User!]! user(id: ID!): User }
    type Mutation { createUser(name: String!, email: String!): User! }
    type Subscription { userCreated: User! }
  `,
  resolvers: {
    Query: {
      users: (_, { limit }, ctx) => ctx.db.listUsers(limit),
      user: (_, { id }, ctx) => ctx.db.getUserById(id),
    },
    User: {
      // 用 DataLoader 批量取文章，避免 N+1
      posts: (parent, _, ctx) => ctx.loaders.postsByAuthor.load(parent.id),
    },
    Mutation: {
      createUser: async (_, { name, email }, ctx) => {
        const u = await ctx.db.createUser({ name, email })
        pubSub.publish('USER_CREATED', u)
        return u
      },
    },
    Subscription: {
      userCreated: { subscribe: () => pubSub.subscribe('USER_CREATED'), resolve: (p) => p },
    },
  },
})

const yoga = createYoga({
  schema,
  graphiql: process.env.NODE_ENV !== 'production', // 生产关 IDE
  context: async ({ request }) => ({
    db,
    loaders: {
      postsByAuthor: new DataLoader((ids) => db.getPostsByAuthors(ids).then(rows =>
        ids.map((id) => rows.filter((r) => String(r.author_id) === String(id)))
      )),
    },
  }),
})

createServer(yoga).listen(4000, () => console.log('▶ http://localhost:4000/graphql'))
```

调用示例：

```graphql
query { users(limit: 3) { id name posts { title } } }
mutation { createUser(name:"alice", email:"a@x.com") { id } }
```

---

## 19. 参考文档

> 本文基于 `graphql-js` v16/v17、`graphql-yoga` v5、`@apollo/server` v5 编写；官方文档以最新为准（均为可点击链接）。

### 19.1 官方与规范

- **GraphQL 官方规范（spec.graphql.org，2025-09 版）**：[https://spec.graphql.org](https://spec.graphql.org)
- **graphql-js（核心引擎）GitHub**：[https://github.com/graphql/graphql-js](https://github.com/graphql/graphql-js)
- **graphql-js npm（v16 稳定线 / v17）**：[https://www.npmjs.com/package/graphql](https://www.npmjs.com/package/graphql)
- **GraphQL Yoga 官方文档**：[https://the-guild.dev/graphql/yoga-server/docs](https://the-guild.dev/graphql/yoga-server/docs)
- **GraphQL Yoga npm（v5）**：[https://www.npmjs.com/package/graphql-yoga](https://www.npmjs.com/package/graphql-yoga)
- **Apollo Server 官方文档（v5）**：[https://www.apollographql.com/docs/apollo-server](https://www.apollographql.com/docs/apollo-server)
- **Apollo Server npm（@apollo/server v5）**：[https://www.npmjs.com/package/@apollo/server](https://www.npmjs.com/package/@apollo/server)

### 19.2 客户端 / 工具

- **graphql-request（Node 轻量客户端）**：[https://www.npmjs.com/package/graphql-request](https://www.npmjs.com/package/graphql-request)
- **DataLoader（批处理/N+1）**：[https://www.npmjs.com/package/dataloader](https://www.npmjs.com/package/dataloader)
- **graphql-subscriptions / graphql-ws（订阅）**：[https://www.npmjs.com/package/graphql-ws](https://www.npmjs.com/package/graphql-ws)
- **graphql-codegen（Schema→TS 类型）**：[https://the-guild.dev/graphql/codegen/docs](https://the-guild.dev/graphql/codegen/docs)
- **Pothos（代码优先 Schema 构建）**：[https://pothos-graphql.dev](https://pothos-graphql.dev)
- **type-graphql（装饰器方案）**：[https://typegraphql.com](https://typegraphql.com)
- **graphql-scalars（自定义标量集合）**：[https://www.npmjs.com/package/graphql-scalars](https://www.npmjs.com/package/graphql-scalars)

### 19.3 安全与学习

- **Apollo 安全公告（v4 EOL 与 CVE）**：[https://www.apollographql.com/docs/apollo-server/previous-versions](https://www.apollographql.com/docs/apollo-server/previous-versions)
- **GraphQL 中文文档**：[https://graphql.cn](https://graphql.cn) / [https://graphql.js.cool](https://graphql.js.cool)
- **Relay 分页规范（Connection）**：[https://relay.dev/graphql/connections.htm](https://relay.dev/graphql/connections.htm)

> 说明：以上均为官方/权威域名。GraphQL 生态演进较快，版本号与默认安全策略以官方最新文档为准；**新项目请勿使用已 EOL 的 Apollo Server v4**。
