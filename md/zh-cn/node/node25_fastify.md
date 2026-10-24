---
title: Node.js 使用 Fastify 学习文档
create:2026-10-12
update:2026-10-21
category:nodejs
cover:https://img-common.aknot.uk/cover/land-24.jpg
tags:[node,fastify,backend,web-framework,api,http]
summary:Node.js 使用 Fastify 框架的学习文档，覆盖路由、插件、钩子、验证与序列化
keywords:[node,fastify,backend,http,api,plugin]
top:1
copyright:true
---

# Node 使用 Fastify 学习文档

> 适用版本：Fastify v4.x（当前稳定主线；v5 已发布但 API 差异需留意）。示例以 **TypeScript** 为主，可去类型直接当 JS 用。
> 客户端 / 生态库以官方 `@fastify/*` 套件为准（Fastify 的「插件即一切」哲学）。

---

## 1. 先说清楚：Fastify 是什么

**Fastify 是一个高性能 Node.js Web 框架**，用于搭建 HTTP API / Web 服务——它**不是数据库**，地位等同于 Express / Koa / NestJS（底层）。它的核心卖点是：

- **快**：基于 schema 的响应序列化（`fast-json-stringify`），吞吐常高于 Express 数倍
- **低开销**：自带 Pino 日志、内置 JSON schema 校验（用 `ajv`），无需额外拼装
- **强约束**：「一切皆插件」的封装模型，依赖注入清晰，天然支持可测试、可组合
- **TypeScript 一等公民**：通过 Type Provider 实现端到端类型安全

> 它常和前面的 `node11_postgre` / `node23_redis` 搭配：Fastify 做 HTTP 层，数据库做存储层。

---

## 2. 环境准备与脚手架

```bash
# 初始化
pnpm init
pnpm add fastify
pnpm add -D typescript @types/node tsx        # 开发依赖

# 最小可运行（CommonJS）
node -e "require('fastify')" || echo "ok"
```

### 2.1 最小服务（TypeScript）

```ts
// server.ts
import Fastify from 'fastify'

const fastify = Fastify({ logger: true })

fastify.get('/', async (_request, _reply) => {
  return { hello: 'world' }
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
```

```bash
pnpm exec tsx server.ts     # 或 node --loader tsx server.ts
```

---

## 3. 实例与启动选项

```ts
const fastify = Fastify({
  logger: true,                       // 开启内置 Pino 日志
  // logger: { level: 'info', transport: { target: 'pino-pretty' } },
  ignoreTrailingSlash: true,          // 忽略末尾斜杠 /users == /users/
  bodyLimit: 1048576,                // 请求体上限 1MB
  maxParamLength: 100,               // 路由参数最大长度
  caseSensitive: true,               // 路由是否大小写敏感
  ajv: { customOptions: { coerceTypes: 'array' } }, // ajv 自定义
  genReqId: (req) => req.headers['x-request-id'] as string || crypto.randomUUID(),
  requestTimeout: 30000,             // 请求超时
  pluginTimeout: 10000,             // 插件加载超时
})

// 启动（listen 默认绑 0.0.0.0）
await fastify.listen({ port: 3000, host: '0.0.0.0' })
// 也可以只监听 unix socket
await fastify.listen({ path: '/tmp/fastify.sock' })

// 优雅关闭
await fastify.close()
```

> `logger: true` 在开发足够；生产建议配置 Pino 的 `transport`（pino-pretty）或接入外部日志系统。

---

## 4. 路由（Routing）

### 4.1 简写方法（shorthand）

```ts
fastify.get('/users', async (req, reply) => { /* ... */ })
fastify.post('/users', async (req, reply) => { /* ... */ })
fastify.put('/users/:id', handler)
fastify.delete('/users/:id', handler)
fastify.patch('/users/:id', handler)
fastify.head('/health', handler)
fastify.options('/users', handler)

// 一次注册多方法
fastify.route({
  method: ['GET', 'HEAD'],
  url: '/ping',
  handler: async () => ({ pong: true }),
})
```

### 4.2 完整 route 对象（推荐：带 schema 校验）

```ts
fastify.route({
  method: 'POST',
  url: '/users/:id',
  schema: {
    params: { type: 'object', properties: { id: { type: 'string' } } },
    querystring: { type: 'object', properties: { verbose: { type: 'boolean' } } },
    body: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 0 },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
      },
    },
  },
  preHandler: async (req, reply) => { /* 鉴权钩子 */ },
  handler: async (request, reply) => {
    const { id } = request.params as { id: string }
    const { name, email, age } = request.body as any
    return { id, name }            // 会被 response schema 序列化
  },
})
```

### 4.3 路由参数 / 查询 / 通配

```ts
// 前缀（版本化 API 常用）
fastify.register(require('./routes/users'), { prefix: '/api/v1' })

// 正则 / 多段参数
fastify.get('/users/:id(\\d+)', handler)       // id 必须数字
fastify.get('/files/*', handler)               // 通配

// 请求对象取值
const handler = async (request, reply) => {
  request.params      // 路由参数
  request.query       // 查询字符串（已解析对象）
  request.body        // 请求体（需有 parser，见 §13）
  request.headers     // 请求头
  request.raw         // Node 原生 IncomingMessage
  request.id          // 请求 ID
  request.ip          // 客户端 IP
  request.url         // 原始 URL
}
```

---

## 5. Reply（响应对象）

```ts
fastify.get('/demo', async (request, reply) => {
  // 方式 1：直接 return（会经 response schema 序列化）
  // return { ok: true }

  // 方式 2：用 reply 精细控制
  reply
    .code(201)                       // 状态码
    .header('x-custom', 'abc')       // 自定义头
    .type('application/json')        // Content-Type
    .serializer((payload) => JSON.stringify(payload))  // 自定义序列化
  return { created: true }
})

// 发送非 JSON
fastify.get('/html', async (req, reply) => {
  reply.type('text/html')
  return '<h1>Hi</h1>'
})

// 重定向
reply.redirect(302, '/login')

// 流式响应
import { createReadStream } from 'fs'
fastify.get('/stream', (req, reply) => {
  reply.send(createReadStream('./big.file'))
})

// 提前结束
reply.sendFile('index.html')         // 需 @fastify/static
```

> **关键差异**：Fastify 的 handler 里 `return` 和 `reply.send()` 等价，但**二者只能用一个**，混用会报 `already sent` 错误。

---

## 6. Schema 校验与序列化（Fastify 灵魂）

Fastify 用 JSON Schema 在**入口校验请求**、在**出口高速序列化响应**（这是它比 Express 快的核心）。

```ts
import Fastify from 'fastify'

const app = Fastify()

// response schema 会被编译成 fast-json-stringify 函数，性能远超 JSON.stringify
app.post('/echo', {
  schema: {
    body: {
      type: 'object',
      required: ['msg'],
      properties: { msg: { type: 'string' } },
    },
    response: {
      200: { type: 'object', properties: { echo: { type: 'string' } } },
    },
  },
}, async (req) => {
  const { msg } = req.body as { msg: string }
  return { echo: msg }
})

// 校验失败默认返回 400 + 标准错误体：
// { "statusCode":400, "code":"FST_ERR_VALIDATION", "error":"Bad Request", "message":"..." }
```

### 6.1 自定义校验错误

```ts
app.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    reply.code(400).send({
      ok: false,
      details: error.validation,    // ajv 错误数组
    })
    return
  }
  reply.send(error)
})
```

---

## 7. 插件系统（Plugins）

Fastify 的核心哲学：**所有功能通过插件注册**，插件间默认相互隔离（Encapsulation）。

```ts
import Fastify from 'fastify'
import fp from 'fastify-plugin'        // 突破封装隔离的关键

// 普通插件（注册后拥有独立作用域）
const myPlugin = async (fastify: Fastify, opts: { prefix?: string }) => {
  fastify.decorate('foo', 'bar')      // 仅在本插件作用域可见
  fastify.get('/plugin', () => ({ ok: true }))
}
fastify.register(myPlugin, { prefix: '/x' })

// 用 fastify-plugin 让 decorate 穿透到全局
const dbPlugin = fp(async (fastify) => {
  fastify.decorate('db', createDb())
})
fastify.register(dbPlugin)            // 之后所有插件都能用 fastify.db
```

### 7.1 插件加载顺序与异步

```ts
// 注册是异步的，但 Fastify 保证按注册顺序完成 boot 后再 listen
fastify.register(import('./plugins/db'))
fastify.register(import('./plugins/auth'))
fastify.register(import('./routes/users'), { prefix: '/api' })

// 插件可嵌套（子作用域）
fastify.register(async (instance) => {
  instance.get('/sub', () => 'in sub scope')
}, { prefix: '/parent' })
```

---

## 8. 装饰器（Decorators）

给 `fastify` / `request` / `reply` 挂载自定义能力——这是 Fastify 的「依赖注入」方式。

```ts
// 实例级
fastify.decorate('db', dbClient)
fastify.decorate('config', loadConfig())

// 请求级
fastify.decorateRequest('user', null)
fastify.decorateRequest('startTime', 0)
fastify.addHook('onRequest', (req, reply, done) => {
  req.user = null
  req.startTime = Date.now()
  done()
})

// 响应级
fastify.decorateReply('success', function (data: unknown) {
  this.code(200).send({ ok: true, data })
})

// 使用
fastify.get('/me', (req, reply) => {
  reply.success({ name: req.user?.name })
})
```

> 装饰器名字不能和已有属性冲突，否则报 `FST_ERR_DECORATION_ALREADY_PRESENT`。建议加前缀或用 `fastify-plugin` 共享。

---

## 9. 钩子（Hooks）

在请求生命周期的特定节点插入逻辑（鉴权、日志、错误处理）。

```ts
// 全局钩子
fastify.addHook('onRequest', (req, reply, done) => { done() })
fastify.addHook('preParsing', (req, reply, payload, done) => { done(null, payload) })
fastify.addHook('preValidation', (req, reply, done) => { done() })
fastify.addHook('preHandler', (req, reply, done) => { done() })
fastify.addHook('preSerialization', (req, reply, payload, done) => { done(null, payload) })
fastify.addHook('onSend', (req, reply, payload, done) => { done(null, payload) })
fastify.addHook('onResponse', (req, reply, done) => { done() })
fastify.addHook('onError', (req, reply, error, done) => { done() })
fastify.addHook('onClose', (instance, done) => { done() })
fastify.addHook('onReady', (done) => { done() })

// 局部钩子（只在某路由生效）
fastify.get('/admin', {
  preHandler: async (req, reply) => {
    if (!req.headers['x-admin']) reply.code(403).send({ error: 'forbidden' })
  },
}, () => ({ ok: true }))
```

### 9.1 完整请求生命周期

```
onRequest → preParsing → preValidation → preHandler
   → (handler 执行) → preSerialization → onSend → onResponse
   出错时：onError 在任意阶段触发
```

---

## 10. 错误处理

```ts
import { createError } from '@fastify/error'

// 自定义错误码
const BadRequest = createError('FST_BAD_THING', 'Custom message: %s', 400)

fastify.get('/boom', async () => {
  throw new BadRequest('invalid input')   // → 400 {statusCode,code,message}
})

// 全局错误处理器
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  const status = error.statusCode ?? 500
  reply.code(status).send({
    statusCode: status,
    error: error.name,
    message: error.message,
  })
})

// 404 处理器
fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ statusCode: 404, message: `Route ${request.method} ${request.url} not found` })
})
```

---

## 11. 中间件（Middleware 兼容）

Fastify 原生没有 Express 那种 `app.use(fn)` 全局中间件，但可通过 hooks 实现等价逻辑；要直接复用 Express 中间件可装 `@fastify/express`。

```ts
// 方式 1：用 hook 模拟（推荐，性能更好）
fastify.addHook('onRequest', (req, reply, done) => {
  req.startTime = Date.now()
  done()
})

// 方式 2：复用 Express 中间件
import fastifyExpress from '@fastify/express'
await fastify.register(fastifyExpress)
fastify.use(require('cors')())                 // 直接挂 Express 中间件
fastify.use('/admin', require('helmet')())
```

---

## 12. 内容解析（Body Parsing）

```ts
// JSON 默认支持；form / multipart 需装插件
import formBody from '@fastify/formbody'
await fastify.register(formBody)               // x-www-form-urlencoded

import multipart from '@fastify/multipart'
await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

fastify.post('/upload', async (req) => {
  const data = await req.file()                // 单文件
  const files = req.files()                    // 多文件流
  const fields = await req.parseMultipart()
  return { name: data?.filename }
})

// 自定义 content-type 解析器
fastify.addContentTypeParser('application/x-custom', { parseAs: 'string' }, (req, body, done) => {
  done(null, JSON.parse(body as string))
})
```

---

## 13. 常用官方插件速查

```ts
// 静态文件
import staticPlugin from '@fastify/static'
await fastify.register(staticPlugin, { root: path.join(__dirname, 'public'), prefix: '/public/' })

// CORS
import cors from '@fastify/cors'
await fastify.register(cors, { origin: '*', methods: ['GET', 'POST'] })

// JWT 鉴权
import jwt from '@fastify/jwt'
await fastify.register(jwt, { secret: 'supersecret' })
fastify.decorate('authenticate', async (req, reply) => {
  try { await req.jwtVerify() } catch { reply.code(401).send({ error: 'unauthorized' }) }
})
fastify.get('/protected', { preHandler: fastify.authenticate }, (req) => req.user)

// Cookie / Session
import cookie from '@fastify/cookie'
import session from '@fastify/session'
await fastify.register(cookie)
await fastify.register(session, { secret: 'keyboard cat' })

// WebSocket（基于 @fastify/websocket）
import websocket from '@fastify/websocket'
await fastify.register(websocket)
fastify.get('/ws', { websocket: true }, (conn) => {
  conn.socket.on('message', (m) => conn.socket.send(`echo: ${m}`))
})

// 速率限制
import rateLimit from '@fastify/rate-limit'
await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' })

// 健康检查
import healthcheck from '@fastify/healthcheck'
await fastify.register(healthcheck, { path: '/health' })
```

---

## 14. TypeScript 类型安全（Type Provider）

```ts
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

// 用 TypeBox 替代手写 JSON Schema，拿到编译期类型推导
const app = Fastify().withTypeProvider<TypeBoxTypeProvider>()

app.post('/user', {
  schema: {
    body: Type.Object({
      name: Type.String(),
      age: Type.Number(),
    }),
    response: { 200: Type.Object({ id: Type.String() }) },
  },
}, async (request, reply) => {
  const { name, age } = request.body        // 自动推断 {name:string, age:number}
  const id = await createUser(name, age)
  return reply.send({ id })                  // 自动推断返回 {id:string}
})

// 也可以自定义 Request/Reply 类型
declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; role: string }
  }
  interface FastifyInstance {
    db: DbClient
  }
}
```

---

## 15. 数据库集成实战（Fastify + PostgreSQL）

```ts
// plugins/db.ts —— 用 fastify-plugin 注入到全局
import fp from 'fastify-plugin'
import pg from 'pg'

export default fp(async (fastify) => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  fastify.decorate('db', pool)
  fastify.addHook('onClose', (instance, done) => pool.end().then(() => done()).catch(done))
})

// routes/users.ts
import type { FastifyPluginAsync } from 'fastify'

const users: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    const { rows } = await fastify.db.query('SELECT * FROM users')
    return rows
  })

  fastify.post('/', {
    schema: {
      body: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
    },
  }, async (req) => {
    const { name } = req.body as { name: string }
    const { rows } = await fastify.db.query(
      'INSERT INTO users(name) VALUES($1) RETURNING *', [name],
    )
    return rows[0]
  })
}

export default users

// server.ts
fastify.register(import('./plugins/db'))
fastify.register(import('./routes/users'), { prefix: '/api/users' })
```

---

## 16. 测试（自带 inject —— 无需起端口）

Fastify 内置 `app.inject()`，可直接模拟 HTTP 请求，非常适合单测。

```ts
// test/users.test.ts
import Fastify from 'fastify'
import users from '../routes/users'

const build = async () => {
  const app = Fastify()
  await app.register(users, { prefix: '/users' })
  await app.ready()
  return app
}

test('GET /users 返回列表', async () => {
  const app = await build()
  const res = await app.inject({ method: 'GET', url: '/users' })
  expect(res.statusCode).toBe(200)
  expect(Array.isArray(res.json())).toBe(true)
})

test('POST /users 校验失败返回 400', async () => {
  const app = await build()
  const res = await app.inject({ method: 'POST', url: '/users', payload: {} })
  expect(res.statusCode).toBe(400)
})
```

---

## 17. 性能与最佳实践

```ts
// 1) 用 reply 复用，避免闭包创建
// 2) response schema 必写 —— 这是 Fastify 性能来源
// 3) 避免在 handler 里做重同步计算，交给 preHandler/子进程
// 4) 用 @fastify/rate-limit 防滥用
// 5) 用 logger 的 child logger 区分请求
fastify.addHook('onRequest', (req, reply, done) => {
  req.log = req.log.child({ reqId: req.id })
  done()
})
```

---

## 18. 常见坑与最佳实践

1. **return 和 reply.send 只能用一个**：handler 里既 return 又 `reply.send()` 会报 `already sent`。
2. **插件封装隔离**：在插件里 `decorate` 的变量默认只在本作用域可见，要全局共享必须用 `fastify-plugin`。
3. **schema 必须写全**：不写 `response` schema 就失去序列化加速；不写 `body` schema 就不校验入参。
4. **异步钩子要调 `done()` 或 `return`**：`addHook` 的回调忘了 `done()` 请求会卡死。
5. **`register` 必须在 `listen` 前完成**：异步插件加载完 Fastify 才监听端口，别在 listen 之后注册关键路由。
6. **避免 `any` 滥用**：用 Type Provider（TypeBox/Zod）拿到端到端类型，比 Express 的 `any` 安全得多。
7. **body 解析需插件**：`x-www-form-urlencoded` 要 `@fastify/formbody`，文件上传要 `@fastify/multipart`，JSON 才是默认。
8. **不要在每个请求里 `new` 连接**：数据库/Redis 客户端用插件在 boot 时建一次，挂在 `fastify` 上复用。
9. **路由顺序**：Fastify 按注册顺序匹配，通配 `/*` 要放最后，否则会吞掉其他路由。
10. **CORS 别无脑 `*` + 带凭据**：需凭据时显式列 allowed origins，否则浏览器报错。
11. **生产关 pretty 日志**：`pino-pretty` 仅开发用，生产用 JSON 格式让采集系统解析。
12. **`reply.send()` 之后别再改 reply**：已发送后修改 header/status 无效。

---

## 19. 速查表

### 实例 / 路由 / 响应方法

| 类别 | API |
|---|---|
| 实例 | `Fastify(opts)` / `fastify.listen()` / `fastify.close()` / `fastify.ready()` |
| 路由简写 | `fastify.get/post/put/delete/patch/head/options(url, opts, handler)` |
| 完整路由 | `fastify.route({ method, url, schema, preHandler, handler })` |
| 响应 | `reply.code()` / `.header()` / `.type()` / `.send()` / `.redirect()` / `.serializer()` |
| 请求取值 | `request.params` / `.query` / `.body` / `.headers` / `.id` / `.ip` |
| 校验 | `schema: { params, querystring, body, response }` |
| 复用 | `fastify.decorate()` / `.decorateRequest()` / `.decorateReply()` |
| 钩子 | `addHook('onRequest'\|'preHandler'\|'onSend'\|'onResponse'\|'onError'\|'onClose', fn)` |
| 插件 | `fastify.register(plugin, opts)` / `fastify-plugin` |
| 错误 | `setErrorHandler` / `setNotFoundHandler` / `createError` |
| 测试 | `app.inject({ method, url, payload })` |

### 常用官方插件

| 插件 | 作用 |
|---|---|
| `@fastify/static` | 静态文件 |
| `@fastify/cors` | 跨域 |
| `@fastify/jwt` | JWT 鉴权 |
| `@fastify/cookie` / `@fastify/session` | Cookie / 会话 |
| `@fastify/websocket` | WebSocket |
| `@fastify/formbody` / `@fastify/multipart` | 表单 / 文件上传 |
| `@fastify/rate-limit` | 限流 |
| `@fastify/healthcheck` | 健康检查 |
| `@fastify/express` | 复用 Express 中间件 |
| `@fastify/swagger` + `@fastify/swagger-ui` | API 文档 |
| `@fastify/type-provider-typebox` / `-zod` | TS 类型安全 |

---

## 20. 学习路径建议

1. **先跑通**：`Fastify()` + `get('/')` + `listen`，用 `curl` 打到。
2. **掌握 schema**：在 `route` 里写 `body` / `response` schema，感受「自动校验 + 高速序列化」。
3. **理解封装模型**：插件的 `register` + 隔离 + `fastify-plugin` 穿透，这是 Fastify 和 Express 最大的心智差异。
4. **钩子与装饰器**：用 `preHandler` 做鉴权、`decorate` 注入服务。
5. **生态插件**：CORS / JWT / static / multipart / swagger 一个个接。
6. **类型安全**：上 TypeBox + Type Provider，告别 `any`。
7. **可测试**：用 `app.inject()` 写无端口单测。
8. **官方资源**：
   - 官网：<https://fastify.dev>
   - 文档：<https://fastify.dev/docs/latest>
   - 插件生态：<https://fastify.dev/ecosystem>
