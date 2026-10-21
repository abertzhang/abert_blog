---
title: Node.js 操作 RabbitMQ 学习文档
create:2026-10-21
update:2026-10-21
category:message-queue
tags:[node,rabbitmq,mq,message-queue,amqp,backend]
summary:Node.js 使用 RabbitMQ 的学习文档，覆盖连接、交换机、队列、发布订阅与工作队列
keywords:[node,rabbitmq,mq,amqp,exchange,queue]
top:1
copyright:true
---

# Node.js 操作 RabbitMQ 学习文档

> 面向 Node.js 开发者的 RabbitMQ 实践指南。覆盖核心概念、完整 amqplib API、五种消息模型、可靠性机制、管理 HTTP API 与最佳实践。所有示例基于官方客户端 **amqplib**。

---

## 目录

1. [重要前提：RabbitMQ 是什么](#1-重要前提rabbitmq-是什么)
2. [环境与安装](#2-环境与安装)
3. [核心概念速记](#3-核心概念速记)
4. [连接与通道（Connection / Channel）](#4-连接与通道connection--channel)
5. [API 全景：amqplib 接口清单](#5-api 全景amqplib-接口清单)
6. [模型一：Hello World（简单队列）](#6-模型一hello-world简单队列)
7. [模型二：Work Queue（任务队列 + 公平分发）](#7-模型二work-queue任务队列--公平分发)
8. [模型三：Publish/Subscribe（广播 fanout）](#8-模型三publishsubscribe广播-fanout)
9. [模型四：Routing（直连 direct）](#9-模型四routing直连-direct)
10. [模型五：Topics（主题匹配）](#10-模型五topics主题匹配)
11. [RPC 远程调用模式](#11-rpc-远程调用模式)
12. [消息可靠性机制](#12-消息可靠性机制)
13. [死信队列（DLX）](#13-死信队列dlx)
14. [消息 TTL 与队列过期](#14-消息-ttl-与队列过期)
15. [ConfirmChannel 与发布确认](#15-confirmchannel-与发布确认)
16. [错误处理、心跳与重连](#16-错误处理心跳与重连)
17. [Management HTTP API](#17-management-http-api)
18. [TypeScript 封装示例](#18-typescript-封装示例)
19. [常见坑与最佳实践](#19-常见坑与最佳实践)

---

## 1. 重要前提：RabbitMQ 是什么

> ⚠️ **先澄清一个术语**：RabbitMQ 是**消息中间件 / 消息队列（message broker）**，不是数据库。它负责在生产者（producer）和消费者（consumer）之间**异步传递消息**，而不是持久化存储业务数据（那是 MySQL/Redis/MongoDB 的活）。

它基于 **AMQP 0-9-1** 协议。核心价值：解耦、异步、削峰、可靠投递。

---

## 2. 环境与安装

### 2.1 启动 RabbitMQ（推荐 Docker）

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \        # AMQP 协议端口（应用连这个）
  -p 15672:15672 \      # Management 管理后台端口
  rabbitmq:3-management
```

启动后访问 http://localhost:15672 ，默认账号 `guest` / `guest`（仅允许本机连接）。

### 2.2 Node.js 客户端

```bash
# pnpm / npm / yarn 均可
pnpm add amqplib
# 类型（如果用 TS）
pnpm add -D @types/amqplib
```

amqplib 同时支持 **Promise 风格**（`amqp.connect(...).then(...)`）和 **回调风格**（`amqp.connect(url, cb)`）。本文一律用 **Promise + async/await**，更现代易读。

### 2.3 连接地址格式

```
amqp://username:password@host:port/vhost
```

示例：

```js
const url = 'amqp://guest:guest@localhost:5672/';      // 默认 vhost 是 "/"
const url2 = 'amqp://user:pass@localhost:5672/my_vhost';
```

> 带特殊字符的密码需 `encodeURIComponent`。集群可写 `amqp://host1,host2,host3`（amqplib 支持逗号分隔的故障转移列表）。

---

## 3. 核心概念速记

| 概念 | 说明 |
|---|---|
| **Producer** | 发送消息的程序 |
| **Consumer** | 接收消息的程序 |
| **Connection** | 一条 TCP 长连接（带心跳、TLS、认证） |
| **Channel** | 建立在 Connection 上的轻量虚拟通道，**几乎所有操作都在 channel 上** |
| **Exchange** | 交换机，接收生产者消息并按规则路由到队列 |
| **Queue** | 队列，消息的真正落脚点，被消费者消费 |
| **Binding** | 绑定，Exchange → Queue 的路由关系（含 routingKey） |
| **Routing Key** | 路由键，生产者发消息时附带的地址标签 |
| **Message** | 消息体（Buffer）+ 属性（headers、deliveryMode 等） |
| **vhost** | 虚拟主机，逻辑隔离单位（类似 MySQL 的 database） |

**消息流转**：Producer → Exchange →(binding/routingKey)→ Queue → Consumer。

Exchange 四种类型：`direct`（精确匹配）、`topic`（模式匹配）、`fanout`（广播）、`headers`（按 header 匹配，少用）。

---

## 4. 连接与通道（Connection / Channel）

### 4.1 建立连接与通道

```js
// conn.js
const amqp = require('amqplib');

async function getChannel() {
  // 1. 建立 TCP 连接
  const connection = await amqp.connect('amqp://guest:guest@localhost:5672/');
  // 2. 在连接上开一个 channel（推荐：一个连接开多个 channel，而非多个连接）
  const channel = await connection.createChannel();
  return { connection, channel };
}

// 使用
;(async () => {
  const { connection, channel } = await getChannel();
  console.log('连接与通道就绪');
  // ... 业务操作
  await channel.close();
  await connection.close();
})().catch(console.error);
```

### 4.2 连接 / 通道选项

```js
const connection = await amqp.connect(url, {
  heartbeat: 30,          // 心跳间隔（秒），默认 0；生产建议 30~60
  locale: 'en_US',
  frameMax: 0,            // 单帧最大字节，0=无限制
  channelMax: 100,        // 单连接最大 channel 数
  protocol: 'amqp0-9-1',
});
```

### 4.3 事件监听（生产必备）

```js
connection.on('error', (err) => console.error('连接错误:', err.message));
connection.on('close', () => console.warn('连接已关闭'));
connection.on('blocked', (reason) => console.warn('连接被 broker 阻塞:', reason));
connection.on('unblocked', () => console.info('连接解除阻塞'));

channel.on('error', (err) => console.error('通道错误:', err.message));
channel.on('close', () => console.warn('通道已关闭'));
```

---

## 5. API 全景：amqplib 接口清单

下面按对象归类列出 amqplib 全部常用/完整接口，方便当速查表。

### 5.1 顶层 `amqp`

| 方法 | 说明 |
|---|---|
| `amqp.connect(url, socketOptions?)` | 建立连接，返回 `Promise<Connection>` |
| `amqp.connect(`url`, { /* options */ })` | 同上，带连接选项 |

### 5.2 `Connection` 接口

| 方法 / 事件 | 说明 |
|---|---|
| `conn.createChannel()` | 创建普通通道 `Promise<Channel>` |
| `conn.createConfirmChannel()` | 创建带发布确认的通道 `Promise<ConfirmChannel>` |
| `conn.close()` | 关闭连接 |
| `conn.connection.serverProperties` | broker 信息（版本、产品名等） |
| 事件 `error` / `close` / `blocked` / `unblocked` | 连接级事件 |

### 5.3 `Channel` 接口（核心）

**声明与删除**

| 方法 | 签名 / 说明 |
|---|---|
| `assertQueue(queue, options?)` | 声明队列（不存在则创建） |
| `checkQueue(queue)` | 检查队列是否存在（不存在抛错） |
| `deleteQueue(queue, options?)` | 删除队列 |
| `purgeQueue(queue)` | 清空队列消息（不删队列） |
| `assertExchange(exchange, type, options?)` | 声明交换机 |
| `checkExchange(exchange)` | 检查交换机 |
| `deleteExchange(exchange, options?)` | 删除交换机 |
| `bindQueue(queue, source, pattern, args?)` | 队列绑定到交换机 |
| `unbindQueue(queue, source, pattern, args?)` | 解绑 |
| `bindExchange(destination, source, pattern, args?)` | 交换机间绑定 |
| `unbindExchange(...)` | 交换机解绑 |

**发布与消费**

| 方法 | 签名 / 说明 |
|---|---|
| `sendToQueue(queue, content, options?)` | 直接发到队列（等价于发到默认 exchange，`routingKey=queue`） |
| `publish(exchange, routingKey, content, options?)` | 发到指定交换机 |
| `consume(queue, onMessage, options?)` | 持续订阅消费（推模式） |
| `get(queue, options?)` | 拉取单条消息（拉模式，无消息返回 false） |
| `cancel(consumerTag)` | 取消某个消费者订阅 |
| `ack(message, allUpTo?)` | 确认消息（成功处理） |
| `nack(message, allUpTo?, requeue?)` | 拒绝并重新入队 / 丢弃 |
| `reject(message, requeue?)` | 拒绝单条消息 |
| `ackAll()` / `nackAll(requeue?)` | 批量确认 / 拒绝 |

**流控与恢复**

| 方法 | 说明 |
|---|---|
| `prefetch(count, global?)` | 设置 QoS：单次预取消息数（公平分发关键） |
| `recover()` | 重新入队未 ack 的消息 |
| `close()` | 关闭通道 |

**`assertQueue` options**

```js
{
  durable: true,                 // 持久化队列（broker 重启后还在）
  exclusive: false,              // 排他：仅当前连接可见，连接关闭即删
  autoDelete: false,             // 无消费者时自动删除
  passive: false,                // true=只检查不创建（不存在则报错）
  arguments: {                   // 队列参数（x- 开头）
    'x-message-ttl': 60000,      // 消息生存时间(ms)
    'x-expires': 1800000,        // 队列空闲多久后自动删除
    'x-max-length': 10000,       // 最大消息数
    'x-max-length-bytes': 10485760,
    'x-dead-letter-exchange': 'dlx',        // 死信交换机
    'x-dead-letter-routing-key': 'dead',    // 死信 routingKey
    'x-max-priority': 10,        // 启用优先级（0~10）
    'x-queue-mode': 'lazy',      // lazy=消息落盘，省内存
    'x-single-active-consumer': true,
  }
}
```

**`assertExchange` options**

```js
{
  durable: true,            // 持久化交换机
  internal: false,          // true=不能直接发消息，只能被其他 exchange 绑定
  autoDelete: false,
  alternateExchange: 'ae',  // 无法路由的消息转发到该交换机（兜底）
  arguments: { /* ... */ }
}
```

### 5.4 `Message` 对象结构

```js
channel.consume('queue', (msg) => {
  if (msg === null) return;
  msg.content;        // Buffer —— 消息体，用 msg.content.toString() 或 JSON.parse
  msg.fields;         // { consumerTag, deliveryTag, redelivered, exchange, routingKey }
  msg.properties;     // 消息属性，见下
});
```

**`msg.properties` 字段**

| 字段 | 说明 |
|---|---|
| `contentType` | 如 `'application/json'` |
| `contentEncoding` | 如 `'gzip'` |
| `headers` | 自定义头对象 `{}` |
| `deliveryMode` | `1`=非持久（默认），`2`=持久（落盘） |
| `priority` | 优先级 0~9 |
| `correlationId` | RPC 关联 ID |
| `replyTo` | RPC 回调队列名 |
| `expiration` | 单条消息 TTL(ms) 字符串 |
| `messageId` / `timestamp` / `type` / `userId` / `appId` | 元数据 |

### 5.5 发布 `options`（sendToQueue / publish 通用）

```js
{
  persistent: true,                 // 旧写法别名，等价于 deliveryMode:2
  deliveryMode: 2,                  // 2=持久化
  contentType: 'application/json',
  contentEncoding: 'utf-8',
  headers: { 'x-version': '1.0' },
  priority: 5,
  correlationId: 'req-123',
  replyTo: 'rpc_reply_queue',
  expiration: '30000',              // 单条 TTL（字符串！）
  messageId: 'msg-001',
  userId: 'guest',
  type: 'order.created',
}
```

> ⚠️ `expiration` 必须是**字符串**（`'30000'`），不是数字。

---

## 6. 模型一：Hello World（简单队列）

最简单的「生产者发一条，消费者收一条」，不经过自定义 exchange（用默认 `''` exchange，routingKey 直接等于队列名）。

### 6.1 生产者 `send.js`

```js
const amqp = require('amqplib');

async function send() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();

  const queue = 'hello';
  await ch.assertQueue(queue, { durable: false });

  const msg = 'Hello RabbitMQ!';
  ch.sendToQueue(queue, Buffer.from(msg));
  console.log(' [x] 已发送:', msg);

  await ch.close();
  await conn.close();
}
send().catch(console.error);
```

### 6.2 消费者 `receive.js`

```js
const amqp = require('amqplib');

async function receive() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();

  const queue = 'hello';
  await ch.assertQueue(queue, { durable: false });

  console.log(' [*] 等待消息中...');
  ch.consume(queue, (msg) => {
    if (!msg) return;
    console.log(' [x] 收到:', msg.content.toString());
    ch.ack(msg);   // 手动确认
  }, { noAck: false });  // noAck:false 表示需要手动 ack
}
receive().catch(console.error);
```

> 若 `noAck: true`，消息一旦发出就被认为已消费（broker 不等 ack），进程崩了消息就丢——**生产环境务必 `noAck:false` + `ack`**。

---

## 7. 模型二：Work Queue（任务队列 + 公平分发）

把耗时任务分发到多个 worker，避免单点阻塞。

### 7.1 关键点

- **持久化**：`durable: true`（队列）+ `deliveryMode: 2`（消息），保证 broker 重启不丢。
- **公平分发**：`channel.prefetch(1)` —— 消费者**每次只取 1 条**，处理完 ack 后才取下一句，避免「能者不均」。
- **手动 ack**：处理成功才 `ack`，失败 `nack(requeue:true)` 重投。

### 7.2 生产者 `new_task.js`

```js
const amqp = require('amqplib');

async function newTask() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();

  const queue = 'task_queue';
  await ch.assertQueue(queue, { durable: true });   // 队列持久化

  const text = process.argv.slice(2).join(' ') || '默认任务';
  ch.sendToQueue(queue, Buffer.from(text), {
    persistent: true,          // 消息持久化（落盘）
  });
  console.log(' [x] 任务已入队:', text);

  await ch.close();
  await conn.close();
}
newTask().catch(console.error);
```

### 7.3 消费者 `worker.js`

```js
const amqp = require('amqplib');

async function worker() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();

  const queue = 'task_queue';
  await ch.assertQueue(queue, { durable: true });

  ch.prefetch(1);   // ★ 公平分发：一次只取一条
  console.log(' [*] 等待任务，Ctrl+C 退出');

  ch.consume(queue, (msg) => {
    if (!msg) return;
    const task = msg.content.toString();
    console.log(' [x] 开始处理:', task);

    // 模拟耗时（每个点 1 秒）
    const secs = (task.match(/\./g) || []).length;
    setTimeout(() => {
      console.log(' [x] 处理完成:', task);
      ch.ack(msg);   // 处理完才确认
    }, secs * 1000);
  }, { noAck: false });
}
worker().catch(console.error);
```

> 测试：开两个终端跑 `worker.js`，再用 `node new_task.js 任务.` 投递，会看到任务被两个 worker 轮流分担。

---

## 8. 模型三：Publish/Subscribe（广播 fanout）

一条消息发给**所有**绑定队列（每个消费者一份）。典型场景：日志广播、缓存失效通知。

**fanout 忽略 routingKey**，消息复制给所有绑定队列。

```js
// 生产者 emit_log.js
const amqp = require('amqplib');

async function emit() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();

  const exchange = 'logs';
  await ch.assertExchange(exchange, 'fanout', { durable: false });

  const msg = process.argv.slice(2).join(' ') || 'info: hello';
  ch.publish(exchange, '', Buffer.from(msg));   // routingKey 留空
  console.log(' [x] 广播:', msg);

  await ch.close();
  await conn.close();
}
emit().catch(console.error);
```

```js
// 消费者 receive_logs.js
const amqp = require('amqplib');

async function receive() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();

  const exchange = 'logs';
  await ch.assertExchange(exchange, 'fanout', { durable: false });

  // 排他、随机名的临时队列：每个消费者独立一份
  const q = await ch.assertQueue('', { exclusive: true });
  await ch.bindQueue(q.queue, exchange, '');   // 绑定到 fanout

  console.log(' [*] 等待日志...');
  ch.consume(q.queue, (msg) => {
    if (!msg) return;
    console.log(' [x]', msg.content.toString());
  }, { noAck: true });
}
receive().catch(console.error);
```

---

## 9. 模型四：Routing（直连 direct）

`direct` exchange 按 **routingKey 精确匹配**队列绑定时指定的 key。典型场景：按级别分发的日志（error 只给错误队列，info 给另一个）。

```js
// 生产者 direct_send.js
const amqp = require('amqplib');

async function send() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();
  await ch.assertExchange('direct_logs', 'direct', { durable: false });

  const severity = process.argv[2] || 'info';
  const msg = process.argv.slice(3).join(' ') || '一条消息';
  ch.publish('direct_logs', severity, Buffer.from(msg));
  console.log(` [x] 发送 [${severity}]:`, msg);

  await ch.close();
  await conn.close();
}
send().catch(console.error);
```

```js
// 消费者 direct_receive.js
const amqp = require('amqplib');

async function receive() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();
  await ch.assertExchange('direct_logs', 'direct', { durable: false });

  const q = await ch.assertQueue('', { exclusive: true });
  const severities = process.argv.slice(2);   // 可绑定多个级别: node recv.js info error
  if (severities.length === 0) severities.push('info');

  for (const s of severities) {
    await ch.bindQueue(q.queue, 'direct_logs', s);   // 每个 key 一次绑定
  }

  console.log(' [*] 等待日志:', severities.join(','));
  ch.consume(q.queue, (msg) => {
    if (!msg) return;
    console.log(` [x] [${msg.fields.routingKey}]`, msg.content.toString());
  }, { noAck: true });
}
receive().catch(console.error);
```

---

## 10. 模型五：Topics（主题匹配）

`topic` 用 `.` 分隔的 routingKey + 通配符匹配：

- `*` 匹配**一个**单词
- `#` 匹配**零个或多个**单词

例：`stock.usd.nyse`、`stock.eur.lse`。绑定 `stock.#` 收所有股票，`*.nyse` 收纽交所。

```js
// 生产者 topic_send.js
const amqp = require('amqplib');

async function send() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();
  await ch.assertExchange('topic_logs', 'topic', { durable: false });

  const key = process.argv[2] || 'anonymous.info';
  const msg = process.argv.slice(3).join(' ') || 'Hello';
  ch.publish('topic_logs', key, Buffer.from(msg));
  console.log(` [x] 发送 [${key}]:`, msg);

  await ch.close();
  await conn.close();
}
send().catch(console.error);
```

```js
// 消费者 topic_receive.js
const amqp = require('amqplib');

async function receive() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();
  await ch.assertExchange('topic_logs', 'topic', { durable: false });

  const q = await ch.assertQueue('', { exclusive: true });
  const patterns = process.argv.slice(2);   // 如: "#" 或 "kern.*" "*.critical"
  if (patterns.length === 0) patterns.push('#');

  for (const p of patterns) {
    await ch.bindQueue(q.queue, 'topic_logs', p);
  }

  console.log(' [*] 等待匹配:', patterns.join(' '));
  ch.consume(q.queue, (msg) => {
    if (!msg) return;
    console.log(` [x] [${msg.fields.routingKey}]`, msg.content.toString());
  }, { noAck: true });
}
receive().catch(console.error);
```

---

## 11. RPC 远程调用模式

用 RabbitMQ 实现「请求-响应」：客户端发消息带 `replyTo`（回调队列）和 `correlationId`（匹配请求/响应），服务端处理完发回该队列。

```js
// rpc_server.js
const amqp = require('amqplib');

async function main() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();
  const queue = 'rpc_queue';
  await ch.assertQueue(queue, { durable: false });

  ch.prefetch(1);
  console.log(' [x] RPC 服务等待请求...');

  ch.consume(queue, async (msg) => {
    const n = parseInt(msg.content.toString(), 10);
    const result = fibonacci(n);     // 假设有 fibonacci 函数
    ch.sendToQueue(
      msg.properties.replyTo,       // 回发到客户端指定的回调队列
      Buffer.from(result.toString()),
      { correlationId: msg.properties.correlationId }  // 带上同样的关联 ID
    );
    ch.ack(msg);
  });
}

function fibonacci(n) {
  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}
main().catch(console.error);
```

```js
// rpc_client.js
const amqp = require('amqplib');

async function rpcCall(n) {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();

  // 声明一条排他的临时回调队列
  const q = await ch.assertQueue('', { exclusive: true });
  const correlationId = Math.random().toString().slice(2);
  const response = await new Promise((resolve) => {
    ch.consume(q.queue, (msg) => {
      if (msg.properties.correlationId === correlationId) {
        resolve(msg.content.toString());
      }
    }, { noAck: true });

    ch.sendToQueue('rpc_queue', Buffer.from(n.toString()), {
      correlationId,
      replyTo: q.queue,
    });
  });

  console.log(`fib(${n}) =`, response);
  await conn.close();
  return response;
}

rpcCall(30).catch(console.error);
```

---

## 12. 消息可靠性机制

要做到「消息不丢」，需要三层配合：

| 层 | 配置 | 作用 |
|---|---|---|
| 队列 | `durable: true` | broker 重启队列不消失 |
| 消息 | `deliveryMode: 2`（或 `persistent: true`） | 消息落盘，重启不丢 |
| 投递 | `channel.prefetch` + 手动 `ack` | 消费者崩了消息不丢 |
| 发布 | `ConfirmChannel` | 确认消息真的到了 broker |

> 注意：`durable + deliveryMode:2` 仍非 100% 可靠（极端情况 broker 在落盘前崩溃），生产高可靠场景需 **ConfirmChannel + Publisher Confirms** 或事务（事务性能差，不推荐）。

---

## 13. 死信队列（DLX）

消息在以下情况会变成「死信」：

1. 被 `reject`/`nack` 且 `requeue: false`
2. 消息 TTL 过期
3. 队列达到 `x-max-length` 被丢弃

通过 `x-dead-letter-exchange` 把死信转发到另一个交换机，便于排查/重试。

```js
const amqp = require('amqplib');

async function dlxDemo() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createChannel();

  // 1. 死信交换机 + 死信队列
  await ch.assertExchange('dlx', 'fanout', { durable: true });
  await ch.assertQueue('dead_letters', { durable: true });
  await ch.bindQueue('dead_letters', 'dlx', '');

  // 2. 主队列，绑定死信参数
  await ch.assertQueue('orders', {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'dlx',
      'x-dead-letter-routing-key': 'dead',
      // 'x-message-ttl': 10000,   // 也可在此设 TTL
    },
  });

  // 3. 消费主队列，处理失败则拒绝且不重投 → 进入死信队列
  ch.consume('orders', (msg) => {
    if (!msg) return;
    const ok = processOrder(msg);
    if (ok) {
      ch.ack(msg);
    } else {
      ch.nack(msg, false, false);   // requeue:false → 进死信
    }
  }, { noAck: false });

  // 4. 单独消费死信队列做告警/重试
  ch.consume('dead_letters', (dmsg) => {
    if (!dmsg) return;
    console.error(' [!] 死信:', dmsg.content.toString());
    ch.ack(dmsg);
  }, { noAck: false });
}
function processOrder() { return false; }  // 示例
dlxDemo().catch(console.error);
```

---

## 14. 消息 TTL 与队列过期

### 14.1 队列级 TTL（所有消息统一过期）

```js
await ch.assertQueue('ttl_queue', {
  arguments: { 'x-message-ttl': 30000 },   // 消息 30 秒后过期
});
```

### 14.2 消息级 TTL（单条设置）

```js
ch.publish(exchange, key, Buffer.from('hi'), {
  expiration: '10000',   // 注意：字符串！单位 ms
});
```

### 14.3 队列空闲过期

```js
await ch.assertQueue('temp', {
  arguments: { 'x-expires': 1800000 },   // 30 秒无消费者连接则自动删队列
});
```

> ⚠️ 过期消息**不会立刻删除**，而是在被「投递/扫描」时才判定为死信或丢弃；想精确控制到期动作，配合 DLX 使用。

---

## 15. ConfirmChannel 与发布确认

普通 `Channel` 的 `publish` 是「发完就忘」，无法知道是否真的到 broker。`createConfirmChannel()` 提供发布确认。

```js
const amqp = require('amqplib');

async function publishConfirm() {
  const conn = await amqp.connect('amqp://guest:guest@localhost:5672/');
  const ch = await conn.createConfirmChannel();   // ★ 确认通道
  await ch.assertQueue('confirms', { durable: true });

  // 方式一：回调
  ch.sendToQueue('confirms', Buffer.from('msg1'), { persistent: true }, (err, ok) => {
    if (err) console.error('发布失败:', err.message);
    else console.log(' [✓] broker 已确认收到 msg1');
  });

  // 方式二：Promise（配合 async）
  await new Promise((resolve, reject) => {
    ch.sendToQueue('confirms', Buffer.from('msg2'), { persistent: true }, (err) => {
      err ? reject(err) : resolve();
    });
  });
  console.log(' [✓] broker 已确认收到 msg2');

  // 方式三：waitForConfirms() 等所有在途消息确认
  ch.sendToQueue('confirms', Buffer.from('msg3'), { persistent: true });
  await ch.waitForConfirms();
  console.log(' [✓] 所有在途消息均已确认');

  await ch.close();
  await conn.close();
}
publishConfirm().catch(console.error);
```

> 高可靠生产者的标配：ConfirmChannel + 持久化 +超时重试 + 本地落盘兜底。

---

## 16. 错误处理、心跳与重连

### 16.1 心跳

```js
const conn = await amqp.connect(url, { heartbeat: 30 });
```

心跳用于检测「半开连接」。若应用处理过慢导致未及时回应心跳，broker 会断开——此时**会丢失未 ack 的消息**，所以消费者处理逻辑要快，或提高心跳值。

### 16.2 通用重连封装（生产推荐）

```js
const amqp = require('amqplib');

async function connectWithRetry(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqp.connect(url, { heartbeat: 30 });
      console.log(' [✓] RabbitMQ 连接成功');
      // 断线自动重连逻辑
      conn.on('close', () => {
        console.warn(' [!] 连接关闭，5 秒后重连...');
        setTimeout(() => connectWithRetry(url, retries), 5000);
      });
      return conn;
    } catch (err) {
      console.error(` [x] 第 ${i + 1} 次连接失败:`, err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('无法连接 RabbitMQ，已达最大重试次数');
}
```

### 16.3 消费重试（指数退避）

```js
async function consumeWithRetry(ch, queue, handler, maxRetry = 3) {
  ch.consume(queue, async (msg) => {
    if (!msg) return;
    let attempt = (msg.properties.headers['x-retry'] || 0);
    try {
      await handler(JSON.parse(msg.content.toString()));
      ch.ack(msg);
    } catch (err) {
      attempt++;
      if (attempt > maxRetry) {
        ch.nack(msg, false, false);   // 进死信
      } else {
        // 带重试次数头，延迟重投（这里简单重投，生产用延迟队列更稳）
        ch.publish('', queue, msg.content, {
          headers: { 'x-retry': attempt },
          persistent: true,
        });
        ch.ack(msg);   // 先 ack 旧消息，新版已重投
      }
    }
  }, { noAck: false });
}
```

---

## 17. Management HTTP API

RabbitMQ 自带 HTTP 管理 API（需启用 `rabbitmq_management` 插件，默认端口 15672）。可用于监控、自动化、健康检查。

> 认证用 HTTP Basic Auth（默认 guest/guest）。

### 17.1 常用端点

| 方法 | 端点 | 说明 |
|---|---|---|
| GET | `/api/overview` | 集群概览 |
| GET | `/api/queues` | 所有队列 |
| GET | `/api/queues/{vhost}/{name}` | 单个队列详情 |
| GET | `/api/queues/{vhost}/{name}/messages` | 队列消息数等 |
| GET | `/api/exchanges` | 所有交换机 |
| GET | `/api/connections` | 连接列表 |
| GET | `/api/channels` | 通道列表 |
| GET | `/api/consumers` | 消费者列表 |
| PUT | `/api/queues/{vhost}/{name}` | 创建队列 |
| DELETE | `/api/queues/{vhost}/{name}` | 删除队列 |
| POST | `/api/queues/{vhost}/{name}/purge` | 清空队列 |
| POST | `/api/exchanges/{vhost}/{name}/publish` | **通过 HTTP 发消息** |
| GET | `/api/healthchecks/node` | 节点健康检查 |
| GET | `/api/aliveness-test/{vhost}` | 存活检测 |

### 17.2 Node 调用示例

```js
const axios = require('axios');   // 或 node 自带 fetch (Node 18+)

const BASE = 'http://localhost:15672/api';
const auth = { username: 'guest', password: 'guest' };

// 查询所有队列
async function listQueues() {
  const { data } = await axios.get(`${BASE}/queues`, { auth });
  return data.map((q) => ({
    name: q.name,
    messages: q.messages,
    consumers: q.consumers,
  }));
}

// 通过 HTTP 直接发一条消息
async function httpPublish(vhost, exchange, routingKey, payload) {
  await axios.post(
    `${BASE}/exchanges/${encodeURIComponent(vhost)}/${exchange}/publish`,
    {
      properties: {},
      routing_key: routingKey,
      payload: JSON.stringify(payload),
      payload_encoding: 'string',
    },
    { auth }
  );
}

// 健康检查
async function health() {
  const { data } = await axios.get(`${BASE}/healthchecks/node`, { auth });
  return data.status === 'ok';
}

// 使用（Node 18+ 用 fetch 也行）
listQueues().then((qs) => console.log(qs)).catch(console.error);
```

> 管理 API 适合**运维/监控/告警**，业务发消息仍走 amqplib（更高效的二进制 AMQP 协议）。

---

## 18. TypeScript 封装示例

一份可复用的生产级封装（单连接、懒初始化、自动重连）：

```ts
// rabbitmq.ts
import * as amqp from 'amqplib';

type ExchangeType = 'direct' | 'topic' | 'fanout' | 'headers';

export class RabbitMQ {
  private conn?: amqp.Connection;
  private channel?: amqp.Channel;
  private readonly url: string;

  constructor(url = 'amqp://guest:guest@localhost:5672/') {
    this.url = url;
  }

  async init(): Promise<void> {
    this.conn = await amqp.connect(this.url, { heartbeat: 30 });
    this.channel = await this.conn.createChannel();
  }

  async assertQueue(name: string, durable = true) {
    return this.channel!.assertQueue(name, { durable });
  }

  async assertExchange(name: string, type: ExchangeType, durable = true) {
    return this.channel!.assertExchange(name, type, { durable });
  }

  async bindQueue(queue: string, exchange: string, pattern = '') {
    return this.channel!.bindQueue(queue, exchange, pattern);
  }

  publish(exchange: string, routingKey: string, data: unknown) {
    return this.channel!.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)), {
      persistent: true,
      contentType: 'application/json',
    });
  }

  async consume(queue: string, handler: (data: any, msg: amqp.Message) => Promise<void>) {
    await this.channel!.prefetch(1);
    return this.channel!.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        await handler(data, msg);
        this.channel!.ack(msg);
      } catch (err) {
        console.error('消费失败:', err);
        this.channel!.nack(msg, false, true);   // 重投
      }
    }, { noAck: false });
  }

  async close() {
    await this.channel?.close();
    await this.conn?.close();
  }
}

// 用法
// const mq = new RabbitMQ();
// await mq.init();
// await mq.assertQueue('tasks');
// mq.publish('', 'tasks', { id: 1 });
// await mq.consume('tasks', async (data) => console.log(data));
```

---

## 19. 常见坑与最佳实践

### 坑

1. **`expiration` 写数字**：必须是字符串 `'30000'`，否则不生效。
2. **忘记 `ack`**：消费者不 ack，消息一直 unacked，最终 channel/队列堆积、内存暴涨。
3. **`noAck:true` 丢消息**：进程崩了消息直接没，生产环境禁用。
4. **prefetch 不生效**：必须 `noAck:false` 才有效；`prefetch(0)` 表示无限预取（又回到能者不均）。
5. **一个连接开海量 channel**：channel 轻量但不免费，长连接建议复用单 channel 或连接池。
6. **默认账号远程连不上**：`guest/guest` 只允许 `localhost`，远程部署要新建用户。
7. **fanout 的 routingKey 无效**：fanout 不看 key，所有绑定队列都收。
8. **持久化 ≠ 不丢**：还得 `deliveryMode:2` + `ConfirmChannel` 才接近可靠。

### 最佳实践

- **单连接多 channel**：不要每条消息建连接。
- **队列/交换机都设 `durable:true`**，消息 `deliveryMode:2`。
- **消费者必开 `prefetch(1)` + 手动 ack**。
- **失败消息走死信队列（DLX）**，别无限重投主队列。
- **连接和通道都监听 `error`/`close` 事件 + 重连**。
- **心跳 30 秒**，消费逻辑要快，必要时把重活丢到别的 worker。
- **用 `assertQueue/assertExchange` 的幂等声明**：生产者和消费者都可以声明，已存在不会报错，省去手动建队列。
- **监控**：用 Management API 定期拉队列积压数、消费者数做告警。

---

## 附：快速对照表

| 想做的事 | 用什么 |
|---|---|
| 发到队列（不建 exchange） | `ch.sendToQueue(queue, buf, opts)` |
| 发到交换机 | `ch.publish(exchange, key, buf, opts)` |
| 持续收消息 | `ch.consume(queue, cb, {noAck:false})` |
| 拉一条消息 | `ch.get(queue, {noAck:false})` |
| 确认成功 | `ch.ack(msg)` |
| 拒绝重投 | `ch.nack(msg, false, true)` |
| 拒绝丢弃/进死信 | `ch.nack(msg, false, false)` |
| 公平分发 | `ch.prefetch(1)` |
| 广播 | exchange 类型 `fanout` |
| 精确路由 | exchange 类型 `direct` |
| 模式匹配 | exchange 类型 `topic` |
| 发布确认 | `conn.createConfirmChannel()` |
| 可靠投递 | durable + deliveryMode:2 + ConfirmChannel |

---

*文档基于 amqplib（AMQP 0-9-1），RabbitMQ 3.x 验证。示例代码可直接复制运行（需先启动本地 RabbitMQ）。*
