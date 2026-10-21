---
title: NodeJs训练营:Koa学习文档
create:2026-10-12
update:2026-10-21
category:backend
tags:[node,fastify,backend,web-framework,api,http]
summary:Node.js 使用 Fastify 框架的学习文档，覆盖路由、插件、钩子、验证与序列化
keywords:[node,fastify,backend,http,api,plugin]
top:1
copyright:true
---

# Node 使用 Koa 学习文档

> 本文档面向已掌握 Node.js 基础的开发者，系统讲解如何使用 **Koa** 构建 Web 应用与 API。
> 接口尽量齐全、示例均可直接运行。

---

## 目录

1. [Koa 是什么](#1-koa-是什么)
2. [环境准备与安装](#2-环境准备与安装)
3. [最小可运行示例](#3-最小可运行示例)
4. [核心概念：洋葱模型](#4-核心概念洋葱模型)
5. [Application 应用对象（app）完整 API](#5-application-应用对象app完整-api)
6. [Context 上下文（ctx）完整 API](#6-context-上下文ctx完整-api)
7. [Request 对象（ctx.request）完整 API](#7-request-对象ctxrequest完整-api)
8. [Response 对象（ctx.response）完整 API](#8-response-对象ctxresponse完整-api)
9. [Cookies 操作](#9-cookies-操作)
10. [中间件编写规范](#10-中间件编写规范)
11. [路由：koa-router](#11-路由koa-router)
12. [请求体解析：koa-bodyparser](#12-请求体解析koa-bodyparser)
13. [静态文件：koa-static](#13-静态文件koa-static)
14. [模板渲染：koa-views](#14-模板渲染koa-views)
15. [Session：koa-session](#15-sessionkoa-session)
16. [错误处理](#16-错误处理)
17. [常见官方中间件速查表](#17-常见官方中间件速查表)
18. [实战：Koa + 路由 + 数据库（CRUD）](#18-实战koa--路由--数据库crud)
19. [测试：supertest](#19-测试supertest)
20. [TypeScript 支持](#20-typescript-支持)
21. [常见坑与最佳实践](#21-常见坑与最佳实践)
22. [与其他框架对比 & 学习路径](#22-与其他框架对比--学习路径)

---

## 1. Koa 是什么

Koa 是由 **Express 原班团队** 打造的 Node.js Web 框架。它和 Express、Fastify 一样，是**做 HTTP 服务的 Web 框架**，不是数据库。Koa 的关键特点：

- **极简内核**：本身只有约 600 行，仅提供上下文、中间件机制和错误处理，其余能力全靠中间件组合。
- **洋葱模型中间件**：基于 async/await，用 `next()` 串联，控制流清晰、错误可捕获。
- **优雅的 Context 抽象**：把 Node 原生 `req`/`res` 封装成更易用的 `ctx.request` / `ctx.response`，且大量属性直接委托到 `ctx` 上。
- **无内置路由 / 无内置 body 解析**：与 Express "全家桶"不同，Koa 把这些留给社区中间件（如 `koa-router`、`koa-bodyparser`）。

> 选型一句话：想要极简、可高度定制、生态由自己拼装的 Web 框架，选 Koa；想要开箱即用，选 NestJS/Fastify。

---

## 2. 环境准备与安装

```bash
# Node 版本要求：Koa 2.x 需 Node >= 7.6（因使用 async/await）
# 推荐 Node >= 18

# 初始化项目
pnpm init

# 安装 Koa 2.x（当前主流）
pnpm add koa

# 常用配套中间件
pnpm add koa-router koa-bodyparser koa-static koa-views koa-session
# 类型（TypeScript 用）
pnpm add -D @types/koa @types/koa-router @types/koa-bodyparser @types/koa__cors
```

> ⚠️ **Koa 1.x（generator 风格）已废弃**，本文学全部基于 **Koa 2.x**（async/await 风格）。

---

## 3. 最小可运行示例

```js
// app.js
const Koa = require('koa');
const app = new Koa();

// 一个最基础的中间件
app.use(async (ctx) => {
  ctx.body = 'Hello Koa!';
});

// 监听端口
app.listen(3000, () => {
  console.log('Koa 运行在 http://localhost:3000');
});
```

```bash
node app.js
# 访问 http://localhost:3000 → 返回 "Hello Koa!"
```

> `app.listen()` 本质是 `http.createServer(app.callback()).listen(...)` 的封装。

---

## 4. 核心概念：洋葱模型

Koa 中间件的执行顺序像**洋葱**：请求从外到内穿透，响应从内到外返回。`next()` 之前的代码在"进入"阶段执行，`next()` 之后的代码在"返回"阶段执行。

```js
app.use(async (ctx, next) => {
  console.log('① 进入 中间件 A');
  await next();
  console.log('⑤ 返回 中间件 A');
});

app.use(async (ctx, next) => {
  console.log('② 进入 中间件 B');
  await next();
  console.log('④ 返回 中间件 B');
});

app.use(async (ctx) => {
  console.log('③ 最内层 处理响应');
  ctx.body = 'done';
});
```

控制台输出顺序：**① → ② → ③ → ④ → ⑤**

```
请求 → A(前) → B(前) → 核心 → B(后) → A(后) → 响应
```

**错误处理**：`next()` 抛出的错误会沿原路向外冒泡，外层中间件用 `try/catch` 即可捕获。

```js
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message };
    // 把错误继续向上抛，让 app.on('error') 也能收到
    ctx.app.emit('error', err, ctx);
  }
});
```

---

## 5. Application 应用对象（app）完整 API

```js
const Koa = require('koa');
const app = new Koa(options);
```

### 构造选项 options

| 选项 | 类型 | 说明 |
|---|---|---|
| `env` | string | 环境变量，默认 `process.env.NODE_ENV` |
| `proxy` | boolean | 是否信任反向代理（影响 `ctx.ip`、`ctx.protocol`），默认 `false` |
| `subdomainOffset` | number | 子域名偏移量，默认 `2`（如 `tobi.koala.com` → subdomain = `['koala','tobi']`） |
| `proxyHeader` | string | 获取真实 IP 的 header 名，默认 `'X-Forwarded-For'` |
| `signed` | boolean | cookie 是否签名，默认 `true` |
| `keys` | string[] | 用于 cookie/签名 的密钥数组 |
| `silent` | boolean | 是否静默错误（不自动打印），默认 `false` |

```js
const app = new Koa({
  proxy: true,
  keys: ['your-secret-key-1', 'your-secret-key-2'],
  proxyHeader: 'X-Real-IP',
});
```

### app 属性

| 属性 | 说明 |
|---|---|
| `app.env` | 当前环境 |
| `app.proxy` | 是否信任代理 |
| `app.subdomainOffset` | 子域名偏移 |
| `app.keys` | 密钥数组（用于 cookie 签名） |
| `app.context` | 上下文原型对象，可在上面挂载全局方法/属性 |
| `app.silent` | 是否静默错误 |

```js
// 在全局 context 上挂载工具方法（所有 ctx 共享）
app.context.db = createDbConnection();
app.context.getLogger = () => console;
```

### app 方法

| 方法 | 说明 |
|---|---|
| `app.use(fn)` | 注册中间件，返回 `app`（可链式） |
| `app.listen(...)` | 启动 HTTP 服务器，同 `http.createServer(app.callback()).listen(...)` |
| `app.callback()` | 返回适用于 `http.createServer` 的回调函数（用于自定义 server / 测试） |
| `app.on(event, fn)` | 监听事件（`error` / `log` 等） |
| `app.removeListener` / `app.emit` | 继承自 EventEmitter |

```js
// 自定义 HTTP server（例如配合 https）
const http = require('http');
const server = http.createServer(app.callback());
server.listen(3000);

// 监听全局错误事件
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx);
});
```

---

## 6. Context 上下文（ctx）完整 API

每个请求都会创建一个独立的 `ctx` 对象，贯穿整个中间件链。

### 6.1 ctx 上的常用属性（大部分是对 request/response 的委托）

| 属性 / 方法 | 来源 | 说明 |
|---|---|---|
| `ctx.req` | Node | 原生 Node 请求对象 |
| `ctx.res` | Node | 原生 Node 响应对象（⚠️ 用了 Koa 后一般不要直接操作） |
| `ctx.request` | Koa | Koa 封装的 Request 对象 |
| `ctx.response` | Koa | Koa 封装的 Response 对象 |
| `ctx.app` | — | 应用实例 |
| `ctx.state` | — | **推荐在中间件间传递数据的命名空间**（不要往 ctx 直接挂） |
| `ctx.cookies` | — | cookie 存取（见 §9） |
| `ctx.throw([status], [msg], [props])` | — | 抛出 HTTP 错误 |
| `ctx.assert(value, [status], [msg])` | — | 条件不成立时抛错（类似 Node assert） |

### 6.2 委托到 ctx 的 request 属性

`ctx.method`、`ctx.url`、`ctx.path`、`ctx.query`、`ctx.querystring`、`ctx.host`、`ctx.hostname`、`ctx.protocol`、`ctx.secure`、`ctx.ip`、`ctx.ips`、`ctx.subdomains`、`ctx.headers`、`ctx.header`、`ctx.get()`、`ctx.is()`、`ctx.accepts()` 等——等价于 `ctx.request.xxx`。

### 6.3 委托到 ctx 的 response 属性

`ctx.body`、`ctx.status`、`ctx.message`、`ctx.length`、`ctx.type`、`ctx.set()`、`ctx.append()`、`ctx.remove()`、`ctx.redirect()`、`ctx.attachment()`、`ctx.etag`、`ctx.lastModified` 等——等价于 `ctx.response.xxx`。

```js
app.use(async (ctx) => {
  // 读取请求
  console.log(ctx.method);   // GET / POST ...
  console.log(ctx.url);      // /users?page=1
  console.log(ctx.path);     // /users
  console.log(ctx.query);    // { page: '1' }
  console.log(ctx.host);     // localhost:3000
  console.log(ctx.ip);       // 127.0.0.1
  console.log(ctx.get('User-Agent'));

  // 写入响应
  ctx.status = 200;
  ctx.type = 'application/json';
  ctx.set('X-Powered-By', 'Koa');
  ctx.body = { ok: true };

  // 在中间件间共享数据
  ctx.state.user = { id: 1 };
});
```

### 6.4 ctx.throw 与 ctx.assert

```js
app.use(async (ctx) => {
  // 抛出 401
  if (!ctx.headers.authorization) {
    ctx.throw(401, '未授权');
  }

  // 条件断言：condition 为 false 时抛错
  ctx.assert(ctx.state.user, 401, '需要登录');

  ctx.body = 'authorized';
});
```

> `ctx.throw(status, msg, props)` 第三个参数可附加额外属性，例如 `ctx.throw(400, '参数错误', { code: 'INVALID' })`。

---

## 7. Request 对象（ctx.request）完整 API

| 成员 | 类型 | 说明 |
|---|---|---|
| `request.header` / `request.headers` | object | 请求头 |
| `request.method` | string | 请求方法 |
| `request.url` | string | 含 query 的完整 URL |
| `request.originalUrl` | string | 原始 URL（未改写） |
| `request.path` | string | 路径部分 |
| `request.query` | object | 解析后的 query string |
| `request.querystring` | string | 原始 query string |
| `request.search` | string | 含 `?` 的 query |
| `request.host` | string | host（含端口） |
| `request.hostname` | string | host（不含端口，去除了 `[` `]`） |
| `request.protocol` | string | `http` / `https` |
| `request.secure` | boolean | 是否 https |
| `request.ip` | string | 客户端 IP（受 `app.proxy` 影响） |
| `request.ips` | string[] | 代理链上的 IP 数组 |
| `request.subdomains` | string[] | 子域名数组 |
| `request.fresh` | boolean | 缓存协商是否新鲜 |
| `request.stale` | boolean | 与 `fresh` 相反 |
| `request.socket` | object | 底层 TCP socket |
| `request.get(field)` | fn | 读取某请求头（大小写不敏感） |
| `request.is(types...)` | fn | 内容协商，判断请求体 MIME 类型 |
| `request.accepts(types)` | fn | 协商客户端接受的响应类型 |
| `request.acceptsEncodings()` | fn | 协商编码 |
| `request.acceptsCharsets()` | fn | 协商字符集 |
| `request.acceptsLanguages()` | fn | 协商语言 |
| `request.idempotent` | boolean | 是否幂等方法（GET/HEAD/PUT/DELETE 等） |

```js
app.use(async (ctx) => {
  const r = ctx.request;
  console.log(r.get('Content-Type'));      // application/json
  console.log(r.is('json', 'text'));       // 'json' | 'text' | false
  console.log(r.accepts('json', 'html'));  // 客户端最想要的格式
  console.log(r.fresh);                    // 是否可走 304
  ctx.body = 'request info logged';
});
```

---

## 8. Response 对象（ctx.response）完整 API

| 成员 | 类型 | 说明 |
|---|---|---|
| `response.header` / `response.headers` | object | 响应头 |
| `response.status` | number | 状态码（默认 404 或 200，取决于 body） |
| `response.message` | string | 状态信息（如 "Not Found"） |
| `response.length` | number | 自动计算的 Content-Length |
| `response.body` | any | 响应体（string / Buffer / Stream / object / null） |
| `response.type` | string | Content-Type（可带 charset） |
| `response.lastModified` | Date | Last-Modified |
| `response.etag` | string | ETag |
| `response.set(field, value)` | fn | 设置响应头（也支持传对象批量设置） |
| `response.append(field, value)` | fn | 追加响应头（同字段多个值） |
| `response.remove(field)` | fn | 删除响应头 |
| `response.get(field)` | fn | 读取响应头 |
| `response.redirect(url, [alt])` | fn | 302 重定向（可指定 alt 用于被禁止的 url） |
| `response.attachment([filename])` | fn | 设置 `Content-Disposition: attachment` |
| `response.headerSent` | boolean | 响应头是否已发送 |
| `response.is(types...)` | fn | 判断响应体类型 |
| `response.flushHeaders([status], [message])` | fn | 立即写入响应头（用于流式响应） |
| `response.socket` | object | 底层 socket |
| `response.vary(field)` | fn | 设置 Vary 头 |

### response.body 的自动处理规则

- 设置 `string` → 按 `type` 发送（默认 `text/plain` 或 `text/html`）
- 设置 `Buffer` → 按 `type` 发送（默认 `application/octet-stream`）
- 设置 `Stream` → 以流方式发送（自动处理 `Content-Encoding`）
- 设置 `object` / `array` → 自动 `JSON.stringify`，`type` 默认 `application/json`
- 设置 `null` / 不设置 → 视为无内容（204 或未匹配路由的 404）

```js
app.use(async (ctx) => {
  const res = ctx.response;

  // 字符串
  ctx.type = 'text/html';
  ctx.body = '<h1>Hi</h1>';

  // JSON（最常用）
  ctx.body = { code: 0, data: [1, 2, 3] };

  // 设置头
  res.set('X-Rate-Limit', '100');
  res.append('Set-Cookie', 'a=1');

  // 重定向
  // ctx.redirect('/login');

  // 附件下载
  // ctx.attachment('report.pdf');
  // ctx.body = fs.createReadStream('./report.pdf');
});
```

---

## 9. Cookies 操作

```js
app.use(async (ctx) => {
  // 读取（自动校验签名）
  const token = ctx.cookies.get('token', { signed: true });

  // 设置
  ctx.cookies.set('token', 'abc123', {
    httpOnly: true,          // 禁止前端 JS 读取（默认 false）
    signed: true,            // 启用签名（默认 true）
    maxAge: 1000 * 60 * 60,  // 有效期（毫秒）
    expires: new Date('2030-01-01'), // 过期时间（与 maxAge 二选一）
    path: '/',               // 生效路径
    domain: 'example.com',   // 生效域名
    secure: true,            // 仅 HTTPS 传输
    sameSite: 'lax',         // 'strict' | 'lax' | 'none'
    overwrite: true,          // 覆盖同名 cookie
  });

  // 删除
  ctx.cookies.set('token', '', { maxAge: 0 });

  ctx.body = 'cookie handled';
});
```

> ⚠️ 使用 `signed: true`（默认）时，必须先给 `app.keys` 赋值数组，否则报错。

---

## 10. 中间件编写规范

### 10.1 基本形态

```js
// async 函数签名：(ctx, next) => {}
const logger = async (ctx, next) => {
  const start = Date.now();
  await next();                  // 控制权交给下游
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
};

app.use(logger);
```

### 10.2 复用 & 参数化中间件（闭包工厂）

```js
// 工厂函数，返回真正的中间件，可传参
function forbidIP(ipList) {
  return async (ctx, next) => {
    if (ipList.includes(ctx.ip)) {
      ctx.throw(403, 'IP 被禁止');
    }
    await next();
  };
}

app.use(forbidIP(['1.2.3.4']));
```

### 10.3 组合多个中间件（koa-compose）

```js
const compose = require('koa-compose');

const a = async (ctx, next) => { console.log('a'); await next(); };
const b = async (ctx, next) => { console.log('b'); await next(); };

// 把多个中间件合并成一个
const all = compose([a, b]);
app.use(all);
```

---

## 11. 路由：koa-router

Koa 无内置路由，使用 `@koa/router`（原 `koa-router`）。

```js
const Router = require('@koa/router');
const router = new Router();

// 基础 GET
router.get('/', async (ctx) => {
  ctx.body = 'home';
});

// 带参数
router.get('/users/:id', async (ctx) => {
  ctx.body = { id: ctx.params.id };
});

// 多个方法
router.get('/about', async (ctx) => { ctx.body = 'about'; });
router.post('/about', async (ctx) => { ctx.body = 'posted'; });

// 多段参数 + 正则约束
router.get('/items/:id(\\d+)', async (ctx) => {
  ctx.body = { itemId: ctx.params.id };
});

// 注册到 app
app.use(router.routes());
// 自动返回 405 Method Not Allowed / 501 Not Implemented
app.use(router.allowedMethods());
```

### 路由前缀 & 嵌套

```js
// API 前缀
const api = new Router({ prefix: '/api' });

api.get('/users', listUsers);
api.post('/users', createUser);

app.use(api.routes());

// 嵌套路由
const user = new Router();
user.get('/', ...);          // /api/users
user.get('/:id', ...);      // /api/users/:id
api.use('/users', user.routes());
```

### 路由级中间件 & 参数预处理

```js
// 单个路由挂中间件
router.get('/admin', authMiddleware, async (ctx) => {
  ctx.body = 'admin only';
});

// 批量挂载到一组路由
router.use('/admin', authMiddleware);
router.use(authMiddleware); // 整个 router 生效

// 参数预处理（router.param）
router.param('id', async (id, ctx, next) => {
  ctx.state.record = await findById(id);
  if (!ctx.state.record) ctx.throw(404);
  await next();
});
```

---

## 12. 请求体解析：koa-bodyparser

```js
const bodyParser = require('koa-bodyparser');

app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'], // 启用的类型
  jsonLimit: '1mb',                      // JSON 体积上限
  formLimit: '56kb',
  textLimit: '1mb',
  onerror: (err, ctx) => {               // 解析失败处理
    ctx.throw(422, '请求体解析失败');
  },
}));

app.use(async (ctx) => {
  // 解析后挂到 ctx.request.body
  const { name, age } = ctx.request.body;
  ctx.body = { received: { name, age } };
});
```

> 默认只解析 `json` 和 `form`。要支持 `multipart/form-data`（文件上传），需用 `@koa/multer` 或 `koa-body`。

### 文件上传：koa-body（替代方案）

```js
const koaBody = require('koa-body', { multipart: true });

app.use(koaBody({ multipart: true, formidable: { uploadDir: './uploads' } }));

router.post('/upload', async (ctx) => {
  const file = ctx.request.files.file; // 上传的文件对象
  ctx.body = { filename: file.name };
});
```

---

## 13. 静态文件：koa-static

```js
const serve = require('koa-static');
const path = require('path');

// 指定静态目录
app.use(serve(path.join(__dirname, 'public'), {
  maxage: 1000 * 60 * 60,  // 浏览器缓存时间（毫秒）
  index: 'index.html',     // 默认首页
  defer: false,            // true 时仅在后续中间件未响应时才尝试静态文件
  gzip: true,
  hidden: false,           // 是否允许访问隐藏文件（. 开头）
  extensions: ['html'],    // 自动补全扩展名
}));
```

---

## 14. 模板渲染：koa-views

```bash
pnpm add koa-views ejs   # 以 ejs 模板引擎为例
```

```js
const views = require('koa-views');
const path = require('path');

// 注册视图引擎（支持 ejs / pug / handlebars 等）
app.use(views(path.join(__dirname, 'views'), {
  extension: 'ejs',
}));

router.get('/page', async (ctx) => {
  await ctx.render('index', {
    title: 'Koa Views',
    users: ['Alice', 'Bob'],
  });
});
```

`views/index.ejs`：

```html
<!DOCTYPE html>
<html>
  <head><title><%= title %></title></head>
  <body>
    <h1><%= title %></h1>
    <ul>
      <% users.forEach(u => { %>
        <li><%= u %></li>
      <% }) %>
    </ul>
  </body>
</html>
```

---

## 15. Session：koa-session

```bash
pnpm add koa-session
```

```js
const session = require('koa-session');

const CONFIG = {
  key: 'koa:sess',          // cookie key
  maxAge: 86400000,         // 1 天
  autoCommit: true,         // 自动写回响应
  overwrite: true,
  httpOnly: true,
  signed: true,             // 需要 app.keys
  rolling: false,           // 每次访问刷新过期时间
  renew: true,              // 快过期时自动续期
  store: null,              // 默认存内存；可用 redis 等外部存储
};

app.keys = ['a-secret-key'];
app.use(session(CONFIG, app));

app.use(async (ctx) => {
  // 读取
  const count = ctx.session.views || 0;
  // 写入
  ctx.session.views = count + 1;
  // 删除整个 session
  // ctx.session = null;

  ctx.body = `你是第 ${ctx.session.views} 次访问`;
});
```

### 使用 Redis 存储 session（生产推荐）

```js
const Redis = require('ioredis');
const { Store } = require('koa-session');

const redis = new Redis();
class RedisStore extends Store {
  async get(key) { return redis.get(key); }
  async set(key, sess, maxAge) { return redis.set(key, sess, 'PX', maxAge); }
  async destroy(key) { return redis.del(key); }
}

app.use(session({ store: new RedisStore() }, app));
```

---

## 16. 错误处理

### 16.1 全局错误事件

```js
app.on('error', (err, ctx) => {
  console.error('server error:', err);
  // 注意：这里不要尝试写响应（响应可能已发送）
});
```

### 16.2 统一错误处理中间件（推荐放最外层）

```js
// 必须放在最前面（最先进入、最后返回）
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.type = 'application/json';
    ctx.body = {
      error: err.expose ? err.message : '内部服务器错误',
      code: err.code || 'ERROR',
    };
    // 让 app.on('error') 也能收到（用于日志/监控）
    ctx.app.emit('error', err, ctx);
  }
});
```

### 16.3 自定义错误类

```js
class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = true; // 允许把 message 返回给客户端
  }
}

// 使用
app.use(async (ctx) => {
  if (!ctx.state.user) {
    throw new HttpError(401, '请先登录', 'UNAUTHORIZED');
  }
  ctx.body = 'ok';
});
```

---

## 17. 常见官方中间件速查表

| 中间件 | 用途 | 关键 API |
|---|---|---|
| `@koa/router` | 路由 | `router.get/post/put/del/use/param` |
| `koa-bodyparser` | 解析 JSON/Form 请求体 | `ctx.request.body` |
| `koa-body` | 支持文件上传 | `ctx.request.files` |
| `koa-static` | 静态资源 | `serve(dir, opts)` |
| `koa-views` | 模板渲染 | `ctx.render(view, data)` |
| `koa-session` | Session | `ctx.session` |
| `@koa/cors` | 跨域 | `cors(opts)` |
| `koa-compose` | 组合中间件 | `compose([mw...])` |
| `koa-helmet` | 安全头 | `helmet()` |
| `koa-compress` | Gzip 压缩 | `compress(opts)` |
| `koa-logger` | 请求日志 | `logger()` |
| `koa-jwt` | JWT 鉴权 | `koaJwt({ secret })` |
| `@koa/multer` | 文件上传 | `multer().single('file')` |

### CORS 示例

```js
const cors = require('@koa/cors');

app.use(cors({
  origin: 'http://localhost:3000',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,   // 允许携带 cookie
}));
```

---

## 18. 实战：Koa + 路由 + 数据库（CRUD）

下面是一个完整的用户 CRUD 示例（以内存数组模拟数据库，替换为真实 DB 即可）。

```js
// server.js
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router({ prefix: '/api/users' });

// 模拟数据库
let db = [];
let seq = 1;

// 错误处理中间件（最前）
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.expose ? err.message : 'Internal Error' };
    ctx.app.emit('error', err, ctx);
  }
});

app.use(bodyParser());

// 列表
router.get('/', async (ctx) => {
  ctx.body = db;
});

// 详情
router.get('/:id', async (ctx) => {
  const user = db.find((u) => u.id === Number(ctx.params.id));
  if (!user) ctx.throw(404, '用户不存在');
  ctx.body = user;
});

// 创建
router.post('/', async (ctx) => {
  const { name, email } = ctx.request.body;
  if (!name) ctx.throw(400, 'name 必填');
  const user = { id: seq++, name, email };
  db.push(user);
  ctx.status = 201;
  ctx.body = user;
});

// 更新
router.put('/:id', async (ctx) => {
  const user = db.find((u) => u.id === Number(ctx.params.id));
  if (!user) ctx.throw(404, '用户不存在');
  Object.assign(user, ctx.request.body);
  ctx.body = user;
});

// 删除
router.delete('/:id', async (ctx) => {
  const idx = db.findIndex((u) => u.id === Number(ctx.params.id));
  if (idx === -1) ctx.throw(404, '用户不存在');
  db.splice(idx, 1);
  ctx.status = 204;
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000, () => console.log('CRUD 服务在 :3000'));
```

测试：

```bash
# 创建
curl -X POST localhost:3000/api/users -H 'Content-Type: application/json' -d '{"name":"Alice","email":"a@x.com"}'
# 列表
curl localhost:3000/api/users
# 更新
curl -X PUT localhost:3000/api/users/1 -H 'Content-Type: application/json' -d '{"name":"Bob"}'
# 删除
curl -X DELETE localhost:3000/api/users/1
```

---

## 19. 测试：supertest

```bash
pnpm add -D supertest jest
```

```js
// app.test.js
const request = require('supertest');
const Koa = require('koa');
const Router = require('@koa/router');

function createApp() {
  const app = new Koa();
  const router = new Router();
  router.get('/ping', (ctx) => { ctx.body = { pong: true }; });
  app.use(router.routes());
  return app;
}

test('GET /ping 返回 pong', async () => {
  const res = await request(createApp().callback()).get('/ping');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ pong: true });
});
```

> 用 `app.callback()` 配合 `supertest`，无需真实监听端口即可测试。

---

## 20. TypeScript 支持

```bash
pnpm add koa @koa/router koa-bodyparser
pnpm add -D @types/koa @types/koa__router @types/koa-bodyparser typescript ts-node
```

```ts
import Koa from 'koa';
import Router from '@koa/router';

interface User {
  id: number;
  name: string;
}

const app = new Koa();
const router = new Router();

router.get('/users/:id', async (ctx) => {
  const id: number = Number(ctx.params.id);
  ctx.body = { id, name: 'Alice' } as User;
  ctx.status = 200;
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);
```

### 扩展 Context（声明合并）

```ts
// types/koa.d.ts
import 'koa';

declare module 'koa' {
  interface BaseContext {
    // 给 ctx.state 加类型
  }
  interface DefaultState {
    user?: { id: number; name: string };
  }
  interface DefaultContext {
    db: any; // 挂载的全局 db
  }
}
```

```ts
// 使用时获得类型提示
app.use(async (ctx) => {
  ctx.state.user; // 有类型
  ctx.db;         // 有类型
});
```

---

## 21. 常见坑与最佳实践

1. **不要直接操作 `ctx.res`**：Koa 管理了响应流程，直接 `ctx.res.end()` 会破坏中间件机制。用 `ctx.body` 即可。
2. **中间件必须调用 `await next()`**：忘了 await 会导致后续中间件不执行、响应迟迟不返回（悬挂）。
3. **`await next()` 要 try/catch 或靠外层错误中间件**：错误会向外冒泡，最外层一定要有错误处理中间件，否则进程崩溃。
4. **`ctx.body` 只能赋值一次**：后赋值的会覆盖前面的，且不能在 `await next()` 之后又改 body 多次（除非流式）。
5. **顺序很重要**：`bodyParser`、`static`、`router` 的注册顺序会影响请求处理；路由与 `allowedMethods` 一般放最后。
6. **`koa-bodyparser` 不支持文件上传**：文件要用 `koa-body` 或 `@koa/multer`。
7. **`app.keys` 必须设置才能用签名 cookie / session**：否则 `signed: true` 时抛错。
8. **中间件数组 vs 洋葱**：`app.use` 是顺序执行（洋葱），不是并行。耗时操作要 `await`，否则阻塞整个链。
9. **`ctx.throw` 比手动 `throw` 好**：它会自动设置 status 与 HTTP 语义。
10. **生产环境用 `app.proxy = true`**：部署在 Nginx / 网关后，否则 `ctx.ip` 永远拿不到真实 IP。
11. **不要用 `ctx.request.body` 在未用 bodyParser 时**：会 `undefined`。
12. **日志/监控放 `app.on('error')`**：而不是在每个 catch 里写库。

---

## 22. 与其他框架对比 & 学习路径

| 维度 | Koa | Express | Fastify |
|---|---|---|---|
| 中间件模型 | 洋葱（async/await） | 线性（回调） | 洋葱（async/await） |
| 性能 | 高 | 中 | 极高 |
| 内置能力 | 极少（极简） | 路由 + 中间件 | 路由 + 校验 + 序列化 |
| 路由 | 需 `@koa/router` | 内置 | 内置 |
| 类型友好 | 一般 | 一般 | 极佳 |
| 适合场景 | 想自己拼装、学习原理 | 传统项目、生态成熟 | 高性能 API、类型安全 |

**学习路径建议**
1. 先把本文 §3 最小示例跑通；
2. 手写 §4 洋葱模型日志，理解 `next()` 执行顺序；
3. 用 §11 路由 + §12 bodyParser 做 REST API；
4. 加 §16 错误处理中间件统一异常；
5. 接真实数据库（见 `node11_postgre.md` / `node23_redis.md`）；
6. 用 §19 supertest 写测试；
7. 生产化：CORS、helmet、compress、session、日志。

---

> 文档更新于 2026-10-21 · 基于 Koa 2.x / Node 18+
