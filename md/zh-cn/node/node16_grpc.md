---
title: Node.js 使用 gRPC 学习文档
create:2026-10-21
update:2026-10-21
category:rpc
tags:[node,grpc,rpc,protobuf,backend,microservice]
summary:Node.js 使用 gRPC 的学习文档，覆盖 @grpc/grpc-js、四种 RPC 类型、Metadata、TLS 与拦截器
keywords:[node,grpc,rpc,protobuf,stream,microservice]
top:1
copyright:true
---

# Node.js 使用 gRPC 学习文档

> 适用版本：`@grpc/grpc-js`（纯 JS 实现，最新稳定 1.14.x，2026）+ `@grpc/proto-loader` 0.8.x，Node ≥ 12.10（推荐 18/20/22 LTS）。
> 本文档聚焦「在 Node.js 里用 gRPC 编写服务端 / 客户端」，接口尽量齐全，每个主题都给可运行示例。
> 示例采用现代 **ESM（`import`）** 写法（与本项目 `type: module` 一致）；若用 CommonJS，把 `import` 换成 `require()` 即可。

---

## ⚠️ 先澄清：gRPC 不是数据库

和前面 `node13_graphql.md` 一样，先纠一个常见误解：

- **gRPC 是 RPC（远程过程调用）框架**，不是数据库。它让你像调用本地函数一样调用另一台机器上的方法。
- 数据交换格式用 **Protocol Buffers（protobuf）**，传输层跑在 **HTTP/2** 上。
- 它通常位于「客户端应用 ↔ 服务端应用」之间；服务端方法内部再去查 PostgreSQL / Redis 等（正好衔接 `node11_postgre.md`）。
- gRPC 与 REST 的核心区别：强类型契约（`.proto`）、二进制高效序列化、原生支持流式（服务器/客户端/双向）。

---

## 目录

- [1. 核心概念与生态库](#1-核心概念与生态库)
- [2. 安装与项目骨架](#2-安装与项目骨架)
- [3. Protocol Buffers 基础（.proto 语法）](#3-protocol-buffers-基础proto-语法)
- [4. 加载 .proto（proto-loader）](#4-加载-protoproto-loader)
- [5. 服务端：构建并启动](#5-服务端构建并启动)
- [6. 客户端：构造 stub 与调用](#6-客户端构造-stub-与调用)
- [7. 四种 RPC 类型完整示例](#7-四种-rpc-类型完整示例)
- [8. Metadata（元数据 / 传参 / 鉴权）](#8-metadata元数据--传参--鉴权)
- [9. 错误处理与状态码](#9-错误处理与状态码)
- [10. 截止时间（Deadline）与超时](#10-截止时间deadline与超时)
- [11. 安全传输：TLS / mTLS](#11-安全传输tls--mtls)
- [12. 认证：拦截器 + Metadata](#12-认证拦截器--metadata)
- [13. 客户端拦截器（日志 / 重试 / 注入）](#13-客户端拦截器日志--重试--注入)
- [14. 连接与通道状态](#14-连接与通道状态)
- [15. 服务端流式背压与取消](#15-服务端流式背压与取消)
- [16. 连接保持（Keepalive）与通道选项](#16-连接保持keepalive与通道选项)
- [17. 服务器反射与健康检查](#17-服务器反射与健康检查)
- [18. 与数据库结合（实战：BlogService → PostgreSQL）](#18-与数据库结合实战blogservice--postgresql)
- [19. 调试工具](#19-调试工具)
- [20. 最佳实践清单](#20-最佳实践清单)
- [21. 参考文档](#21-参考文档)

---

## 1. 核心概念与生态库

### 1.1 三种“服务方法”类型（proto 里定义）

| 类型 | proto 写法 | 客户端 → 服务端 | 适用场景 |
|---|---|---|---|
| 一元（Unary） | `rpc Get(A) returns (B)` | 一次请求 / 一次响应 | 普通 CRUD、查询 |
| 服务端流（Server streaming） | `rpc List(A) returns (stream B)` | 一次请求 / 多个响应 | 流式推送、大列表 |
| 客户端流（Client streaming） | `rpc Upload(stream A) returns (B)` | 多个请求 / 一次响应 | 文件上传、批量写入 |
| 双向流（Bidirectional） | `rpc Chat(stream A) returns (stream B)` | 多个请求 / 多个响应 | 聊天、实时订阅 |

### 1.2 库选型（务必用纯 JS 版）

| 包名 | 状态 | 说明 |
|---|---|---|
| **`@grpc/grpc-js`** | ✅ 推荐 | 纯 JavaScript 实现，无原生编译、跨平台、Node ≥12.10 可用 |
| `grpc`（C++ addon） | ❌ 已弃用 | 2021-04 起废弃，仅支持到 Node 14，勿再使用 |
| `@grpc/proto-loader` | ✅ 必须 | 运行时加载 `.proto`，配合 `loadPackageDefinition` |
| `grpc-tools` / `@grpc/proto-loader` | 可选 | 静态代码生成（`protoc` 插件） |
| `grpc-health-check` | ✅ 推荐 | 标准健康检查服务 |
| `@grpc/reflection` | ✅ 推荐 | 服务端反射，便于 `grpcurl` 调试 |

---

## 2. 安装与项目骨架

```bash
# 运行时依赖
npm install @grpc/grpc-js@^1.14 @grpc/proto-loader@^0.8

# 调试 / 运维常用（可选）
npm install -D grpc-health-check @grpc/reflection grpcurl
```

```
grpc-blog/
├── proto/
│   └── blog.proto          # 契约：服务与消息定义
├── server.js               # gRPC 服务端
├── client.js               # gRPC 客户端
└── db.js                   # 模拟数据源（实战里换成 pg）
```

> 若项目是 CommonJS（`"type": "commonjs"` 或无该字段），把下面所有 `import` 改成 `require`，并把 `export` 改成 `module.exports` 即可。

---

## 3. Protocol Buffers 基础（.proto 语法）

### 3.1 最小示例

```proto
syntax = "proto3";              // 推荐 proto3

package blog.v1;                // 包名，影响 JS 里的命名空间

// 消息：数据结构
message Article {
  string id = 1;                // 字段编号（已序列化后的二进制标签，不可复用/改）
  string title = 2;
  string content = 3;
  int64  created_at = 4;
  repeated string tags = 5;     // 数组
}

// 服务：方法集合
service BlogService {
  rpc GetArticle (GetArticleRequest) returns (Article) {}            // 一元
  rpc ListArticles (ListArticlesRequest) returns (stream Article) {} // 服务端流
}
```

### 3.2 字段类型映射（proto3 ↔ JS）

| proto3 类型 | JS 取值 | 备注 |
|---|---|---|
| `double` / `float` | `number` | |
| `int32` `sint32` `sfixed32` | `number` | |
| `int64` `uint64` `fixed64` `sfixed64` | `number` 或 `string` | 默认 `number`（可能丢精度），用 `longs: String` 转字符串 |
| `bool` | `boolean` | |
| `string` | `string` | |
| `bytes` | `Buffer` | |
| `enum` | `number`（或 `string`，`enums: String`） | |
| `message` | 嵌套对象 | |
| `map<K,V>` | 普通对象 `{}` | |
| `repeated T` | 数组 `T[]` | |

### 3.3 常用语法

```proto
message CreateArticleRequest {
  string title   = 1;
  string content = 2;
  string author  = 3;
}

// 枚举
enum Status { UNKNOWN = 0; DRAFT = 1; PUBLISHED = 2; }

// oneof：同一时刻只有一个字段被设置
message Update {
  oneof payload {
    string text = 1;
    bytes  media = 2;
  }
}

// map
message Meta { map<string, string> labels = 1; }

// 客户端流：批量创建
rpc BatchCreateArticles (stream CreateArticleRequest) returns (BatchSummary) {}

// 双向流：实时订阅文章变更
rpc WatchArticles (stream WatchRequest) returns (stream ArticleEvent) {}
```

> 规则：字段编号 `1–15` 占 1 字节，尽量给高频字段；删除字段后**编号不要再复用**（用 `reserved` 标记）。

---

## 4. 加载 .proto（proto-loader）

### 4.1 loadSync + loadPackageDefinition

```js
// proto.js
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'node:path';

const packageDefinition = protoLoader.loadSync(
  path.join(import.meta.dirname, 'proto/blog.proto'),
  {
    keepCase: true,     // 保留 snake_case（否则默认转 camelCase）
    longs: String,      // int64 等以字符串返回，避免精度丢失
    enums: String,      // 枚举以字符串返回（更易读）
    defaults: true,     // 未传字段补默认值（0 / '' / false）
    oneofs: true,       // 生成 oneof 辅助字段
  }
);

// 把定义加载成可构造 client / 注册 service 的对象
const proto = grpc.loadPackageDefinition(packageDefinition);

// 命名空间结构与 package + service 对应
//   proto.blog.v1.BlogService            -> 客户端构造器
//   proto.blog.v1.BlogService.service    -> 服务端 service 描述符
export const BlogService = proto.blog.v1.BlogService;
```

### 4.2 选项说明

| 选项 | 取值 | 作用 |
|---|---|---|
| `keepCase` | `true/false` | 是否保留原始命名（推荐 `true`） |
| `longs` | `String` / `Number` / `Array` | 64 位整数的 JS 表示 |
| `enums` | `String` / `Number` | 枚举返回字符串还是数字 |
| `defaults` | `true/false` | 是否填充字段默认值 |
| `oneofs` | `true/false` | 是否生成 oneof 成员 |
| `includeDirs` | `string[]` | 引入 `import "xxx.proto"` 的搜索路径 |

> `loadSync` 是同步加载（启动时用）；运行期热加载可用 `await protoLoader.load(...)`（异步）。

---

## 5. 服务端：构建并启动

### 5.1 完整骨架（含四种方法实现）

```js
// server.js
import * as grpc from '@grpc/grpc-js';
import { BlogService } from './proto.js';
import * as handlers from './handlers.js';   // 见第 7 节

const server = new grpc.Server({
  // 通道/消息大小上限（字节），默认约 4MB
  'grpc.max_receive_message_length': 16 * 1024 * 1024,
  'grpc.max_send_message_length': 16 * 1024 * 1024,
});

// 注册服务：第一个参数是描述符，第二个是方法实现对象
server.addService(BlogService.service, {
  GetArticle: handlers.getArticle,
  ListArticles: handlers.listArticles,
  CreateArticle: handlers.createArticle,
  BatchCreateArticles: handlers.batchCreateArticles,
  WatchArticles: handlers.watchArticles,
});

// bindAsync 取代旧版 bind；回调里再 start()
server.bindAsync(
  '0.0.0.0:50051',
  grpc.ServerCredentials.createInsecure(), // 开发用；生产见第 11 节 TLS
  (err, port) => {
    if (err) throw err;
    server.start();
    console.log(`gRPC server listening on ${port}`);
  }
);
```

### 5.2 Server 关键 API

| API | 作用 |
|---|---|
| `new grpc.Server(options?)` | 创建服务端，`options` 可设消息大小/keepalive |
| `server.addService(serviceDef, impl)` | 注册一个服务（可多次调用注册多个） |
| `server.bindAsync(addr, creds, cb)` | 异步绑定地址；`creds` 为 `ServerCredentials` |
| `server.bind(addr, creds)` | ⚠️ 旧 API，已不推荐 |
| `server.start()` | 开始接收请求（必须在 `bindAsync` 回调里调用） |
| `server.tryShutdown(cb)` / `server.forceShutdown()` | 优雅/强制关闭 |
| `server.addService` 多次 | 同一 server 可挂载多个 `.proto` 服务 |

### 5.3 优雅关闭

```js
async function shutdown(server) {
  await new Promise((resolve) => server.tryShutdown(resolve));
  console.log('server shut down');
}
process.on('SIGINT', () => shutdown(server));
process.on('SIGTERM', () => shutdown(server));
```

---

## 6. 客户端：构造 stub 与调用

### 6.1 构造客户端

```js
// client.js
import * as grpc from '@grpc/grpc-js';
import { BlogService } from './proto.js';

const client = new BlogService(
  'localhost:50051',
  grpc.credentials.createInsecure() // 开发用；生产见 createSsl
  // { interceptors: [loggingInterceptor] }  // 第三个参数是 ClientOptions
);

// 用完关闭连接（避免进程挂起）
// client.close();
```

### 6.2 客户端方法签名（一元）

```js
// 四种等效调用形式（元数据/选项均可省略）
client.GetArticle(request, callback);
client.GetArticle(request, metadata, callback);
client.GetArticle(request, metadata, options, callback);
// options 可含：{ deadline, credentials, propagateFlags, parent }
```

### 6.3 客户端关键 API

| API | 作用 |
|---|---|
| `new Service(address, credentials, options?)` | 构造客户端 stub |
| `client.waitForReady(deadline, cb)` | 等待通道就绪再发请求 |
| `client.getChannel()` | 取底层 Channel（看连接状态） |
| `client.close()` | 关闭通道，释放连接 |
| `client.makeUnaryRequest(...)` | 底层一元调用（一般不直接用） |

---

## 7. 四种 RPC 类型完整示例

沿用 `blog.proto` 中的 `BlogService`。下面给出**服务端实现**与**客户端调用**一一对应。

### 7.1 一元（Unary）—— GetArticle / CreateArticle

**服务端**

```js
// handlers.js
export function getArticle(call, callback) {
  const { id } = call.request;
  const article = db.get(id);          // 假设 db 为数据源
  if (!article) {
    // 返回错误：第一个参数为 error 对象（见第 9 节）
    callback({
      code: grpc.status.NOT_FOUND,
      details: `article ${id} not found`,
    });
    return;
  }
  callback(null, article);             // 成功：null + 响应消息
}

export function createArticle(call, callback) {
  const { title, content, author } = call.request;
  const article = db.create({ title, content, author });
  callback(null, article);
}
```

**客户端**

```js
client.getArticle({ id: 'a-1' }, (err, article) => {
  if (err) { console.error(err.code, err.details); return; }
  console.log('got:', article.title);
});

client.createArticle({ title: 'Hi', content: 'body', author: 'me' }, (err, a) => {
  if (err) return console.error(err);
  console.log('created id:', a.id);
});
```

### 7.2 服务端流（Server streaming）—— ListArticles

**服务端**：用 `call.write()` 逐个发送，`call.end()` 结束。

```js
export function listArticles(call) {
  const { page_size } = call.request;
  const articles = db.list(page_size || 10);
  for (const a of articles) {
    call.write(a);                    // 发送一条消息
  }
  call.end();                         // 发送完毕
}
```

**客户端**：拿到的是 `Readable` 流，监听 `data / end / error / status`。

```js
const call = client.listArticles({ page_size: 5 });
call.on('data', (article) => console.log('article:', article.title));
call.on('end', () => console.log('--- stream ended ---'));
call.on('error', (e) => console.error('stream error', e));
call.on('status', (status) => console.log('final status', status.code));
```

### 7.3 客户端流（Client streaming）—— BatchCreateArticles

**服务端**：`call` 是 `Readable`，用 `data / end` 收完，最后 `callback` 返回单条汇总。

```js
export function batchCreateArticles(call, callback) {
  let count = 0;
  call.on('data', (req) => {
    db.create(req);
    count++;
  });
  call.on('end', () => {
    callback(null, { count });        // 全部收完，返回一次响应
  });
  call.on('error', (e) => callback(e));
}
```

**客户端**：拿到 `Writable` 流，反复 `write()` 后 `end()`。

```js
const call = client.batchCreateArticles((err, summary) => {
  if (err) return console.error(err);
  console.log('created total:', summary.count);
});

call.write({ title: 'A', content: '...', author: 'me' });
call.write({ title: 'B', content: '...', author: 'me' });
call.write({ title: 'C', content: '...', author: 'me' });
call.end();                          // 必须 end，否则服务端收不到 end
```

### 7.4 双向流（Bidirectional）—— WatchArticles

**服务端**：`call` 是 `Duplex`，可读可写，收发顺序互不依赖。

```js
export function watchArticles(call) {
  call.on('data', (req) => {
    // 收到客户端订阅请求，可立即回推，也可后续异步推送
    console.log('client watch filter:', req.filter);
    call.write({ type: 'ack', article: null });
  });
  call.on('end', () => call.end());
  call.on('error', (e) => console.error(e));
}
```

**客户端**：`Duplex`，一边 `write` 一边 `on('data')`。

```js
const call = client.watchArticles();
call.on('data', (evt) => console.log('event:', evt.type));

call.write({ filter: 'tech' });
call.write({ filter: 'life' });

// 想停止：call.end();
```

> 流式方法（非一元）的客户端调用**不传 callback**，返回的是一个流对象（`ClientReadableStream` / `ClientWritableStream` / `ClientDuplexStream`）。

---

## 8. Metadata（元数据 / 传参 / 鉴权）

Metadata 类似 HTTP 头，用于传递鉴权 token、请求 ID、追踪信息等，不参与业务 proto 定义。

### 8.1 创建与发送

```js
const meta = new grpc.Metadata();
meta.add('authorization', 'Bearer ' + token);  // 可重复 add（同名多值）
meta.set('x-request-id', 'req-123');            // set 覆盖同名
meta.set('trace-bin', Buffer.from([1, 2, 3]));  // 二进制值用 Buffer

// 一元：作为第 2 个参数
client.getArticle({ id: 'a-1' }, meta, (err, a) => {});

// 流式：作为第 2 个参数
const call = client.listArticles({ page_size: 3 }, meta);
```

### 8.2 服务端读取

```js
export function getArticle(call, callback) {
  const token = call.metadata.get('authorization')[0]; // 返回数组
  if (!token) {
    callback({ code: grpc.status.UNAUTHENTICATED, details: 'missing token' });
    return;
  }
  // ...
}
```

### 8.3 服务端回写响应头 / 尾随元数据

```js
export function getArticle(call, callback) {
  // 先回初始元数据（响应头）
  call.sendMetadata(new grpc.Metadata());
  callback(null, article, /* trailing metadata */ new grpc.Metadata());
}
```

---

## 9. 错误处理与状态码

gRPC 用**标准状态码**表达错误，而不是 HTTP 状态码。错误通过回调的 `err` 或流的 `error` 事件传递。

### 9.1 状态码全表（`grpc.status`）

| 值 | 名称 | 含义 / 典型用途 |
|---|---|---|
| 0 | `OK` | 成功 |
| 1 | `CANCELLED` | 客户端取消 |
| 2 | `UNKNOWN` | 未知错误（兜底） |
| 3 | `INVALID_ARGUMENT` | 参数非法（类似 400） |
| 4 | `DEADLINE_EXCEEDED` | 超时 |
| 5 | `NOT_FOUND` | 资源不存在（类似 404） |
| 6 | `ALREADY_EXISTS` | 资源已存在（类似 409） |
| 7 | `PERMISSION_DENIED` | 无权限（未认证/未授权） |
| 8 | `RESOURCE_EXHAUSTED` | 限流/配额（类似 429） |
| 9 | `FAILED_PRECONDITION` | 操作前提不满足 |
| 10 | `ABORTED` | 并发冲突（如写冲突） |
| 11 | `OUT_OF_RANGE` | 超出范围 |
| 12 | `UNIMPLEMENTED` | 方法未实现（类似 501） |
| 13 | `INTERNAL` | 服务端内部错误（类似 500） |
| 14 | `UNAVAILABLE` | 服务不可用（可重试，类似 503） |
| 15 | `DATA_LOSS` | 数据损坏 |
| 16 | `UNAUTHENTICATED` | 未认证（类似 401） |

### 9.2 服务端返回错误

```js
// 一元 / 客户端流：通过 callback 的第一个参数
callback({
  code: grpc.status.INVALID_ARGUMENT,
  details: 'title must not be empty',
  // 可选：附带元数据（如错误字段）
  metadata: new grpc.Metadata(),
});

// 服务端流 / 双向流：用 call 发出错误
call.emit('error', {
  code: grpc.status.INTERNAL,
  details: 'db failure',
});
// 或者销毁调用
call.destroy({
  code: grpc.status.INTERNAL,
  details: 'db failure',
});
```

### 9.3 客户端捕获错误

```js
client.getArticle({ id: 'x' }, (err, article) => {
  if (err) {
    console.error('code =', err.code);        // 5 (NOT_FOUND)
    console.error('details =', err.details);  // 文本
    console.error('metadata =', err.metadata);// 尾随元数据
    return;
  }
});

// 流式：监听 error 事件
call.on('error', (err) => {
  console.error(err.code, err.details);
});
// 并在 status 事件里看最终状态
call.on('status', (status) => {
  console.log(status.code, status.details, status.metadata);
});
```

> 一元调用：错误进 `callback` 的 `err`；流式调用：错误进 `error` 事件（且 `end` 不会触发）。

---

## 10. 截止时间（Deadline）与超时

gRPC 没有“超时”概念，只有 **deadline（绝对时间点）**：超过该时刻仍未完成即返回 `DEADLINE_EXCEEDED`。

```js
// 方式一：用 options 设置（推荐，一元）
client.getArticle(
  { id: 'a-1' },
  metadata,
  { deadline: new Date(Date.now() + 2000) }, // 2 秒后截止
  (err, a) => {
    if (err && err.code === grpc.status.DEADLINE_EXCEEDED) {
      console.error('请求超时');
    }
  }
);

// 方式二：拿到 call 后再 setDeadline
const call = client.getArticle({ id: 'a-1' }, callback);
call.setDeadline(new Date(Date.now() + 2000));

// 等待通道就绪（避免一上来就发请求但还没连上）
const deadline = new Date(Date.now() + 5000);
client.waitForReady(deadline, (err) => {
  if (err) return console.error('not ready');
  client.getArticle({ id: 'a-1' }, callback);
});
```

> Deadline 会**沿调用链传播**：若 A 调 B 且 A 剩余 1 秒，B 拿到的 deadline 也是那一秒，避免级联卡死。

---

## 11. 安全传输：TLS / mTLS

开发期用 `createInsecure()` 即可；**生产环境必须用 TLS**（至少单向，内网服务建议双向 mTLS）。

### 11.1 服务端启用 TLS

```js
import fs from 'node:fs';

const rootCert = fs.readFileSync('certs/ca.pem');
const serverKey = fs.readFileSync('certs/server.key');
const serverCert = fs.readFileSync('certs/server.crt');

// 单向 TLS（仅服务端证书）
const serverCreds = grpc.ServerCredentials.createSsl(
  rootCert,                       // 受信任的根证书（校验客户端可选）
  [{ private_key: serverKey, cert_chain: serverCert }]
);

// 双向 mTLS（第 3 个参数为 true：要求客户端也提供证书）
const mtlsCreds = grpc.ServerCredentials.createSsl(
  rootCert,
  [{ private_key: serverKey, cert_chain: serverCert }],
  true                            // require client cert
);

server.bindAsync('0.0.0.0:50051', mtlsCreds, (err, port) => { /* ... */ });
```

### 11.2 客户端启用 TLS

```js
const rootCert = fs.readFileSync('certs/ca.pem');
const clientKey = fs.readFileSync('certs/client.key');
const clientCert = fs.readFileSync('certs/client.crt');

const clientCreds = grpc.credentials.createSsl(rootCert, clientKey, clientCert);
const client = new BlogService('localhost:50051', clientCreds);
```

### 11.3 忽略域名校验（仅测试）

```js
// 自签证书且 hostname 不匹配时，开发可用（生产勿用）
const clientCreds = grpc.credentials.createSsl(
  rootCert, clientKey, clientCert,
  { checkServerIdentity: () => undefined } // 跳过校验
);
```

---

## 12. 认证：拦截器 + Metadata

把 token 统一注入，比在每个调用里手写 `meta.add` 更干净（见下一节拦截器）。服务端在 handler 里校验。

**服务端校验示例**

```js
function requireAuth(call, next) {
  const [token] = call.metadata.get('authorization') || [];
  if (token !== 'Bearer secret') {
    return { code: grpc.status.UNAUTHENTICATED, details: 'invalid token' };
  }
  return null;
}

export function getArticle(call, callback) {
  const authErr = requireAuth(call);
  if (authErr) return callback(authErr);
  // ...业务逻辑
}
```

**另一种注入方式：`createFromMetadataGenerator` + 组合凭证**

除了拦截器，也可以用「调用凭证生成器」把 token 自动塞进每条请求，再与 TLS 凭证组合：

```js
import * as grpc from '@grpc/grpc-js';

// 生成每次调用都附带的 metadata（适合 OAuth / 短期 token）
const callCreds = grpc.credentials.createFromMetadataGenerator((args, cb) => {
  const meta = new grpc.Metadata();
  meta.add('authorization', 'Bearer ' + getToken());
  cb(null, meta);
});

// 与 TLS（SSL）凭证组合成通道凭证
const channelCreds = grpc.credentials.combineChannelCredentials(sslCreds, callCreds);
const client = new BlogService('localhost:50051', channelCreds);
```

---

## 13. 客户端拦截器（日志 / 重试 / 注入）

拦截器是「包裹每次调用」的函数，适合做日志、鉴权注入、重试、链路追踪。

```js
import { InterceptingCall } from '@grpc/grpc-js';

// 1) 日志拦截器
function loggingInterceptor(options, nextCall) {
  const call = nextCall(options);
  console.log('-->', options.method_definition?.path);
  return new InterceptingCall(call, {
    onReceiveMessage(message, next) {
      console.log('<--', message);
      next(message);
    },
  });
}

// 2) 鉴权注入拦截器（自动带 token）
function authInterceptor(getToken) {
  return (options, nextCall) => {
    const call = nextCall(options);
    return new InterceptingCall(call, {
      start(metadata, listener, next) {
        metadata.add('authorization', 'Bearer ' + getToken());
        next(metadata, listener);
      },
    });
  };
}

// 3) 简易重试拦截器
function retryInterceptor(max = 2) {
  return (options, nextCall) => {
    const call = nextCall(options);
    let attempts = 0;
    return new InterceptingCall(call, {
      onReceiveStatus(status, next) {
        if (status.code === grpc.status.UNAVAILABLE && attempts < max) {
          attempts++;
          // 重新发起（简化；生产用更严谨的重试策略）
          return;
        }
        next(status);
      },
    });
  };
}

// 组合使用
const client = new BlogService('localhost:50051', grpc.credentials.createInsecure(), {
  interceptors: [
    loggingInterceptor,
    authInterceptor(() => process.env.TOKEN),
    retryInterceptor(2),
  ],
});
```

> 拦截器也可**全局**注册：`grpc.Client.prototype` 改造不推荐；优先用 `new Service(addr, creds, { interceptors })` 传参。

---

## 14. 连接与通道状态

```js
const channel = client.getChannel();

// 连接状态枚举：IDLE / CONNECTING / READY / TRANSIENT_FAILURE / SHUTDOWN
const state = channel.getConnectivityState(false);
console.log('state =', state);

// 监听状态变化（状态切换时回调）
channel.watchConnectivityState(channel.getConnectivityState(false), new Date(Date.now() + 5000), (err) => {
  if (!err) console.log('state changed to', channel.getConnectivityState(false));
});

// 等待就绪
client.waitForReady(new Date(Date.now() + 3000), (err) => {
  console.log(err ? 'not ready' : 'ready');
});
```

| API | 作用 |
|---|---|
| `client.getChannel()` | 取底层 Channel |
| `channel.getConnectivityState(tryToConnect)` | 当前状态；`true` 会触发连接尝试 |
| `channel.watchConnectivityState(s, deadline, cb)` | 状态变化时回调 |
| `client.waitForReady(deadline, cb)` | 便捷等待就绪 |

---

## 15. 服务端流式背压与取消

### 15.1 客户端取消

```js
const call = client.listArticles({ page_size: 1000 });
call.on('data', (a) => {/* ... */});
// 中途取消
call.cancel(); // 触发 CANCELLED，服务端会收到取消信号
```

### 15.2 服务端感知取消（避免无意义计算）

```js
export function listArticles(call) {
  let cancelled = false;
  call.on('cancelled', () => { cancelled = true; }); // 客户端取消时触发
  for (const a of db.list(1000)) {
    if (cancelled) break;
    call.write(a);
  }
  if (!cancelled) call.end();
}
```

---

## 16. 连接保持（Keepalive）与通道选项

长连接需要 keepalive 防止被中间设备/代理断开。

```js
const client = new BlogService('localhost:50051', creds, {
  'grpc.keepalive_time_ms': 30_000,        // 每 30s 发一次 ping
  'grpc.keepalive_timeout_ms': 10_000,      // 等待 pong 超时
  'grpc.keepalive_permit_without_calls': 1, // 空闲也允许 ping
  'grpc.http2.min_time_between_pings_ms': 10_000,
  'grpc.max_receive_message_length': 8 * 1024 * 1024,
  'grpc.max_send_message_length': 8 * 1024 * 1024,
});
```

### 常用通道/服务端选项一览

| 选项 | 说明 |
|---|---|
| `grpc.max_receive_message_length` | 最大接收消息（字节） |
| `grpc.max_send_message_length` | 最大发送消息（字节） |
| `grpc.keepalive_time_ms` | keepalive ping 间隔 |
| `grpc.keepalive_timeout_ms` | pong 等待超时 |
| `grpc.keepalive_permit_without_calls` | 空闲时是否 ping（1=允许） |
| `grpc.initial_reconnect_backoff_ms` | 重连退避初始值 |
| `grpc.max_reconnect_backoff_ms` | 重连退避上限 |
| `grpc.enable_retries` | 是否启用客户端重试（默认开） |
| `grpc.default_compression_algorithm` | 默认压缩算法（`gzip` 等） |
| `grpc.max_connection_idle_ms` | 空闲连接最大存活 |
| `grpc.service_config` | JSON 服务配置（负载均衡/重试策略） |
| `grpc.client_idle_timeout_ms` | 客户端空闲超时 |

---

## 17. 服务器反射与健康检查

便于用 `grpcurl` / `evans` 等工具在不带 `.proto` 的情况下调用与排查。

### 17.1 健康检查（grpc-health-check）

```js
import { HealthImplementation, service as healthService } from 'grpc-health-check';

const health = new HealthImplementation({ '': 'SERVING' });
health.addStatus('blog.v1.BlogService', 'SERVING'); // 整体 + 具体服务

server.addService(healthService, health);

// 运行时变更状态（如关闭中）
health.setStatus('blog.v1.BlogService', 'NOT_SERVING');
```

**客户端调用健康检查**

```js
import { HealthClient, HealthCheckRequest, ServingStatus } from 'grpc-health-check';
const healthClient = new HealthClient('localhost:50051', grpc.credentials.createInsecure());
healthClient.check(new HealthCheckRequest({ service: 'blog.v1.BlogService' }, (err, res) => {
  console.log(res.status === ServingStatus.SERVING ? 'healthy' : 'unhealthy');
}));
```

### 17.2 服务器反射（@grpc/reflection）

```js
import { reflection } from '@grpc/reflection';
server.addService(reflection.service, reflection.handlers);
```

启用后可直接用 `grpcurl` 列出服务、调用方法（无需本地 `.proto`）：

```bash
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext localhost:50051 blog.v1.BlogService/GetArticle
```

---

## 18. 与数据库结合（实战：BlogService → PostgreSQL）

把第 7 节的 handler 接到真实的 PostgreSQL（接口来自 `node11_postgre.md`）。这里只演示关键衔接点。

```js
// db.js —— 用 pg 连接池
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.PG_URL });

export const db = {
  async get(id) {
    const { rows } = await pool.query('SELECT * FROM articles WHERE id=$1', [id]);
    return rows[0] || null;
  },
  async list(limit) {
    const { rows } = await pool.query('SELECT * FROM articles ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows;
  },
  async create({ title, content, author }) {
    const { rows } = await pool.query(
      `INSERT INTO articles(title,content,author) VALUES($1,$2,$3)
       RETURNING *`,
      [title, content, author]
    );
    return rows[0];
  },
};
```

```js
// handlers.js 改为 async，用 callback 返回（gRPC 是回调模型）
import { db } from './db.js';

export function getArticle(call, callback) {
  db.get(call.request.id)
    .then((a) => callback(null, a ?? {
      code: grpc.status.NOT_FOUND, details: 'not found',
    }))
    .catch((e) => callback({ code: grpc.status.INTERNAL, details: e.message }));
}

export async function listArticles(call) {
  const rows = await db.list(call.request.page_size || 10);
  for (const r of rows) call.write(r);
  call.end();
}
```

> 要点：gRPC handler 是**回调式**，可在内部 `await` 数据库后用 `callback(null, msg)` 返回；流式则用 `call.write/end`。这与 REST/GraphQL 的 async 返回不同，但能在同一进程里无缝复用 `pg`。

---

## 19. 调试工具

| 工具 | 用途 | 命令示例 |
|---|---|---|
| `grpcurl` | 命令行调用/列出 gRPC 服务（需反射或 `--proto`） | `grpcurl -plaintext localhost:50051 list` |
| `evans` | 交互式 gRPC 客户端 | `evans -p 50051 --plaintext` |
| `bloomrpc` / `kreya` | GUI 客户端 | 图形界面导入 `.proto` |
| `grpc_cli` | gRPC 官方 CLI | `grpc_cli ls localhost:50051` |

```bash
# 用本地 proto 文件调用（无需反射）
grpcurl -plaintext -import-path ./proto -proto blog.proto \
  -d '{"id":"a-1"}' localhost:50051 blog.v1.BlogService/GetArticle
```

---

## 20. 最佳实践清单

1. **永远用 `@grpc/grpc-js`**，丢弃已弃用的 `grpc`（C++ addon）。
2. **生产环境必须 TLS/mTLS**，`createInsecure()` 仅用于本地开发。
3. **契约先行**：所有接口写在 `.proto`，client/server 都从同一份生成，避免漂移。
4. **每个一元调用都要正确处理 error**：返回合适的 `grpc.status` 而非裸 `throw`。
5. **流式务必 `call.end()`**：客户端写完要 `end()`，服务端发完要 `end()`，否则对端一直等待。
6. **设置合理 deadline**：禁止无限等待；超时用 `DEADLINE_EXCEEDED` 表达。
7. **大消息设 `max_receive/send_message_length`**，并考虑流式分片而非一次性巨包。
8. **鉴权走 Metadata**（token），服务端在 handler 里校验，或用拦截器统一注入。
9. **健康检查 + 反射**在运维侧开启（反射生产可保留，便于排查，但注意暴露 schema）。
10. **优雅关闭**用 `tryShutdown()`，监听 `SIGTERM/SIGINT`，别直接 `forceShutdown()` 丢请求。
11. **keepalive 必配**：长连接服务不开 keepalive 易被代理/负载均衡断开。
12. **int64 用 `longs: String`**：避免 JS `number` 精度丢失（尤其雪花 ID）。
13. **`reserved` 字段编号**：删除/重命名字段后用 `reserved` 占位，别复用编号。
14. **客户端复用 stub**：`new Service()` 开销小但建议单例复用，别每次请求 new 一个。
15. **错误不要泄漏内部细节**：`INTERNAL` 的 `details` 可记录日志，但对外返回笼统信息。

---

## 21. 参考文档

- **gRPC 官方网站**：[grpc.io](https://grpc.io)
- **Node.js 基础教程（官方）**：[Basics tutorial | Node](https://grpc.io/docs/languages/node/basics/)
- **Node.js 快速开始（官方）**：[Quick start | Node](https://grpc.io/docs/languages/node/quickstart/)
- **gRPC 概念介绍（四种调用类型/HTTP2）**：[Introduction to gRPC](https://grpc.io/docs/what-is-grpc/introduction/)
- **gRPC 状态码说明**：[Status codes and their use](https://grpc.io/docs/guides/status-codes/)
- **Deadlines 核心概念**：[Core concepts | Deadlines](https://grpc.io/docs/what-is-grpc/core-concepts/#deadlines)
- **@grpc/grpc-js（npm）**：[@grpc/grpc-js](https://www.npmjs.com/package/@grpc/grpc-js)
- **@grpc/proto-loader（npm）**：[@grpc/proto-loader](https://www.npmjs.com/package/@grpc/proto-loader)
- **grpc-node 源码仓库**：[github.com/grpc/grpc-node](https://github.com/grpc/grpc-node)
- **grpc-js 拦截器说明**：[INTERCEPTORS.md](https://github.com/grpc/grpc-node/blob/master/packages/grpc-js/INTERCEPTORS.md)
- **Protocol Buffers 官网**：[protobuf.dev](https://protobuf.dev)
- **proto3 语言指南**：[proto3 language guide](https://protobuf.dev/programming-guides/proto3/)
- **grpc-health-check（npm）**：[grpc-health-check](https://www.npmjs.com/package/grpc-health-check)
- **@grpc/reflection（npm）**：[@grpc/reflection](https://www.npmjs.com/package/@grpc/reflection)
- **grpcurl 调试工具**：[fullstorydev/grpcurl](https://github.com/fullstorydev/grpcurl)
- **evans 交互式客户端**：[ktr0731/evans](https://github.com/ktr0731/evans)
- **本项目配套：Node + PostgreSQL 文档**：[md/zh-cn/node11_postgre.md](./node11_postgre.md)
- **本项目配套：Node + GraphQL 文档**：[md/zh-cn/node13_graphql.md](./node13_graphql.md)
