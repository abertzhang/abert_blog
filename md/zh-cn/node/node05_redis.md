---
title: Node 使用 Redis 学习文档
create:2026-10-21
update:2026-10-21
category:cache
tags:[node,redis,cache,database,session,backend]
summary:Node 使用 Redis 的学习文档，覆盖连接、数据结构、发布订阅与缓存模式
keywords:[node,redis,cache,database,pub-sub,session]
top:1
copyright:true
---

# Node 使用 Redis 学习文档

> 适用版本：Redis 7.x，客户端以 **ioredis v5.x**（功能最全、TS 支持最好）为主，并附官方 **node-redis（redis v4/v5）** 对照。
> 语言：TypeScript / JavaScript（示例以 TS 为主，可去类型当 JS 用）。

---

## 1. 先说清楚：Redis 是什么

**Redis 是一个内存数据结构存储（in-memory data structure store）**。它常被当成「数据库」用（可持久化的 KV 存储），但更准确地说它是**多数据结构服务器**：除了字符串，还原生支持哈希、列表、集合、有序集合、位图、HyperLogLog、地理空间、流（Stream）等。

典型用途：缓存、会话存储、排行榜、计数器、消息队列（Pub/Sub / Stream）、限流、分布式锁、实时排行榜。

| 角色 | 说明 |
|---|---|
| 缓存 Cache | 最主流用法，给 DB 前面挡一层，TTL 自动过期 |
| 数据结构服务器 | 直接用 List/Set/ZSet/Hash 表达业务结构 |
| 消息中间件 | Pub/Sub 轻量广播、Stream 做可靠队列 |
| KV 数据库 | 可开启 AOF/RDB 持久化，当作持久 KV 用 |

> Redis 与前面文档的 RabbitMQ/MQTT（消息队列）、Elasticsearch（搜索引擎）定位不同：Redis 主打**低延迟内存访问**，适合高频小数据；不适合做大体积、强一致、复杂关系的数据。

---

## 2. 环境准备

### 2.1 Docker 起 Redis 7

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
# 带密码
docker run -d --name redis -p 6379:6379 redis:7-alpine redis-server --requirepass changeme
```

### 2.2 安装客户端

```bash
# ioredis（推荐：功能全、集群/Sentinel/自动重连/Pipeline 支持好）
pnpm add ioredis

# 官方 node-redis（redis v4+，API 较新但部分高级特性不如 ioredis 顺手）
pnpm add redis
```

---

## 3. 客户端初始化（ioredis）

### 3.1 基础连接

```ts
import Redis from 'ioredis'

// 最简单：默认 127.0.0.1:6379
const redis = new Redis()

// 带密码 / 选项
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  password: 'changeme',
  db: 0,                      // 选库 0~15
  lazyConnect: false,         // true 则不会立即连，需手动 redis.connect()
  maxRetriesPerRequest: 3,    // 命令重试次数
  enableReadyCheck: true,     // 发命令前确认 Redis 就绪
  retryStrategy: (times) => Math.min(times * 200, 2000), // 重连退避
  family: 4,                  // IPv4
})

await redis.set('ping', 'pong')
console.log(await redis.get('ping'))   // pong
```

### 3.2 连接事件与生命周期

```ts
redis.on('connect', () => console.log('已连接'))
redis.on('ready', () => console.log('可接收命令'))
redis.on('error', (err) => console.error('Redis 错误:', err))
redis.on('close', () => console.log('连接关闭'))
redis.on('reconnecting', () => console.log('重连中...'))
redis.on('end', () => console.log('连接已终止'))

// 优雅关闭（进程退出前）
process.on('SIGINT', async () => {
  await redis.quit()          // 优雅退出，完成在途命令
  process.exit(0)
})
```

### 3.3 连接字符串 & TLS & Sentinel & Cluster

```ts
// 连接字符串（支持 redis:// / rediss://）
const r1 = new Redis('redis://:changeme@127.0.0.1:6379/0')

// TLS（云数据库如 AWS ElastiCache / 阿里云）
const r2 = new Redis({
  host: 'my-redis.example.com',
  port: 6380,
  tls: {},                    // 启用 TLS，可传 ca/cert/key
  password: 'changeme',
})

// 哨兵 Sentinel（高可用）
const r3 = new Redis({
  sentinels: [
    { host: 's1', port: 26379 },
    { host: 's2', port: 26379 },
  ],
  name: 'mymaster',           // master 组名
  password: 'changeme',
})

// 集群 Cluster
import { Cluster } from 'ioredis'
const cluster = new Cluster([
  { host: '127.0.0.1', port: 7000 },
  { host: '127.0.0.1', port: 7001 },
  { host: '127.0.0.1', port: 7002 },
])
```

### 3.4 官方 node-redis 对照

```ts
import { createClient } from 'redis'

const client = createClient({ url: 'redis://:changeme@127.0.0.1:6379' })
client.on('error', (err) => console.error(err))
await client.connect()        // 注意：node-redis 默认 lazy，需显式 connect
await client.set('k', 'v')
console.log(await client.get('k'))
```

> 本文示例默认用 **ioredis**。两者命令名几乎一致（都是 Redis 原生命令），差异主要在连接管理和批量/事务 API 上。

---

## 4. 通用键操作（Keys）

```ts
// 是否存在
const has = await redis.exists('user:1')            // 1 | 0
// 删除（可多键）
await redis.del('user:1', 'user:2')
// 重命名
await redis.rename('old', 'new')
// 设置/查询过期
await redis.expire('session', 3600)                 // 秒
await redis.pexpire('session', 3_600_000)           // 毫秒
const ttl = await redis.ttl('session')              // 剩余秒，-1 无过期，-2 不存在
await redis.persist('session')                      // 取消过期
// 类型
const type = await redis.type('user:1')             // string/hash/list/set/zset/stream/none
// 遍历键（生产慎用 KEYS，用 SCAN）
const keys = await redis.keys('user:*')             // ⚠️ 阻塞，生产不用
// 推荐 SCAN 迭代，不阻塞
const stream = redis.scanStream({ match: 'user:*', count: 100 })
stream.on('data', (keys: string[]) => keys.forEach(k => console.log(k)))
stream.on('end', () => console.log('扫描完成'))
```

---

## 5. String（字符串）

最基础类型，可存文本、JSON、数字（用 incr 做原子计数）。

```ts
// 写 / 读
await redis.set('name', 'zhang')
const name = await redis.get('name')               // 'zhang'（不存在返回 null）

// 带过期（EX 秒 / PX 毫秒 / EXAT 时间戳）
await redis.set('code', '1234', 'EX', 300)        // 5 分钟过期
await redis.set('token', 'abc', 'PX', 60_000)

// 仅不存在时写入（分布式锁核心）
const ok = await redis.set('lock:order', '1', 'NX', 'EX', 10)  // 'OK' | null
// 仅存在时写入
await redis.set('k', 'v', 'XX')

// 批量
await redis.mset('k1', 'v1', 'k2', 'v2')
const vals = await redis.mget('k1', 'k2')          // ['v1', 'v2']

// 数字原子计数（计数器、限流核心）
await redis.incr('views')                          // +1，返回新值
await redis.incrby('views', 10)                    // +10
await redis.decr('stock')                          // -1
await redis.incrbyfloat('price', 0.5)

// 追加 / 长度
await redis.append('log', 'hello')
const len = await redis.strlen('name')

// 存 JSON（需手动序列化）
await redis.set('user:1', JSON.stringify({ id: 1, name: 'zhang' }))
const user = JSON.parse((await redis.get('user:1'))!)

// 读部分 / 设部分（大文本友好）
await redis.setrange('doc', 0, 'Hi')
const part = await redis.getrange('doc', 0, 1)     // 'Hi'
```

> **Tips**：Redis 7.4+ 支持 `JSON.SET`/`JSON.GET`（需 RedisJSON 模块）。若用 ioredis 调模块命令直接 `redis.call('JSON.SET', ...)` 或 `redis.sendCommand(new Command('JSON.SET', [...]))`。

---

## 6. Hash（哈希）

适合存对象（用户资料、配置项），可单独读写字段，省序列化开销。

```ts
// 写单个 / 多个字段
await redis.hset('user:1', 'name', 'zhang')
await redis.hset('user:1', { name: 'zhang', age: '30', city: 'sh' })

// 读
const name = await redis.hget('user:1', 'name')
const all = await redis.hgetall('user:1')          // { name, age, city }
const multi = await redis.hmget('user:1', 'name', 'city')

// 字段增减（值是整数才能 incr）
await redis.hincrby('user:1', 'age', 1)

// 是否存在某字段 / 字段数 / 所有字段名
const has = await redis.hexists('user:1', 'name')
const count = await redis.hlen('user:1')
const fields = await redis.hkeys('user:1')

// 删字段
await redis.hdel('user:1', 'city')

// 遍历大 Hash（HSCAN，避免 hgetall 阻塞）
const hs = redis.hscanStream('user:1', { match: '*', count: 100 })
hs.on('data', (items: string[]) => { /* [field, val, field, val, ...] */ })
```

---

## 7. List（列表）

双向链表，可做队列、栈、最新 N 条动态。

```ts
// 左入 / 右入（RPUSH 做队列尾、LPUSH 做栈）
await redis.rpush('queue', 'a', 'b', 'c')         // 从右追加 → [a,b,c]
await redis.lpush('queue', 'x')                   // 从左插入 → [x,a,b,c]

// 右出 / 左出（阻塞版用于消费者）
const item = await redis.rpop('queue')            // 取最右 'c'
const itemL = await redis.lpop('queue')           // 取最左 'x'

// 阻塞弹出（BLPOP/BRPOP）：没有元素时阻塞等待，做可靠消费者
const res = await redis.brpop('queue', 0)         // 0=无限等待，返回 [key, value]
// 或用 stream 监听多队列
await redis.blpop('q1', 'q2', 5)                  // 等 5 秒

// 范围读取 / 长度 / 裁剪
const list = await redis.lrange('queue', 0, -1)   // 全部
const len = await redis.llen('queue')
await redis.ltrim('queue', 0, 99)                 // 只保留前 100 条（最新动态）

// 按索引读写 / 删除
await redis.lset('queue', 0, 'new')
const first = await redis.lindex('queue', 0)
await redis.lrem('queue', 2, 'a')                 // 从左删 2 个值为 'a'

// 阻塞移交（可靠队列模式：RPOPLPUSH 把任务从待办移到处理中）
await redis.rpoplpush('todo', 'doing')            // 取 todo 尾，压 doing 头
```

---

## 8. Set（集合）

无序、去重，适合标签、好友关系、共同关注。

```ts
// 增 / 查 / 删
await redis.sadd('tags:1', 'es', 'node', 'redis')
const isMember = await redis.sismember('tags:1', 'node')
const members = await redis.smembers('tags:1')    // ['es','node','redis']
const size = await redis.scard('tags:1')
await redis.srem('tags:1', 'redis')

// 随机抽取 / 弹出
const rand = await redis.srandmember('tags:1')    // 不删除
const popOne = await redis.spop('tags:1')         // 随机弹出并删除

// 集合运算（关系计算核心）
await redis.sadd('tags:2', 'node', 'go')
const inter = await redis.sinter('tags:1', 'tags:2')   // 交集 [node]
const union = await redis.sunion('tags:1', 'tags:2')   // 并集
const diff = await redis.sdiff('tags:1', 'tags:2')     // 差集
// 存结果到新集合
await redis.sinterstore('tags:both', 'tags:1', 'tags:2')
```

---

## 9. Sorted Set（有序集合 / ZSet）

带 score 的有序去重集合，是**排行榜、延迟队列、热门榜单**的核心。

```ts
// 增（score 在前，member 在后）
await redis.zadd('leaderboard', 100, 'zhang', 200, 'li', 150, 'wang')

// 查：按排名 / 按分数区间
const top = await redis.zrange('leaderboard', 0, 2, 'WITHSCORES')   // 前三（升序）
const revTop = await redis.zrevrange('leaderboard', 0, 2, 'WITHSCORES')  // 前三（降序）
const byScore = await redis.zrangebyscore('leaderboard', 100, 200)  // 分数区间
const rank = await redis.zrevrank('leaderboard', 'li')              // 排名（第几，0 起）
const score = await redis.zscore('leaderboard', 'li')               // 150

// 增减分数（排行榜更新）
await redis.zincrby('leaderboard', 50, 'zhang')    // zhang 分数 +50

// 计数 / 删除
const cnt = await redis.zcard('leaderboard')
const inRange = await redis.zcount('leaderboard', 100, 200)
await redis.zrem('leaderboard', 'wang')
await redis.zremrangebyrank('leaderboard', 0, -11)   // 只留前 10（删掉 11 名之后）
await redis.zremrangebyscore('leaderboard', 0, 50)   // 删分数 <=50 的

// 延迟队列用法：score 存执行时间戳，取到期任务
const due = await redis.zrangebyscore('delayq', 0, Date.now(), 'LIMIT', 0, 10)
```

---

## 10. Bitmap / HyperLogLog / Geo（附加结构）

```ts
// ===== Bitmap 位图（签到、在线状态）=====
await redis.setbit('sign:2026-10', 21, 1)         // 第 21 天签到
const signed = await redis.getbit('sign:2026-10', 21)
const days = await redis.bitcount('sign:2026-10')  // 本月签到天数
// 多用户位运算（共同签到）
await redis.bitop('AND', 'both', 'sign:A', 'sign:B')

// ===== HyperLogLog（超大数据基数去重，误差 ~0.81%）=====
await redis.pfadd('uv', 'user1', 'user2', 'user3')
await redis.pfadd('uv', 'user1')                   // 重复不计数
const uv = await redis.pfcount('uv')               // 近似唯一数
await redis.pfmerge('uv_all', 'uv', 'uv2')         // 合并多个 HLL

// ===== Geo 地理空间（附近的人 / 门店）=====
await redis.geoadd('shops', 121.47, 31.23, 'shop1', 121.50, 31.22, 'shop2')
const dist = await redis.geodist('shops', 'shop1', 'shop2', 'km')
const near = await redis.georadius('shops', 121.47, 31.23, 5, 'km', 'WITHDIST')  // 5km 内
```

---

## 11. Stream（流）—— Redis 5+ 的可靠消息队列

比 Pub/Sub 更可靠（可持久化、可消费组、可回溯），适合事件流、日志流。

```ts
// 写消息（* = 自动生成 ID；字段键值对）
const id = await redis.xadd('events', '*', 'type', 'click', 'uid', '123')
// 限制长度（近似裁剪，避免无限增长）
await redis.xadd('events', 'MAXLEN', '~', 1000, '*', 'k', 'v')

// 读（XREAD 从某 ID 之后读，0 表示从头；$ = 只等新消息）
const msgs = await redis.xread('COUNT', 10, 'STREAMS', 'events', '0')

// 消费组（多消费者分摊，且能重投失败消息）
await redis.xgroup('CREATE', 'events', 'g1', '$', 'MKSTREAM')   // 建组，$ 从最新开始
// 消费者读取（'>' = 只取未分配给本消费者的新消息）
const got = await redis.xreadgroup('GROUP', 'g1', 'c1', 'COUNT', 5, 'STREAMS', 'events', '>')
// 确认已处理（ACK），否则会留在 pending
if (got) {
  for (const [, entries] of got) {
    for (const [id] of entries) await redis.xack('events', 'g1', id)
  }
}
// 查看 pending（未 ACK 的，用于重投）
const pending = await redis.xpending('events', 'g1')
// 认领超时未处理的消息
await redis.xclaim('events', 'g1', 'c2', 60000, 'pending-id-1')

// 删除消息
await redis.xdel('events', id)
```

---

## 12. Pub/Sub（发布订阅）

轻量广播，但**消息不持久化**（无消费者时发布的消息丢失）。

```ts
// 订阅
const sub = new Redis()                            // 订阅需独立连接
await sub.subscribe('news', 'alerts')
sub.on('message', (channel, message) => {
  console.log(`[${channel}]`, message)
})
// 模式订阅
await sub.psubscribe('user:*')
sub.on('pmessage', (pattern, channel, message) => {})

// 发布（可在另一个连接/进程）
const redis2 = new Redis()
await redis2.publish('news', JSON.stringify({ t: 'hi' }))

// 退订 / 关闭
await sub.unsubscribe('news')
sub.quit()
```

> **Pub/Sub vs Stream 怎么选**：需要可靠、可重投、多消费者分摊 → 用 Stream；纯广播、丢了无所谓（如实时通知）→ 用 Pub/Sub。

---

## 13. 事务（Transactions）+ Lua 脚本

### 13.1 MULTI / EXEC（事务）

```ts
// 命令入队，EXEC 一次性原子执行
const pipeline = redis.multi()
  .set('a', '1')
  .incr('counter')
  .lpush('log', 'done')
const results = await pipeline.exec()              // 全部执行，返回 [[err,val],...]
```

> ⚠️ **ioredis 的 `multi()` 返回的是 Pipeline，命令同步收集、异步 exec**。若中间某命令报错，EXEC 仍会执行其余命令（Redis 事务不支持回滚，这是设计如此）。

### 13.2 Lua 脚本（原子 + 自定义逻辑）

多步操作需要真正原子性时（如分布式锁释放、限流），用 `EVAL` / `SCRIPT LOAD` + `EVALSHA`。

```ts
// 限流器：滑动窗口（用 incr + 过期，但 incr 和 expire 非原子，用脚本保证原子）
const script = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local ttl = tonumber(ARGV[2])
  local current = redis.call('incr', key)
  if current == 1 then
    redis.call('expire', key, ttl)
  end
  if current > limit then
    return 0
  end
  return 1
`
const sha = await redis.script('LOAD', script)      // 预加载，拿 SHA
const allowed = await redis.evalsha(sha, 1, 'ratelimit:ip', 100, 60)  // 60s 内限 100 次
// 或一次写好：redis.eval(script, 1, 'ratelimit:ip', 100, 60)
console.log(allowed === 1 ? '放行' : '限流')
```

### 13.3 分布式锁（Redlock 思路，单实例最小实现）

```ts
// 加锁：SET NX EX 原子操作
async function acquireLock(key: string, ttlSec: number) {
  return redis.set(`lock:${key}`, 'owner', 'NX', 'EX', ttlSec)
}
// 释放：用 Lua 保证只删自己的锁（避免误删别人）
const unlockScript = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end
`
async function releaseLock(key: string, owner: string) {
  await redis.eval(unlockScript, 1, `lock:${key}`, owner)
}
// 用唯一 owner（如随机串）标识锁持有者
const owner = crypto.randomUUID()
if (await acquireLock('order', 10)) {
  try { /* 临界区 */ } finally { await releaseLock('order', owner) }
}
```

> ⚠️ **生产分布式锁请用成熟库**（如 `redlock` / `@node-redlock/redlock），单实例 SET NX 在故障切换时会丢锁，仅适合非严格要求场景。

---

## 14. Pipeline & 批量（性能关键）

```ts
// ioredis pipeline：一次性发送多条命令，减少 RTT（不保证原子）
const pipe = redis.pipeline()
for (let i = 0; i < 1000; i++) pipe.set(`key:${i}`, i)
const res = await pipe.exec()                      // 一次网络往返

// 对比：durable 批量读
const p2 = redis.pipeline()
p2.get('a'); p2.get('b'); p2.get('c')
const [a, b, c] = await p2.exec()

// 事务性 pipeline（multi）
await redis.multi().set('x', 1).incr('x').exec()

// node-redis 的 pipeline
import { pipeline } from 'redis'
```

---

## 15. 实战模式

### 15.1 缓存（Cache-Aside / 懒加载）

```ts
async function getUser(id: string) {
  const cacheKey = `user:${id}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)            // 命中
  const dbRow = await db.query('SELECT * FROM users WHERE id=$1', [id])
  if (dbRow) {
    // 回写缓存，设 5 分钟过期
    await redis.set(cacheKey, JSON.stringify(dbRow), 'EX', 300)
  }
  return dbRow
}
// 更新时删缓存（或双删）
async function updateUser(id: string, data: any) {
  await db.query('UPDATE users SET ... WHERE id=$1', [id])
  await redis.del(`user:${id}`)                    // 失效缓存
}
```

### 15.2 限流（令牌桶 / 计数窗口）

```ts
// 简单固定窗口限流（结合 13.2 的 Lua 脚本更严谨）
async function isAllowed(ip: string, limit = 100, windowSec = 60) {
  const key = `ratelimit:${ip}`
  const cur = await redis.incr(key)
  if (cur === 1) await redis.expire(key, windowSec)
  return cur <= limit
}
```

### 15.3 排行榜（ZSet）

```ts
await redis.zincrby('game:rank', 1, 'player:zhang')  // 得分 +1
const top10 = await redis.zrevrange('game:rank', 0, 9, 'WITHSCORES')
```

### 15.4 会话存储

```ts
await redis.set(`session:${sid}`, JSON.stringify(session), 'EX', 1800)  // 30 分钟
const s = JSON.parse((await redis.get(`session:${sid}`)) ?? 'null')
```

---

## 16. 错误处理与健壮性

```ts
import Redis from 'ioredis'

const redis = new Redis({
  maxRetriesPerRequest: 2,
  retryStrategy: (times) => {
    if (times > 10) return null                    // 放弃重连
    return Math.min(times * 100, 3000)
  },
})

// 命令超时
const res = await redis.get('k').timeout(1000).catch((e) => {
  if (e.name === 'TimeoutError') console.log('命令超时')
})

// 单条命令错误不影响连接
try {
  await redis.set('k', 'v')
} catch (e) {
  console.error('写入失败', e)
}
```

---

## 17. 常见坑与最佳实践

1. **生产禁用 `KEYS *`**：会阻塞整个 Redis，用 `SCAN` 迭代。同理大 Hash/Set 用 `HSCAN`/`SSCAN`/`ZSCAN`。
2. **键命名加前缀 + 冒号分层**：`user:1:profile`、`cache:article:99`，便于管理和统计。
3. **合理设置 TTL**：缓存必须有过期，避免「缓存雪崩 / 永久脏数据」；热点 key 过期时间加随机抖动防雪崩。
4. **大 key 是性能杀手**：单个 String > 10KB、Hash/List > 5000 元素要拆分。用 `redis-cli --bigkeys` 巡检。
5. **ioredis 的 `multi` 不会回滚**：Redis 事务设计就是「全部执行、出错继续执行」，需要回滚逻辑自己写。
6. **连接池/复用**：全局只建一个 `Redis` 实例，别每次请求 `new Redis()`（连接数爆炸）。
7. **Pipeline 不是事务**：要原子用 `multi`，要批量减 RTT 用 `pipeline`。
8. **阻塞命令（BLPOP/BRPOP/XREADGROUP）要配超时/独立连接**：别在共享连接上长时间阻塞。
9. **Pub/Sub 消息不持久**：消费者离线期间的消息会丢，要可靠就用 Stream。
10. **持久化选择**：缓存为主可关 RDB/AOF；要当持久 KV 必须开 AOF（`appendonly yes`）+ 合理 `appendfsync`。
11. **不要用 Redis 存大文件/大 JSON**：它内存贵，超 512MB 单值直接报错。
12. **集群下多 key 操作限制**：`MSET`/`MGET`/事务涉及多 key 必须保证在同一 slot（用 `{}` hash tag 强制同槽，如 `user:{1}:name` 与 `user:{1}:age`）。

---

## 18. 速查表

### 各类型常用命令（ioredis 方法名）

| 类型 | 读 | 写 | 删/其他 |
|---|---|---|---|
| String | `get` / `mget` / `getrange` | `set` / `mset` / `append` / `incr` / `set nx` | `strlen` / `expire` |
| Hash | `hget` / `hgetall` / `hmget` / `hkeys` | `hset` / `hincrby` | `hdel` / `hlen` |
| List | `lrange` / `lindex` / `llen` | `rpush` / `lpush` / `lset` | `lpop` / `rpop` / `ltrim` / `brpop` |
| Set | `smembers` / `sismember` / `srandmember` | `sadd` / `spop` | `srem` / `scard` / `sinter`/`sunion`/`sdiff` |
| ZSet | `zrange` / `zrevrange` / `zscore` / `zrank` | `zadd` / `zincrby` | `zrem` / `zcard` / `zremrangebyrank` |
| Stream | `xread` / `xreadgroup` | `xadd` / `xack` | `xdel` / `xpending` / `xclaim` |
| Bitmap | `getbit` / `bitcount` | `setbit` | `bitop` |
| Geo | `geodist` / `georadius` | `geoadd` | — |

### 通用方法

`exists` / `del` / `expire` / `ttl` / `persist` / `type` / `rename` / `scan` / `pipeline` / `multi` / `eval` / `publish` / `subscribe`

### Node 客户端选型

| 客户端 | 特点 | 适合 |
|---|---|---|
| **ioredis** | 功能最全、Cluster/Sentinel/Pipeline/重连体验好、TS 友好 | 多数项目（含集群/哨兵） |
| **node-redis (redis)** | 官方维护、API 现代、体积较小 | 简单场景、想用官方库 |

---

## 19. 学习路径建议

1. **先跑通**：Docker 起 Redis → ioredis 连上 → set/get 一个值。
2. **掌握 5 大基础类型**：String / Hash / List / Set / ZSet，理解各自适用场景。
3. **缓存模式**：Cache-Aside + TTL + 失效策略，这是 80% 用法。
4. **高级结构**：Stream（可靠队列）、Bitmap（签到）、Geo（附近）、HyperLogLog（UV）。
5. **原子性**：Pipeline（批量）vs Multi（事务）vs Lua（自定义原子），能区分三者。
6. **生产化**：连接复用、SCAN 替代 KEYS、大 key 治理、集群 slot、持久化配置。
7. **官方资源**：
   - 命令参考：<https://redis.io/commands>
   - ioredis：<https://github.com/redis/ioredis>
   - node-redis：<https://github.com/redis/node-redis>
