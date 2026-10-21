---
title: Node.js 使用 MQTT 学习文档
create:2026-10-21
update:2026-10-21
category:iot
tags:[node,mqtt,iot,message,broker,backend]
summary:Node.js 使用 MQTT 协议的学习文档，覆盖连接、发布订阅、QoS 与遗嘱消息
keywords:[node,mqtt,iot,broker,publish-subscribe,qos]
top:1
copyright:true
---

# Node.js 使用 MQTT 学习文档

> 适用对象：已掌握 Node.js 基础（async/await、事件、流）的开发者。
> 本文基于官方 `mqtt` 包（moscajs/mqtt，当前主流 v5.x），覆盖 MQTT 3.1.1 与 MQTT 5.0。
> 所有示例复制即可运行（需先启动一个 broker，见下文）。

---

## 目录

1. [MQTT 是什么](#1-mqtt-是什么)
2. [环境准备](#2-环境准备)
3. [核心概念](#3-核心概念)
4. [快速开始：第一个发布与订阅](#4-快速开始第一个发布与订阅)
5. [API 完整速查表](#5-api-完整速查表)
6. [使用模式与进阶](#6-使用模式与进阶)
7. [MQTT 5.0 特性](#7-mqtt-50-特性)
8. [自动重连与离线处理](#8-自动重连与离线处理)
9. [TypeScript 工程化封装](#9-typescript-工程化封装)
10. [实战：传感器上报 + 命令下发](#10-实战传感器上报--命令下发)
11. [常见坑与最佳实践](#11-常见坑与最佳实践)
12. [与其它协议对比 & 快速对照表](#12-与其它协议对比--快速对照表)

---

## 1. MQTT 是什么

**MQTT（Message Queuing Telemetry Transport）** 是一种基于 **发布/订阅（publish/subscribe）** 模式的轻量级物联网消息传输协议，构建在 TCP/IP 之上（也可跑在 WebSocket 上）。它只负责"把消息从一端可靠地送到另一端"，本身不存数据——所以严格说它是**消息传输协议 / 通信中间件客户端用法**，而非数据库。

核心角色：

- **Broker（代理 / 服务器）**：消息中转站，负责接收发布、按主题分发订阅。常见实现：Eclipse Mosquitto、EMQX、HiveMQ、阿里云 IoT Hub。
- **Client（客户端）**：任何连上 broker 的程序。Node 通过 `mqtt` 包即成为一个 client。一个程序可以同时是发布者和订阅者。

为什么选 MQTT 而不是 HTTP：

- 极小的协议头（最小 2 字节），省带宽，适合弱网/嵌入式。
- 长连接 + 推送，broker 主动把消息推给在线订阅者，无需客户端轮询。
- 三种 **QoS（服务质量）** 保证不同可靠级别。
- 内置 **遗嘱消息（Last Will）**、**保留消息（Retained）**、**会话保持** 等专为"设备掉线"场景设计的机制。

---

## 2. 环境准备

### 2.1 启动一个本地 Broker（Mosquitto，最轻量）

```bash
# 用 Docker 一键起一个本地 broker（默认端口 1883）
docker run -d --name mqtt -p 1883:1883 -p 9001:9001 eclipse-mosquitto:2

# 不带 Docker：macOS
brew install mosquitto && brew services start mosquitto

# 验证：用 mosquitto 自带客户端发一句
mosquitto_pub -h localhost -t test -m "hello"
mosquitto_sub -h localhost -t test
```

> 生产环境可用 EMQX（`docker run -d --name emqx -p 1883:1883 emqx/emqx:latest`），支持 MQTT 5.0、共享订阅、规则引擎、Dashboard。

### 2.2 安装 Node 客户端

```bash
# 普通 Node 项目
npm i mqtt
# 或 pnpm
pnpm add mqtt
```

`mqtt` 包同时支持：TCP（`mqtt://`）、TLS（`mqtts://`）、WebSocket（`ws://` / `wss://`），浏览器里也能用（通过 `wss://` 或打包后的 `mqtt`）。

---

## 3. 核心概念

### 3.1 主题（Topic）

主题是用 `/` 分隔的 UTF-8 字符串层级，例如 `home/livingroom/temperature`。

- 发布和订阅都按"主题"匹配。
- 层级**区分大小写**，`home/A` 与 `home/a` 是两个主题。
- 不要用 `/` 开头或结尾（多数 broker 会拒绝或产生空层）。

### 3.2 通配符

| 通配符 | 含义 | 示例 |
|---|---|---|
| `+` | 单层通配 | `home/+/temperature` 匹配 `home/kitchen/temperature`，**不匹配** `home/kitchen/sensor1/temperature` |
| `#` | 多层通配（必须放在主题**末尾**） | `home/#` 匹配 `home` 下所有层级 |

> 注意：`#` 不能写成 `home/#/x`（# 后还有内容非法）。`+` 和 `#` 不能用于**发布**的主题。

### 3.3 QoS（服务质量）

| QoS | 含义 | 传输保证 |
|---|---|---|
| 0 | 至多一次（At most once） | 发了就忘，可能丢，最快 |
| 1 | 至少一次（At least once） | 保证送达，但可能重复 |
| 2 | 恰好一次（Exactly once） | 保证只送达一次，最慢，握手最多 |

> 实际到达质量 = `min(发布者 QoS, 订阅者 QoS)`。例如发布 QoS2 但订阅 QoS1，则按 1 投递。

### 3.4 保留消息（Retained）

发布时设 `retain: true`，broker 会保存该主题的**最后一条**保留消息。任何新订阅者上线后立即收到它（无需等下一次发布）。适合"设备当前状态快照"。

### 3.5 遗嘱消息（Last Will and Testament, LWT）

连接时设置 `will` 选项。当 broker 检测到客户端**非正常断开**（心跳超时、网络中断），会自动代发这条遗嘱到指定主题。常用于"设备离线"状态广播。

### 3.6 会话（Session）与 Clean Start

- `clean: true`（MQTT 3.1.1 的 `clean: true` = MQTT5 的 `cleanStart: true`）：每次连接都是全新会话，断线期间的消息不会补发。
- `clean: false`：broker 为客户端保留订阅关系和未确认消息，重连后补发（需固定 `clientId`）。

### 3.7 Keep Alive 心跳

客户端定期发 `PINGREQ`，broker 回 `PINGRESP`。超过 1.5 倍 keepalive 未收到即判定掉线。默认 `keepalive: 60`（秒）。

---

## 4. 快速开始：第一个发布与订阅

### 4.1 最简单的订阅者

```js
// sub.js
const mqtt = require('mqtt')

// 连到本地 broker；mqtt.connect 返回 MqttClient 实例
const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: 'node-sub-' + Math.random().toString(16).slice(2, 8),
})

// 'connect' 事件：握手成功后才订阅/发布，避免连上瞬间发消息丢失
client.on('connect', () => {
  console.log('已连接到 broker')
  // 订阅主题，QoS 1
  client.subscribe('demo/hello', { qos: 1 }, (err, granted) => {
    if (err) return console.error('订阅失败:', err)
    console.log('已订阅:', granted)   // [{ topic: 'demo/hello', qos: 1 }]
  })
})

// 'message' 事件：收到匹配主题的消息
client.on('message', (topic, payload, packet) => {
  // payload 是 Buffer，按需转字符串/JSON
  console.log(`收到 [${topic}]:`, payload.toString())
  console.log('  QoS=', packet.qos, 'retain=', packet.retain)
})
```

### 4.2 最简单的发布者

```js
// pub.js
const mqtt = require('mqtt')

const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: 'node-pub-' + Math.random().toString(16).slice(2, 8),
})

client.on('connect', () => {
  // publish(topic, message, options?, callback?)
  client.publish('demo/hello', 'Hello MQTT from Node!', { qos: 1 }, (err) => {
    if (err) return console.error('发布失败:', err)
    console.log('已发布')
    client.end()   // 发完即断开
  })
})
```

运行：

```bash
node sub.js   # 终端 A，先起
node pub.js   # 终端 B，后起
```

### 4.3 async/await 风格（推荐）

`mqtt` 提供 `connectAsync`，返回 Promise，配合 `await` 更顺手：

```js
const mqtt = require('mqtt')

async function main() {
  const client = await mqtt.connectAsync('mqtt://localhost:1883', {
    clientId: 'node-async-1',
  })
  console.log('连接成功')

  await client.subscribe('demo/#')
  client.on('message', (t, p) => console.log(t, p.toString()))

  await client.publish('demo/hi', JSON.stringify({ ok: true }))
  console.log('发布完成')
}

main().catch(console.error)
```

---

## 5. API 完整速查表

### 5.1 `mqtt.connect(url, options)` / `mqtt.connectAsync(url, options)`

返回一个 `MqttClient`（`connectAsync` 返回 `Promise<MqttClient>`）。

**`url`** 支持：
- `mqtt://localhost:1883`（TCP）
- `mqtts://localhost:8883`（TLS）
- `ws://localhost:9001`（WebSocket）
- `wss://broker.example.com/mqtt`（安全 WebSocket，浏览器常用）
- 也接受对象形式 `mqtt.connect({ host: 'localhost', port: 1883, protocol: 'mqtt' })`

**`options`（常用字段）**：

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `clientId` | string | 自动生成 | 客户端标识，**clean:false 时必须固定**，否则会话无法恢复 |
| `clean` | boolean | `true` | MQTT 3.1.1：是否清除会话（true=不保留离线消息） |
| `cleanStart` | boolean | `true` | MQTT 5.0 同义字段，优先级高于 `clean` |
| `keepalive` | number | `60` | 心跳间隔（秒），0 表示禁用 |
| `reconnectPeriod` | number | `1000` | 断线后重连间隔（毫秒），0 表示不自动重连 |
| `connectTimeout` | number | `30000` | 连接超时（毫秒） |
| `username` | string | — | 用户名鉴权 |
| `password` | string/buffer | — | 密码鉴权 |
| `will` | object | — | 遗嘱消息（见 5.6） |
| `protocolVersion` | number | `4` | `3`=3.1、`4`=3.1.1、`5`=5.0 |
| `rejectUnauthorized` | boolean | `true` | TLS 是否校验服务端证书（自签证书时设 false） |
| `ca`/`cert`/`key` | — | — | TLS 证书链/客户端证书/私钥 |
| `resubscribe` | boolean | `true` | 断线重连后是否自动重新订阅 |
| `queueQoSZero` | boolean | `true` | 断线期间是否缓存 QoS0 消息（重连后补发） |
| `reschedulePings` | boolean | `true` | 是否在活动后重置心跳计时（避免假死） |
| `manualConnect` | boolean | `false` | true 时不自动连，需手动 `client.connect()` |
| `properties` | object | — | MQTT 5.0 连接属性（见 7） |

### 5.2 MqttClient 主要方法

| 方法 | 说明 |
|---|---|
| `client.subscribe(topic, [opts], [cb])` | 订阅单个/多个主题。topic 可为字符串、`['a','b']`、`[{topic, qos}]` |
| `client.unsubscribe(topic, [opts], [cb])` | 退订 |
| `client.publish(topic, message, [opts], [cb])` | 发布消息。message 可为 string/Buffer |
| `client.end([force], [opts], [cb])` | 断开连接。`force:true` 立即关闭不发剩余消息 |
| `client.reconnect()` | 手动重连 |
| `client.removeOutgoingMessage(id)` | 删除指定 packetId 的待确认出站消息 |
| `client.handleMessage(topic, message, cb)` / `client.doPing()` | 底层钩子，一般不用 |

### 5.3 发布 `publish(topic, message, options, callback)`

**options**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `qos` | 0\|1\|2 | 服务质量 |
| `retain` | boolean | 是否设为保留消息 |
| `dup` | boolean | 是否为重发副本（内部用，一般勿设） |
| `properties` | object | MQTT 5.0 发布属性（见 7） |

**callback(err)**：仅当 QoS>0 时表示"broker 已确认"（QoS1 的 PUBACK / QoS2 的 PUBCOMP）；QoS0 则仅表示"已进入 socket 发送队列"。

```js
client.publish('sensor/temp', '26.5', { qos: 1, retain: true }, (err) => {
  if (!err) console.log('broker 已确认收到')
})
```

### 5.4 订阅 `subscribe(filter, options, callback)`

**filter** 形式：
```js
client.subscribe('a/b')                       // 单主题
client.subscribe(['a/b', 'c/#'])             // 多主题
client.subscribe([{ topic: 'a/b', qos: 2 }]) // 带 QoS
```

**options**：`qos`、`nl`(no local, MQTT5)、`rap`(retain as published, MQTT5)、`rh`(retain handling, MQTT5)、`properties`。

**callback(err, granted)**：`granted` 为数组 `[{ topic, qos }]`，反映 broker 实际授予的 QoS（取 min）。

### 5.5 消息事件回调签名

```js
client.on('message', (topic, payload, packet) => {
  // topic:   string
  // payload: Buffer（注意不是字符串！）
  // packet:  完整 MQTT 报文对象，含以下字段
})
```

`packet` 关键字段：

| 字段 | 说明 |
|---|---|
| `topic` | 主题 |
| `payload` | Buffer 消息体 |
| `qos` | 实际投递 QoS |
| `retain` | 是否为保留消息 |
| `dup` | 是否为重发 |
| `cmd` | 报文类型，如 `'publish'` |
| `properties` | MQTT 5.0 属性（userProperties 等） |
| `messageId` | 报文 ID（QoS>0 时用于 ack） |

### 5.6 遗嘱 `will` 配置

```js
const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: 'device-001',
  will: {
    topic: 'devices/device-001/status',
    payload: JSON.stringify({ online: false, ts: Date.now() }),
    qos: 1,
    retain: true,                       // 让状态快照持久可见
    properties: { willDelayInterval: 30 }, // MQTT5: 延迟 30s 才发（避免闪断误报）
  },
})
```

---

## 6. 使用模式与进阶

### 6.1 QoS 选择实践

```js
// 关键控制指令用 QoS1/2，高频遥测用 QoS0
client.publish('cmd/reboot', '1', { qos: 2 })      // 必须送达
client.publish('sensor/raw', buf, { qos: 0 })      // 丢一帧无所谓
```

### 6.2 保留消息（状态快照）

```js
// 设备上报当前温度，并设为保留 —— 新订阅者一上线就拿到最新值
client.publish('sensor/temp', '26.5', { qos: 1, retain: true })

// 清除某主题的保留消息：发布一条空 payload + retain:true
client.publish('sensor/temp', '', { retain: true })
```

### 6.3 通配符订阅 + 路由分发

```js
client.subscribe('home/+/temperature', { qos: 1 })

client.on('message', (topic, payload) => {
  // 解析层级
  const [, room] = topic.split('/')   // ['home', 'kitchen', 'temperature']
  console.log(`${room} 温度:`, payload.toString())
})
```

### 6.4 共享订阅（Shared Subscription，MQTT 5.0 / EMQX 等支持）

多个消费者组成一个"消费组"，broker 在组内**轮询**分发，实现负载均衡（而非广播给每个订阅者）。

```js
// 标准 MQTT5 语法：$share/<group>/<topic>
client.subscribe('$share/workers/queue/job', { qos: 1 })
// EMQX 兼容语法（3.x 也可用）：$queue/<topic>
client.subscribe('$queue/queue/job', { qos: 1 })
```

> 共享订阅适合"任务队列"场景；普通订阅适合"广播通知"场景。

### 6.5 用户名密码鉴权

```js
const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'app-node',
  password: 'secret-token',
  // 也可放在 URL：mqtt://app-node:secret-token@localhost:1883
})
```

### 6.6 TLS 安全连接（mqtts）

```js
const fs = require('fs')
const client = mqtt.connect('mqtts://broker.example.com:8883', {
  ca: fs.readFileSync('./ca.crt'),          // 服务端 CA 证书
  cert: fs.readFileSync('./client.crt'),    // 客户端证书（双向认证时）
  key: fs.readFileSync('./client.key'),
  rejectUnauthorized: true,                 // 生产务必 true
  // 自签证书临时调试：rejectUnauthorized: false（不推荐上线）
})
```

### 6.7 在 WebSocket 上跑（浏览器 / 防火墙友好）

```js
// 浏览器环境（打包后）或 Node 都可用 wss
const client = mqtt.connect('wss://broker.example.com:8084/mqtt', {
  username: 'web', password: 'x',
})
```

> 注意路径：EMQX 的 WebSocket 默认挂载在 `/mqtt`。URL 必须带对路径。

---

## 7. MQTT 5.0 特性

`mqtt` 包完整支持 MQTT 5.0，连接时设 `protocolVersion: 5`。

### 7.1 连接属性 `properties`

```js
mqtt.connect('mqtt://localhost:1883', {
  protocolVersion: 5,
  properties: {
    sessionExpiryInterval: 3600,   // 会话过期时间（秒），配合 cleanStart:false
    receiveMaximum: 65535,         // 客户端能承受的最大未确认入站数
    userProperties: { app: 'iot-monitor' },
    requestResponseInformation: true,
    requestProblemInformation: true,
  },
})
```

### 7.2 发布属性（User Properties 等）

```js
client.publish('event/log', 'boot', {
  qos: 1,
  properties: {
    userProperties: { traceId: 'abc123', source: 'edge' },
    messageExpiryInterval: 86400,  // 消息存活 1 天，超时 broker 丢弃
    contentType: 'application/json',
    responseTopic: 'reply/here',   // 配合 9 节的请求-响应模式
  },
})
```

### 7.3 原因码（Reason Code）

MQTT5 的回调里能拿到更细的失败原因：

```js
client.on('error', (err) => {
  // err 可能含 reasonCode / reasonString（MQTT5）
  console.error(err)
})
```

---

## 8. 自动重连与离线处理

`mqtt` 默认开重连（`reconnectPeriod: 1000`），关键是**在正确的事件里做事**：

```js
const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: 'durable-client',   // 固定 ID，配合 clean:false 才能补发离线消息
  clean: false,
  reconnectPeriod: 2000,
  resubscribe: true,            // 重连后自动重新订阅（默认 true）
})

// ✅ 订阅必须放在 'connect' 里（首次 + 每次重连都会触发）
client.on('connect', () => {
  client.subscribe('app/commands', { qos: 1 })
  // 若 clean:false，这里可主动拉取离线期间堆积的消息（broker 自动补发）
})

client.on('reconnect', () => console.log('[reconnect] 正在重连...'))
client.on('offline', () => console.log('[offline] 连接已断开'))
client.on('close', () => console.log('[close] 连接关闭'))
client.on('error', (e) => console.error('[error]', e.message))

// 断线期间发布的消息：默认 queueQoSZero:true 会缓存 QoS0 消息，
// QoS1/2 由协议保证重发。重连后自动补发。
```

**离线消息的发布缓冲**：

```js
// 网络抖动时 publish 不会丢，client 内部按 QoS 缓存并在重连后重发
client.publish('sensor/temp', '26.5', { qos: 1 })  // QoS1 保证最终送达
```

---

## 9. TypeScript 工程化封装

下面是一个可复用的 MQTT 客户端封装类，封装连接、重连、话题路由、JSON 编解码：

```ts
// mqtt-client.ts
import mqtt, { MqttClient, IClientOptions, IPublishPacket } from 'mqtt'

type Handler = (payload: Buffer, packet: IPublishPacket) => void

export interface MqttConfig {
  url: string
  clientId?: string
  username?: string
  password?: string
  clean?: boolean
  protocolVersion?: 3 | 4 | 5
}

export class MqttWrapper {
  private client: MqttClient
  private handlers = new Map<string, Set<Handler>>()
  private connected = false

  constructor(private cfg: MqttConfig) {
    const opts: IClientOptions = {
      clientId: cfg.clientId ?? 'node-' + Math.random().toString(16).slice(2, 10),
      username: cfg.username,
      password: cfg.password,
      clean: cfg.clean ?? true,
      reconnectPeriod: 2000,
      protocolVersion: cfg.protocolVersion ?? 4,
    }

    this.client = mqtt.connect(cfg.url, opts)

    this.client.on('connect', () => {
      this.connected = true
      // 重连后重新订阅所有已注册 handler 的主题
      for (const topic of this.handlers.keys()) {
        this.client.subscribe(topic, { qos: 1 })
      }
    })
    this.client.on('message', (topic, payload, packet) => {
      const exact = this.handlers.get(topic)
      exact?.forEach((h) => h(payload, packet))
      // 通配符话题：简单实现可借助 mqtt-pattern 库做匹配
    })
    this.client.on('offline', () => (this.connected = false))
    this.client.on('error', (e) => console.error('[mqtt] error:', e.message))
  }

  /** 订阅 + 注册处理器 */
  on(topic: string, handler: Handler) {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set())
      if (this.connected) this.client.subscribe(topic, { qos: 1 })
    }
    this.handlers.get(topic)!.add(handler)
    return this
  }

  /** 发布 JSON */
  publishJson(topic: string, obj: unknown, opts?: { qos?: 0 | 1 | 2; retain?: boolean }) {
    return new Promise<void>((resolve, reject) => {
      this.client.publish(
        topic,
        JSON.stringify(obj),
        { qos: opts?.qos ?? 0, retain: opts?.retain ?? false },
        (err) => (err ? reject(err) : resolve()),
      )
    })
  }

  async close() {
    await new Promise<void>((res) => this.client.end(false, {}, () => res()))
  }
}

// 用法
// const m = new MqttWrapper({ url: 'mqtt://localhost:1883', clientId: 'svc-1' })
// m.on('app/cmd', (buf) => console.log(JSON.parse(buf.toString())))
// await m.publishJson('app/event', { type: 'boot' })
```

---

## 10. 实战：传感器上报 + 命令下发

一个典型物联网闭环：设备周期上报温度（保留消息），云端订阅后下发控制命令。

```js
// device.js —— 模拟设备端
const mqtt = require('mqtt')

const client = mqtt.connect('mqtt://localhost:1883', {
  clientId: 'device-001',
  will: {
    topic: 'devices/device-001/status',
    payload: JSON.stringify({ online: false }),
    qos: 1,
    retain: true,
  },
})

client.on('connect', () => {
  client.subscribe('devices/device-001/cmd', { qos: 1 })

  // 周期上报温度，保留最新值
  setInterval(() => {
    const temp = (20 + Math.random() * 10).toFixed(1)
    client.publish(
      'devices/device-001/temp',
      JSON.stringify({ temp, ts: Date.now() }),
      { qos: 1, retain: true },
    )
  }, 3000)

  // 上线即广播在线状态
  client.publish(
    'devices/device-001/status',
    JSON.stringify({ online: true, ts: Date.now() }),
    { qos: 1, retain: true },
  )
})

client.on('message', (topic, payload) => {
  const cmd = JSON.parse(payload.toString())
  console.log('收到命令:', cmd)
  if (cmd.action === 'reboot') { /* 执行重启 */ }
})
```

```js
// cloud.js —— 云端控制端
const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://localhost:1883', { clientId: 'cloud-controller' })

client.on('connect', () => {
  client.subscribe('devices/+/temp', { qos: 1 })
  client.subscribe('devices/+/status', { qos: 1 })

  // 5 秒后下发一条命令
  setTimeout(() => {
    client.publish(
      'devices/device-001/cmd',
      JSON.stringify({ action: 'reboot' }),
      { qos: 1 },
    )
  }, 5000)
})

client.on('message', (topic, payload) => {
  const data = JSON.parse(payload.toString())
  console.log(`[${topic}]`, data)
})
```

---

## 11. 常见坑与最佳实践

1. **payload 是 Buffer，不是字符串**：`payload.toString()` 转字符串；JSON 要先 `JSON.parse(payload.toString())`，否则报错。
2. **订阅要放在 `connect` 事件里**：连上之前订阅会被忽略；`resubscribe:true` 只解决重连，首次也得在 connect 里。
3. **clean:false 必须配固定 clientId**：否则每次重连是"新会话"，离线消息无法补发；多个实例用同一 clientId 会互相踢下线。
4. **QoS0 的 publish 回调只表示"已进发送队列"**，不代表 broker 收到。关键消息用 QoS1+ 并用回调确认。
5. **retain 消息忘记清理**：状态类主题用 retain 很方便，但主题废弃时要发空 payload 清掉，否则新订阅者永远收到旧值。
6. **遗嘱要设 `retain:true` + online 状态也 retain**：这样"设备在线/离线"始终是自解释的最新快照，订阅者随时能判断。
7. **WebSocket 路径**：`wss://host/mqtt` 的 `/mqtt` 路径不能漏，不同 broker 挂载点不同（EMQX=`/mqtt`，Mosquitto 需额外配置）。
8. **TLS 自签证书**：临时调试用 `rejectUnauthorized:false`，但上线务必配 `ca` 并设为 `true`，否则有中间人风险。
9. **共享订阅语法区分 broker**：EMQX 支持 `$queue/` 和 `$share/group/`；标准 MQTT5 只有 `$share/`。写错语法订阅会失败或变成普通主题。
10. **大量主题用通配符 + 单连接**：不要为每个主题开一个 client，复用单连接 + 通配订阅 + 在 message 里路由，更省资源。

**最佳实践清单**：

- 主题层级用稳定结构：`{domain}/{deviceId}/{type}`，便于通配与权限控制。
- 高频数据 QoS0，控制/告警 QoS1/2。
- 设备状态类一律 retain + will 双保险。
- 客户端加 `client.on('error')` 统一兜底，避免进程崩溃。
- 生产环境关闭 `rejectUnauthorized:false`，启用鉴权与 TLS。
- 用固定 `clientId` + `clean:false` 实现"离线消息不丢"。

---

## 12. 与其它协议对比 & 快速对照表

### 12.1 MQTT vs HTTP vs WebSocket

| 维度 | MQTT | HTTP | WebSocket |
|---|---|---|---|
| 模式 | 发布/订阅（推送） | 请求/响应 | 全双工长连接 |
| 开销 | 极小（2 字节头） | 较大（头部多） | 中等 |
| 实时性 | 主动推送，极低延迟 | 需轮询或长轮询 | 双向实时 |
| 离线消息 | QoS+会话支持 | 无 | 需自己实现 |
| 适合 | IoT、遥测、推送 | REST API、网页 | 聊天、实时 UI |

### 12.2 常用操作速查

| 需求 | 代码 |
|---|---|
| 连接 | `mqtt.connect('mqtt://host:1883', opts)` |
| 异步连接 | `await mqtt.connectAsync(url, opts)` |
| 订阅 | `client.subscribe('a/b', { qos: 1 }, cb)` |
| 退订 | `client.unsubscribe('a/b', cb)` |
| 发布 | `client.publish('a/b', 'hi', { qos: 1 }, cb)` |
| 收消息 | `client.on('message', (t, p, pk) => {})` |
| 保留消息 | `client.publish('a', 'v', { retain: true })` |
| 清保留 | `client.publish('a', '', { retain: true })` |
| 遗嘱 | `connect({ will: { topic, payload, qos, retain } })` |
| 断开 | `client.end()` |
| 重连 | `client.reconnect()` |
| TLS | `mqtt.connect('mqtts://...', { ca, key, cert })` |
| WS | `mqtt.connect('wss://host/mqtt')` |
| 共享订阅 | `client.subscribe('$share/g/queue/job')` |
| MQTT5 | `connect({ protocolVersion: 5, properties: {...} })` |

### 12.3 推荐学习路径

1. 跑通 4 节的 pub/sub → 2. 试 QoS/retain/will（6 节）→ 3. 用封装类（9 节）落地项目 → 4. 上 TLS + 鉴权（6.5/6.6）→ 5. 需要高并发消费时上共享订阅（6.4）。

---

> 本文基于 `mqtt` 包 v5 API 编写。不同小版本字段略有差异，请以 `npm view mqtt version` 实际安装版本为准；官方文档：https://github.com/moscajs/mqtt
