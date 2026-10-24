---
title: Node.js 使用 tRPC 学习文档
create:2026-10-21
update:2026-10-21
category:nodejs
cover:https://img-common.aknot.uk/cover/land-40.jpg
tags:[node,trpc,api,typescript,backend,rpc]
summary:Node.js 使用 tRPC 的学习文档，覆盖类型安全 RPC、router、procedure 与前后端一体化调用
keywords:[node,trpc,rpc,typescript,procedure,api]
top:1
copyright:true
---

# Node.js 使用 tRPC 学习文档

> 适用对象：已掌握 TypeScript、Node.js 基础，了解 Express/Fastify 或 Next.js 的开发者。
> 本文基于 **tRPC v11**（当前稳定版），覆盖核心 API 与常见集成模式。所有示例为 TypeScript。

---

## 目录

1. [tRPC 是什么](#1-trpc-是什么)
2. [核心概念](#2-核心概念)
3. [环境准备](#3-环境准备)
4. [快速开始：最小可运行服务 + 客户端](#4-快速开始最小可运行服务--客户端)
5. [API 完整速查表](#5-api-完整速查表)
6. [使用模式与进阶](#6-使用模式与进阶)
7. [实时订阅（Subscription）](#7-实时订阅subscription)
8. [客户端用法](#8-客户端用法)
9. [与 Express / Fastify 集成](#9-与-express--fastify-集成)
10. [实战：tRPC + 数据库（Prisma）](#10-实战trpc--数据库prisma)
11. [TypeScript 工程化目录结构](#11-typescript-工程化目录结构)
12. [常见坑与最佳实践](#12-常见坑与最佳实践)
13. [与 REST / GraphQL 对比 & 速查表](#13-与-rest--graphql-对比--速查表)

---

## 1. tRPC 是什么

**tRPC（TypeScript Remote Procedure Call）** 是一个用于构建**端到端类型安全 API** 的框架。它让你用 TypeScript 定义后端过程（procedure），前端调用时**自动获得完整类型推断**，无需手写 API schema、无需代码生成、无需 Swagger。

⚠️ **重要澄清**：tRPC **不是数据库**。它是一套**类型安全的 RPC 通信层**，负责"前端→后端过程调用"的契约。真实项目里 tRPC 通常**作为 API 层架在数据库之上**（经典组合是 tRPC + Prisma + PostgreSQL），本文第 10 节专门演示这套"tRPC 操作数据库"的写法。

为什么用 tRPC 而不是 REST/GraphQL：

- **零 schema、零代码生成**：后端改了过程签名，前端编译期立刻报错。
- **完整的端到端类型**：输入参数、返回值、错误类型全部推导。
- **轻量**：没有 GraphQL 的 Query 语言与解析开销，也没有 REST 的路径约定负担。
- 原生支持 **query / mutation / subscription** 三件套，天然契合前后端协作。

不适用的场景：需要给**非 TS 客户端**（如纯 Java 后端、第三方公开 API）提供接口时，tRPC 的类型安全优势无法跨语言传递，此时 REST/GraphQL 更合适。

---

## 2. 核心概念

| 概念 | 说明 |
|---|---|
| **Router（路由器）** | 一组 procedure 的集合，可无限嵌套合并，最终导出 `AppRouter` 类型 |
| **Procedure（过程）** | 单个远程调用单元，分 `query`（读）、`mutation`（写）、`subscription`（流式） |
| **Context（上下文）** | 每次请求注入的共享对象，通常放 user、db 连接、req 等 |
| **Link（链路）** | 客户端请求的传输管道，`httpLink`/`httpBatchLink`/`wsLink` 等可组合 |
| **Middleware（中间件）** | 包裹 procedure 的前置逻辑，常用于鉴权、日志 |
| **Transformer（转换器）** | 序列化层（如 `superjson`），让 `Date`/`Map`/`undefined` 等能跨网络传输 |
| **Input / Output** | 用 zod 等做入参/出参校验，校验失败自动返回标准错误 |

请求生命周期：`客户端调用 → Link 传输 → adapter 解析 HTTP → createContext → 命中 middleware → 执行 procedure → 返回（经 transformer 序列化）`。

---

## 3. 环境准备

```bash
# 核心包
pnpm add @trpc/server @trpc/client

# React 前端集成（可选）
pnpm add @trpc/react-query @tanstack/react-query

# 校验库（tRPC 官方推荐 zod）
pnpm add zod

# 序列化（处理 Date 等，官方推荐 superjson）
pnpm add superjson

# 若接数据库（第 10 节）
pnpm add @prisma/client
pnpm add -D prisma
```

> 版本要求：tRPC v11 需要 **TypeScript ≥ 5.0**、**Node ≥ 18**（部分 adapter 需 20+）。React 集成需 `@tanstack/react-query` v5。

---

## 4. 快速开始：最小可运行服务 + 客户端

### 4.1 服务端（HTTP fetch adapter）

```ts
// server.ts
import { initTRPC, TRPCError } from '@trpc/server'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { z } from 'zod'

// 1) 初始化 tRPC 实例（这里无 context，用 {}）
const t = initTRPC.create()

// 2) 定义 procedure 与 router
const appRouter = t.router({
  // query：读操作，input 用 zod 校验
  hello: t.procedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return `你好, ${input.name}!`
    }),

  // mutation：写操作
  add: t.procedure
    .input(z.object({ a: z.number(), b: z.number() }))
    .mutation(({ input }) => input.a + input.b),
})

// 3) 导出类型给前端用（关键！类型安全的来源）
export type AppRouter = typeof appRouter

// 4) HTTP 入口（以原生 fetch 适配器为例，可挂任意 Node 服务）
function handler(req: Request): Response {
  return fetchRequestHandler({
    endpoint: '/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),  // 这里返回空 context
  }) as unknown as Response
}

// 在 Bun / Deno / Next.js Route Handler / Cloudflare Workers 等环境直接可用
// Node + http 服务器示例见第 9 节
console.log('tRPC server ready, type AppRouter exported')
```

### 4.2 客户端（Proxy Client）

```ts
// client.ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from './server'

const client = createTRPCProxyClient<AppRouter>({
  links: [
    // 批量链接：短时间内多个调用自动合并为一个 HTTP 请求
    httpBatchLink({ url: 'http://localhost:3000/trpc' }),
  ],
})

async function main() {
  // 类型推断 ✅ input 必须匹配 z.object({ name: z.string() })
  const hi = await client.hello.query({ name: '张三' })
  console.log(hi) // "你好, 张三!"

  const sum = await client.add.mutate({ a: 1, b: 2 })
  console.log(sum) // 3

  // ❌ 类型错误（编译期即报错）：
  // await client.hello.query({ name: 123 })
}
main()
```

> **类型安全体现**：把鼠标移到 `client.hello.query` 上，IDE 会提示 `{ name: string }`；传错类型或字段直接编译失败。这就是 tRPC 的核心价值。

---

## 5. API 完整速查表

### 5.1 `initTRPC` 初始化

```ts
import { initTRPC } from '@trpc/server'
import superjson from 'superjson'

interface Context { user?: { id: string }; db: PrismaClient }
const t = initTRPC.context<Context>().create({
  transformer: superjson,             // 序列化器（处理 Date 等）
  errorFormatter({ shape, error }) {   // 自定义错误返回结构
    return { ...shape, data: { ...shape.data, zodError: error.code === 'BAD_REQUEST' ? error.getZodError()?.flatten() : null } }
  },
})
```

`initTRPC` 返回对象（通常约定叫 `t`），提供：`t.router`、`t.procedure`、`t.middleware`。

### 5.2 Procedure 构建链（方法全表）

| 方法 | 位置 | 说明 |
|---|---|---|
| `.input(schema)` | procedure | 入参校验。传 zod schema，或函数 `(value) => validated` |
| `.output(schema)` | procedure | 出参校验（返回前校验返回值，失败抛 `INTERNAL_SERVER_ERROR`） |
| `.use(middleware)` | procedure | 套用中间件（鉴权/日志） |
| `.query(fn)` | 末尾 | 定义只读过程，`fn({ input, ctx, type })` 返回数据 |
| `.mutation(fn)` | 末尾 | 定义写过程 |
| `.subscription(fn)` | 末尾 | 定义流式过程，返回 `observable`（见第 7 节） |

`fn` 回调入参：

| 字段 | 说明 |
|---|---|
| `input` | 经 `.input()` 校验后的入参 |
| `ctx` | 上下文（经 middleware 增强后） |
| `type` | `'query' \| 'mutation' \| 'subscription'` |
| `path` | 当前 procedure 的路径，如 `'user.get'` |
| `rawInput` | 未校验的原始输入（调试用） |
| `signal` | `AbortSignal`，用于取消 |

### 5.3 Router 定义与合并

```ts
// 子路由
const userRouter = t.router({
  getById: t.procedure.input(z.string()).query(...),
  create: t.procedure.input(z.object({...})).mutation(...),
})

// 主路由：可嵌套对象或 .merge()
const appRouter = t.router({
  user: userRouter,          // 嵌套 → 调用路径 client.user.getById
  post: postRouter,
})
// 或合并同层
const merged = t.mergeRouters(userRouter, postRouter)
export type AppRouter = typeof appRouter
```

### 5.4 中间件（Middleware）

```ts
const t = initTRPC.context<Context>().create()

// 鉴权中间件：校验 ctx.user，并向下游暴露强类型 user
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({
    ctx: { ...ctx, user: ctx.user },  // 增强 ctx，下游 procedure 拿到类型安全的 user
  })
})

// 受保护 procedure：复用中间件
const protectedProcedure = t.procedure.use(isAuthed)

const r = t.router({
  me: protectedProcedure.query(({ ctx }) => {
    return { id: ctx.user.id }  // ✅ user 已确定存在且有类型
  }),
})
```

中间件回调入参/出参：

| 字段 | 说明 |
|---|---|
| `ctx` | 当前上下文 |
| `next(opts?)` | 调用下游；`next({ ctx })` 可**覆盖/增强** ctx |
| `rawInput` / `path` / `type` | 同 procedure |
| 抛 `TRPCError` | 中断链路并返回标准错误 |

### 5.5 错误：`TRPCError`

```ts
import { TRPCError } from '@trpc/server'

// 在 procedure 内抛出
throw new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' })

// 包装未知错误
throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: err })
```

**错误码全表**：

```
PARSE_ERROR              # 请求体解析失败
BAD_REQUEST             # 入参校验失败（zod 错误）
INTERNAL_SERVER_ERROR   # 服务端未捕获异常
UNAUTHORIZED            # 未认证
FORBIDDEN               # 已认证但无权限
NOT_FOUND               # 资源不存在
METHOD_NOT_SUPPORTED    # 用 query 调了 mutation 等
TIMEOUT                 # 超时
CONFLICT                # 冲突
PRECONDITION_FAILED     # 前置条件不满足
PAYLOAD_TOO_LARGE       # 负载过大
UNSUPPORTED_MEDIA_TYPE  # 媒体类型不支持
UNPROCESSABLE_CONTENT   # 内容无法处理
TOO_MANY_REQUESTS       # 限流
CLIENT_CLOSED_REQUEST   # 客户端已断开
```

### 5.6 客户端 Links（链路）

| Link | 作用 |
|---|---|
| `httpLink` | 单请求单 HTTP 调用 |
| `httpBatchLink` | 短时间多个调用自动合并为一个 HTTP 请求（默认推荐） |
| `httpBatchStreamLink` | 批量 + 流式响应（v11 新增，适合大模型流式） |
| `wsLink` | 走 WebSocket，用于 subscription |
| `splitLink` | 按条件分流（query/mutation 走 http，subscription 走 ws） |
| `loggerLink` | 打印请求日志（开发调试） |
| `retryLink`（react-query 层） | 失败重试 |

### 5.7 Adapters（服务端适配器）

| Adapter | 导入路径 | 用途 |
|---|---|---|
| Fetch | `@trpc/server/adapters/fetch` | Next.js App Router、Cloudflare Workers、Bun、Deno |
| Express | `@trpc/server/adapters/express` | 传统 Express 应用 |
| Fastify | `@trpc/server/adapters/fastify` | Fastify 应用 |
| AWS Lambda | `@trpc/server/adapters/aws-lambda` | 无服务器 |
| Node HTTP | `@trpc/server/adapters/node-http` | 原生 `http` 模块 |
| WebSocket | `@trpc/server/adapters/ws` | subscription 的 ws 服务端 |

---

## 6. 使用模式与进阶

### 6.1 输入校验（zod）

```ts
const userRouter = t.router({
  create: t.procedure
    .input(z.object({
      email: z.string().email(),
      age: z.number().int().min(0).max(150),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // input 已校验，类型安全
      return ctx.db.user.create({ data: input })
    }),
})
```

### 6.2 输出校验（output）

```ts
const r = t.router({
  getProfile: t.procedure
    .output(z.object({ id: z.string(), name: z.string() }))
    .query(async ({ ctx }) => {
      const u = await ctx.db.user.findUnique({ where: { id: ctx.user!.id } })
      if (!u) throw new TRPCError({ code: 'NOT_FOUND' })
      return u  // 若字段不符 schema，自动返回 INTERNAL_SERVER_ERROR
    }),
})
```

### 6.3 上下文（Context）+ 鉴权

```ts
// context.ts
import type { CreateContextOptions } from '@trpc/server'
import { verifyToken } from './auth'

export async function createContext({ req }: CreateContextOptions) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const user = token ? await verifyToken(token) : null
  return { user, db: prisma }   // 注入 db 与 user
}
export type Context = Awaited<ReturnType<typeof createContext>>
```

```ts
// 在 adapter 中传入
fetchRequestHandler({
  endpoint: '/trpc',
  req,
  router: appRouter,
  createContext,   // 每次请求自动调用
})
```

### 6.4 错误处理与格式化

```ts
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // 把 zod 错误明细透传给前端（生产可酌情精简）
        zod: error.code === 'BAD_REQUEST' ? error.getZodError?.().flatten() : null,
      },
    }
  },
})
```

### 6.5 数据转换器（superjson）

默认 tRPC 用 JSON 序列化，`Date`/`Map`/`undefined` 会丢失或变形。加 `superjson` 后前后端类型完全一致：

```ts
// 服务端
const t = initTRPC.create({ transformer: superjson })

// 客户端（必须与服务端用同一个 transformer）
import superjson from 'superjson'
const client = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [httpBatchLink({ url: '...' })],
})

// 现在可以直接传 Date
const res = await client.events.query({ from: new Date('2024-01-01') })
// res 仍是 Date 实例 ✅
```

> ⚠️ **坑**：服务端和客户端必须使用**同一个 transformer**，否则解不出来会报解析错误。

### 6.6 请求批处理（Batching）

`httpBatchLink` 默认把 16ms 内的多个调用合并为一个 HTTP 请求（一次往返），大幅减少网络开销：

```ts
// 这三个调用会被合并为 1 个 HTTP 请求
const [a, b, c] = await Promise.all([
  client.user.get.query('1'),
  client.post.list.query(),
  client.stats.query(),
])
```

---

## 7. 实时订阅（Subscription）

tRPC 的 subscription 基于 RxJS 风格的 `observable`，通过 WebSocket 传输。

### 7.1 服务端

```ts
import { observable } from '@trpc/server/observable'

const r = t.router({
  // 每秒推送一个随机数
  randomNumber: t.procedure.subscription(() => {
    return observable<number>((emit) => {
      const timer = setInterval(() => emit.next(Math.random()), 1000)
      // 清理函数：客户端断开时触发
      return () => clearInterval(timer)
    })
  }),

  // 带入参的订阅
  onPostCreated: t.procedure
    .input(z.object({ authorId: z.string() }))
    .subscription(({ input }) => {
      return observable<Post>((emit) => {
        const cb = (p: Post) => { if (p.authorId === input.authorId) emit.next(p) }
        eventBus.on('post.created', cb)
        return () => eventBus.off('post.created', cb)
      })
    }),
})
```

### 7.2 客户端（wsLink + splitLink）

```ts
import { createTRPCProxyClient, wsLink, splitLink, httpBatchLink } from '@trpc/client'
import superjson from 'superjson'

const ws = new WebSocket('ws://localhost:3000/trpc')
const client = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    // 订阅走 ws，其余走 http
    splitLink({
      condition: (op) => op.type === 'subscription',
      true: wsLink({ client: ws }),
      false: httpBatchLink({ url: 'http://localhost:3000/trpc' }),
    }),
  ],
})

// 订阅 + 取消
const unsub = client.randomNumber.subscribe(undefined, {
  onData: (n) => console.log('收到:', n),
  onError: (e) => console.error(e),
})
// unsub.unsubscribe()  // 取消订阅
```

---

## 8. 客户端用法

### 8.1 Proxy Client（最通用，任意 TS 环境）

见 4.2 与 7.2。特点是 `await client.xxx.query()` 风格，适合 Node 脚本、测试、非 React 前端。

### 8.2 React Hooks（@trpc/react-query）

```tsx
// utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../server'
export const trpc = createTRPCReact<AppRouter>()

// Provider 注入
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'

function App({ children }) {
  const [qc] = useState(() => new QueryClient())
  const [client] = useState(() =>
    trpc.createClient({ links: [httpBatchLink({ url: '/trpc' })] })
  )
  return (
    <trpc.Provider client={client} queryClient={qc}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}

// 组件内使用：自动获得 useQuery/useMutation 语义 + 类型安全
function UserList() {
  const users = trpc.user.list.useQuery()          // → useQuery
  const create = trpc.user.create.useMutation()    // → useMutation
  if (!users.data) return <div>加载中…</div>
  return <ul>{users.data.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

---

## 9. 与 Express / Fastify 集成

### 9.1 Express

```ts
// server-express.ts
import express from 'express'
import * as trpcExpress from '@trpc/server/adapters/express'
import { appRouter } from './router'

const app = express()
app.use('/trpc', trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext,           // 签名 (opts) => Context
}))
app.listen(3000, () => console.log('tRPC on http://localhost:3000/trpc'))
```

### 9.2 Fastify

```ts
import Fastify from 'fastify'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { appRouter } from './router'

const app = Fastify()
await app.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
})
await app.listen({ port: 3000 })
```

### 9.3 原生 Node http

```ts
import http from 'node:http'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

const server = http.createServer((req, res) => {
  // 把 node req/res 适配成 fetch 的 Request/Response
  // 实际项目推荐直接用 fetch adapter + 各运行时，无需手搓
})
```

---

## 10. 实战：tRPC + 数据库（Prisma）

> 这一节回应"tRPC 操作数据库"的核心诉求：tRPC 本身不碰存储，而是把数据库操作包成类型安全的过程。

### 10.1 Prisma Schema

```prisma
// prisma/schema.prisma
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String
  posts Post[]
}
model Post {
  id        String @id @default(cuid())
  title     String
  authorId  String
  author    User   @relation(fields: [authorId], references: [id])
}
```

### 10.2 Context 注入 db

```ts
// context.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function createContext({ req }: { req: Request }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const user = token ? await prisma.user.findFirst({ where: { email: token } }) : null
  return { prisma, user }   // db 贯穿所有 procedure
}
export type Context = Awaited<ReturnType<typeof createContext>>
```

### 10.3 Router 操作数据库

```ts
// router.ts
import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { z } from 'zod'
import type { Context } from './context'

const t = initTRPC.context<Context>().create({ transformer: superjson })

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.user } })
})
const protectedProc = t.procedure.use(isAuthed)

export const appRouter = t.router({
  // 列表查询
  'post.list': t.procedure
    .input(z.object({ authorId: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      return ctx.prisma.post.findMany({
        where: input?.authorId ? { authorId: input.authorId } : undefined,
        take: 20,
      })
    }),

  // 创建（受保护）
  'post.create': protectedProc
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.post.create({
        data: { title: input.title, authorId: ctx.user.id },
      })
    }),

  // 事务示例：转账类操作
  'user.transfer': protectedProc
    .input(z.object({ toId: z.string(), amount: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.$transaction(async (tx) => {
        // ... 原子操作
      })
    }),
})
export type AppRouter = typeof appRouter
```

### 10.4 客户端调用（类型安全贯穿全栈）

```ts
const posts = await client['post.list'].query({ authorId: 'u1' })
// posts 类型 = Prisma Post[]（含所有字段）
await client['post.create'].mutate({ title: '新文章' })  // 自动要求已登录（否则服务端 UNAUTHORIZED）
```

---

## 11. TypeScript 工程化目录结构

```
src/
├── server/
│   ├── context.ts        # createContext + Context 类型
│   ├── trpc.ts           # initTRPC 实例 + publicProcedure/protectedProcedure
│   ├── routers/
│   │   ├── user.ts
│   │   ├── post.ts
│   │   └── index.ts      # 合并导出 appRouter
│   ├── middleware/
│   │   └── auth.ts
│   └── index.ts          # adapter 入口（fetch/express/fastify）
├── client/
│   └── trpc.ts           # createTRPCProxyClient / createTRPCReact
└── utils/prisma.ts       # PrismaClient 单例
```

`trpc.ts` 集中导出复用封装：

```ts
// server/trpc.ts
import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import type { Context } from './context'

const t = initTRPC.context<Context>().create({ transformer: superjson })

export const router = t.router
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory
// protectedProcedure / middleware 另见 middleware/auth.ts
export { t }
```

---

## 12. 常见坑与最佳实践

1. **必须导出 `AppRouter` 类型**：前端类型安全的唯一来源。改了后端不更新类型 → 前端编译报错或拿到旧类型。
2. **服务端/客户端 transformer 必须一致**：superjson 两端都要配，漏一端解不出 `Date`。
3. **input 校验不可省**：即使前端类型安全，外部可直接打 HTTP 接口，zod 是最后一道防线。
4. ** Context 不要放大对象**：每个请求都创建，放 db 单例引用即可，别每次 new PrismaClient（连接泄露）。
5. **subscription 清理函数必写**：不清理 `setInterval`/监听器会导致内存泄漏。
6. **批量链接增加延迟**：`httpBatchLink` 默认合并窗口 16ms；对延迟极敏感的场景用 `httpLink`。
7. **错误码语义要对**：校验失败用 `BAD_REQUEST`，鉴权失败用 `UNAUTHORIZED`，资源缺失用 `NOT_FOUND`。
8. **React 需 Provider + QueryClient**：忘包 `<trpc.Provider>` 会运行时报错。
9. **procedure 路径用字符串键**：`'post.list'` 比嵌套对象在某些合并场景更稳，调用端 `client['post.list']`。
10. **不要在 query 里做副作用**：query 可能被重试/缓存，写操作放 mutation。

**最佳实践清单**：

- 统一在 `trpc.ts` 导出 `publicProcedure` / `protectedProcedure`，全项目复用。
- 用 `errorFormatter` 把 zod 错误明细透传给前端表单校验。
- 用 `splitLink` 让 subscription 走 ws、其余走 http。
- 生产环境给 `httpBatchLink` 配 `headers` 注入 token（而非写在 URL）。
- 用 `createCaller` 在服务端直接调用 router（测试 / 服务端渲染 / 内部 RPC），无需走 HTTP。

---

## 13. 与 REST / GraphQL 对比 & 速查表

### 13.1 对比

| 维度 | tRPC | REST | GraphQL |
|---|---|---|---|
| 类型安全 | 端到端 TS（编译期） | 需额外 schema/生成 | 运行时 schema |
| 代码生成 | 无 | 可选 | 需要 |
| 学习曲线 | 低（TS 即文档） | 低 | 中（SDL/Resolver） |
| 跨语言 | 弱（依赖 TS） | 强 | 强 |
| 实时 | subscription + ws | 需 SSE/WS 自搭 | subscription |
| 适合 | 全栈 TS 应用 | 公开 API | 多端复杂查询 |

### 13.2 常用操作速查

| 需求 | 代码 |
|---|---|
| 初始化 | `initTRPC.context<Ctx>().create({ transformer: superjson })` |
| 定义 query | `t.procedure.input(z...).query(({input,ctx}) => ...)` |
| 定义 mutation | `t.procedure.input(z...).mutation(({input,ctx}) => ...)` |
| 定义 subscription | `t.procedure.subscription(() => observable(...))` |
| 中间件 | `t.procedure.use(mw)` / `next({ ctx })` |
| 抛错 | `throw new TRPCError({ code: 'NOT_FOUND' })` |
| 合并路由 | `t.router({ a: routerA, b: routerB })` |
| Fetch 适配器 | `fetchRequestHandler({ endpoint, req, router, createContext })` |
| Express 适配器 | `trpcExpress.createExpressMiddleware({ router, createContext })` |
| 客户端 | `createTRPCProxyClient<AppRouter>({ links:[httpBatchLink({url})] })` |
| React | `createTRPCReact<AppRouter>()` + `useQuery`/`useMutation` |
| 服务端直调 | `const caller = appRouter.createCaller(ctx); await caller.hello()` |
| 订阅客户端 | `client.x.subscribe(input, { onData, onError })` |
| 分流 link | `splitLink({ condition, true: wsLink, false: httpBatchLink })` |

### 13.3 推荐学习路径

1. 跑通第 4 节最小服务+客户端 → 2. 加 zod 校验与 Context 鉴权（6.1/6.3）→ 3. 接数据库（第 10 节）→ 4. 上 subscription 实时（第 7 节）→ 5. React 集成（8.2）→ 6. 工程化拆分（第 11 节）。

---

> 本文基于 tRPC v11 API 编写。小版本字段可能微调，以 `pnpm view @trpc/server version` 实际安装版本为准；官方文档：https://trpc.io
