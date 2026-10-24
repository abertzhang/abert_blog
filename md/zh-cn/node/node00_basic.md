---
title: Node.js 基础语法学习文档
create:2026-10-22
update:2026-10-22
category:nodejs
cover:https://img-common.aknot.uk/cover/land-11.jpg
tags:[node,javascript,runtime,module,async,eventloop,stream,backend,basic]
summary:Node.js 基础语法与核心 API 的完整学习文档（基于 Node 24 LTS），覆盖运行时与事件循环、CommonJS/ESM 双模块系统、全局对象、定时器、Buffer、fs/path/events/stream、异步演进(Promise/async-await)、错误处理、util、child_process、crypto、http、调试、cluster 多进程与 worker_threads 多线程，每节均含可直接运行的示例
keywords:[node,javascript,runtime,module,commonjs,esm,async,eventloop,stream,buffer,backend]
top:1
copyright:true
---

# Node.js 基础语法学习文档

> 适用版本：**Node.js 24 LTS（Krypton，Active LTS，官方支持至 2028-04-30）**；Node 22 LTS（Maintenance，支持至 2027-04-30）；Node 26 为 Current（将于 2026-10-28 转 LTS）。
> 生产环境推荐 **Node 24 LTS**。本文示例以 **ESM（`import/export`）为默认写法**，并在关键处对比 CommonJS（`require`），绝大多数在 Node 18+ 即可运行（个别 API 标注最低版本）。
> 本文定位「基础语法 + 核心 API 速查 + 可直接运行示例」，从**运行机制 → 模块系统 → 全局对象 → 核心内置模块 → 异步模型 → 进阶并发**逐步递进。后续框架类文档（Express/Koa/Fastify 等）都建立在这些基础之上。

---

## 目录

- [1. Node.js 是什么与运行机制](#1-nodejs-是什么与运行机制)
- [2. 环境安装、REPL 与运行脚本](#2-环境安装repl-与运行脚本)
- [3. 第一个程序与模块系统总览](#3-第一个程序与模块系统总览)
- [4. CommonJS 模块](#4-commonjs-模块)
- [5. ES Modules（ESM）](#5-es-modulesesm)
- [6. package.json 与 npm 基础](#6-packagejson-与-npm-基础)
- [7. 全局对象与全局变量](#7-全局对象与全局变量)
- [8. 命令行参数与环境变量](#8-命令行参数与环境变量)
- [9. 定时器与事件循环阶段](#9-定时器与事件循环阶段)
- [10. Buffer 与二进制数据](#10-buffer-与二进制数据)
- [11. 文件系统 fs](#11-文件系统-fs)
- [12. path 路径处理](#12-path-路径处理)
- [13. 事件 events（EventEmitter）](#13-事件-eventseventemitter)
- [14. 流 Stream](#14-流-stream)
- [15. 异步演进：回调 → Promise → async/await](#15-异步演进回调--promise--asyncawait)
- [16. Promise 静态方法](#16-promise-静态方法)
- [17. 错误处理](#17-错误处理)
- [18. util 工具模块](#18-util-工具模块)
- [19. child_process 子进程](#19-child_process-子进程)
- [20. crypto 加密基础](#20-crypto-加密基础)
- [21. http 模块（原生 HTTP 服务）](#21-http-模块原生-http-服务)
- [22. 调试与诊断](#22-调试与诊断)
- [23. cluster 多进程（利用多核）](#23-cluster-多进程利用多核)
- [24. worker_threads 多线程](#24-worker_threads-多线程)
- [25. 常见坑与最佳实践](#25-常见坑与最佳实践)
- [26. 参考文档](#26-参考文档)

---

## 1. Node.js 是什么与运行机制

Node.js 是一个基于 **V8 引擎**的 JavaScript 运行时，用 **libuv** 提供跨平台异步 I/O。它的核心特征是：

- **单线程 + 事件循环（Event Loop）**：主线程只跑 JS，I/O 等耗时操作交给后台线程/内核，完成后以回调/微任务形式回到主线程。
- **非阻塞 I/O**：一个请求在等磁盘/网络时，主线程可以去处理别的请求，因此擅长高并发 I/O。
- **不擅长 CPU 密集**：长时间占用主线程会阻塞事件循环（需用 `worker_threads` 或子进程分流）。

```
        ┌─────────────────────────── 单线程（Event Loop）──────────────────────────┐
用户请求 → │  接收 → 注册异步任务 → 继续处理别的请求 → 任务完成回调 → 返回响应          │
        └──────────────────────────────────────────────────────────────────────┘
                                  │ 委托
                                  ▼
                         libuv 线程池 / 操作系统内核（文件、DNS、网络）
```

```bash
# 查看版本（本文示例基于 Node 24 LTS）
node --version     # v24.x
node -p "process.versions"   # 查看 V8 / libuv / OpenSSL 等版本
```

> 一句话：**Node.js = V8（跑 JS）+ libuv（异步 I/O）+ 一堆内置模块（fs/http/crypto…）**。它不是浏览器，没有 `window`/`document`，但新增了很多服务端全局对象（`process`、`Buffer`、`__dirname` 等）。

---

## 2. 环境安装、REPL 与运行脚本

### 2.1 安装与版本管理

```bash
# 官方安装包 / 包管理器（brew、apt 等）
# 推荐用版本管理器，避免系统全局污染：
nvm install 24        # 安装 Node 24
nvm use 24            # 切换到 24
node -v

# 设置国内镜像（加速 npm install）
npm config set registry https://registry.npmmirror.com
```

### 2.2 REPL 交互式环境

```bash
node          # 进入 REPL，可直接敲 JS
> 1 + 2
3
> const a = [1,2,3]; a.map(x => x*2)
[ 2, 4, 6 ]
> .exit      # 退出
```

### 2.3 运行脚本

```bash
node app.js            # 运行文件（CommonJS 或 ESM 由扩展名/package.json 决定）
node --watch app.js    # Node 18.11+：文件变更自动重启（开发利器）
node --check app.js    # 只做语法检查，不执行
```

---

## 3. 第一个程序与模块系统总览

Node 有两种模块系统，理解它们是写好 Node 的前提：

| 维度 | CommonJS（CJS） | ES Modules（ESM） |
|------|----------------|-------------------|
| 语法 | `require()` / `module.exports` | `import` / `export` |
| 加载 | 运行时同步加载 | 静态分析、可异步 |
| 默认扩展 | `.js`（无 type 字段时） | `.mjs` 或 `"type":"module"` 后的 `.js` |
| 加载时机 | 动态、可条件加载 | 静态（顶层 `import`） |

```javascript
// hello.mjs（ESM 写法）
console.log("Hello from Node.js", process.version);

// 运行：node hello.mjs
```

```javascript
// 也可在 package.json 声明 "type":"module"，则 .js 就是 ESM
// package.json:
// { "name": "demo", "type": "module" }
```

> 约定：新项目**优先用 ESM**；维护老仓库时多半是 CommonJS。本文两种都讲，你按项目实际选择。

---

## 4. CommonJS 模块

CommonJS 是 Node 的传统模块系统。`require` 加载模块，`module.exports` 导出。

### 4.1 基本导出 / 导入

```javascript
// math.cjs
function add(a, b) { return a + b; }
const PI = 3.14159;

// 导出方式 1：直接赋值 module.exports
module.exports = { add, PI };

// 也可给 exports 添加属性（注意：不能直接 exports = {...}，会切断引用）
// exports.add = add;
// exports.PI = PI;
```

```javascript
// main.cjs
const { add, PI } = require("./math.cjs");
console.log(add(2, 3), PI); // 5 3.14159
```

### 4.2 模块缓存与循环依赖

```javascript
// 模块只执行一次，结果被缓存（require 再次拿到同一份）
const a = require("./math.cjs");
const b = require("./math.cjs");
console.log(a === b); // true（同一缓存实例）

// 循环依赖：Node 用「部分导出」机制兜底，但应避免
// a.cjs -> require('./b.cjs') -> b.cjs -> require('./a.cjs') 时，b 拿到的是 a 的半成品
```

### 4.3 核心模块与第三方

```javascript
const fs = require("node:fs");        // node: 前缀显式指定内置模块（推荐）
const _ = require("lodash");          // 第三方（需 npm install）
```

---

## 5. ES Modules（ESM）

ESM 是目前推荐的方式，语法与浏览器一致。

### 5.1 命名导出与默认导出

```javascript
// math.mjs
export function add(a, b) { return a + b; }
export const PI = 3.14159;
export default function sub(a, b) { return a - b; } // 默认导出（每个模块仅一个）
```

```javascript
// main.mjs
import sub, { add, PI } from "./math.mjs"; // 默认在前，具名在后
console.log(add(2, 3), PI, sub(5, 2)); // 5 3.14159 3
```

### 5.2 package.json 的 type 字段

```json
{
  "name": "demo",
  "type": "module",   // .js 按 ESM 解析
  "exports": "./index.js"
}
```

- `"type":"module"`：`.js` = ESM，`.cjs` = CommonJS。
- `"type":"commonjs"` 或未写：`.js` = CJS，`.mjs` = ESM。
- 扩展名优先级最高：`.mjs` 永远是 ESM，`.cjs` 永远是 CJS。

### 5.3 动态导入（按需加载）

```javascript
// import() 返回 Promise，可在条件/运行时加载（CJS 中没有等价静态能力）
async function load(lang) {
  if (lang === "zh") {
    const m = await import("./zh.mjs");
    return m.greet();
  }
  const m = await import("./en.mjs");
  return m.greet();
}
```

### 5.4 导入 JSON 与裸说明符

```javascript
// Node 已支持直接导入 JSON（ESM，Node 17+ 稳定）
import pkg from "./package.json" with { type: "json" };
console.log(pkg.name);

// 裸说明符（bare specifier）：由 node_modules 解析
import express from "express"; // 第三方包
import fs from "node:fs";       // 内置模块，node: 前缀更明确
```

---

## 6. package.json 与 npm 基础

`package.json` 是项目的「身份证 + 说明书」。

```json
{
  "name": "demo",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "node --test"
  },
  "dependencies": { "express": "^4.19.2" },
  "devDependencies": { "eslint": "^9.0.0" },
  "engines": { "node": ">=20" },
  "exports": {
    ".": "./index.js",
    "./utils": "./utils.mjs"
  }
}
```

```bash
npm install            # 安装全部依赖
npm install lodash     # 写入 dependencies
npm install -D typescript  # 写入 devDependencies
npm run dev            # 执行 scripts.dev
```

**SemVer（语义化版本）**：`^1.2.3` 允许 `1.x.x` 最新（不跨主版本）；`~1.2.3` 只允许 `1.2.x`；`1.2.3` 精确锁定。

```bash
npm ci                 # 基于 package-lock.json 干净安装（CI 推荐）
npm outdated           # 查看可升级项
```

---

## 7. 全局对象与全局变量

Node 提供一批**无需 import 即可使用**的全局对象。

| 全局 | 作用 |
|------|------|
| `global` / `globalThis` | 全局命名空间（类似浏览器的 `window`） |
| `process` | 当前进程信息与控制（argv/env/exit/平台） |
| `console` | 打印与计时 |
| `Buffer` | 二进制数据容器（Node 特有） |
| `__dirname` | 当前文件所在目录（CJS；ESM 用 `import.meta.url` 推导） |
| `__filename` | 当前文件绝对路径（CJS） |
| `queueMicrotask` | 把回调加入微任务队列 |
| `setTimeout/setInterval/setImmediate` | 定时器 |

```javascript
// ESM 中获取等价 __dirname / __filename
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log(__dirname, __filename);

// globalThis 跨模块共享（谨慎使用，易成全局污染）
globalThis.appName = "demo";
console.log(globalThis.appName);
```

---

## 8. 命令行参数与环境变量

### 8.1 命令行参数

```javascript
// node app.mjs --port 3000 --verbose
console.log(process.argv); // [node路径, 脚本路径, '--port', '3000', '--verbose']

// 解析参数（推荐用内置 util.parseArgs，Node 18.3+ 稳定）
import { parseArgs } from "node:util";
const { values } = parseArgs({
  options: {
    port: { type: "string", short: "p" },
    verbose: { type: "boolean", short: "v" },
  },
  args: process.argv.slice(2),
});
console.log(values); // { port: '3000', verbose: false }
```

### 8.2 环境变量

```javascript
// 读取环境变量（常用于区分环境、配置密钥）
const PORT = process.env.PORT || 3000;
const DB_URL = process.env.DATABASE_URL;
console.log(PORT, DB_URL);

// 设置（仅当前进程及子进程）
process.env.NODE_ENV = "production";
```

```bash
# 运行前注入
PORT=8080 DATABASE_URL=sqlite://app.db node app.mjs
```

```javascript
// 从 .env 文件加载（需第三方 dotenv，或 Node 20.6+ 原生 --env-file）
// Node 20.6+ 原生支持：node --env-file=.env app.mjs
import "dotenv/config"; // 老项目常见写法
```

---

## 9. 定时器与事件循环阶段

Node 事件循环分为若干阶段，**理解顺序**才能解释 `setTimeout` 与 `setImmediate` 谁先执行。

```
┌─  timers：setTimeout / setInterval 回调
├─ pending callbacks：上轮 IO 延迟回调
├─ idle, prepare（内部）
├─ poll：检索新的 I/O 事件、执行 I/O 回调（除了 close/timer/setImmediate）
├─ check：setImmediate 回调
└─ close callbacks：关闭事件（如 socket.on('close')）
   每阶段之间：先清空 process.nextTick 队列，再清空 Promise 微任务队列
```

```javascript
// 1) setTimeout：最少延迟（实际 ≥ 给定 ms，受事件循环阻塞影响）
setTimeout(() => console.log("timeout"), 0);

// 2) setImmediate：在 poll 之后、check 阶段立即执行
setImmediate(() => console.log("immediate"));

// 3) process.nextTick：不属于事件循环阶段，当前操作结束后立即执行（优先级最高）
process.nextTick(() => console.log("nextTick"));

// 4) Promise 微任务：在 nextTick 之后、进入下一阶段前清空
Promise.resolve().then(() => console.log("promise"));

console.log("sync");
// 输出顺序：sync → nextTick → promise → timeout / immediate（二者顺序不定）
```

```javascript
// setInterval：重复执行，务必 clearTimeout/clearInterval 否则进程不退出
const id = setInterval(() => console.log("tick"), 1000);
setTimeout(() => { clearInterval(id); console.log("stopped"); }, 3500);
```

> 经验：**`process.nextTick` 优先级高于 `Promise` 微任务，二者都高于事件循环各阶段**。`setImmediate` 与 `setTimeout(fn,0)` 的相对顺序取决于代码所处阶段（在 I/O 回调内 `setImmediate` 通常先；在首轮 `setTimeout` 先）。

---

## 10. Buffer 与二进制数据

`Buffer` 是 Node 处理二进制（文件、网络）的核心类型，类似 `Uint8Array`。

```javascript
// 创建
const b1 = Buffer.alloc(10);                 // 10 字节，全 0（安全，先清零）
const b2 = Buffer.from("你好", "utf8");       // 字符串 → 字节
const b3 = Buffer.from([0x48, 0x69]);         // 字节数组

// 转回字符串
console.log(b2.toString("utf8"));            // 你好
console.log(b2.length);                      // 字节数（中文 UTF-8 占 3 字节）

// 编码互转
console.log(Buffer.from("A").toString("base64")); // QQ==

// 拼接（生产用 Buffer.concat 而非 +）
const merged = Buffer.concat([b2, b3]);

// 切片（共享底层内存，改动会影响原 Buffer）
const slice = b2.subarray(0, 3);
```

> 注意：`Buffer` 在 Node 中直接是 `Uint8Array` 的子类。涉及字符编码时务必显式指定（如 `"utf8"`、`"base64"`、`"hex"`），避免平台默认编码差异。

---

## 11. 文件系统 fs

`fs` 提供三种风格 API：**回调式**、**同步式**、**Promise 式**（推荐）。

### 11.1 Promise API（推荐，Node 10+ 稳定）

```javascript
import { promises as fs } from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "demo.txt");

// 写
await fs.writeFile(file, "hello node", "utf8");

// 追加
await fs.appendFile(file, "\nsecond line", "utf8");

// 读
const data = await fs.readFile(file, "utf8");
console.log(data);

// 判断存在 / 状态
const stat = await fs.stat(file);
console.log(stat.size, stat.isFile(), stat.isDirectory());

// 拷贝 / 重命名 / 删除 / 建目录 / 列目录
await fs.copyFile(file, file + ".bak");
await fs.rename(file, file + ".renamed");
await fs.mkdir("sub", { recursive: true });      // recursive 递归建多级
const list = await fs.readdir(".", { withFileTypes: true });
console.log(list.map(e => e.name));
await fs.rm("sub", { recursive: true, force: true });
```

### 11.2 同步与回调式

```javascript
import { readFileSync, existsSync } from "node:fs";

// 同步：简单但会阻塞事件循环，仅适合启动期/CLI
const txt = readFileSync("demo.txt", "utf8");
console.log(existsSync("demo.txt")); // 存在性检查（同步）

// 回调式（错误优先：第一个参数是 err）
import { readFile } from "node:fs";
readFile("demo.txt", "utf8", (err, data) => {
  if (err) throw err;
  console.log(data);
});
```

> 规则：**服务端请求处理路径禁止用 sync API**（会阻塞整个进程）；脚本/启动初始化阶段可用。

---

## 12. path 路径处理

`path` 处理跨平台路径，永远用它对路径做拼接，别手写字符串。

```javascript
import path from "node:path";

const p = path.join("src", "utils", "index.js"); // 跨平台正确分隔符
console.log(p);                                   // src/utils/index.js (POSIX)

const abs = path.resolve("demo.txt");             // 相对 cwd 转绝对路径
console.log(path.basename(abs));                   // demo.txt
console.log(path.dirname(abs));                    // 目录
console.log(path.extname(abs));                    // .txt

// 解析 / 还原
const parsed = path.parse("/a/b/c.txt");
console.log(parsed); // { root, dir:'/a/b', base:'c.txt', ext:'.txt', name:'c' }
console.log(path.format(parsed));

console.log(path.normalize("/a/../b"));           // /b
console.log(path.relative("/a/b", "/a/c/d"));     // ../c/d
console.log(path.sep, path.delimiter);            // 平台分隔符 / 与 :

// ESM 中拼出「当前文件旁的文件」路径（替代 __dirname）
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const cfg = path.join(here, "config.json");
```

---

## 13. 事件 events（EventEmitter）

Node 大量 API 基于事件（HTTP、Stream、Child Process 都是 `EventEmitter`）。

```javascript
import { EventEmitter } from "node:events";

class MyEmitter extends EventEmitter {}
const bus = new MyEmitter();

// 监听（on）与一次性（once）
bus.on("data", (v) => console.log("收到:", v));
bus.once("boot", () => console.log("只触发一次"));

bus.emit("data", 42);   // 收到: 42
bus.emit("boot");       // 只触发一次
bus.emit("boot");       // 不再触发

// 移除监听
function handler() {}
bus.on("x", handler);
bus.off("x", handler);                    // 或 removeListener
bus.removeAllListeners("data");

console.log(bus.listenerCount("data"));   // 剩余监听数
```

**错误事件约定**：EventEmitter 触发 `'error'` 事件且无人监听时会**抛出并崩溃进程**，务必监听：

```javascript
bus.on("error", (err) => {
  console.error("捕获错误:", err.message);
});
```

> 实用技巧：`prependListener` 把监听器插到队首；用 `on('newListener')` 可观测监听注册。

---

## 14. 流 Stream

Stream 以**分块**方式处理数据，避免把大文件一次性读进内存（背压自动控速）。

```javascript
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

// 方式 1：pipe 串联（经典）
const rs = createReadStream("big.txt");
const ws = createWriteStream("big.txt.gz");
rs.pipe(createGzip()).pipe(ws);

// 方式 2：pipeline（推荐，自动清理 + 错误传播，Node 10+）
await pipeline(
  createReadStream("big.txt"),
  createGzip(),
  createWriteStream("big.txt.gz")
);
```

```javascript
// 手动消费 Readable 事件（背压感知）
import { createReadStream } from "node:fs";

const rs = createReadStream("big.txt", { highWaterMark: 64 * 1024 }); // 64KB 一块
rs.on("data", (chunk) => {
  console.log("块字节数:", chunk.length);
  // rs.pause() / rs.resume() 手动控速
});
rs.on("end", () => console.log("读取完成"));
rs.on("error", (e) => console.error(e));
```

| 流类型 | 说明 | 典型 |
|--------|------|------|
| Readable | 可读 | `fs.createReadStream` |
| Writable | 可写 | `fs.createWriteStream` |
| Duplex | 双向 | `zlib` 流 |
| Transform | 读写时转换 | `crypto.createCipher`、自定义压缩 |

> 用 `stream/promises` 的 `pipeline` 替代手写 `.pipe()`，错误处理更稳健，避免「写失败读端不停止」的泄漏。

---

## 15. 异步演进：回调 → Promise → async/await

### 15.1 回调（最早，易"回调地狱"）

```javascript
import { readFile } from "node:fs";
readFile("a.txt", "utf8", (err, a) => {
  if (err) return console.error(err);
  readFile("b.txt", "utf8", (err, b) => {
    if (err) return console.error(err);
    console.log(a, b); // 嵌套深、难维护
  });
});
```

### 15.2 Promise（链式，扁平化）

```javascript
import { readFile } from "node:fs/promises";
readFile("a.txt", "utf8")
  .then((a) => readFile("b.txt", "utf8").then((b) => [a, b]))
  .then(([a, b]) => console.log(a, b))
  .catch((err) => console.error(err));
```

### 15.3 async/await（最推荐，像同步一样写异步）

```javascript
import { readFile } from "node:fs/promises";

async function main() {
  try {
    const a = await readFile("a.txt", "utf8");
    const b = await readFile("b.txt", "utf8");
    console.log(a, b);
  } catch (err) {
    console.error("出错了:", err);
  }
}
main();
```

> 现代 Node 开发默认 **async/await + Promise API**。回调仅出现在少数底层 API（如 `EventEmitter`、旧库）。

---

## 16. Promise 静态方法

| 方法 | 行为 |
|------|------|
| `Promise.resolve/reject` | 包装已决值 |
| `Promise.all([...])` | 全部成功才成功；**任一失败立即 reject**（并发） |
| `Promise.allSettled([...])` | 全部「落定」（无论成败）后返回状态数组 |
| `Promise.race([...])` | 谁先「落定」用谁（成败都算） |
| `Promise.any([...])` | 任一成功即成功；全失败才 reject（Node 15+） |
| `Promise.withResolvers()` | 暴露 `{ promise, resolve, reject }`（Node 22+） |

```javascript
// 并发请求，全部完成
const [a, b] = await Promise.all([
  fetch("https://api.a.com"),
  fetch("https://api.b.com"),
]);

// 不关心成败，等所有结束
const results = await Promise.allSettled([p1, p2, p3]);
results.forEach(r => r.status === "fulfilled"
  ? console.log("值:", r.value)
  : console.log("失败:", r.reason));

// 超时竞速：谁先到用谁，慢的被丢弃（注意仍会执行，需额外取消）
const winner = await Promise.race([
  fetch(url),
  new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
]);
```

```javascript
// Promise.withResolvers：把 resolve/reject 暴露出去（Node 22+）
const { promise, resolve, reject } = Promise.withResolvers();
setTimeout(() => resolve("done"), 1000);
console.log(await promise);
```

---

## 17. 错误处理

### 17.1 同步与异步错误

```javascript
// 同步：try/catch
try {
  JSON.parse("{ bad");
} catch (e) {
  console.error(e instanceof SyntaxError); // true
}

// 异步回调：错误优先（err 为第一参数）
import { readFile } from "node:fs";
readFile("x.txt", (err, data) => {
  if (err) { console.error(err); return; } // 必须处理
});

// async/await：try/catch 或 .catch
async function f() {
  try { await mayFail(); }
  catch (e) { console.error(e); }
}
```

### 17.2 进程级兜底

```javascript
// 未捕获的同步异常 / 未处理的 Promise rejection 会终止或告警进程，应兜底
process.on("uncaughtException", (err) => {
  console.error("未捕获异常:", err);
  // 一般记录后优雅退出（不宜继续运行，状态可能已损坏）
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的 Promise 拒绝:", reason);
});

// Node 15+ 默认：未处理的 rejection 不再静默，会进程退出（--unhandled-rejections=throw）
```

### 17.3 自定义错误

```javascript
class ValidationError extends Error {
  constructor(field) {
    super(`字段校验失败: ${field}`);
    this.name = "ValidationError";
    this.field = field;
  }
}
throw new ValidationError("email");
```

---

## 18. util 工具模块

```javascript
import { promisify, inspect, format, debuglog, TextEncoder, TextDecoder, isDeepStrictEqual } from "node:util";
import { stat } from "node:fs";

// 1) promisify：把错误优先回调 API 转成返回 Promise
const statP = promisify(stat);
const info = await statP("demo.txt");

// 2) inspect：对象美化打印（替代 console.log 看深层结构）
console.log(inspect({ a: 1, b: { c: [1, 2] } }, { depth: null, colors: true }));

// 3) format：printf 风格拼接
console.log(format("用户 %s 年龄 %d", "Tom", 18)); // 用户 Tom 年龄 18

// 4) debuglog：按 NODE_DEBUG 环境变量开关的日志
const log = debuglog("myapp");
log("这条只在 NODE_DEBUG=myapp 时出现");

// 5) TextEncoder/TextDecoder：字符串 <-> Uint8Array
const enc = new TextEncoder();
const bytes = enc.encode("你好");          // Uint8Array
const dec = new TextDecoder();
console.log(dec.decode(bytes));            // 你好

// 6) isDeepStrictEqual：深度比较（Node 12+）
console.log(isDeepStrictEqual({ a: 1 }, { a: 1 })); // true
```

---

## 19. child_process 子进程

用于在 Node 中调用外部命令或其他脚本。

| API | 特点 |
|-----|------|
| `exec` | 开 shell，**缓冲**整个输出（适合短命令，注意命令注入） |
| `execFile` | 不启 shell，直接执行文件（更安全、更快） |
| `spawn` | 流式 stdout/stderr，不缓冲（适合大输出/长进程） |
| `fork` | **专跑 Node 脚本**，自带 IPC 通道（最常用） |

```javascript
import { exec, spawn, fork } from "node:child_process";

// exec：简单但输出进内存
exec("ls -lh", (err, stdout, stderr) => {
  if (err) throw err;
  console.log(stdout);
});

// spawn：流式、可写 stdin、监听 data
const child = spawn("node", ["worker.cjs"]);
child.stdout.on("data", (d) => console.log("子:", d.toString()));
child.on("close", (code) => console.log("退出码:", code));

// fork：与 Node 子脚本双向通信（IPC）
const f = fork("worker.cjs");
f.on("message", (m) => console.log("父收到:", m));
f.send({ hello: "from parent" });
```

```javascript
// worker.cjs（被 fork 的子进程）
process.on("message", (msg) => {
  console.log("子收到:", msg);
  process.send({ result: 42 });
});
```

> 安全提示：`exec` 走 shell，拼接用户输入会**命令注入**，优先用 `execFile`/`spawn` 并把参数作为数组传入。

---

## 20. crypto 加密基础

`crypto` 提供哈希、HMAC、随机数与密钥派生，是做密码存储、签名、令牌的基础。

```javascript
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";

// 1) 哈希（单向，如校验文件完整性；别用它存密码）
const h = createHash("sha256").update("data").digest("hex");
console.log(h);

// 2) HMAC（带密钥的哈希，用于签名/校验）
const sig = createHmac("sha256", "secret").update("msg").digest("hex");

// 3) 随机数（令牌、盐）
console.log(randomBytes(16).toString("hex")); // 32 位十六进制
console.log(randomUUID());                     // 标准 UUID v4

// 4) 密码存储：scrypt（加盐 + 慢哈希）
function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verify(password, stored) {
  const [salt, key] = stored.split(":");
  const derived = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  // timingSafeEqual：恒定时间比较，防计时攻击
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

const stored = hashPassword("123456");
console.log(verify("123456", stored)); // true
console.log(verify("wrong", stored));  // false
```

> 实践：**绝不明文存密码**，用 scrypt/Argon2/bcrypt + 随机盐；用 `timingSafeEqual` 做比较，避免计时攻击。

---

## 21. http 模块（原生 HTTP 服务）

不依赖框架，用内置 `http` 即可起服务（理解它对学 Express/Fastify 很有帮助）。

```javascript
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const server = http.createServer(async (req, res) => {
  // req：可读流 + 请求信息（method/url/headers）
  // res：可写流 + 响应控制
  if (req.url === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Hello Node</h1>");
    return;
  }

  if (req.url === "/api/echo" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk; // 流式收 body
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ youSent: body }));
    return;
  }

  res.writeHead(404); res.end("Not Found");
});

server.listen(3000, () => console.log("listening on http://localhost:3000"));
```

```javascript
// 作为 HTTP 客户端发起请求（Node 18+ 推荐全局 fetch，亦可用 http.request）
const res = await fetch("https://api.github.com");
console.log(res.status, await res.json());
```

> 路由、中间件等「便利能力」正是 Express/Koa/Fastify 在 `http` 之上封装的（见 `node00_express.md` 等）。

---

## 22. 调试与诊断

```javascript
// 1) console 系列（不止 log）
console.log("普通");
console.error("错误(stderr)");
console.table([{ a: 1 }, { a: 2 }]);   // 表格
console.time("t"); /* ... */ console.timeEnd("t"); // 计时
console.assert(1 === 2, "不会触发");    // 条件为假才打印

// 2) 原生断点调试：node --inspect app.js，浏览器 DevTools 连接
//    代码里写 debugger; 即可在该处暂停

// 3) assert 模块做断言（Node 内置测试常用）
import assert from "node:assert/strict";
assert.equal(1 + 1, 2);
assert.deepEqual({ a: 1 }, { a: 1 });

// 4) node --test 跑内置测试（Node 18+ 稳定，无需框架）
// test.mjs:
// import { test } from "node:test";
// import assert from "node:assert";
// test("加法", () => assert.equal(1+1, 2));
// 运行：node --test
```

---

## 23. cluster 多进程（利用多核）

Node 主进程单线程，用 `cluster` 把请求分摊到多个 worker 进程，吃满多核 CPU。

```javascript
import cluster from "node:cluster";
import os from "node:os";
import http from "node:http";

if (cluster.isPrimary) {
  const cpus = os.cpus().length;
  console.log(`主进程 ${process.pid} 启动 ${cpus} 个 worker`);
  for (let i = 0; i < cpus; i++) cluster.fork();

  cluster.on("exit", (worker) => {
    console.log(`worker ${worker.process.pid} 退出，重启`);
    cluster.fork(); // 进程挂掉自动拉起
  });
} else {
  http.createServer((req, res) => {
    res.end(`由 worker ${process.pid} 处理`);
  }).listen(3000);
  console.log(`worker ${process.pid} 就绪`);
}
```

> 注意：`cluster` 共享端口（底层由主进程分发）。**有状态数据不要放进程内存**，应放 Redis/数据库。新版推荐用 `worker_threads` 处理 CPU 任务，用反向代理（Nginx/PM2）做进程管理更成熟。

---

## 24. worker_threads 多线程

`worker_threads` 在**同一进程内**开多线程，适合 CPU 密集计算，且能通过 `MessageChannel`/`SharedArrayBuffer` 共享数据。

```javascript
// main.mjs
import { Worker } from "node:worker_threads";

const worker = new Worker(`
  import { parentPort } from "node:worker_threads";
  // 模拟耗时计算
  let sum = 0;
  for (let i = 0; i < 1e8; i++) sum += i;
  parentPort.postMessage(sum);
`, { eval: true });

worker.on("message", (result) => {
  console.log("计算结果:", result);
  worker.terminate();
});
worker.on("error", (e) => console.error(e));
```

```javascript
// 用文件形式的 worker（更清晰）
// calc.worker.mjs:
// import { parentPort } from "node:worker_threads";
// parentPort.on("message", (n) => {
//   parentPort.postMessage(n * n);
// });
//
// main.mjs:
// import { Worker } from "node:worker_threads";
// const w = new Worker(new URL("./calc.worker.mjs", import.meta.url));
// w.postMessage(21);
// w.on("message", (r) => console.log(r)); // 441
```

> 选型：**I/O 并发用异步 + cluster；CPU 密集用 worker_threads**（避免阻塞事件循环）。二者都不要滥用——多数 Web 服务瓶颈在 I/O。

---

## 25. 常见坑与最佳实践

### 25.1 高频坑

1. **在请求处理路径用 `fs.*Sync`**：阻塞整个事件循环，吞吐骤降。
2. **忘记 `await`**：Promise 静默执行，常表现为「数据没拿到」。
3. **未处理的 Promise rejection**：Node 15+ 默认让进程退出，务必 `try/catch` 或 `.catch`。
4. **EventEmitter 没监听 `error`**：触发 error 直接崩进程。
5. **`process.env` 永远是字符串**：`PORT` 是 `"3000"` 不是 `3000`，记得 `Number()`。
6. **CommonJS/ESM 混用**：`require` 不能加载 ESM（反之部分可），扩展名/`type` 要理清。
7. **`exec` 命令注入**：拼接用户输入，改用 `execFile`/`spawn` 传数组参数。
8. **流不清理**：手写 `.pipe()` 出错时读端不停止，改用 `pipeline`。
9. **定时器不 `clear`**：`setInterval` 忘记 `clearInterval`，进程无法退出。
10. **明文存密码 / 用 `==` 比较哈希**：用 scrypt + `timingSafeEqual`。

### 25.2 最佳实践

- 新项目默认 **ESM + async/await + Promise API**。
- 生产固定 **LTS 版本**（当前 Node 24 LTS），用 `engines` 约束。
- 错误优先处理：回调判 `err`、async 用 `try/catch`、进程级 `uncaughtException/unhandledRejection` 兜底。
- 大文件/大响应一律走 **Stream + pipeline**，避免内存爆炸。
- 用 `node --watch` 开发、`node --test` 测试、`node --inspect` 调试。
- 敏感配置走**环境变量**（不要写进代码），密钥用 `crypto` 正确哈希。
- 进程管理交给 **PM2 / 容器 / 反向代理**，而非手写 cluster 重启。

---

## 26. 参考文档

- [Node.js 官方首页](https://nodejs.org/)
- [Node.js 文档总入口（最新版）](https://nodejs.org/docs/latest/api/)
- [Node.js Releases（版本与 LTS 状态）](https://nodejs.org/en/download/releases)
- [Node.js LTS 日程（Release Schedule）](https://github.com/nodejs/release)
- [ES Modules 官方文档](https://nodejs.org/api/esm.html)
- [Modules: CommonJS 官方文档](https://nodejs.org/api/modules.html)
- [process 全局对象](https://nodejs.org/api/process.html)
- [fs 文件系统（Promise API）](https://nodejs.org/api/fs.html)
- [path 路径](https://nodejs.org/api/path.html)
- [events / EventEmitter](https://nodejs.org/api/events.html)
- [stream 流](https://nodejs.org/api/stream.html)
- [timers 定时器与事件循环](https://nodejs.org/api/timers.html)
- [The Node.js Event Loop, Timers, and process.nextTick（官方长文）](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [buffer 二进制](https://nodejs.org/api/buffer.html)
- [util 工具模块](https://nodejs.org/api/util.html)
- [child_process 子进程](https://nodejs.org/api/child_process.html)
- [crypto 加密](https://nodejs.org/api/crypto.html)
- [http 模块](https://nodejs.org/api/http.html)
- [cluster 多进程](https://nodejs.org/api/cluster.html)
- [worker_threads 多线程](https://nodejs.org/api/worker_threads.html)
- [node:test 内置测试](https://nodejs.org/api/test.html)
- [npm 文档](https://docs.npmjs.com/)
- [MDN：JavaScript 指南（语法基础）](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide)

> 说明：本文基于 **Node.js 24 LTS（Krypton，Active LTS，官方支持至 2028-04-30）** 编写；示例在 Node 18+ 基本可运行，个别 API 已在文中标注最低版本（如 `Promise.withResolvers` 需 Node 22+）。Node 22 LTS（Maintenance）至 2027-04-30、Node 26 将于 2026-10-28 转入 LTS；具体版本矩阵以官方 [Releases](https://nodejs.org/en/download/releases) 为准。框架类用法（Express/Koa/Fastify/Nest 等）建立在本篇基础之上，详见 `node/` 目录下对应文档。
