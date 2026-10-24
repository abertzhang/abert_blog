---
title: Node.js 使用 Express 学习文档
create:2026-10-21
update:2026-10-21
category:nodejs
cover:https://img-common.aknot.uk/cover/land-41.jpg
tags:[node,express,http,middleware,routing,backend,api]
summary:Node.js 使用 Express 框架的详细学习文档，覆盖 app/路由/中间件/Request/Response/Router/错误处理/静态文件/模板引擎/安全实践，含完整示例与 Express 5 变更说明
keywords:[node,express,http,middleware,routing,backend,api]
top:1
copyright:true
---

# Node.js 使用 Express 学习文档

> 适用版本：**Express 5.x**（当前默认版本 `5.3.0`，2024-09 发布，需 Node ≥ 18）。文中示例以 Express 5 为准，并专门标注与 Express 4 的差异。
> 本文定位为「API 齐全 + 可运行示例」的学习/速查手册，不是替代官方文档；每节都附官方链接。

---

## ⚠️ 先澄清：Express 是什么

**Express 不是数据库**，而是 Node.js 上最流行的 **Web 应用框架**（HTTP 服务层）。它帮你优雅地处理「路由、中间件、请求/响应、静态文件、模板渲染」。它通常位于你的应用与 HTTP 客户端之间，内部再去查数据库（如前面学的 `node11_postgre.md` 用 `pg` 查 PostgreSQL）。

```
浏览器 / 前端  ──HTTP──▶  Express 服务  ──▶  业务逻辑  ──▶  PostgreSQL / Redis / ...
                          (路由+中间件+req/res)
```

---

## 目录

- [1. 安装与初始化](#1-安装与初始化)
- [2. 最小应用](#2-最小应用)
- [3. 应用对象 app 核心方法](#3-应用对象-app-核心方法)
- [4. 路由 Routing](#4-路由-routing)
- [5. 中间件 Middleware](#5-中间件-middleware)
- [6. Request 对象 req](#6-request-对象-req)
- [7. Response 对象 res](#7-response-对象-res)
- [8. 路由器对象 Router](#8-路由器对象-router)
- [9. 错误处理](#9-错误处理)
- [10. 静态文件服务](#10-静态文件服务)
- [11. 模板引擎](#11-模板引擎)
- [12. 常用第三方中间件速查](#12-常用第三方中间件速查)
- [13. 安全最佳实践](#13-安全最佳实践)
- [14. 实战：Express + PostgreSQL 博客 API](#14-实战express--postgresql-博客-api)
- [15. 参考文档](#15-参考文档)

---

## 1. 安装与初始化

### 1.1 安装

```bash
# Express 5 是当前默认版本
npm install express
# 或显式指定大版本
npm install "express@5"
# 类型（TypeScript 项目）
npm install -D @types/express
```

### 1.2 引入：CommonJS 与 ESM

```js
// CommonJS（Node 默认）
const express = require('express');
const app = express();

// ESM（package.json 中 "type": "module"）
import express from 'express';
const app = express();
```

### 1.3 express-generator

```
//
npx express-generator
//
npm install -g express-generator
```

```
```



### 1.3 版本与运行要求

| 项目 | 说明 |
|---|---|
| 当前默认版本 | **5.3.0**（2024-09 发布；`npm i express` 即装 5.x） |
| Node 要求 | ≥ 18（官方支持 4.x 与 5.x，4.x 未宣布 EOL） |
| 包管理器 | npm / yarn / pnpm / bun 均支持 |
| 关键依赖 | `path-to-regexp` v8（路由语法变更的来源）、`send`（静态文件）、`body-parser`（已内置） |

> **Express 4 → 5 升级提示**：Express 5 与 4 差异不大但**不向后兼容**。最易踩的坑：异步 handler 现在自动转发错误、路由通配符语法变化、`req.query` 只读、若干方法被移除。详见第 13 节与 [迁移指南](https://expressjs.com/en/guide/migrating-5/)。

---

## 2. 最小应用

```js
const express = require('express');
const app = express();
const port = 3000;

// 注册一个 GET / 路由
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// 启动监听
app.listen(port, () => {
  console.log(`示例应用监听在 http://localhost:${port}`);
});
```

运行：`node app.js`，浏览器访问 `http://localhost:3000`。

---

## 3. 应用对象 app 核心方法

`app` 是 Express 的顶层实例，几乎所有配置都从它开始。下表覆盖常用方法。

| 方法 | 作用 | 示例 |
|---|---|---|
| `app.listen(port, cb)` | 启动 HTTP 服务 | `app.listen(3000)` |
| `app.get/post/put/patch/delete(route, handler)` | 注册 HTTP 方法路由 | `app.post('/login', fn)` |
| `app.all(route, handler)` | 匹配所有 HTTP 方法 | `app.all('/api/*', auth)` |
| `app.route(path)` | 链式定义同一路径的多个方法 | `app.route('/book').get(fn).post(fn)` |
| `app.use([path,] fn)` | 挂载中间件 | `app.use(express.json())` |
| `app.param(name, fn)` | 路径参数预处理器 | `app.param('id', loadUser)` |
| `app.set(name, val)` | 设置程序变量 | `app.set('view engine', 'ejs')` |
| `app.get(name)` | 读取程序变量 | `app.get('env')` |
| `app.enable/disable(name)` | 布尔开关 | `app.disable('x-powered-by')` |
| `app.engine(ext, fn)` | 注册模板引擎 | `app.engine('html', ejs.renderFile)` |
| `app.locals` | 全局模板变量（所有视图可见） | `app.locals.title = 'Blog'` |
| `app.mountpath` | 被挂载到的路径 | 子应用挂载后读取 |

### 3.1 启动监听 `app.listen`

```js
// 返回 Node 原生 http.Server 实例，可用于优雅关闭
const server = app.listen(3000, '0.0.0.0', () => {
  console.log('listening on 0.0.0.0:3000');
});

// 优雅关闭
process.on('SIGTERM', () => {
  server.close(() => console.log('server closed'));
});
```

### 3.2 程序设置 `app.set` / `app.get`

```js
app.set('port', 3000);                 // 自定义变量
app.set('view engine', 'ejs');         // 模板引擎
app.set('views', './views');           // 视图目录
app.disable('x-powered-by');           // 关闭 X-Powered-By 头（安全建议）

console.log(app.get('env'));           // 'development' | 'production' | 自定义
console.log(app.get('port'));          // 3000
```

### 3.3 路径参数预处理 `app.param`

```js
// 当路由含 :userId 时，先执行该回调把用户载入 res.locals
app.param('userId', async (req, res, next, id) => {
  try {
    req.user = await db.users.findById(id);
    if (!req.user) return res.status(404).json({ error: '用户不存在' });
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/users/:userId', (req, res) => {
  res.json(req.user); // 已被 param 预加载
});
```

---

## 4. 路由 Routing

路由 = **HTTP 方法 + 路径 + 一个或多个处理函数**。

### 4.1 基本路由

```js
app.get('/books', (req, res) => res.send('列表'));
app.post('/books', (req, res) => res.send('创建'));
app.put('/books/:id', (req, res) => res.send('整体更新'));
app.patch('/books/:id', (req, res) => res.send('局部更新'));
app.delete('/books/:id', (req, res) => res.send('删除'));
```

### 4.2 同一路径多种方法：`app.route`

```js
app.route('/book')
  .get((req, res) => res.json({ id: 1, title: 'Express 指南' }))
  .post((req, res) => res.status(201).json({ created: true }))
  .put((req, res) => res.json({ updated: true }));
```

### 4.3 路径匹配（含 Express 5 语法变更）

```js
// 字符串
app.get('/about', fn);

// 命名参数（最常用）
app.get('/users/:userId/books/:bookId', (req, res) => {
  res.send(`用户 ${req.params.userId} 的书 ${req.params.bookId}`);
});

// 可选参数（Express 5 语法）
//   Express 4: '/user/:id?'
//   Express 5: 用正则式写法 '/user/:id{0,1}' 或在 handler 内自行判断
app.get('/user/:id{0,1}', (req, res) => {
  res.send(req.params.id ? `用户 ${req.params.id}` : '未指定用户');
});

// 零个或多个段（替代 Express 4 的 *）—— 必须用 {*splat}
//   Express 4: '/files/*'
//   Express 5: '/files/{*splat}'  或  '/files/*splat'
app.get('/files/{*splat}', (req, res) => {
  res.send(`路径: ${req.params.splat}`);
});

// 字符集/正则约束参数
app.get('/user/:id(\\d+)', (req, res) => res.send(`数字 id: ${req.params.id}`));
```

> **Express 5 重大变更（path-to-regexp v8）**：
> - 不再支持路径字符串中的**裸正则**（如 `'/a(b)?c'`），参数约束须写成 `:name(regex)`。
> - 通配符 `*` 不再是「任意段」，须用 `{*splat}` 表示「余下全部」。
> - 旧 `?` 可选语法建议改用 `{0,1}` 等重复语法。

### 4.4 多个处理函数（数组 / 链）

```js
// 多个回调按顺序执行，靠 next() 串联
const validate = (req, res, next) => {
  if (!req.body.title) return res.status(400).json({ error: 'title 必填' });
  next();
};
const save = (req, res) => res.status(201).json({ saved: true });

app.post('/posts', validate, save);

// 数组形式（适合从外部组合中间件）
app.get('/dashboard', [auth, logVisit], (req, res) => res.send('ok'));

// 数组 + 组合：一个 handler 数组里可以再嵌套数组
app.get('/x', [fn1, [fn2, fn3]], fn4);
```

---

## 5. 中间件 Middleware

中间件是「能访问 req、res、next 的函数」，用于在请求-响应周期中执行逻辑（鉴权、日志、解析 body 等）。

### 5.1 中间件类型

| 类型 | 注册方式 | 说明 |
|---|---|---|
| 应用级 | `app.use(fn)` | 全局或指定路径生效 |
| 路由级 | `router.use(fn)` | 仅在该 Router 内生效 |
| 错误处理 | `app.use((err,req,res,next)=>{})` | 4 个参数，签名区别于普通中间件 |
| 内置 | `express.json()` 等 | Express 自带 |
| 第三方 | `app.use(helmet())` 等 | npm 安装的 |

### 5.2 编写普通中间件

```js
// 日志中间件：打印方法、路径、耗时
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next(); // 必须调用，否则请求会挂起
});
```

### 5.3 Express 5 的异步中间件（重要）

```js
// Express 5：async handler 抛错/ rejects 会自动传到错误中间件，无需 try/catch 包裹
app.get('/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id); // 抛错会自动进错误处理
  if (!user) {
    const e = new Error('NOT_FOUND');
    e.status = 404;
    throw e; // 等价于 next(e)
  }
  res.json(user);
});

// Express 4 需要手动 try/catch 或 express-async-errors；Express 5 已内置此能力
```

### 5.4 内置中间件

```js
// 解析 JSON 请求体 → req.body（Express 4.16+ 内置）
app.use(express.json({ limit: '1mb' }));

// 解析 URL 编码表单 → req.body
app.use(express.urlencoded({ extended: true }));

// 解析纯文本
app.use(express.text());

// 解析原始二进制
app.use(express.raw({ type: 'application/octet-stream' }));

// 静态文件服务（见第 10 节）
app.use(express.static('public'));
```

### 5.5 常用第三方中间件（示例）

```js
const helmet = require('helmet');         // 安全头
const morgan = require('morgan');         // HTTP 日志
const cors = require('cors');             // 跨域
const cookieParser = require('cookie-parser');
const session = require('express-session');
const compression = require('compression');

app.use(helmet());
app.use(morgan('combined'));
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(cookieParser('签名密钥'));
app.use(session({ secret: 'xxxx', resave: false, saveUninitialized: false }));
app.use(compression());
```

---

## 6. Request 对象 req

`req` 封装了本次 HTTP 请求。下表覆盖常用属性/方法（**标 ⚠ 为 Express 5 变更点**）。

| 属性/方法 | 类型/返回 | 说明 |
|---|---|---|
| `req.params` | object | 路径参数，如 `/users/:id` → `{ id }` |
| `req.query` | object | 查询字符串 ⚠ **v5 只读 getter**（4 中可改写） |
| `req.body` | object | 解析后的请求体（需先挂 body 解析中间件） |
| `req.headers` | object | 请求头（小写键） |
| `req.get(field)` | string | 取请求头（大小写不敏感） |
| `req.path` | string | 路径部分（不含查询串） |
| `req.originalUrl` | string | 完整原始 URL |
| `req.url` | string | 路由层看到的 URL（挂载后被改写） |
| `req.method` | string | HTTP 方法 |
| `req.protocol` | string | `http` / `https` |
| `req.secure` | boolean | 是否 HTTPS |
| `req.hostname` / `req.host` | string | 主机名（v5 推荐 `req.host`） |
| `req.ip` | string | 客户端 IP（受 `trust proxy` 影响） |
| `req.ips` | array | 经代理后的 IP 链 |
| `req.cookies` | object | Cookie（需 cookie-parser） |
| `req.signedCookies` | object | 签名 Cookie |
| `req.xhr` | boolean | 是否 XMLHttpRequest（旧式 AJAX 标记） |
| `req.accepts(types)` | string\|false | 内容协商，返回首选类型 |
| `req.acceptsCharsets()` ⚠ | fn | 复数化（v4 为 `acceptsCharset`） |
| `req.acceptsLanguages()` ⚠ | fn | 语言协商 |
| `req.acceptsEncodings()` ⚠ | fn | 编码协商 |
| `req.is(type)` | string\|false | 判断 `Content-Type`，如 `req.is('json')` |
| `req.range(size)` | object | 解析 `Range` 头（断点续传） |
| `req.app` | object | 指向 Express app 实例 |

### 6.1 读取参数的三种来源

```js
app.get('/search', (req, res) => {
  const kw = req.query.q;        // ?q=express  → 'express'
  const id = req.params.id;      // /users/:id
  const token = req.body.token;  // POST/PUT 的 body（需先解析）
  res.json({ kw, id, token });
});
```

> **Express 5 注意**：`req.param(name)` 已从 Express 5 **移除**，必须显式从 `req.params` / `req.body` / `req.query` 取。`req.query` 变为只读，中间件不能再改写它。

### 6.2 内容协商与类型判断

```js
app.get('/data', (req, res) => {
  const type = req.accepts(['json', 'html']);
  if (type === 'json') return res.json({ ok: true });
  if (type === 'html') return res.send('<p>ok</p>');
  res.status(406).send('Not Acceptable');

  // 判断请求体类型
  if (req.is('application/json')) { /* ... */ }
});
```

### 6.3 客户端 IP 与信任代理

```js
// 在反向代理（nginx / 负载均衡）后正确获取真实 IP
app.set('trust proxy', true); // 或 'loopback' / 具体 IP

app.get('/me', (req, res) => {
  res.json({ ip: req.ip, ips: req.ips });
});
```

---

## 7. Response 对象 res

`res` 用于构造并发送响应。下表覆盖常用方法（**标 ⚠ 为 Express 5 变更点**）。

| 方法 | 作用 | 示例 |
|---|---|---|
| `res.send(body)` | 发送任意类型（string/buffer/object） | `res.send('hi')` / `res.send({a:1})` |
| `res.json(obj)` | 发送 JSON（自动设 Content-Type） | `res.json({ ok: true })` |
| `res.jsonp(obj)` | 带 JSONP 回调的 JSON | `res.jsonp({ ok: true })` |
| `res.status(code)` | 设状态码，**链式** | `res.status(201).json(x)` |
| `res.sendStatus(code)` | 设状态码并发送文本 | `res.sendStatus(404)` |
| `res.sendFile(path)` | 发送文件（绝对路径） | `res.sendFile(__dirname+'/a.png')` |
| `res.download(path)` | 触发浏览器下载 | `res.download('/tmp/a.zip')` |
| `res.redirect(url)` ⚠ | 302 重定向（`'back'` 已移除） | `res.redirect('/login')` |
| `res.render(view, data)` | 渲染模板引擎 | `res.render('home', { title })` |
| `res.set(field, val)` / `res.header()` | 设置响应头 | `res.set('X-API', '1')` |
| `res.get(field)` | 读取已设响应头 | `res.get('Content-Type')` |
| `res.cookie(name, val, opt)` | 设置 Cookie | `res.cookie('sid', 'x', { httpOnly: true })` |
| `res.clearCookie(name)` | 清除 Cookie | `res.clearCookie('sid')` |
| `res.location(url)` | 设 `Location` 头（不发送） | `res.location('/x').send()` |
| `res.links(obj)` | 设 `Link` 头 | `res.links({ next: '/2' })` |
| `res.type(type)` | 设 `Content-Type` | `res.type('application/json')` |
| `res.format(obj)` | 按 `Accept` 内容协商响应 | 见下例 |
| `res.attachment([name])` | 提示下载（设 Content-Disposition） | `res.attachment('a.txt')` |
| `res.append(field, val)` | 追加响应头（可多值） | `res.append('Set-Cookie', 'a=1')` |
| `res.vary(field)` | 设 `Vary` 头 | `res.vary('Accept-Encoding')` |
| `res.contentType(type)` | 同 `res.type` | `res.contentType('png')` |
| `res.end([data])` | 结束响应（不发送 body） | `res.end()` |
| `res.write(chunk)` | 流式分块写入（配合 end） | 用于大响应 |

### 7.1 状态码与响应体

```js
// Express 5：res.json(json, status) 已移除，必须链 status
res.status(201).json({ created: true });   // ✅ 正确
// res.json({ created: true }, 201);         // ❌ Express 5 不支持两参

res.sendStatus(204);                        // 204 No Content
res.status(400).send('参数错误');
```

### 7.2 内容协商 `res.format`

```js
app.get('/profile', (req, res) => {
  res.format({
    'text/html': () => res.send('<h1>Profile</h1>'),
    'application/json': () => res.json({ name: 'Ada' }),
    'default': () => res.status(406).send('Not Acceptable'),
  });
});
```

### 7.3 重定向（Express 5 变更）

```js
res.redirect('/login');
res.redirect(301, 'https://example.com');
res.redirect('back'); // ❌ Express 5 已移除；改用下一行
res.redirect(req.get('Referrer') || '/'); // ✅ 替代 'back'
```

### 7.4 Cookie 与签名

```js
app.use(require('cookie-parser')('签名密钥'));

app.get('/set', (req, res) => {
  res.cookie('session', 'abc', {
    httpOnly: true,   // JS 无法读取，防 XSS
    secure: true,     // 仅 HTTPS 下发
    sameSite: 'lax',  // CSRF 防护
    maxAge: 86400000, // 1 天
  });
  res.send('cookie set');
});

app.get('/signed', (req, res) => {
  res.cookie('uid', '123', { signed: true }); // 可经 req.signedCookies 读取
  res.send('signed cookie set');
});
```

### 7.5 发送文件与下载

```js
const path = require('path');

app.get('/avatar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'avatar.png'), (err) => {
    if (err) res.status(404).send('not found');
  });
});

app.get('/export', (req, res) => {
  res.download(path.join(__dirname, 'report.pdf'), 'report.pdf', (err) => {
    if (err) console.error(err);
  });
});
```

### 7.6 流式响应

```js
app.get('/stream', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.write('第一行\n');
  res.write('第二行\n');
  setTimeout(() => { res.write('第三行\n'); res.end(); }, 500);
});
```

---

## 8. 路由器对象 Router

`express.Router` 用于**模块化、可挂载**的路由（类似「迷你 app」），是组织中大型项目的首选。

```js
// routes/posts.js
const express = require('express');
const router = express.Router();

// 该 Router 内所有路由的前缀中间件（如鉴权）
router.use((req, res, next) => {
  console.log('访问 posts 模块:', req.originalUrl);
  next();
});

router.get('/', (req, res) => res.json({ list: [] }));
router.get('/:id', (req, res) => res.json({ id: req.params.id }));
router.post('/', (req, res) => res.status(201).json({ created: true }));

// 路径参数预处理器（Router 级）
router.param('id', (req, res, next, id) => {
  req.postId = id;
  next();
});

module.exports = router;
```

```js
// app.js —— 挂载 Router，并加统一前缀
const postsRouter = require('./routes/posts');
app.use('/api/posts', postsRouter); // → /api/posts, /api/posts/:id ...
```

| Router 方法 | 说明 |
|---|---|
| `router.get/post/...` | 注册路由（同 app） |
| `router.use([path,] fn)` | 路由级中间件 |
| `router.route(path)` | 链式多方法 |
| `router.param(name, fn)` | 参数预处理 |
| `router.all(path, fn)` | 匹配所有方法 |

---

## 9. 错误处理

### 9.1 错误中间件签名

错误中间件**比普通中间件多一个 `err` 参数**，且**必须 4 个参数**齐全，否则 Express 不会把它当作错误处理函数。

```js
// 错误处理中间件必须放在所有其他 app.use 和路由之后
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});
```

### 9.2 Express 5：异步错误自动转发

```js
// Express 5 中，下面 async handler 抛出/拒绝的错误会自动到达上面的错误处理中间件
app.get('/boom', async (req, res) => {
  await doSomethingThatThrows(); // 无需 try/catch 或 next(err)
});
```

### 9.3 主动抛出错误

```js
app.get('/users/:id', (req, res, next) => {
  const user = findUser(req.params.id);
  if (!user) {
    const err = new Error('用户不存在');
    err.status = 404;
    return next(err); // 交给错误中间件
  }
  res.json(user);
});
```

### 9.4 404 处理

```js
// 在所有路由之后、错误处理之前，捕获未匹配路由
app.use((req, res, next) => {
  res.status(404).json({ error: `找不到 ${req.originalUrl}` });
});
```

### 9.5 默认错误处理器

若没有自定义错误处理中间件，Express 会提供内置处理器：开发环境返回含堆栈的 HTML，生产环境返回 500 与简短信息。**生产务必设置 `NODE_ENV=production`**。

### 9.6 统一业务异常

```js
// 自定义异常类，便于统一处理
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// 抛出
app.get('/admin', (req, res, next) => {
  if (!req.user?.isAdmin) throw new HttpError(403, '无权限');
  res.send('admin');
});

// 捕获
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  res.status(500).json({ error: '服务器内部错误' });
});
```

---

## 10. 静态文件服务

`express.static(root, options)` 是 Express 内置的静态文件中间件。

```js
// 基本用法：把 public 目录映射为站点根
app.use(express.static('public')); // 访问 /style.css → public/style.css

// 带虚拟路径前缀
app.use('/static', express.static('public')); // 访问 /static/style.css

// 常用 options
app.use(express.static('public', {
  maxAge: '1d',             // 浏览器缓存
  etag: true,
  lastModified: true,
  dotfiles: 'ignore',       // ⚠ Express 5 默认值；'allow' 才允许 .well-known 等
  index: ['index.html'],
  redirect: true,
  fallthrough: true,        // true：找不到文件时继续下一个中间件（常用于 SPA）
}));
```

> **Express 5 变更**：`express.static` 的 `dotfiles` 默认值为 `ignore`（v4 是 `allow`）。若要通过 `/.well-known/` 暴露 ACME 校验文件，需显式设 `dotfiles: 'allow'`。

### 10.1 SPA 回退（history 模式）

```js
// 单页应用：未匹配的 GET 请求回退到 index.html
const path = require('path');
app.use(express.static('dist'));
app.get('{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

---

## 11. 模板引擎

```js
// 以 EJS 为例
// npm install ejs
app.set('view engine', 'ejs');     // 模板引擎
app.set('views', './views');       // 视图目录
app.engine('ejs', require('ejs').__express); // 注册（多数引擎可省略）

app.get('/', (req, res) => {
  res.render('home', {
    title: '首页',
    appName: app.locals.appName,
  });
});
```

```ejs
<!-- views/home.ejs -->
<h1><%= title %></h1>
<p>欢迎来到 <%= appName %></p>
```

| 常用引擎 | 包 | 语法风格 |
|---|---|---|
| EJS | `ejs` | `<%= %>` 嵌入式 JS |
| Pug | `pug` | 缩进式 |
| Handlebars | `hbs` | `{{ }}` |
| Nunjucks | `nunjucks` | `{{ }}` + 强大继承 |

---

## 12. 常用第三方中间件速查

| 包 | 作用 | 典型用法 |
|---|---|---|
| `helmet` | 设置安全响应头 | `app.use(helmet())` |
| `cors` | 跨域资源共享 | `app.use(cors())` |
| `morgan` | HTTP 请求日志 | `app.use(morgan('dev'))` |
| `cookie-parser` | 解析 Cookie | `app.use(cookieParser())` |
| `express-session` | 服务端 Session | `app.use(session({...}))` |
| `multer` | 解析 `multipart/form-data`（文件上传） | 见下方示例 |
| `compression` | gzip 压缩 | `app.use(compression())` |
| `express-rate-limit` | 限流防刷 | `app.use(rateLimit({...}))` |
| `express-validator` | 请求数据校验 | `body('email').isEmail()` |
| `passport` | 身份认证 | 策略化登录 |
| `csurf` | CSRF 防护 | `app.use(csrf())` |

### 12.1 文件上传（multer）

```js
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // 简单落盘
// 或内存/限流：multer({ storage, limits:{fileSize:5MB}, fileFilter })

// 单文件
app.post('/avatar', upload.single('avatar'), (req, res) => {
  res.json({ filename: req.file.filename, size: req.file.size });
});

// 多文件 / 多字段
app.post('/gallery', upload.array('photos', 9), (req, res) => {
  res.json({ count: req.files.length });
});

// 字段混合
app.post('/profile', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]), (req, res) => res.json({ ok: true }));
```
### 12.2 swagger文档

| 库                              | 特点                                     | 适合                       |
| ------------------------------- | ---------------------------------------- | -------------------------- |
| **`express-swagger-generator`** | 也是注释驱动，配置更少                   | 想要极简接入               |
| **`tsoa`**                      | 用 TypeScript 类型自动推断，不用手写注释 | 你如果项目改 TS 后强烈推荐 |
| **`@nestjs/swagger`**           | NestJS 官方                              | Nest 就用这个              |

#### express-swagger-generator

```javascript
npm i swagger-jsdoc swagger-ui-express
//
pnpm i swagger-jsdoc swagger-ui-express
```

```javascript
// 添加到app.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Abert Blog API', version: '1.0.0' },
  },
  apis: ['./routes/*.js'],   // 扫描哪些文件里的 JSDoc 注释
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

```javascript
/**
 * @swagger
 * /user/:id?:
 *   get:
 *     summary: 获取用户
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: string }
 *         required: false
 *     responses:
 *       200: { description: 成功 }
 */
app.get('/user/:id?', (req, res) => { ... });
```

```
//
//启动后访问 `http://localhost:PORT/api-docs` 就能看到可交互的 API 文档页面
```



### 12.3

> 2026-06 官方发布 multer 安全更新，建议使用最新版并限制文件大小/类型。

---

## 13. 安全最佳实践

1. **关闭 `X-Powered-By`**：`app.disable('x-powered-by')`。
2. **上 helmet**：`app.use(helmet())` 自动设 CSP/HSTS/XSS-Protection 等。
3. **生产设 `NODE_ENV=production`**：隐藏错误堆栈。
4. **CORS 白名单**：不要 `cors()` 全开，限定 `origin`。
5. **Cookie 安全**：`httpOnly` + `secure` + `sameSite`。
6. **限流防刷**：`express-rate-limit` 保护登录/短信等接口。
7. **输入校验**：用 `express-validator` 校验所有外部输入，防注入/越权。
8. **文件上传限制**：`multer` 限定 `fileSize` 与扩展名白名单。
9. **不要暴露堆栈**：自定义错误中间件返回通用信息。
10. **`trust proxy` 正确配置**：在反向代理后设置，否则 `req.ip` 不准。
11. **Express 5 迁移检查**：确保 `req.query` 不被改写、路由通配符已改为 `{*splat}`、`res.json(obj,status)` 已改链 `status`。
12. **依赖审计**：`npm audit`，及时升级（如 multer/morgan 安全补丁）。

---

## 14. 实战：Express + PostgreSQL 博客 API

结合前面 `node11_postgre.md` 的 `pg`，搭一个最小博客 API（含路由模块化、错误处理、参数校验）。

```js
// app.js
const express = require('express');
const { Pool } = require('pg');
const postsRouter = require('./routes/posts');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// 把 db 挂到 app.locals，路由里通过 req.app.locals.db 取用
const app = express();
app.locals.db = pool;

app.disable('x-powered-by');
app.use(express.json());

app.get('/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});

app.use('/api/posts', postsRouter);

// 404
app.use((req, res) => res.status(404).json({ error: 'not found' }));

// 错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'server error' });
});

app.listen(3000, () => console.log('blog api on :3000'));
```

```js
// routes/posts.js
const express = require('express');
const router = express.Router();

// 列表（含分页）
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const size = Math.min(50, parseInt(req.query.size) || 10);
    const offset = (page - 1) * size;
    const { rows } = await req.app.locals.db.query(
      'SELECT id,title,created_at FROM posts ORDER BY id DESC LIMIT $1 OFFSET $2',
      [size, offset]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// 详情
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await req.app.locals.db.query(
      'SELECT * FROM posts WHERE id=$1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: '不存在' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// 创建（参数校验示例）
router.post('/', async (req, res, next) => {
  const { title, body } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title/body 必填' });
  try {
    const { rows } = await req.app.locals.db.query(
      'INSERT INTO posts(title,body) VALUES($1,$2) RETURNING *',
      [title, body]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
```

> 运行前需建表：`CREATE TABLE posts(id SERIAL PRIMARY KEY, title TEXT, body TEXT, created_at TIMESTAMPTZ DEFAULT now());`。完整 `pg` 用法见 `node11_postgre.md`。

---

## 15. 参考文档

本文档的方法签名、参数与默认行为均以 Express 官方资料为准。下方按主题列出权威入口。

- **Express 官方首页**：[expressjs.com](https://expressjs.com/)
- **中文文档**：https://www.expressjs.com.cn/zh-cn/
- **Express 中文网**：[express.nodejs.cn](https://express.nodejs.com/zh-cn/)
- **Express 5 迁移指南（4→5 破坏性变更全表）**：[Migrating to Express 5](https://expressjs.com/en/guide/migrating-5/)
- **Express 4 迁移指南（对照参考）**：[Migrating to Express 4](https://expressjs.com/en/guide/migrating-4.html)
- **Express 中文指南**：[expressjs.com 中文文档](https://expressjs.com/zh-cn/)
- **应用对象 app API**：[Express API Reference - app](https://expressjs.com/en/4x/api.html#app)
- **Request 对象 req**：[req API Reference](https://expressjs.com/en/4x/api.html#req)
- **Response 对象 res**：[res API Reference](https://expressjs.com/en/4x/api.html#res)
- **Router 对象**：[express.Router](https://expressjs.com/en/4x/api.html#router)
- **中间件编写指南**：[Writing middleware](https://expressjs.com/en/guide/writing-middleware.html)
- **使用中间件**：[Using middleware](https://expressjs.com/en/guide/using-middleware.html)
- **路由指南**：[Routing](https://expressjs.com/en/guide/routing.html)
- **错误处理指南**：[Error handling](https://expressjs.com/en/guide/error-handling.html)
- **静态文件服务**：[Serving static files](https://expressjs.com/en/starter/static-files.html)
- **模板引擎**：[Using template engines](https://expressjs.com/en/guide/using-template-engines.html)
- **第三方中间件列表**：[Third-party middleware](https://expressjs.com/en/resources/middleware.html)
- **helmet（安全头）**：[helmetjs.github.io](https://helmetjs.github.io/)
- **body-parser（已内置说明）**：[body-parser](https://expressjs.com/en/resources/middleware/body-parser.html)
- **multer（文件上传）**：[multer on GitHub](https://github.com/expressjs/multer)

> 说明：Express 5 是当前默认版本，但官方 API 参考页仍大量以「4x」路径托管（5.x 与 4.x API 基本同构），文中示例已针对 5.x 行为校正。若 SDK 后续有大版本变动，请以官方 reference 最新说明为准。
