---
title: Node.js 内置模块学习文档
create:2026-10-23
update:2026-10-23
category:nodejs
cover:https://img-common.aknot.uk/cover/land-33.jpg
tags:[node,builtin,module,core,fs,path,crypto,stream,http,events,backend]
summary:Node.js 内置（核心）模块完整学习文档（基于 Node 24 LTS），覆盖 node: 前缀规范与模块全景，逐个讲解 fs/path/os/util/events/stream/buffer/crypto/http/https/net/dns/url/querystring/child_process/cluster/worker_threads/process/assert/perf_hooks/timers/zlib/readline/tls/dgram/http2/console/vm/async_hooks/diagnostics_channel/test 等常用与进阶内置库，每个库均给出尽量齐全的接口清单与可直接运行的示例
keywords:[node,builtin,module,core,fs,path,crypto,stream,http,events,process,worker-threads,backend]
top:1
copyright:true
---

# Node.js 内置模块学习文档

> 适用版本：**Node.js 24 LTS（Krypton，Active LTS，官方支持至 2028-04-30）**；Node 22 LTS（Maintenance）；Node 26 Current（2026-10-28 转 LTS）。
> 生产环境推荐 **Node 24 LTS**。本文示例以 **ESM（`import ... from 'node:xxx'`）为默认写法**，绝大多数接口在 Node 18+ 即可运行（个别标注最低版本）。
> 内置模块是「随 Node 一起安装、无需 `npm install`」的核心能力，是 Express/Fastify/Nest 等框架的地基。本文从 **模块全景 → 高频模块深讲 → 进阶模块速查 → 常见坑** 逐步递进，力求接口尽量齐全、示例可直接运行。

---

## 目录

- [1. 内置模块全景与 `node:` 前缀](#1-内置模块全景与-node-前缀)
- [2. `fs` 文件系统（回调 / Promise / 同步）](#2-fs-文件系统回调--promise--同步)
- [3. `fs/promises` 与 `fs` 文件流](#3-fspromises-与-fs-文件流)
- [4. `path` 路径处理](#4-path-路径处理)
- [5. `os` 操作系统信息](#5-os-操作系统信息)
- [6. `util` 工具函数](#6-util-工具函数)
- [7. `events` 事件发射器](#7-events-事件发射器)
- [8. `stream` 流](#8-stream-流)
- [9. `buffer` 与 `string_decoder`](#9-buffer-与-string_decoder)
- [10. `crypto` 加密与哈希](#10-crypto-加密与哈希)
- [11. `http` 原生 HTTP 服务与客户端](#11-http-原生-http-服务与客户端)
- [12. `https` 安全 HTTP](#12-https-安全-http)
- [13. `net` TCP 套接字](#13-net-tcp-套接字)
- [14. `dns` 域名解析](#14-dns-域名解析)
- [15. `url` 与 `querystring`](#15-url-与-querystring)
- [16. `child_process` 子进程](#16-child_process-子进程)
- [17. `cluster` 多进程](#17-cluster-多进程)
- [18. `worker_threads` 工作线程](#18-worker_threads-工作线程)
- [19. `process` 进程对象](#19-process-进程对象)
- [20. `assert` 断言](#20-assert-断言)
- [21. `perf_hooks` 性能测量](#21-perf_hooks-性能测量)
- [22. `timers` 与 `timers/promises`](#22-timers-与-timerspromises)
- [23. `zlib` 压缩](#23-zlib-压缩)
- [24. `readline` 逐行读取](#24-readline-逐行读取)
- [25. `tls` 传输层安全](#25-tls-传输层安全)
- [26. `dgram` UDP 数据报](#26-dgram-udp-数据报)
- [27. `http2` HTTP/2](#27-http2-http2)
- [28. `console` 控制台](#28-console-控制台)
- [29. `vm` 沙箱](#29-vm-沙箱)
- [30. `async_hooks` 异步资源追踪](#30-async_hooks-异步资源追踪)
- [31. `diagnostics_channel` 诊断通道](#31-diagnostics_channel-诊断通道)
- [32. `test` 内置测试运行器](#32-test-内置测试运行器)
- [33. `querystring` / `module` / `tty` / `repl` / `v8` 等补充](#33-querystring--module--tty--repl--v8-等补充)
- [34. 常见坑与最佳实践](#34-常见坑与最佳实践)
- [35. 参考文档](#35-参考文档)

---

## 1. 内置模块全景与 `node:` 前缀

Node 内置模块是 Node.js 二进制自带、无需 `npm install` 的核心库。从 **Node 12+** 起官方推荐使用 `node:` 前缀（如 `node:fs`、`node:path`）显式加载，避免与用户自定义同名模块冲突，并在 ESM 下强制通过该前缀访问部分模块。

```javascript
// ✅ 推荐：node: 前缀（ESM / CommonJS 均可）
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

// ⚠️ 旧写法（仍可用，但易与第三方包重名冲突）
import fsOld from 'fs';
```

### 常用内置模块清单（按用途分组）

| 分组 | 模块 | 用途 |
|---|---|---|
| 文件系统 | `fs` / `fs/promises` / `fs/streams` | 文件读写、目录、流 |
| 路径/系统 | `path` / `os` | 路径解析、系统信息 |
| 工具 | `util` / `querystring` / `url` | 通用辅助 |
| 事件/流 | `events` / `stream` / `buffer` / `string_decoder` | 异步基元 |
| 加密 | `crypto` | 哈希/签名/加解密 |
| 网络 | `http` / `https` / `net` / `dns` / `tls` / `dgram` / `http2` | 网络编程 |
| 子进程/并发 | `child_process` / `cluster` / `worker_threads` | 多进程/多线程 |
| 运行时 | `process` / `console` / `timers` / `module` / `vm` | 进程控制 |
| 质量 | `assert` / `test` / `perf_hooks` / `diagnostics_channel` / `async_hooks` | 测试/性能 |
| 交互 | `readline` / `tty` / `repl` / `v8` | CLI/调试 |

> **铁律**：内置模块不需要安装，但**不要**与 npm 包重名。例如不要自己建一个 `fs.js`，否则 `import 'node:fs'` 才是安全的兜底。

---

## 2. `fs` 文件系统（回调 / Promise / 同步）

`fs` 提供三类 API：**回调式**（经典）、**Promise 式**（在 `node:fs/promises`）、**同步式**（`.sync` 后缀）。现代代码优先用 `fs/promises`。

### 2.1 读文件

```javascript
import { readFile, readFileSync } from 'node:fs';

// 回调式
readFile('a.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});

// Promise 式（推荐，配合顶层 await / async）
const text = await readFile('a.txt', { encoding: 'utf8' });

// 同步式（会阻塞事件循环，仅启动/脚本初始化时用）
const syncText = readFileSync('a.txt', 'utf8');
```

### 2.2 写文件

```javascript
import { writeFile, writeFileSync, appendFile } from 'node:fs';

await writeFile('out.txt', 'hello', { encoding: 'utf8', flag: 'w' }); // 覆盖
await appendFile('out.txt', '\nworld', 'utf8');                       // 追加
writeFileSync('out.txt', 'sync content');                              // 同步
```

### 2.3 文件信息与操作

```javascript
import { stat, rename, copyFile, unlink, mkdir, readdir } from 'node:fs/promises';

const info = await stat('out.txt');
info.isFile(); info.isDirectory(); info.size; info.mtimeMs; info.birthtimeMs;

await rename('a.txt', 'b.txt');        // 重命名/移动
await copyFile('b.txt', 'c.txt');      // 拷贝
await unlink('c.txt');                 // 删除
await mkdir('sub/dir', { recursive: true }); // 递归创建目录
const entries = await readdir('sub', { withFileTypes: true });
```

### 2.4 监视文件变化

```javascript
import { watch } from 'node:fs';

const watcher = watch('.', { recursive: true }, (eventType, filename) => {
  console.log(eventType, filename); // 'rename' | 'change'
});
// 不再需要时关闭，避免句柄泄漏
process.on('SIGINT', () => watcher.close());
```

> **坑**：`fs.watch` 在不同平台（Linux inotify / macOS FSEvents / Windows）行为不一致，且可能重复触发。生产环境文件同步请用专门的同步方案（如 chokidar 库），或只依赖事件做「重新读取」而非精确增量。

---

## 3. `fs/promises` 与 `fs` 文件流

`node:fs/promises` 是 Promise 版全套 API（与回调版同名，只是返回 Promise）。大文件务必用**流**而非一次性 `readFile`，否则内存爆掉。

### 3.1 流式拷贝大文件

```javascript
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

await pipeline(
  createReadStream('big.iso'),
  createWriteStream('big-copy.iso')
);
// pipeline 自动处理背压、错误与清理，比手动 pipe 更安全
```

### 3.2 逐行读取大日志

```javascript
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const rl = createInterface({ input: createReadStream('app.log'), crlfDelay: Infinity });
for await (const line of rl) {
  if (line.includes('ERROR')) console.log(line);
}
```

### 3.3 `fs/streams` (Node 20+)

Node 20 引入 `node:fs/streams`，提供 `ReadStream` / `WriteStream` 等可组合流类，便于与 Web Streams 互操作（`Readable.toWeb()` / `Writable.fromWeb()`）。

---

## 4. `path` 路径处理

`path` 模块处理文件路径，**永远用它对路径做拼接**，不要手写字符串拼接（跨平台分隔符不同）。

```javascript
import path from 'node:path';

path.join('/a', 'b', 'c.txt');            // /a/b/c.txt（自动处理分隔符）
path.resolve('foo', 'bar');               // 基于 cwd 解析为绝对路径
path.basename('/a/b/c.txt');              // c.txt
path.dirname('/a/b/c.txt');               // /a/b
path.extname('/a/b/c.txt');               // .txt
path.parse('/a/b/c.txt');                 // { root, dir, base, ext, name }
path.format({ dir: '/a/b', base: 'c.txt' });
path.relative('/a/b', '/a/b/c/d');        // c/d
path.isAbsolute('/a');                     // true
path.sep;                                 // '/' (POSIX) 或 '\\' (Win)
path.delimiter;                            // ':' (POSIX) 或 ';' (Win)
```

> **铁律**：`path.join(__dirname, 'x')` 在 ESM 中 `__dirname` 不存在，改用 `import.meta.dirname`（Node 20.11+）或 `path.dirname(fileURLToPath(import.meta.url))`。

```javascript
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url)); // ESM 兼容写法
```

---

## 5. `os` 操作系统信息

```javascript
import os from 'node:os';

os.platform();        // 'linux' | 'darwin' | 'win32'
os.arch();            // 'arm64' | 'x64'
os.homedir();         // 用户主目录
os.tmpdir();          // 临时目录
os.cpus();            // CPU 核心信息数组（用于计算并发数）
os.totalmem();        // 总内存（字节）
os.freemem();         // 空闲内存
os.hostname();
os.EOL;               // 当前平台换行符
os.networkInterfaces(); // 网络接口（IP 地址）
os.loadavg();         // 1/5/15 分钟平均负载（Windows 恒为 0）
```

典型用法：根据 `os.cpus().length` 决定 Worker 数量（见 §18）。

---

## 6. `util` 工具函数

```javascript
import util from 'node:util';
import { promisify, format, inspect, types, TextEncoder, TextDecoder, deprecate, callbackify, parseArgs } from 'node:util';

// 回调转 Promise
const stat = promisify(require('node:fs').stat);
await stat('a.txt');

// 字符串格式化（%s %d %j %O）
util.format('%s = %d', 'count', 42); // 'count = 42'

// 深度打印对象（调试神器）
console.log(inspect({ a: 1, b: { c: 2 } }, { depth: null, colors: true }));

// 类型判断
types.isPromise(Promise.resolve()); // true
types.isAsyncFunction(async () => {});

// TextEncoder / TextDecoder：字符串 <-> Uint8Array
const enc = new TextEncoder().encode('你好');
const dec = new TextDecoder().decode(enc);

// deprecate：标记废弃 API
const old = deprecate(() => {}, 'old() 已废弃，请用 new()');

// parseArgs（Node 18.3+）：解析 CLI 参数
const { values, positionals } = parseArgs({
  args: ['--port', '3000', 'build'],
  options: { port: { type: 'string' } },
  allowPositionals: true,
});
// values.port === '3000', positionals === ['build']
```

---

## 7. `events` 事件发射器

`EventEmitter` 是 Node 异步事件的核心基类，几乎所有 I/O 类都继承它（流、进程、cluster 等）。

```javascript
import { EventEmitter } from 'node:events';

const ee = new EventEmitter();
ee.on('data', (payload) => console.log('收到:', payload)); // 监听
ee.once('ready', () => console.log('只触发一次'));          // 一次性
ee.emit('data', { id: 1 });                                // 触发
ee.emit('ready');

console.log(ee.listenerCount('data'));
ee.off('data', handler);   // 取消监听（别名 removeListener）
ee.removeAllListeners('data');

// error 事件特殊：未监听会抛异常使进程退出
ee.on('error', (e) => console.error('出错', e));
```

> **铁律**：务必监听 `error` 事件。未处理的 `error` 事件会抛出 `ERR_UNHANDLED_ERROR` 并可能终止进程。

---

## 8. `stream` 流

流是处理大量数据的基石（背压自动调节速度）。四类：`Readable` / `Writable` / `Duplex` / `Transform`。

```javascript
import { Readable, Writable, Transform, pipeline } from 'node:stream';
import { pipeline as pipelineP } from 'node:stream/promises';

// 自定义可读流
const src = Readable.from(['a', 'b', 'c']);

// 自定义可写流
const sink = new Writable({
  write(chunk, enc, cb) { console.log(chunk.toString()); cb(); }
});

// 自定义转换流（经典「大写转换」）
const upper = new Transform({
  transform(chunk, enc, cb) { cb(null, chunk.toString().toUpperCase()); }
});

await pipelineP(src, upper, sink); // 自动串联 + 错误处理

// 对象模式流
const objStream = Readable.from([{ x: 1 }, { x: 2 }], { objectMode: true });
```

常用方法：`stream.pipe()`、`read()`、`write()`、`end()`、`destroy()`；背压通过 `write()` 返回 `false` 配合 `'drain'` 事件实现（pipeline 已自动处理）。

---

## 9. `buffer` 与 `string_decoder`

`Buffer` 是 Node 处理二进制（V8 外存）的核心类型；`string_decoder` 解决流式 UTF-8 多字节被截断问题。

```javascript
import { Buffer } from 'node:buffer';
import { StringDecoder } from 'node:string_decoder';

const b = Buffer.from('你好');      // 默认 utf8
Buffer.alloc(1024);                  // 已清零，安全
Buffer.allocUnsafe(1024);            // 可能含旧数据，需立即填充
b.toString('utf8');
b.length; b.subarray(0, 2);

// 流式解码，避免多字节字符在 chunk 边界被切断
const decoder = new StringDecoder('utf8');
decoder.write(Buffer.from([0xe4])); // 不完整的字节先缓存
decoder.write(Buffer.from([0xbd, 0xa0])); // '你'
```

> **坑**：网络/文件流里 `chunk.toString()` 直接转 UTF-8 可能在边界把一个中文字符（3 字节）拆成两半导致乱码。始终用 `StringDecoder` 或累积成完整 Buffer 再转。

---

## 10. `crypto` 加密与哈希

`crypto` 提供哈希、HMAC、对称/非对称加解密、签名、随机数、密钥派生等。

```javascript
import crypto from 'node:crypto';

// 哈希（校验文件完整性）
const sha = crypto.createHash('sha256').update('data').digest('hex');

// HMAC（带密钥的摘要，用于签名验证）
const hmac = crypto.createHmac('sha256', 'secret').update('msg').digest('base64');

// 随机数（密码学安全，禁止用 Math.random 做密钥）
crypto.randomBytes(16); // 返回 Buffer

// 密钥派生（存储密码用 scrypt 或 pbkdf2）
const salt = crypto.randomBytes(16);
crypto.scrypt('password', salt, 64, (err, derived) => {
  // 存储 salt + derived
});
// 同步校验
const k1 = crypto.scryptSync('pw', salt, 64);
crypto.timingSafeEqual(k1, k1); // 常量时间比较，防时序攻击

// 对称加密 AES-256-GCM（含认证，推荐）
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const enc = Buffer.concat([cipher.update('secret'), cipher.final()]);
const tag = cipher.getAuthTag(); // GCM 认证标签

// RSA 签名
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const sig = crypto.sign('sha256', Buffer.from('msg'), privateKey);
crypto.verify('sha256', Buffer.from('msg'), publicKey, sig);
```

> **铁律**：密码存储用 `scrypt` / `pbkdf2`（带盐、高迭代），**绝不**明文或只用哈希；比较用 `timingSafeEqual`；加密优先 AEAD（GCM），不要用 ECB 模式。

---

## 11. `http` 原生 HTTP 服务与客户端

不依赖任何框架，用 `http` 即可搭服务与发请求。

```javascript
import http from 'node:http';

// 服务端
const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ method: req.method, url: req.url, body: Buffer.concat(chunks).toString() }));
  });
});
server.listen(3000, () => console.log('listening on 3000'));

// 客户端
const { statusCode, headers } = await new Promise((resolve, reject) => {
  http.get('http://example.com', (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
  }).on('error', reject);
});
```

关键接口：`createServer` / `server.listen` / `server.close` / `http.request` / `http.get` / `req`（IncomingMessage：`method`/`url`/`headers`/`statusCode`）/ `res`（`writeHead`/`write`/`end`/`setHeader`）。

---

## 12. `https` 安全 HTTP

`https` 接口与 `http` 一致，但需配置 TLS（证书/密钥）。客户端 `https.request` 默认校验服务器证书。

```javascript
import https from 'node:https';
import fs from 'node:fs';

const server = https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
}, (req, res) => { res.end('secure'); });
server.listen(443);

// 客户端跳过证书校验（仅测试用，生产禁止 rejectUnauthorized:false）
https.get('https://self-signed.test', { rejectUnauthorized: false }, (res) => { /* ... */ });
```

---

## 13. `net` TCP 套接字

```javascript
import net from 'node:net';

// TCP 服务端
const srv = net.createServer((socket) => {
  socket.write('hello\n');
  socket.on('data', (d) => socket.write(d)); // 回显
  socket.on('end', () => socket.end());
});
srv.listen(8124);

// TCP 客户端
const client = net.connect(8124, 'localhost', () => client.write('ping'));
client.on('data', (d) => console.log(d.toString()));
```

关键接口：`createServer` / `connect` / `socket.write` / `socket.end` / `socket.on('data'|'close'|'error')` / `socket.setKeepAlive`。

---

## 14. `dns` 域名解析

```javascript
import dns from 'node:dns/promises'; // 推荐 Promise 版
import dnsCb from 'node:dns';

const { address } = await dns.lookup('example.com'); // IPv4/IPv6
const records = await dns.resolveMx('example.com');   // MX 记录
await dns.reverse('8.8.8.8');                          // 反向解析

// 回调式
dnsCb.lookup('example.com', (err, address) => {});
```

接口：`lookup` / `resolve` / `resolve4` / `resolve6` / `resolveMx` / `resolveTxt` / `resolveSrv` / `reverse` / `setServers`。

---

## 15. `url` 与 `querystring`

### 15.1 `url`（现代用 WHATWG URL）

```javascript
import { URL, URLSearchParams, fileURLToPath, pathToFileURL } from 'node:url';

const u = new URL('https://user:pw@example.com:8080/p/a?x=1&y=2#hash');
u.protocol; u.hostname; u.port; u.pathname; u.search; u.hash; u.username;
u.searchParams.get('x'); // '1'
u.searchParams.append('z', '3');

const params = new URLSearchParams({ a: '1', b: '2' });
params.toString(); // 'a=1&b=2'

fileURLToPath('file:///a/b'); // /a/b
pathToFileURL('/a/b').href;   // file:///a/b
```

### 15.2 `querystring`（遗留，处理 `a=1&b=2`）

```javascript
import qs from 'node:querystring';
qs.parse('a=1&b=2');        // { a: '1', b: '2' }
qs.stringify({ a: 1, b: 2 }); // 'a=1&b=2'
```

> **建议**：新代码优先 `URL` / `URLSearchParams`，`querystring` 仅用于兼容旧系统。

---

## 16. `child_process` 子进程

用于在 Node 中执行外部命令或其他脚本（含 IPC）。

```javascript
import { exec, spawn, fork, execFile } from 'node:child_process';
import util from 'node:util';
const execP = util.promisify(exec);

// exec：拿到完整 stdout（适合短命令，注意 shell 注入风险）
const { stdout } = await execP('ls -la', { encoding: 'utf8' });

// spawn：流式 stdout/stderr，适合长输出/大文件
const child = spawn('ls', ['-la']);
child.stdout.on('data', (d) => process.stdout.write(d));
child.on('close', (code) => console.log('exit', code));

// execFile：不启动 shell，更安全（参数直接传数组）
await execFile('node', ['--version']);

// fork：派生 Node 子进程并自动建立 IPC 通道
const w = fork('./worker.js');
w.send({ cmd: 'start' });
w.on('message', (m) => console.log('from child:', m));
```

关键接口：`exec` / `execFile` / `spawn` / `fork`；子进程事件 `'close'` / `'exit'` / `'error'`；`child.kill()`、`child.pid`、`child.stdin/stdout/stderr`。

> **坑**：`exec` 通过 shell 执行，拼接用户输入会造成**命令注入**。处理不可信输入用 `spawn`/`execFile` 并把参数放数组。

---

## 17. `cluster` 多进程

利用多核 CPU，主进程 fork 多个 worker，共享同一端口。

```javascript
import cluster from 'node:cluster';
import os from 'node:os';
import http from 'node:http';

if (cluster.isPrimary) {
  const n = os.cpus().length;
  for (let i = 0; i < n; i++) cluster.fork(); // 按核数派生
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died, 重启`);
    cluster.fork(); // 自动重启崩溃的 worker
  });
} else {
  http.createServer((req, res) => res.end(`worker ${process.pid}`)).listen(3000);
  console.log(`worker ${process.pid} started`);
}
```

接口：`cluster.isPrimary` / `isWorker` / `fork` / `on('exit')` / `workers` / `cluster.settings`。

---

## 18. `worker_threads` 工作线程

适合 CPU 密集任务（与 cluster 不同，线程共享内存、开销更小）。

```javascript
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

if (isMainThread) {
  const w = new Worker(__filename, { workerData: { n: 40 } }); // 传入数据
  w.on('message', (r) => console.log('result:', r));
  w.on('error', (e) => console.error(e));
  w.on('exit', (code) => console.log('exit', code));
} else {
  // 在 worker 内
  const { n } = workerData;
  parentPort.postMessage(fib(n)); // 把结果发回主线程
}
```

接口：`Worker` / `workerData` / `parentPort.postMessage` / `parentPort.on('message')` / `isMainThread` / `worker.terminate()`。

> **坑**：`worker_threads` 与 `cluster` 适用场景不同——IO 密集用 cluster/异步即可，CPU 密集（加解密、压缩、计算）才用 worker_threads。

---

## 19. `process` 进程对象

```javascript
process.argv;              // 命令行参数（[node, script, ...args]）
process.env;               // 环境变量（只读副本，改了不影响子进程除非 execenv）
process.cwd();             // 当前工作目录
process.pid;               // 进程 ID
process.platform; process.arch;
process.uptime();          // 运行秒数
process.memoryUsage();     // 内存占用
process.exitCode = 1;      // 退出码
process.exit(0);

// 信号处理
process.on('SIGINT', () => { console.log('Ctrl+C'); process.exit(); });
process.on('uncaughtException', (e) => console.error('未捕获', e));
process.on('unhandledRejection', (r) => console.error('未处理 Promise', r));

// 子进程 IPC（仅 fork 出的进程）
process.send?.({ ok: true });
process.on('message', (m) => {});
```

> **铁律**：生产服务务必监听 `uncaughtException` / `unhandledRejection` 兜底，但**不要**在异常里继续跑业务——记录日志后优雅退出并让进程管理器（PM2/systemd）重启。

---

## 20. `assert` 断言

```javascript
import assert from 'node:assert';
import { strict as assertStrict } from 'node:assert';

assert.equal(1, '1');        // 宽松（==）— 不推荐
assertStrict.strictEqual(1, 1); // 严格（===）
assert.deepStrictEqual({ a: 1 }, { a: 1 });
assert.ok(true);             // 真值
assert.throws(() => { throw new Error('x'); });
assert.rejects(async () => { throw new Error('y'); });
assert.match('abc', /^abc$/);
```

> 推荐始终使用 `strict` 模式（`import { strict } from 'node:assert'`），避免隐式类型转换导致的误判。

---

## 21. `perf_hooks` 性能测量

```javascript
import { performance, PerformanceObserver } from 'node:perf_hooks';

const t0 = performance.now();
// 做点事情
const duration = performance.now() - t0;

performance.mark('start');
// ...
performance.mark('end');
performance.measure('task', 'start', 'end');

const obs = new PerformanceObserver((items) => {
  for (const e of items.getEntries()) console.log(e.name, e.duration);
});
obs.observe({ entryTypes: ['measure'] });
```

---

## 22. `timers` 与 `timers/promises`

```javascript
import { setTimeout, setInterval, setImmediate, clearTimeout } from 'node:timers/promises';
// ⚠️ 注意：从 timers/promises 导入的 setTimeout 返回 Promise（不是定时器句柄）

// Promise 版定时器（Node 15+）
const result = await setTimeout(100, 'done'); // 100ms 后 resolve 'done'

// 经典定时器（来自全局，也可从 node:timers 显式导入）
import { setTimeout as cbTimeout } from 'node:timers';
const id = cbTimeout(() => {}, 100);
clearTimeout(id);

setImmediate(() => console.log('在当前轮 poll 之后、下轮前执行'));
// 事件循环：setTimeout(0) 在 timers 阶段，setImmediate 在 check 阶段，次序不确定
```

> **坑**：`process.nextTick` 优先级高于微任务/Promise，滥用会饿死事件循环；`setImmediate` 与 `setTimeout(fn,0)` 在不同上下文中先后不定。

---

## 23. `zlib` 压缩

```javascript
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';

// gzip 文件
await pipeline(
  createReadStream('big.txt'),
  zlib.createGzip(),
  createWriteStream('big.txt.gz')
);

// 同步压缩 Buffer
const gz = zlib.gzipSync(Buffer.from('hello'));
zlib.gunzipSync(gz).toString(); // 'hello'
```

接口：`gzip` / `gunzip` / `deflate` / `inflate` / `brotliCompress`（Node 11+）/ 及各 `.sync` 版本。

---

## 24. `readline` 逐行读取

```javascript
import readline from 'node:readline';
import { createReadStream } from 'node:fs';

// 文件逐行（配合流，见 §3.2）
// 交互式 CLI 输入
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question('你的名字? ');
console.log('你好', answer);
rl.close();
```

接口：`createInterface` / `question` / `rl.on('line')` / `rl.close` / `rl.write`。

---

## 25. `tls` 传输层安全

```javascript
import tls from 'node:tls';
import fs from 'node:fs';

const socket = tls.connect(443, 'example.com', {
  ca: fs.readFileSync('ca.pem'),   // 自定义 CA
  rejectUnauthorized: true,
}, () => {
  socket.write('GET / HTTP/1.1\r\nHost: example.com\r\n\r\n');
});
socket.on('data', (d) => console.log(d.toString()));

// 服务端双向认证
tls.createServer({ key, cert, requestCert: true, ca }, (s) => {
  console.log('client cert:', s.getPeerCertificate());
});
```

接口：`connect` / `createServer` / `socket.getPeerCertificate` / `checkServerIdentity` / `rootCertificates`。

---

## 26. `dgram` UDP 数据报

```javascript
import dgram from 'node:dgram';

const server = dgram.createSocket('udp4');
server.on('message', (msg, rinfo) => {
  server.send(msg, rinfo.port, rinfo.address); // 回显
});
server.bind(41234);

const client = dgram.createSocket('udp4');
client.send('hi', 41234, 'localhost', () => client.close());
```

接口：`createSocket` / `send` / `on('message')` / `bind` / `close` / `address`。

---

## 27. `http2` HTTP/2

```javascript
import http2 from 'node:http2';
import fs from 'node:fs';

const server = http2.createSecureServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
});
server.on('stream', (stream, headers) => {
  stream.respond({ 'content-type': 'text/plain', ':status': 200 });
  stream.end('http2 push-less');
});
server.listen(8443);

// 客户端
const client = http2.connect('https://localhost:8443');
const req = client.request({ ':path': '/' });
req.on('response', (hd) => {});
req.on('data', (d) => {});
req.end();
```

接口：`createServer` / `createSecureServer` / `connect` / `stream.respond` / `stream.pushStream` / `req.on('response')`。

---

## 28. `console` 控制台

```javascript
console.log('普通'); console.info('信息'); console.warn('警告'); console.error('错误');
console.debug('调试');
console.table([{ a: 1 }, { a: 2 }]);     // 表格
console.time('t'); /* ... */ console.timeEnd('t'); // 计时
console.count('label');                  // 计数
console.trace('调用栈');
console.dir(obj, { depth: null });       // 深度打印
console.assert(cond, '条件为假时打印');
```

> 生产环境建议用 `pino` / `winston` 等结构化日志库替代裸 `console`，便于级别控制与采集。

---

## 29. `vm` 沙箱

在隔离上下文执行不受信任代码（注意：vm 并非安全沙箱，仅隔离全局对象，仍需配合限制）。

```javascript
import vm from 'node:vm';

const sandbox = { x: 1, console };
const context = vm.createContext(sandbox);
vm.runInContext('x = x + 41; console.log(x)', context); // 42
console.log(sandbox.x); // 42
```

---

## 30. `async_hooks` 异步资源追踪

用于追踪异步资源的生命周期（调试、APM 埋点）。

```javascript
import async_hooks from 'node:async_hooks';

const hook = async_hooks.createHook({
  init(id, type, triggerId) { /* 资源创建 */ },
  before(id) {},
  after(id) {},
  destroy(id) {},
});
hook.enable();
// ... 业务 ...
hook.disable();
```

> **注意**：`async_hooks` 有性能开销，仅在诊断工具中启用，不要常驻生产。

---

## 31. `diagnostics_channel` 诊断通道

发布/订阅诊断消息（类似轻量事件总线，用于框架级可观测性）。

```javascript
import diagnostics_channel from 'node:diagnostics_channel';

const channel = diagnostics_channel.channel('app:request');
channel.subscribe((message) => console.log('diag:', message));
channel.publish({ id: 1 });
```

---

## 32. `test` 内置测试运行器

Node 18+ 内置 `node --test`，无需额外测试框架即可写单测。

```javascript
// math.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('加法', () => {
  test('正数相加', () => {
    assert.strictEqual(1 + 2, 3);
  });
  test('异步用例', async () => {
    const r = await Promise.resolve(4);
    assert.strictEqual(r, 4);
  });
});
```

运行：`node --test`（Node 会自动发现 `*.test.js` / `test/` 目录）。

---

## 33. `querystring` / `module` / `tty` / `repl` / `v8` 等补充

- **`querystring`**：见 §15.2，仅遗留系统使用。
- **`module`**：访问当前模块元信息，`import.meta` / `module.children` / `module.parent`；ESM 下用 `import.meta.url` / `import.meta.dirname`（Node 20.11+）。
- **`tty`**：判断是否为终端 `tty.isatty(fd)`、`process.stdout.isTTY`；读写原始模式 `setRawMode`。
- **`repl`**：启动交互式解释器 `node:repl.start()`，可做自定义 REPL（如带上下文的调试控制台）。
- **`v8`**：访问 V8 引擎统计 `v8.getHeapStatistics()` / `v8.getHeapSpaceStatistics()` / `v8.writeHeapSnapshot()`（内存快照分析）。
- **`trace_events`**：收集跟踪事件 `createTracing` / `trace_events.createTracing({ categories: ['node.perf'] })`。
- **`punycode`**：已弃用（Node 21+ 移除内置，需单独 `npm i punycode`），处理国际化域名。
- **`wasi`**：WebAssembly 系统接口，`new WASI()` 运行 WASI 模块。
- **`worker_threads`** / **`cluster`** 见 §17–18。

---

## 34. 常见坑与最佳实践

1. **永远用 `node:` 前缀** 导入内置模块，避免与 npm 包重名。
2. **大文件用流，不要用 `readFile` 一次性读**——内存会爆；用 `pipeline` 自动处理背压。
3. **UTF-8 多字节截断**：流里 `chunk.toString()` 边界可能切断中文，用 `StringDecoder` 或累积 Buffer。
4. **`fs.watch` 跨平台不一致**，生产同步场景谨慎依赖，必要时用成熟库。
5. **命令注入**：拼用户输入执行 shell 用 `exec` 有注入风险，改用 `spawn`/`execFile` 数组传参。
6. **密码存储**：用 `scrypt`/`pbkdf2`（带盐），比较用 `timingSafeEqual`，绝不用 `==` 或明文。
7. **`Buffer.allocUnsafe`** 会残留旧内存，必须立即填充；默认用 `Buffer.alloc`。
8. **`uncaughtException`/`unhandledRejection`** 要兜底但不能在异常中继续业务逻辑，应记录后退出由守护进程重启。
9. **cluster vs worker_threads**：IO 密集用异步/cluster，CPU 密集才用 worker_threads。
10. **ESM 下没有 `__dirname`/`__filename`**，用 `import.meta.dirname` 或 `fileURLToPath(import.meta.url)`。
11. **`process.env` 是只读副本**，运行时改它不会影响已 spawn 的子进程，需要时用 `env` 选项显式传。
12. **`async_hooks`/`diagnostics_channel` 有开销**，仅诊断时使用，不要常驻生产。

---

## 35. 参考文档

- [Node.js 官方文档（全部 API）](https://nodejs.org/docs/latest/api/)
- [Node.js `fs` 模块](https://nodejs.org/docs/latest/api/fs.html)
- [Node.js `path` 模块](https://nodejs.org/docs/latest/api/path.html)
- [Node.js `os` 模块](https://nodejs.org/docs/latest/api/os.html)
- [Node.js `util` 模块](https://nodejs.org/docs/latest/api/util.html)
- [Node.js `events` 模块](https://nodejs.org/docs/latest/api/events.html)
- [Node.js `stream` 模块](https://nodejs.org/docs/latest/api/stream.html)
- [Node.js `buffer` 模块](https://nodejs.org/docs/latest/api/buffer.html)
- [Node.js `crypto` 模块](https://nodejs.org/docs/latest/api/crypto.html)
- [Node.js `http` 模块](https://nodejs.org/docs/latest/api/http.html)
- [Node.js `https` 模块](https://nodejs.org/docs/latest/api/https.html)
- [Node.js `net` 模块](https://nodejs.org/docs/latest/api/net.html)
- [Node.js `dns` 模块](https://nodejs.org/docs/latest/api/dns.html)
- [Node.js `url` 模块](https://nodejs.org/docs/latest/api/url.html)
- [Node.js `querystring` 模块](https://nodejs.org/docs/latest/api/querystring.html)
- [Node.js `child_process` 模块](https://nodejs.org/docs/latest/api/child_process.html)
- [Node.js `cluster` 模块](https://nodejs.org/docs/latest/api/cluster.html)
- [Node.js `worker_threads` 模块](https://nodejs.org/docs/latest/api/worker_threads.html)
- [Node.js `process` 对象](https://nodejs.org/docs/latest/api/process.html)
- [Node.js `assert` 模块](https://nodejs.org/docs/latest/api/assert.html)
- [Node.js `perf_hooks` 模块](https://nodejs.org/docs/latest/api/perf_hooks.html)
- [Node.js `timers` 模块](https://nodejs.org/docs/latest/api/timers.html)
- [Node.js `zlib` 模块](https://nodejs.org/docs/latest/api/zlib.html)
- [Node.js `readline` 模块](https://nodejs.org/docs/latest/api/readline.html)
- [Node.js `tls` 模块](https://nodejs.org/docs/latest/api/tls.html)
- [Node.js `dgram` 模块](https://nodejs.org/docs/latest/api/dgram.html)
- [Node.js `http2` 模块](https://nodejs.org/docs/latest/api/http2.html)
- [Node.js `console` 模块](https://nodejs.org/docs/latest/api/console.html)
- [Node.js `vm` 模块](https://nodejs.org/docs/latest/api/vm.html)
- [Node.js `async_hooks` 模块](https://nodejs.org/docs/latest/api/async_hooks.html)
- [Node.js `diagnostics_channel` 模块](https://nodejs.org/docs/latest/api/diagnostics_channel.html)
- [Node.js `test` 测试运行器](https://nodejs.org/docs/latest/api/test.html)
- [Node.js `v8` 模块](https://nodejs.org/docs/latest/api/v8.html)
- [Node.js `tty` 模块](https://nodejs.org/docs/latest/api/tty.html)
- [Node.js `repl` 模块](https://nodejs.org/docs/latest/api/repl.html)
- [Node.js `module` 模块](https://nodejs.org/docs/latest/api/module.html)
- [Node.js `string_decoder` 模块](https://nodejs.org/docs/latest/api/string_decoder.html)
- [Node.js `timers/promises` 模块](https://nodejs.org/docs/latest/api/timers.html#timers-promises-api)
- [Node.js `fs/streams` 模块（Node 20+）](https://nodejs.org/docs/latest/api/fs.html#fsstreams)
