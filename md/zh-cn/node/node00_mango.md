---
title: Node.js 使用 MongoDB 学习文档
create:2026-10-22
update:2026-10-22
category:nodejs
cover:https://img-common.aknot.uk/cover/land-37.jpg
tags:[node,mongodb,database,document,crud,bson,aggregation,odm]
summary:Node.js 操作 MongoDB 的完整学习文档（基于官方 mongodb 驱动 v7.7），覆盖文档模型与 BSON、连接与连接池、数据库/集合管理、增删改查全套 API、查询操作符、投影排序分页、聚合管道、索引、多文档事务、变更流、GridFS、模式设计、连接管理、错误处理与安全，每节均含可直接运行的 ESM 示例
keywords:[node,mongodb,database,document,bson,crud,aggregate,index,transaction,changestream,gridfs,odm]
top:1
copyright:true
---

# Node.js 使用 MongoDB 学习文档

> 适用版本：**官方 `mongodb` 驱动 v7.7.0**（2026-09-28 发布）；要求 **MongoDB Server 4.4+**（v7.6 起最低支持版本从 4.2 提升到 4.4），TypeScript 5.6+。本文示例以 **ESM（`import`）为默认写法**，绝大多数在 Node 18+ 即可运行，个别特性（如 `await using` 显式资源管理）标注最低版本。
> 本文定位「原生驱动 API 速查 + 可直接运行示例」，从**文档模型 → 连接 → CRUD → 聚合 → 索引 → 事务 → 进阶特性 → 模式设计 → 运维实践**逐步递进。ODM（Mongoose）在第 16 章做对比，主体聚焦官方驱动。

---

## 目录

- [1. MongoDB 与文档模型简介](#1-mongodb-与文档模型简介)
- [2. 安装与连接（本地 / Atlas）](#2-安装与连接本地--atlas)
- [3. 数据库与集合操作](#3-数据库与集合操作)
- [4. 插入文档 insertOne / insertMany](#4-插入文档-insertone--insertmany)
- [5. 查询基础与操作符](#5-查询基础与操作符)
- [6. 投影、排序与分页](#6-投影排序与分页)
- [7. 更新文档 updateOne / updateMany](#7-更新文档-updateone--updatemany)
- [8. 删除文档 deleteOne / deleteMany](#8-删除文档-deleteone--deletemany)
- [9. 聚合管道 aggregate](#9-聚合管道-aggregate)
- [10. 索引 createIndex 与查询优化](#10-索引-createindex-与查询优化)
- [11. 多文档事务（Transactions）](#11-多文档事务transactions)
- [12. 变更流 Change Streams](#12-变更流-change-streams)
- [13. 大文件 GridFS](#13-大文件-gridfs)
- [14. 模式设计（嵌入式 vs 引用）](#14-模式设计嵌入式-vs-引用)
- [15. 连接管理与优雅关闭](#15-连接管理与优雅关闭)
- [16. 原生驱动 vs Mongoose（ODM）](#16-原生驱动-vs-mongooseodm)
- [17. 错误处理与重试](#17-错误处理与重试)
- [18. 安全：认证、TLS 与最小权限](#18-安全认证tls-与最小权限)
- [19. 常见坑与最佳实践](#19-常见坑与最佳实践)
- [20. 参考文档](#20-参考文档)

---

## 1. MongoDB 与文档模型简介

MongoDB 是**文档型 NoSQL 数据库**，以 BSON（Binary JSON）格式存储「文档」（类似 JSON 对象），集合（Collection）相当于关系库的「表」，但**模式自由（schema-less）**——同一集合内文档结构可以不同。

**与关系型对比：**

| 关系型 | MongoDB | 说明 |
|---|---|---|
| 数据库 Database | Database | 同 |
| 表 Table | 集合 Collection | 无固定列 |
| 行 Row | 文档 Document | 类似 JSON 对象 |
| 列 Column | 字段 Field | 可动态增减 |
| 主键 | `_id` | 默认 ObjectId，唯一 |
| JOIN | `$lookup` / 嵌入式 | 推荐冗余嵌入式 |

**BSON 特有类型（驱动自动映射）：** `ObjectId`、`Date`、`Binary`、`Decimal128`、`Long`、`Double`、`Array`、`Object`。

```js
// 一个典型文档
{
  _id: ObjectId('...'),
  name: '张三',
  age: 30,
  tags: ['node', 'mongodb'],
  address: { city: '上海', zip: '200000' }, // 嵌套子文档
  createdAt: new Date()
}
```

> 文档大小上限 **16 MB**；超过用 GridFS（第 13 章）。字段名区分大小写，`_id` 是保留主键。

---

## 2. 安装与连接（本地 / Atlas）

```bash
npm install mongodb
```

```js
// db/client.js —— 单例 MongoClient（全局复用，勿每次请求新建）
import { MongoClient } from 'mongodb';

const uri =
  'mongodb://user:pass@localhost:27017/?authSource=admin&retryWrites=true&w=majority';

// maxPoolSize 控制连接池上限（默认 100）
const client = new MongoClient(uri, {
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 5000, // 选节点超时
  socketTimeoutMS: 30000,
});

export const db = client.db('blog'); // 指定数据库名

// 首次使用才真正建立连接（惰性连接）；也可显式 client.connect()
```

**MongoDB Atlas（云托管）连接串：**

```js
const uri =
  'mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/blog?retryWrites=true&w=majority';
```

> ⚠️ `mongodb://` 与 `mongodb+srv://` 区别：后者用 DNS SRV 记录自动发现集群节点，无需在 URI 写死多个 `host:port`，**Atlas 默认用 srv 形式**。生产环境务必带 `retryWrites=true&w=majority` 以启用可重试写与多数确认。

---

## 3. 数据库与集合操作

```js
import { MongoClient } from 'mongodb';
const client = new MongoClient(uri);
await client.connect();

const admin = client.db().admin();
const dbs = await admin.listDatabases(); // 列出所有库
console.log(dbs.databases);

const db = client.db('blog');

// 列出集合
const cols = await db.listCollections().toArray();
console.log(cols.map((c) => c.name));

// 显式创建集合（可带校验器 / 上限集合等选项）
await db.createCollection('users', {
  validator: { $jsonSchema: { /* 可选结构校验 */ } },
  capped: false,
});

// 删除集合 / 库
await db.collection('users').drop();
// await db.dropDatabase();
```

> 在 MongoDB 中**无需预建集合**，`db.collection('users')` 在插入时自动创建。显式 `createCollection` 仅当你需要带 `validator`（结构校验）或 `capped`（固定大小）等特殊选项。

---

## 4. 插入文档 insertOne / insertMany

```js
import { db } from './client.js';
const users = db.collection('users');

// 单条插入
const r1 = await users.insertOne({
  name: '张三',
  age: 30,
  tags: ['node'],
});
console.log(r1.acknowledged, r1.insertedId); // true, ObjectId

// 批量插入（返回 insertedIds 映射）
const r2 = await users.insertMany([
  { name: '李四', age: 25 },
  { name: '王五', age: 28 },
]);
console.log(r2.insertedCount, r2.insertedIds);

// 自定义 _id（必须是集合内唯一）
await users.insertOne({ _id: 'u_001', name: '自定义主键' });
```

> `insertOne` 返回 `{ acknowledged, insertedId }`；`insertMany` 返回 `{ acknowledged, insertedCount, insertedIds }`。未指定 `_id` 时驱动自动生成 `ObjectId`。`_id` 重复会抛 `MongoServerError`（错误码 11000，E11000 重复键）。

---

## 5. 查询基础与操作符

`find(filter)` 返回**游标（Cursor）**，需 `.toArray()`（或 `for await` / `next()`）消费。

```js
import { ObjectId } from 'mongodb';

// 全量查询
const all = await users.find({}).toArray();

// 条件查询
const one = await users.findOne({ name: '张三' });
const byId = await users.findOne({ _id: new ObjectId('...') });

// 比较操作符
await users.find({ age: { $gt: 25, $lte: 40 } }).toArray();      // 25 < age <= 40
await users.find({ age: { $ne: 30 } }).toArray();                 // 不等于
await users.find({ name: { $in: ['李四', '王五'] } }).toArray();  // 在集合中
await users.find({ name: { $nin: ['张三'] } }).toArray();         // 不在

// 逻辑操作符
await users.find({ $and: [{ age: { $gte: 20 } }, { age: { $lt: 30 } }] }).toArray();
await users.find({ $or: [{ name: '张三' }, { age: { $lt: 20 } }] }).toArray();
await users.find({ $nor: [{ age: { $lt: 18 } }] }).toArray();

// 数组 / 嵌套字段 / 正则
await users.find({ tags: 'node' }).toArray();                     // 数组含某元素
await users.find({ 'address.city': '上海' }).toArray();           // 嵌套点路径
await users.find({ name: { $regex: /^张/, $options: 'i' } }).toArray(); // 正则
```

**常用查询操作符速查：** `$eq` `$ne` `$gt` `$gte` `$lt` `$lte` `$in` `$nin` `$and` `$or` `$nor` `$not` `$exists` `$type` `$regex` `$all` `$elemMatch`。

> ⚠️ 查询 `{ field: value }` 是隐式 `$eq`；**比较空值要用 `{ field: null }`**（会同时匹配字段不存在与值为 null），如需严格判断是否存在用 `$exists`。

---

## 6. 投影、排序与分页

```js
// 投影：只返回需要的字段（_id 默认返回，需显式排除）
const docs = await users
  .find({ age: { $gt: 20 } }, { projection: { name: 1, age: 1, _id: 0 } })
  .toArray();

// 排序：1 升序，-1 降序
const sorted = await users.find({}).sort({ age: -1, name: 1 }).toArray();

// 分页：skip + limit（小数据量足够；大数据用游标/键集分页）
const page = await users
  .find({})
  .sort({ _id: 1 })
  .skip(20)
  .limit(10)
  .toArray();

// countDocuments / estimatedDocumentCount
const total = await users.countDocuments({ age: { $gt: 20 } });   // 精确计数
const est = await users.estimatedDocumentCount();                  // 快速估算
```

> **深分页陷阱**：`skip(N)` 越大越慢（需扫描并丢弃前 N 条）。大数据分页改用**基于游标的键集分页**：`find({ _id: { $gt: lastId } }).sort({ _id: 1 }).limit(10)`，避免 `skip`。

---

## 7. 更新文档 updateOne / updateMany

```js
// 更新单条（matchedCount / modifiedCount / upsertedId）
const r = await users.updateOne(
  { name: '张三' },
  { $set: { age: 31 }, $currentDate: { updatedAt: true } }
);
console.log(r.matchedCount, r.modifiedCount);

// upsert：不存在则插入（upsertedId 非空）
await users.updateOne(
  { _id: 'u_002' },
  { $set: { name: '赵六', age: 22 } },
  { upsert: true }
);

// 批量更新
await users.updateMany(
  { age: { $lt: 18 } },
  { $set: { tag: 'minor' } }
);

// 替换整文档（仅保留 _id，其余字段被覆盖）—— replaceOne
await users.replaceOne({ _id: new ObjectId('...') }, { name: '全新文档' });

// 更新操作符
await users.updateOne({ _id: id }, { $inc: { age: 1 } });          // 自增
await users.updateOne({ _id: id }, { $push: { tags: 'vip' } });    // 数组追加
await users.updateOne({ _id: id }, { $pull: { tags: 'old' } });    // 数组移除
await users.updateOne({ _id: id }, { $unset: { temp: '' } });      // 删除字段
await users.updateOne({ _id: id }, { $rename: { name: 'fullname' } }); // 改名
```

**常用更新操作符：** `$set` `$unset` `$inc` `$mul` `$push` `$pull` `$addToSet` `$pop` `$rename` `$min` `$max` `$currentDate`。

> 默认 `updateOne/updateMany` **只更新匹配的第一条 / 全部匹配**。务必带上精确的 `filter`（尤其 `updateMany`），否则会误改全表。更新**不返回文档本身**，若要「更新并返回」用 `findOneAndUpdate({ returnDocument: 'after' })`。

---

## 8. 删除文档 deleteOne / deleteMany

```js
// 删除单条（deletedCount）
const r = await users.deleteOne({ name: '张三' });
console.log(r.deletedCount);

// 删除多条
await users.deleteMany({ age: { $lt: 18 } });

// 清空集合（deleteMany({}) 比 drop() 慢但保留索引）
await users.deleteMany({});

// 删除并返回（findOneAndDelete）
const removed = await users.findOneAndDelete({ _id: id });
```

> `deleteMany({})` 会逐文档删除；若想连索引一起清空，用 `collection.drop()` 更快。删除操作**不可恢复**，生产务必先在副本集/备份上验证 `filter`。

---

## 9. 聚合管道 aggregate

聚合管道是 MongoDB 的「数据处理流水线」：多阶段（stage）依次转换文档，常用 `$match` 过滤、`$group` 分组、`$project` 塑形、`$sort`/`$limit`/`$lookup` 关联。

```js
const result = await orders.aggregate([
  // 1) 过滤
  { $match: { status: 'paid', createdAt: { $gte: new Date('2026-01-01') } } },
  // 2) 展开数组（每个商品一行）
  { $unwind: '$items' },
  // 3) 分组聚合
  {
    $group: {
      _id: '$items.sku',
      totalQty: { $sum: '$items.qty' },
      totalAmt: { $sum: { $multiply: ['$items.qty', '$items.price'] } },
      orderCount: { $sum: 1 },
    },
  },
  // 4) 重塑输出字段
  {
    $project: {
      sku: '$_id',
      totalQty: 1,
      totalAmt: { $round: ['$totalAmt', 2] },
      _id: 0,
    },
  },
  // 5) 排序 + 取前 10
  { $sort: { totalAmt: -1 } },
  { $limit: 10 },
]).toArray();
```

```js
// $lookup：左连接另一集合（类似 SQL JOIN）
const ordersWithUser = await orders.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'buyer',
    },
  },
  { $unwind: { path: '$buyer', preserveNullAndEmptyArrays: true } },
]).toArray();
```

**常用聚合阶段：** `$match` `$group` `$project` `$sort` `$limit` `$skip` `$unwind` `$lookup` `$addFields` `$count` `$bucket` `$facet` `$out`（写回集合）。

> `$match` 尽量放管道**最前面**（可命中索引）；`$group` 之后的 `$sort` 无法用索引。聚合结果默认受 16 MB 单文档限制，大数据用 `allowDiskUse: true` 落盘。

---

## 10. 索引 createIndex 与查询优化

```js
// 单字段索引
await users.createIndex({ age: 1 });

// 唯一索引（防重复，重复插入报 11000）
await users.createIndex({ email: 1 }, { unique: true });

// 复合索引（遵循 ESR 原则：等值 → 排序 → 范围）
await users.createIndex({ city: 1, age: -1 });

// 文本索引（支持全文检索）
await articles.createIndex({ title: 'text', body: 'text' });
await articles.find({ $text: { $search: 'mongodb 教程' } }).toArray();

// 查看 / 删除索引
const idx = await users.indexes();
await users.dropIndex('age_1');

// 用 explain 分析执行计划（确认是否走索引 IXSCAN 而非 COLLSCAN）
const plan = await users.find({ age: { $gt: 20 } }).explain('executionStats');
console.log(plan.executionStats.totalKeysExamined);
```

> **ESR 规则**：复合索引字段顺序应为 **E**quality（等值过滤）→ **S**ort（排序）→ **R**ange（范围过滤），顺序错了索引利用率骤降。`_id` 自带唯一索引。`explain()` 是诊断慢查询的第一工具——看到 `COLLSCAN`（全集合扫描）就要加索引。

---

## 11. 多文档事务（Transactions）

事务依赖**副本集 / 分片集群**（单机 standalone 不支持）。v7 驱动用 `ClientSession` 显式管理。

```js
const session = client.startSession();
try {
  session.startTransaction();
  // 事务内操作必须传 session
  await accounts.updateOne({ _id: from }, { $inc: { balance: -100 } }, { session });
  await accounts.updateOne({ _id: to }, { $inc: { balance: 100 } }, { session });
  await session.commitTransaction();
} catch (e) {
  await session.abortTransaction(); // 回滚
  throw e;
} finally {
  await session.endSession();
}
```

```js
// 推荐写法：withTransaction 自动重试 + 提交/中止
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await accounts.updateOne({ _id: from }, { $inc: { balance: -100 } }, { session });
    await accounts.updateOne({ _id: to }, { $inc: { balance: 100 } }, { session });
  });
} finally {
  await session.endSession();
}
```

> 事务有**默认 60 秒超时**（可调 `transactionOptions.maxCommitTimeMS`）；事务内所有读写都要传同一个 `session`。**优先用嵌入式文档避免跨文档事务**——单文档写本身是原子性的，能不跨文档就别跨。

---

## 12. 变更流 Change Streams

变更流实时监听集合/库的增删改，适合**实时同步、审计、缓存失效**。

```js
const changeStream = users.watch([
  { $match: { operationType: { $in: ['insert', 'update'] } } },
]);

// 事件驱动
changeStream.on('change', (change) => {
  console.log(change.operationType, change.documentKey, change.fullDocument);
});

// 或用 for-await（可中断）
for await (const change of changeStream) {
  if (change.operationType === 'insert') invalidateCache();
}

// 关闭
await changeStream.close();
```

> 变更流需要 **oplog（副本集）** 支持；`fullDocument: 'updateLookup'` 可让 update 事件带回完整新文档。它是「至少一次」投递，消费端需幂等。

---

## 13. 大文件 GridFS

超过 16 MB 的文件用 GridFS 切分为 chunk 存储。

```js
import { GridFSBucket } from 'mongodb';
import { createReadStream, createWriteStream } from 'node:fs';

const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

// 上传
await new Promise((resolve, reject) => {
  createReadStream('./big.zip')
    .pipe(bucket.openUploadStream('big.zip', { contentType: 'application/zip' }))
    .on('error', reject)
    .on('finish', resolve);
});

// 下载
await new Promise((resolve, reject) => {
  bucket
    .openDownloadStreamByName('big.zip')
    .pipe(createWriteStream('./out.zip'))
    .on('error', reject)
    .on('finish', resolve);
});

// 列出 / 删除文件
const files = await bucket.find({}).toArray();
await bucket.delete(files[0]._id);
```

> GridFS 把文件拆成 **255 KB** 默认大小的 `chunks` 集合存储，元数据在 `files` 集合。适合视频、备份等；小文件（<16MB）直接存二进制字段（`Binary` 类型）更简单。

---

## 14. 模式设计（嵌入式 vs 引用）

MongoDB 没有 JOIN 友好模型，**建模优先选「嵌入式（反范式）」**，仅在真正需要时引用。

| 关系 | 推荐建模 | 示例 |
|---|---|---|
| 一对一 | 嵌入式子文档 | `user.profile` |
| 一对多（少且随主体查） | 嵌入式数组 | `post.comments[]` |
| 一对多（多且独立） | 引用 + `$lookup` | `orders.userId → users._id` |
| 多对多 | 双向引用数组 | `student.courseIds[]` + `course.studentIds[]` |

```js
// 嵌入式：一次查询拿到全部（推荐）
{
  _id: ObjectId,
  title: 'MongoDB 入门',
  comments: [
    { user: '李四', text: '好文', at: new Date() },
    { user: '王五', text: '收藏', at: new Date() }
  ]
}

// 引用式：适合评论海量、需独立分页的场景
{ _id: ObjectId, postId: ObjectId, user: '李四', text: '...' }
```

> **反范式化是常态**：为读性能冗余数据。代价是更新时要同步多处——用事务或应用层保证一致。建模口诀：**「读多写少就嵌入，海量独立就引用」**。

---

## 15. 连接管理与优雅关闭

```js
// 全局单例 + 优雅关闭（进程退出前释放连接池）
import { MongoClient } from 'mongodb';

let client;
export async function getClient() {
  if (!client) client = new MongoClient(uri, { maxPoolSize: 50 });
  await client.connect();
  return client;
}

// Node 24 显式资源管理（Symbol.asyncDispose，驱动 v7.4+ 稳定）
{
  await using c = new MongoClient(uri);
  const db = c.db('blog');
  await db.collection('users').insertOne({ x: 1 });
} // 块结束自动 client.close()，无需手动

// 进程退出时关闭
async function shutdown() {
  if (client) await client.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

> **绝不**在每个请求里 `new MongoClient()`——驱动内置连接池，单例复用是关键性能点。生产务必在 `SIGTERM/SIGINT` 里 `client.close()`，避免连接泄漏与强制杀进程丢连接。

---

## 16. 原生驱动 vs Mongoose（ODM）

| 维度 | 原生 `mongodb` 驱动 | Mongoose（ODM） |
|---|---|---|
| 模式校验 | 需 `$jsonSchema` 或应用层 | 内置 Schema + 类型校验 |
| 中间件（hook） | 无 | 有（pre/post save） |
| 学习曲线 | 低（贴近数据库） | 中（额外抽象） |
| 包体 / 性能 | 轻、快 | 略重 |
| 适用 | 需要精细控制、简单 CRUD | 复杂业务模型、团队约定 |

```js
// Mongoose 简例（需 npm i mongoose）
import mongoose from 'mongoose';
const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, min: 0 },
}));
await mongoose.connect(uri);
await User.create({ name: '张三', age: 30 });
```

> 本文聚焦原生驱动（更通用、贴近 MongoDB 语义）。**选型建议**：强 schema 约束、大量业务校验、熟悉 Rails 式 model 的团队用 Mongoose；性能敏感、查询复杂多变、想完全掌控 BSON 的用原生驱动。两者可混用（Mongoose 底层也是原生驱动）。

---

## 17. 错误处理与重试

```js
import { MongoServerError, MongoNetworkError } from 'mongodb';

try {
  await users.insertOne({ email: 'a@b.com' }); // 假设 email 唯一索引
} catch (e) {
  if (e instanceof MongoServerError && e.code === 11000) {
    console.log('重复键：', e.keyValue); // 处理冲突
  } else if (e instanceof MongoNetworkError) {
    // 网络抖动：可结合指数退避重试
    console.log('网络错误，重试');
  } else {
    throw e;
  }
}
```

> 开启 `retryWrites=true`（连接串默认）后，**可重试写（insert/update/delete）在网络抖动时自动重试一次**。对读操作，应用层可加指数退避。`MongoServerError.code` 是排查关键：11000=重复键、112（写冲突事务 abort）等。

---

## 18. 安全：认证、TLS 与最小权限

```js
// 1) 认证：SCRAM（默认，明文账号密码）+ TLS 加密传输
const uri =
  'mongodb://user:pass@host:27017/blog?authSource=admin&tls=true&tlsCAFile=/path/ca.pem';

// 2) x.509 证书认证（免密码，企业常用）
const client = new MongoClient(
  'mongodb://host:27017/?authMechanism=MONGODB-X509&tls=true',
  { tlsCertificateKeyFile: '/path/client.pem' }
);

// 3) 最小权限：用专用账号而非 admin
//    db.createUser({ user:'app', pwd:'...', roles:[{role:'readWrite', db:'blog'}] })
```

> 生产三件套：**① 不用默认端口/空密码；② 开启 TLS（`tls=true`）防中间人；③ 按库授权最小 role（readWrite 而非 root）**。`authSource` 指定存账号的库（通常 admin）。切勿把连接串（含密码）写进前端代码或提交到仓库。

---

## 19. 常见坑与最佳实践

1. **每次请求新建 MongoClient**：必须用全局单例 + 连接池（`maxPoolSize`）。
2. **查询忘记建索引**：`explain()` 看到 `COLLSCAN` 立即补索引；复合索引遵守 ESR。
3. **误用 `deleteMany({})` / `updateMany({})` 空 filter**：会改/删全表，生产前务必确认条件。
4. **`_id` 类型混淆**：用字符串比较 `ObjectId` 永远不等，必须用 `new ObjectId()`。
5. **深分页用 `skip`**：大数据改用键集（游标）分页。
6. **滥用跨文档事务**：单文档写本就原子，能用嵌入式就别开事务；事务需副本集。
7. **聚合后 `$sort` 想走索引**：索引只作用于 `$match`/`$sort` 前置阶段。
8. **敏感信息入库明文**：密码用 `scrypt`/`bcrypt` 哈希（见 node00_basic 第 20 章）。
9. **连接串含密码入库/前端**：统一用环境变量 + `NEXT_PUBLIC_` 之外的服务端配置。
10. **不关连接**：进程退出前 `client.close()`，避免连接泄漏。

---

## 20. 参考文档

- [MongoDB 官网](https://www.mongodb.com/)
- [MongoDB Node.js 驱动（npm）](https://www.npmjs.com/package/mongodb)
- [MongoDB Node.js 驱动文档](https://www.mongodb.com/docs/drivers/node/current/)
- [驱动升级指南（v6 → v7）](https://www.mongodb.com/docs/drivers/node/current/upgrade/)
- [MongoClient 连接选项](https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/)
- [连接字符串 URI 格式](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [CRUD 操作（insert/find/update/delete）](https://www.mongodb.com/docs/drivers/node/current/crud/)
- [查询操作符（Query Operators）](https://www.mongodb.com/docs/manual/reference/operator/query/)
- [更新操作符（Update Operators）](https://www.mongodb.com/docs/manual/reference/operator/update/)
- [聚合管道（Aggregation Pipeline）](https://www.mongodb.com/docs/manual/aggregation/)
- [聚合阶段参考](https://www.mongodb.com/docs/manual/reference/operator/aggregation/)
- [$lookup 关联](https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/)
- [索引（Indexes）](https://www.mongodb.com/docs/manual/indexes/)
- [复合索引 ESR 规则](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/)
- [explain 执行计划](https://www.mongodb.com/docs/manual/reference/explain-results/)
- [事务（Transactions）](https://www.mongodb.com/docs/manual/core/transactions/)
- [ClientSession 与 withTransaction](https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/)
- [变更流 Change Streams](https://www.mongodb.com/docs/manual/changeStreams/)
- [GridFS 大文件存储](https://www.mongodb.com/docs/manual/core/gridfs/)
- [数据建模（Data Modeling）](https://www.mongodb.com/docs/manual/data-modeling/)
- [嵌入式 vs 引用设计](https://www.mongodb.com/docs/manual/core/data-model-design/)
- [BSON 类型](https://www.mongodb.com/docs/manual/reference/bson-types/)
- [Mongoose ODM 官网](https://mongoosejs.com/)
- [MongoDB Atlas（云托管）](https://www.mongodb.com/atlas/database)
- [MongoDB 兼容性矩阵](https://www.mongodb.com/docs/drivers/node/current/compatibility/)
