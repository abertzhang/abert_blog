---
title: Node.js 操作 MySQL 学习文档（mysql2 驱动）
create:2026-10-22
update:2026-10-22
category:nodejs
cover:https://img-common.aknot.uk/cover/land-26.jpg
tags:[node,mysql,database,sql,mysql2,orm,backend,crud,transaction,pool]
summary:本文系统讲解如何用 Node.js 操作 MySQL，基于社区主流且长期维护的 mysql2 驱动。从环境准备、连接与连接池、增删改查（CRUD）、参数化查询防注入、预处理语句、事务、存储过程、大结果集流式读取、错误码处理、类型映射到 TypeScript 集成，再到 Sequelize / TypeORM / Prisma 三大 ORM 概览与线上最佳实践，覆盖 Node 访问 MySQL 几乎全部常用接口，每个接口均配可直接运行的示例。
keywords:[node,mysql,mysql2,连接池,事务,预处理,sql注入,sequelize,typeorm,prisma,增删改查,流式读取]
top:1
copyright:true
---

# Node.js 操作 MySQL 学习文档（mysql2 驱动）

> 本文面向已经掌握 Node.js 基础（CommonJS / ESM、async/await、回调）的开发者，目标是**把「Node 访问 MySQL」这条链路讲全、讲透**。
> 示例全部基于 **mysql2 v3.x**（当前社区主流、长期维护、支持 Promise 与预处理语句），运行环境 Node ≥ 16。
> 配套示例假设你本地已有一个 MySQL 8 实例（端口 3306、用户 `root`、密码 `Zhang1234!`、库名 `blog`），可用本文第 1 节 Docker 一键起。

---

## 目录

1. [简介：选哪个驱动](#1-简介选哪个驱动)
2. [环境准备：Docker 起 MySQL + 安装 mysql2](#2-环境准备)
3. [建立单次连接 createConnection](#3-建立单次连接)
4. [连接池 Connection Pool（生产必用）](#4-连接池)
5. [执行查询：query 的三种形态](#5-执行查询)
6. [CRUD 完整示例](#6-crud-完整示例)
7. [参数化查询与防 SQL 注入](#7-参数化查询与防-sql-注入)
8. [预处理语句 execute（二进制协议）](#8-预处理语句)
9. [事务 Transactions](#9-事务)
10. [存储过程与多语句](#10-存储过程与多语句)
11. [大结果集流式读取 stream](#11-大结果集流式读取)
12. [错误码与错误处理](#12-错误码与错误处理)
13. [MySQL 类型 ↔ JS 类型映射](#13-类型映射)
14. [TypeScript 集成](#14-typescript-集成)
15. [ORM 概览：Sequelize / TypeORM / Prisma](#15-orm-概览)
16. [安全与最佳实践](#16-安全与最佳实践)
17. [常见问题 FAQ](#17-常见问题)

---

## 1. 简介：选哪个驱动

Node 生态连接 MySQL 有两个老牌驱动：

| 驱动 | 状态 | 说明 |
| --- | --- | --- |
| `mysql` | ❌ 已停止维护 | Felipe 老驱动，最后一个版本停留在 2.18（2020），不支持 Promise、不支持预处理 |
| **`mysql2`** | ✅ 长期维护 | 兼容 `mysql` 的 API，**额外**支持 Promise、预处理语句（`execute`）、流式、压缩协议、命名占位符，**性能更好** |

**结论：新项目一律用 `mysql2`**。本文所有示例均基于 `mysql2`。

> `mysql2` 故意保持了与 `mysql` 几乎一致的回调式 API，所以老代码 `require('mysql')` 改成 `require('mysql2')` 通常零改动即可迁移。

---

## 2. 环境准备

### 2.1 Docker 起一个 MySQL 8（推荐）

新建 `docker-compose.yml`：

```yaml
services:
  mysql:
    image: mysql:8.3.0
    command: mysqld --character-set-server=utf8mb4 --collation-server=utf8mb4_general_ci
    environment:
      - MYSQL_ROOT_PASSWORD=Zhang1234!
      - MYSQL_DATABASE=blog
      - MYSQL_LOWER_CASE_TABLE_NAMES=0
    ports:
      - "3306:3306"
    volumes:
      - ./data/mysql:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-pZhang1234!"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

```bash
docker compose up -d          # 拉起 MySQL
docker compose ps             # 确认状态为 healthy / Up
```

客户端工具（任选）：macOS 用 **TablePlus** / **Sequel Ace**；跨平台用 **DBeaver Community**（`brew install --cask dbeaver-community`）。

### 2.2 安装 mysql2

```bash
npm install mysql2
# 或 ESM 项目
pnpm add mysql2
```

---

## 3. 建立单次连接

> ⚠️ 单次连接（`createConnection`）**只适合脚本/一次性任务**。Web 服务请用第 4 节连接池，否则并发请求会互相阻塞甚至耗尽连接。

### 3.1 回调式（兼容老 mysql API）

```js
// db-callback.js
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'Zhang1234!',
  database: 'blog',
  charset: 'utf8mb4',      // 强烈建议显式指定，避免中文乱码
});

connection.connect((err) => {
  if (err) {
    console.error('连接失败:', err.stack);
    return;
  }
  console.log('已连接，连接 id =', connection.threadId);
});

connection.query('SELECT 1 + 1 AS result', (err, rows) => {
  if (err) throw err;
  console.log(rows); // [ { result: 2 } ]
  connection.end();  // 用完关闭
});
```

### 3.2 Promise 式（推荐，配合 async/await）

```js
// db-promise.js
const mysql = require('mysql2/promise'); // 注意：/promise 子路径

async function main() {
  // 方式一：createConnection().promise() 也行，但更推荐直接 require('mysql2/promise')
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Zhang1234!',
    database: 'blog',
    charset: 'utf8mb4',
  });

  const [rows] = await connection.query('SELECT 1 + 1 AS result');
  console.log(rows); // [ { result: 2 } ]

  await connection.end(); // 关闭连接
}

main().catch(console.error);
```

### 3.3 createConnection 常用配置项

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `host` | string | `localhost` | 主机地址 |
| `port` | number | `3306` | 端口 |
| `user` | string | `undefined` | 用户名 |
| `password` | string | `undefined` | 密码 |
| `database` | string | `undefined` | 默认库（不填则连接后需 `USE db`） |
| `charset` | string | `UTF8MB4_GENERAL_CI` | 字符集，**建议显式写 `utf8mb4`** |
| `timezone` | string | `local` | 时区，跨时区存 `DATETIME` 时注意；常用 `'+00:00'` 或 `'Z'` |
| `connectTimeout` | number | `10000` | 连接超时（毫秒） |
| `ssl` | object | `undefined` | 启用 TLS；`ssl: { rejectUnauthorized: true, ca: fs.readFileSync(...) }` |
| `multipleStatements` | boolean | `false` | 是否允许一条 `query` 执行多条 SQL（见第 10 节，有安全风险） |
| `namedPlaceholders` | boolean | `false` | 是否支持 `:name` 命名占位符（见 7.3） |
| `dateStrings` | boolean | `false` | `true` 时 `DATE/DATETIME` 以字符串返回而非 `Date` 对象 |
| `typeCast` | function | 内置 | 自定义类型转换（见第 13 节） |
| `connectionLimit` | number | `10` | 仅 `createPool` 有效，池上限 |
| `waitForConnections` | boolean | `true` | 仅 `createPool` 有效，无空闲连接时是否排队等待 |
| `queueLimit` | number | `0` | 仅 `createPool` 有效，`0` 表示排队无上限 |

---

## 4. 连接池

### 4.1 为什么必须用连接池

- Web 服务并发请求多，**每次请求建/断 TCP + 握手认证开销大**；连接池复用连接，毫秒级响应。
- 控制最大并发连接数，避免打爆 MySQL（`max_connections`）。
- mysql2 连接池自动处理**断线重连、健康检查**。

### 4.2 创建连接池（回调式）

```js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Zhang1234!',
  database: 'blog',
  charset: 'utf8mb4',
  waitForConnections: true, // 无空闲连接时排队，而非立即报错
  connectionLimit: 10,       // 最多 10 个连接
  queueLimit: 0,             // 排队无上限（0 = 不限）
  connectTimeout: 10000,
});

// 直接 pool.query：内部自动取连接、执行、归还
pool.query('SELECT NOW() AS t', (err, rows) => {
  if (err) throw err;
  console.log(rows);
});
```

### 4.3 创建连接池（Promise 式，★推荐）

```js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Zhang1234!',
  database: 'blog',
  charset: 'utf8mb4',
  connectionLimit: 10,
});

async function now() {
  const [rows] = await pool.query('SELECT NOW() AS t');
  console.log(rows);
}

now().catch(console.error);
```

### 4.4 手动取/还连接（事务、多语句时必须）

```js
const mysql = require('mysql2/promise');

async function withManualConn() {
  const conn = await pool.getConnection(); // 从池里借一条
  try {
    const [rows] = await conn.query('SELECT 1');
    console.log(rows);
  } finally {
    conn.release(); // 必须归还！否则这条连接永远被占着，池会耗尽
  }
}
```

> 💡 **铁律**：`getConnection()` 借出的连接，无论成功失败都要 `release()`（放在 `finally`）。忘记归还 = 连接泄漏 = 池最终耗尽（`Error: Pool is exhausted`）。

### 4.5 关闭整个池

```js
await pool.end(); // 优雅关闭：等待在途查询完成，拒绝新请求
// 强制立即销毁（不等待）：pool.destroy();
```

---

## 5. 执行查询

mysql2 的 `query` 有两种返回形态：**回调** 与 **Promise**。Promise 形态返回 `[rows, fields]` 二元组（`fields` 是列元数据，通常忽略）。

### 5.1 回调式 query

```js
pool.query('SELECT id, title FROM articles LIMIT 10', (err, rows, fields) => {
  if (err) throw err;
  console.log('行数据:', rows);
  console.log('列定义:', fields.map(f => f.name));
});
```

### 5.2 Promise 式 query（★推荐）

```js
const [rows, fields] = await pool.query('SELECT id, title FROM articles LIMIT 10');
console.log(rows);   // 行数组
console.log(fields); // 列元数据数组（可省略不接收）
```

### 5.3 query 的多种签名

```js
// 1) sql 字符串
await pool.query('SELECT * FROM articles');

// 2) sql + 参数数组（占位符 ?）
await pool.query('SELECT * FROM articles WHERE id = ?', [42]);

// 3) sql + 参数对象（需开启 namedPlaceholders，见 7.3）
await pool.query('SELECT * FROM articles WHERE id = :id', { id: 42 });

// 4) sql + 参数 + 回调（混用）
pool.query('SELECT * FROM articles WHERE id = ?', [42], (err, rows) => { /* ... */ });

// 5) 选项对象形式
await pool.query({
  sql: 'SELECT * FROM articles WHERE status = ?',
  values: ['published'],
  timeout: 5000, // 单条查询超时（毫秒）
});
```

> ⚠️ `query` 走的是**文本协议 + 自动转义**（占位符 `?` 会被安全转义）。它和 `execute`（第 8 节预处理）不同：`execute` 走二进制协议、在服务端预编译。

---

## 6. CRUD 完整示例

下面用一张 `articles` 表贯穿所有增删改查。

### 6.1 建表

```js
await pool.query(`
  CREATE TABLE IF NOT EXISTS articles (
    id        INT PRIMARY KEY AUTO_INCREMENT,
    title     VARCHAR(200)  NOT NULL,
    content   TEXT,
    status    ENUM('draft','published') NOT NULL DEFAULT 'draft',
    view_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);
```

### 6.2 INSERT（插入单条）

```js
const [result] = await pool.query(
  'INSERT INTO articles (title, content, status) VALUES (?, ?, ?)',
  ['Node 操作 MySQL 入门', '这是正文……', 'published']
);
console.log('插入成功，自增 id =', result.insertId);
console.log('影响行数 =', result.affectedRows);
```

`result` 是 `ResultSetHeader` 对象，关键字段：

| 字段 | 含义 |
| --- | --- |
| `insertId` | 自增主键的值 |
| `affectedRows` | 影响行数 |
| `changedRows` | 实际被改动的行数（UPDATE 时可能与 affectedRows 不同） |
| `warningStatus` | 警告状态 |

### 6.3 INSERT（批量插入）

```js
// 写法一：多值元组
const [r1] = await pool.query(
  'INSERT INTO articles (title, status) VALUES ?',
  [
    [['文章A', 'published'], ['文章B', 'draft'], ['文章C', 'published']],
  ]
);
console.log('批量插入条数 =', r1.affectedRows); // 3

// 写法二：用对象数组 + namedPlaceholders 更直观
const rows = [
  { title: '文章A', status: 'published' },
  { title: '文章B', status: 'draft' },
];
const [r2] = await pool.query(
  'INSERT INTO articles (title, status) VALUES :rows',
  { rows },
  { namedPlaceholders: true }
);
```

### 6.4 SELECT（查询）

```js
// 查所有
const [all] = await pool.query('SELECT * FROM articles');

// 条件 + 排序 + 分页
const [page] = await pool.query(
  'SELECT id, title, view_count FROM articles WHERE status = ? ORDER BY id DESC LIMIT ? OFFSET ?',
  ['published', 10, 0]
);

// 聚合
const [agg] = await pool.query(
  'SELECT COUNT(*) AS total, SUM(view_count) AS views FROM articles WHERE status = ?',
  ['published']
);
console.log(agg[0].total, agg[0].views);
```

### 6.5 UPDATE（更新）

```js
const [upd] = await pool.query(
  'UPDATE articles SET title = ?, status = ? WHERE id = ?',
  ['新标题', 'draft', 1]
);
console.log('影响行数 =', upd.affectedRows);
console.log('实际改动 =', upd.changedRows); // 值没变时为 0
```

### 6.6 DELETE（删除）

```js
const [del] = await pool.query('DELETE FROM articles WHERE id = ?', [1]);
console.log('删除行数 =', del.affectedRows);
```

### 6.7 完整可运行脚本

```js
// crud-demo.js
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: 'localhost', user: 'root',
    password: 'Zhang1234!', database: 'blog', charset: 'utf8mb4',
    connectionLimit: 5,
  });

  await pool.query(`CREATE TABLE IF NOT EXISTS articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    status ENUM('draft','published') DEFAULT 'draft',
    view_count INT DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const [{ insertId }] = await pool.query(
    'INSERT INTO articles (title, status) VALUES (?, ?)',
    ['Hello MySQL', 'published']
  );
  console.log('插入 id =', insertId);

  const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [insertId]);
  console.log('查询 =', rows);

  await pool.query('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [insertId]);
  await pool.query('DELETE FROM articles WHERE id = ?', [insertId]);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
```

运行：`node crud-demo.js`

---

## 7. 参数化查询与防 SQL 注入

### 7.1 永远用占位符 `?`，不要字符串拼接

❌ **危险**（SQL 注入）：

```js
const id = req.params.id; // 攻击者可传 "1 OR 1=1"
await pool.query(`SELECT * FROM articles WHERE id = ${id}`); // 灾难
```

✅ **安全**（占位符自动转义）：

```js
await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
```

mysql2 会对 `?` 处的参数按类型安全转义：字符串加引号并转义特殊字符、数字校验、数组展开为逗号分隔、对象转 `key = value`。

### 7.2 标识符（表名/列名）不能占位

占位符只对**值**生效，不能用于表名、列名、SQL 关键字。动态表名要白名单校验：

```js
const allowed = new Set(['articles', 'comments', 'users']);
const table = req.query.table;
if (!allowed.has(table)) throw new Error('非法表名');

// 表名手动拼接（已白名单校验），值仍用占位符
await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
```

### 7.3 命名占位符 `:name`

开启 `namedPlaceholders` 后可用 `:key` 命名占位符，SQL 更可读、参数顺序自由：

```js
const [rows] = await pool.query(
  'SELECT * FROM articles WHERE status = :status AND view_count >= :minViews',
  { status: 'published', minViews: 100 },
  { namedPlaceholders: true }
);
```

也可在连接配置里全局开启：`createPool({ ..., namedPlaceholders: true })`。

---

## 8. 预处理语句

`connection.execute()` / `pool.execute()` 走 **MySQL 二进制协议 + 服务端预编译**：
- 首次发送带 `?` 的 SQL 模板，服务端编译成 prepared statement；
- 后续只发送参数值，避免每条都重新解析 SQL，且天然防注入；
- 适合**高频重复执行**同构 SQL（如循环插入）。

```js
// 在连接上 prepare 一次，execute 多次
const conn = await pool.getConnection();
try {
  const [prepared] = await conn.execute(
    'INSERT INTO articles (title, status) VALUES (?, ?)'
  );
  // prepared 是 PreparedStatement 对象；更常见是直接 execute 带值：
  await conn.execute('INSERT INTO articles (title, status) VALUES (?, ?)', ['A', 'published']);
  await conn.execute('INSERT INTO articles (title, status) VALUES (?, ?)', ['B', 'draft']);
  await conn.execute('INSERT INTO articles (title, status) VALUES (?, ?)', ['C', 'published']);
} finally {
  conn.release();
}
```

> `execute` vs `query` 怎么选？
> - **简单/一次性查询**：用 `query`（文本协议，零预编译开销）。
> - **循环/高频同构 SQL**：用 `execute`（预编译，性能更好、防注入）。
> - 两者都支持 `?` 占位符，都防注入；区别在协议层。

---

## 9. 事务

事务保证**多条 SQL 要么全成功、要么全回滚**（如转账：扣 A + 加 B 必须原子）。

### 9.1 回调式事务

```js
pool.getConnection((err, conn) => {
  if (err) throw err;
  conn.beginTransaction((err) => {
    if (err) throw err;
    conn.query('UPDATE accounts SET balance = balance - 100 WHERE id = 1', (err) => {
      if (err) return conn.rollback(() => { throw err; });
      conn.query('UPDATE accounts SET balance = balance + 100 WHERE id = 2', (err) => {
        if (err) return conn.rollback(() => { throw err; });
        conn.commit((err) => {
          if (err) return conn.rollback(() => { throw err; });
          console.log('事务提交成功');
          conn.release();
        });
      });
    });
  });
});
```

### 9.2 Promise 式事务（★推荐，清晰）

```js
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();                       // 开启事务
  await conn.query('UPDATE accounts SET balance = balance - 100 WHERE id = 1');
  await conn.query('UPDATE accounts SET balance = balance + 100 WHERE id = 2');
  await conn.commit();                                 // 提交
  console.log('转账成功');
} catch (err) {
  await conn.rollback();                               // 出错回滚
  console.error('转账失败，已回滚:', err.message);
} finally {
  conn.release();                                      // 归还连接
}
```

### 9.3 保存点（嵌套回滚）

```js
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  await conn.query("SAVEPOINT sp1");
  await conn.query('INSERT INTO articles (title) VALUES (?)', ['临时数据']);
  // 只想撤销上面这条，但不回滚整个事务：
  await conn.query('ROLLBACK TO SAVEPOINT sp1');
  await conn.commit();
} finally {
  conn.release();
}
```

> 💡 事务要**短**：事务期间连接被占用（不能服务其他请求），长事务会拖垮连接池。把网络调用、耗时计算移到事务外。

---

## 10. 存储过程与多语句

### 10.1 调用存储过程

```js
// 假设已创建：CREATE PROCEDURE get_article(IN aid INT) BEGIN SELECT * FROM articles WHERE id = aid; END
const [results] = await pool.query('CALL get_article(?)', [1]);
console.log(results); // 存储过程结果集在第一个元素里
```

### 10.2 多语句（需显式开启，谨慎）

```js
const pool = mysql.createPool({
  /* ... */
  multipleStatements: true, // 默认 false，开启有注入风险
});

const [results] = await pool.query(`
  SELECT COUNT(*) AS a FROM articles;
  SELECT COUNT(*) AS b FROM users;
`);
console.log(results[0], results[1]); // 每个语句一个结果集
```

> ⚠️ `multipleStatements: true` 会让 `; DROP TABLE ...` 类注入得逞，**非必要不要开**，开了务必对所有用户输入用占位符。

---

## 11. 大结果集流式读取

查询返回几百万行时，一次性 `await pool.query()` 会把全部行加载进内存，可能 OOM。用**流式**逐行处理：

```js
const mysql = require('mysql2');
const pool = mysql.createPool({ /* ... */ });

// query 返回 Query 对象，可链式 .stream()
const query = pool.query('SELECT * FROM articles').stream();

query.on('data', (row) => {
  // 逐行处理，内存恒定
  console.log(row.id, row.title);
});

query.on('end', () => {
  console.log('流结束');
});

query.on('error', (err) => {
  console.error(err);
});
```

也支持对象模式 / 高性能模式：

```js
const stream = pool.query('SELECT * FROM big_table').stream({ highWaterMark: 100 });
for await (const row of stream) {
  // 用 for-await 消费更优雅
  process(row);
}
```

> 流式模式**不能**在回调里拿到完整 `rows` 数组，只能 `data` 事件逐行消费。

---

## 12. 错误码与错误处理

### 12.1 错误对象字段

mysql2 抛出的错误对象带 MySQL 原生信息：

| 字段 | 说明 |
| --- | --- |
| `err.code` | 字符串错误码，如 `'ER_DUP_ENTRY'`、`'ECONNREFUSED'` |
| `err.errno` | 数字错误码，如 `1062` |
| `err.sqlState` | SQL 状态，如 `'23000'`（完整性约束违反） |
| `err.sql` | 出错的原始 SQL（方便排查） |
| `err.sqlMessage` | MySQL 返回的错误信息 |

```js
try {
  await pool.query('INSERT INTO articles (id, title) VALUES (1, "x")');
} catch (err) {
  console.log(err.code);      // 'ER_DUP_ENTRY'
  console.log(err.errno);     // 1062
  console.log(err.sqlState);  // '23000'
  console.log(err.sql);       // 出错的 SQL
}
```

### 12.2 常见错误码速查

| code | errno | 含义 | 处理建议 |
| --- | --- | --- | --- |
| `ER_DUP_ENTRY` | 1062 | 唯一键冲突 | 捕获后提示"已存在" |
| `ER_NO_SUCH_TABLE` | 1146 | 表不存在 | 检查表名/库名 |
| `ER_ACCESS_DENIED_ERROR` | 1045 | 账号/密码错 | 检查连接配置 |
| `ECONNREFUSED` | — | 连不上（端口/服务没起） | 检查 MySQL 是否运行 |
| `ER_PARSE_ERROR` | 1064 | SQL 语法错 | 检查 SQL |
| `PROTOCOL_CONNECTION_LOST` | — | 连接中途断开 | 重连 / 用连接池自动重连 |
| `ER_LOCK_WAIT_TIMEOUT` | 1205 | 锁等待超时 | 重试 / 缩短事务 |
| `ER_LOCK_DEADLOCK` | 1213 | 死锁 | 捕获后重试整个事务 |

### 12.3 连接断开自动重连（连接池已内置）

连接池默认会在连接失效时自动重连；单次 `createConnection` 需要自己监听 `error` 事件：

```js
connection.on('error', (err) => {
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('连接丢失，需重建连接');
  } else {
    throw err;
  }
});
```

---

## 13. 类型映射

MySQL 类型 ↔ JS 类型的默认转换：

| MySQL 类型 | JS 类型 |
| --- | --- |
| `INT` / `BIGINT`(小)/ `TINYINT(1)` | `Number` |
| `BIGINT`(大) | `String`（避免精度丢失，见下） |
| `DECIMAL` / `FLOAT` / `DOUBLE` | `Number`（DECIMAL 建议字符串） |
| `VARCHAR` / `TEXT` / `CHAR` | `String` |
| `DATE` / `DATETIME` / `TIMESTAMP` | `Date`（可用 `dateStrings: true` 变字符串） |
| `JSON` | 自动 `JSON.parse` 成对象 |
| `BLOB` / `BINARY` | `Buffer` |
| `NULL` | `null` |

### 13.1 BIGINT 精度丢失问题

JS `Number` 只有 53 位精度，超过 `2^53` 的 `BIGINT`（如雪花 ID）会丢精度。解决：用 `typeCast` 把 BIGINT 转成字符串，或让 MySQL 端 `CAST(id AS CHAR)`。

```js
const pool = mysql.createPool({
  /* ... */
  typeCast(field, next) {
    if (field.type === 'BIGINT') {
      const val = field.string();   // 以字符串读取
      return val === null ? null : val;
    }
    return next();                  // 其他类型走默认转换
  },
});
```

### 13.2 自定义 DATETIME 为字符串

```js
const pool = mysql.createPool({ /* ... */ dateStrings: true });
// 之后 DATETIME 直接返回 '2026-10-22 15:04:05'，而非 Date 对象
```

---

## 14. TypeScript 集成

mysql2 自带类型定义，无需额外 `@types`。

```ts
import mysql from 'mysql2/promise';

interface Article {
  id: number;
  title: string;
  status: 'draft' | 'published';
  view_count: number;
  created_at: Date;
}

async function getArticles(): Promise<Article[]> {
  const pool = mysql.createPool({
    host: 'localhost', user: 'root',
    password: 'Zhang1234!', database: 'blog', charset: 'utf8mb4',
  });

  // RowDataPacket[] 是 mysql2 的行类型
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM articles');
  // 转成业务类型
  return rows as Article[];
}
```

常用类型：`mysql.Pool`、`mysql.PoolConnection`、`mysql.RowDataPacket`、`mysql.ResultSetHeader`、`mysql.FieldPacket`。

---

## 15. ORM 概览

当表多、逻辑复杂时，手写 SQL 维护成本高。三大主流 ORM：

### 15.1 Sequelize（老牌、文档全）

```bash
npm install sequelize
```

```js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('blog', 'root', 'Zhang1234!', {
  host: 'localhost', dialect: 'mysql',
});

const Article = sequelize.define('Article', {
  title: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'published'), defaultValue: 'draft' },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'articles' });

// 自动建表 / 增删改查
await Article.sync();
await Article.create({ title: 'Hi', status: 'published' });
const list = await Article.findAll({ where: { status: 'published' } });
```

### 15.2 TypeORM（装饰器、TS 友好）

```bash
npm install typeorm reflect-metadata
```

```ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'enum', enum: ['draft', 'published'], default: 'draft' })
  status!: string;
}
```

### 15.3 Prisma（新一代、类型安全最强）

```bash
npm install @prisma/client
npx prisma generate
```

```ts
// schema.prisma 定义后，client 自动生成类型
const articles = await prisma.article.findMany({
  where: { status: 'published' },
  orderBy: { id: 'desc' },
});
```

| ORM | 上手难度 | TS 支持 | 学习曲线 | 适用 |
| --- | --- | --- | --- | --- |
| Sequelize | 低 | 一般 | 平缓 | 老项目、快速 CRUD |
| TypeORM | 中 | 好（装饰器） | 中 | TS 项目、企业级 |
| Prisma | 中 | 极佳（自动生成类型） | 中 | 新项目、类型安全要求高 |

> 本博客后端规划（apps/api_go、apps/api_express）用的是**原生 SQL / 轻量封装 + 连接池**，ORM 适合表结构频繁变动的业务系统。选型看团队熟悉度。

---

## 16. 安全与最佳实践

1. **永远用占位符 `?` / `:name`**，杜绝字符串拼接（防 SQL 注入，第 7 节）。
2. **Web 服务必须用连接池**（`createPool`），并设合理的 `connectionLimit`（通常 = 预期并发上限，或 MySQL `max_connections` 的 70%~80%）。
3. **`getConnection()` 后务必 `release()`**，放在 `finally`，防连接泄漏。
4. **事务要短**：把耗时/网络操作移出事务，避免池被长事务占满。
5. **`multipleStatements` 默认关闭**，非必要不开；开了必须全占位符。
6. **BIGINT 主键用字符串处理**（typeCast），防 JS 精度丢失（第 13.1 节）。
7. **生产启用 SSL/TLS** 连接远程 MySQL：`ssl: { rejectUnauthorized: true, ca: fs.readFileSync('ca.pem') }`。
8. **密码别硬编码**：用环境变量（`dotenv`）：
   ```js
   require('dotenv').config();
   const pool = mysql.createPool({
     host: process.env.DB_HOST, user: process.env.DB_USER,
     password: process.env.DB_PASS, database: process.env.DB_NAME,
   });
   ```
9. **设置 `connectTimeout` 与查询 `timeout`**，避免慢查询拖死连接。
10. **监控连接池**：`pool` 有事件可监听；高并发下留意 `Error: Pool is exhausted`（池不够或连接泄漏）。

---

## 17. 常见问题 FAQ

**Q1：`Error: Pool is exhausted`（连接池耗尽）？**
→ 多半是 `getConnection()` 后忘了 `release()`，或 `connectionLimit` 太小。检查所有借连接处是否都在 `finally` 里归还。

**Q2：中文乱码 / 问号？**
→ 连接配置加 `charset: 'utf8mb4'`，并确保库表字符集也是 `utf8mb4`（建表 `DEFAULT CHARSET=utf8mb4`）。

**Q3：`Cannot find module 'mysql2/promise'`？**
→ 你装的是旧版 mysql2。升级：`npm install mysql2@latest`。`/promise` 子路径在 mysql2 v2.0+ 才有。

**Q4：datetime 时区不对？**
→ `timezone` 配置统一（建议服务端/DB 都用 UTC `'+00:00'`），或在应用层统一处理。

**Q5：query 和 execute 哪个快？**
→ 单次查询 `query` 更快（无预编译开销）；循环执行同构 SQL 用 `execute` 更快（预编译复用）。

**Q6：连接池 vs 单次连接，Web 服务怎么选？**
→ Web 服务一律连接池；一次性脚本/迁移工具可用单次连接。

---

> 📌 本文所有示例基于 `mysql2` v3.x，运行环境 Node ≥ 16。涉及库名/表名/密码均以来源项目 Docker 配置（`blog` / `root` / `Zhang1234!`）为例，生产请改为强密码与环境变量。
