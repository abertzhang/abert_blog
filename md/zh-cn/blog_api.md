---
title: Web API 学习文档
create:2026-10-20
update:2026-10-20
category:api
tags:[api,http,rest,blog,express,nest,golang,jwt]
summary:Web API 的场景化学习文档，每个接口均配使用场景与前后端示例代码
keywords:[rest,api,express,nest,golang,jwt,http,blog]
top:1
copyright:true
---

# 博客 Web API 学习文档

> 面向正在搭建本博客项目的学习者：把 `doc/ui` 里的静态界面稿，变成真正能联调的前后端应用。
> 全文共 18 个接口，**每个接口都按「场景 → 请求 → 响应 → 前端示例 → 后端示例」组织**，示例代码可直接复制运行。
> 参考实现使用 Express（:3001），同时提供 Nest（:3002）与 Go/Gin（:3003）的对照实现，三端遵循同一份响应契约。

---

## 目录

1. [总览：应用、端口与统一约定](#1-总览应用端口与统一约定)
2. [环境准备与快速开始](#2-环境准备与快速开始)
3. [数据模型（SQLite）](#3-数据模型sqlite)
4. [前端请求封装](#4-前端请求封装)
5. [文章接口（前台阅读）](#5-文章接口前台阅读)
6. [分类与标签接口](#6-分类与标签接口)
7. [搜索接口](#7-搜索接口)
8. [评论接口](#8-评论接口)
9. [站点信息接口](#9-站点信息接口)
10. [认证接口（阿里云短信 + JWT）](#10-认证接口阿里云短信--jwt)
11. [后台管理接口](#11-后台管理接口)
12. [三端实现对照（Express / Nest / Go）](#12-三端实现对照express--nest--go)
13. [跨域与联调](#13-跨域与联调)
14. [常见问题与排错](#14-常见问题与排错)
15. [推荐实现顺序](#15-推荐实现顺序)

---

## 1. 总览：应用、端口与统一约定

### 1.1 应用与端口

| 应用 | 端口 | 技术栈 | 说明 |
| --- | --- | --- | --- |
| `apps/web_react` | 5001 | React 19 + Vite | 前端（SPA） |
| `apps/web_next` | 5002 | Next.js 16 | 前端（SSR/SSG） |
| `apps/api_express` | 3001 | Express 4 | 后端，本文参考实现 |
| `apps/api_nest` | 3002 | Nest 12 | 后端 |
| `apps/api_go` | 3003 | Go + Gin | 后端（规划中） |

本文示例的 Base URL 统一为 `http://localhost:3001/blog`。

### 1.2 接口清单速查

| # | 方法 | 路径 | 使用场景 | 认证 |
| --- | --- | --- | --- | --- |
| 1 | GET | `/blog/articles` | 首页「最新文章」、分类页列表 | 否 |
| 2 | GET | `/blog/articles/:id` | 文章详情页正文与元信息 | 否 |
| 3 | GET | `/blog/articles/hot` | 侧栏「热门文章」 | 否 |
| 4 | GET | `/blog/categories` | 顶部导航、首页分类卡片、分类页 | 否 |
| 5 | GET | `/blog/tags` | 标签云 | 否 |
| 6 | GET | `/blog/search` | 搜索框结果页 | 否 |
| 7 | GET | `/blog/articles/:id/comments` | 详情页评论列表 | 否 |
| 8 | POST | `/blog/articles/:id/comments` | 详情页提交评论 | 可选 |
| 9 | GET | `/blog/site/about` | 关于页 | 否 |
| 10 | POST | `/blog/auth/sms/code` | 登录页获取短信验证码 | 否 |
| 11 | POST | `/blog/auth/login` | 验证码登录，签发 JWT | 否 |
| 12 | GET | `/blog/auth/profile` | 刷新页面后恢复登录态 | 是 |
| 13 | POST | `/blog/auth/refresh` | 令牌静默续期 | 是 |
| 14 | POST | `/blog/admin/articles` | 后台上传 `.md` 文章 | 管理员 |
| 15 | PUT | `/blog/admin/articles/:id` | 后台编辑文章 | 管理员 |
| 16 | DELETE | `/blog/admin/articles/:id` | 后台删除文章 | 管理员 |
| 17 | POST | `/blog/admin/covers/random` | 按分类批量随机分配封面 | 管理员 |
| 18 | POST | `/blog/admin/upload` | 上传封面 / 正文配图 | 管理员 |

### 1.3 统一约定

**Base URL**：`http://localhost:3001/blog`（换后端只改 host:port，路径不变）。

**请求头**：

```http
Content-Type: application/json        # 普通接口
Authorization: Bearer <token>         # 需要登录的接口
```

上传类接口（`multipart/form-data`）**不要**手动设置 `Content-Type`，交给浏览器自动带上 boundary。

**统一响应体**：所有接口都返回这三段结构，前端只需写一套解析逻辑。

```json
// 成功
{
  "code": 0,
  "message": "ok",
  "data": { "id": 12, "title": "Go 并发模型：从 goroutine 到结构化并发" }
}

// 失败（HTTP 状态码与 code 对应，见错误码表）
{
  "code": 40400,
  "message": "文章不存在或已删除",
  "data": null
}
```

**错误码表**：

| code | HTTP | 含义 | 典型场景 |
| --- | --- | --- | --- |
| 0 | 200 | 成功 | — |
| 40000 | 400 | 请求参数错误 | `page` 为负数、评论内容超长 |
| 40100 | 401 | 未登录 / 令牌无效 | 缺少或过期的 `Authorization` 头 |
| 40101 | 401 | 验证码错误或已过期 | 登录时输错验证码 |
| 40300 | 403 | 无权限 | 普通用户访问后台接口 |
| 40400 | 404 | 资源不存在 | 文章已删除 |
| 40900 | 409 | 资源冲突 | 分类名重复 |
| 42900 | 429 | 请求过于频繁 | 验证码 60 秒内重复发送 |
| 50000 | 500 | 服务器内部错误 | 未捕获异常，由全局错误中间件兜底 |

**分页约定**：查询参数 `page`（默认 1）、`pageSize`（默认 10，最大 50）；响应固定返回 `{ list, total, page, pageSize, hasMore }`。`hasMore` 比让前端再算一次 `total` 更可靠。

**时间格式**：服务端一律存储并返回 ISO 8601 字符串（如 `2026-10-14T09:30:00.000Z`），展示层再格式化为 `2026-10-14`，避免前端各自解析。

### 1.4 REST 设计约定（学习要点）

- **名词复数**表示资源集合：`/articles`、`/categories`、`/comments`；动作通过 HTTP 方法表达（GET 查、POST 增、PUT 改、DELETE 删）。
- **按读者身份分前缀**：`/blog/articles` 对所有人开放，`/blog/admin/**` 仅管理员，一眼能看出权限边界。
- **查询参数做过滤**：`/blog/articles?category=flutter&tag=riverpod&sort=hot`，不要为每个过滤器新建路径。
- **状态码表达结果类别**：4xx 是调用方的问题，5xx 是服务端的问题；`code` 字段再细分业务错误。

---

## 2. 环境准备与快速开始

### 2.1 启动后端（Express 参考实现）

```bash
# 在 monorepo 根目录
pnpm install

# 启动 Express 后端（:3001）
pnpm --filter @repo/api_express dev

# 安装本文示例用到的依赖（后端）
pnpm --filter @repo/api_express add better-sqlite3 jsonwebtoken cors multer
```

### 2.2 curl 冒烟测试

```bash
# 1. 文章列表（首页数据源）
curl -s "http://localhost:3001/blog/articles?page=1&pageSize=2" | python3 -m json.tool

# 2. 文章详情
curl -s "http://localhost:3001/blog/articles/1" | python3 -m json.tool

# 3. 获取验证码（开发环境验证码打印在后端控制台）
curl -s -X POST http://localhost:3001/blog/auth/sms/code \
  -H "Content-Type: application/json" \
  -d '{"phone":"10000000000"}'

# 4. 登录（把上一步控制台打印的 6 位验证码填进来）
curl -s -X POST http://localhost:3001/blog/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"10000000000","code":"123456"}'

# 5. 带令牌访问需要登录的接口
curl -s http://localhost:3001/blog/auth/profile \
  -H "Authorization: Bearer <第4步返回的token>"
```

### 2.3 后端目录建议（Express）

```text
apps/api_express/
├── app.js                  # 中间件与路由挂载（/blog 前缀在这里统一加）
├── db.js                   # better-sqlite3 连接
├── helpers.js              # ok / fail / asyncHandler 统一响应助手
├── middleware/
│   └── auth.js             # requireAuth / requireAdmin
├── routes/
│   ├── articles.js         # 第 5 章
│   ├── categories.js       # 第 6 章
│   ├── comments.js         # 第 8 章
│   ├── auth.js             # 第 10 章
│   └── admin.js            # 第 11 章
└── public/
    ├── covers/             # 内置封面库：flutter/ react/ nodejs/ golang/ 各一个文件夹
    └── uploads/            # 后台上传的图片
```

先把公共底座搭好，后面每个接口都复用它们：

```js
// db.js —— better-sqlite3 是同步 API，包不包 Promise 都能用
const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database(path.join(__dirname, 'blog.db'));
db.pragma('journal_mode = WAL');   // 提升并发读写体验
db.pragma('foreign_keys = ON');    // 显式打开外键约束（SQLite 默认关闭）
module.exports = db;
```

```js
// helpers.js —— 统一响应 + async 路由包装
// 成功：{ code: 0, message: 'ok', data }
function ok(res, data, status = 200) {
  return res.status(status).json({ code: 0, message: 'ok', data: data ?? null });
}

// 失败：HTTP 状态码与业务 code 对应（见 1.3 错误码表）
function fail(res, status, code, message) {
  return res.status(status).json({ code, message, data: null });
}

// 包一层 Promise.resolve，省得每个 handler 手写 try/catch，
// 抛出的错误会进入 app.js 里的全局错误中间件
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { ok, fail, asyncHandler };
```

```js
// middleware/auth.js —— 登录态与管理员校验
const jwt = require('jsonwebtoken');
const { fail } = require('../helpers');

// 解析 Authorization: Bearer <token>，通过后把用户信息挂到 req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 401, 40100, '未登录：缺少 Authorization 头');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { sub, phone, role }
    next();
  } catch {
    return fail(res, 401, 40100, '登录已过期，请重新登录');
  }
}

// 管理员门槛：role 为 admin 才放行（种子账号 10000000000 即管理员）
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return fail(res, 403, 40300, '无权限：需要管理员账号');
  next();
}

module.exports = { requireAuth, requireAdmin };
```

```js
// app.js —— 挂载 /blog 前缀（在现有代码基础上追加）
const cors = require('cors');

app.use(cors({
  origin: ['http://localhost:5001', 'http://localhost:5002'], // 两个前端 dev server
  credentials: true,
}));

app.use('/blog/articles', require('./routes/articles'));
app.use('/blog/categories', require('./routes/categories'));
app.use('/blog/comments', require('./routes/comments'));
app.use('/blog/auth', require('./routes/auth'));
app.use('/blog/admin', require('./routes/admin'));

// 全局错误中间件：放在所有路由之后，兜住所有 next(err)
app.use((err, req, res, next) => {
  console.error('[blog-api]', err);
  res.status(500).json({ code: 50000, message: '服务器内部错误', data: null });
});
```

---

## 3. 数据模型（SQLite）

五个核心表覆盖博客全部场景。字段命名与接口响应保持一致，减少心智转换。

```sql
-- 用户表：手机号即账号（短信验证码登录）
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  phone      TEXT NOT NULL UNIQUE,              -- 11 位手机号
  nickname   TEXT NOT NULL,                     -- 昵称，默认「用户+后四位」
  avatar     TEXT,                              -- 头像 URL，可为空
  role       TEXT NOT NULL DEFAULT 'user',      -- admin / user
  created_at TEXT NOT NULL
);

-- 短信验证码表：生产环境可换 Redis，带 TTL
CREATE TABLE sms_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,                     -- 6 位数字
  expired_at TEXT NOT NULL,                     -- 5 分钟后过期
  created_at TEXT NOT NULL
);
CREATE INDEX idx_sms_codes_phone ON sms_codes(phone);

-- 分类表：与 UI 导航一致，slug 用于 URL
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,             -- Flutter / React / NodeJs / Golang / 其他
  slug        TEXT NOT NULL UNIQUE,             -- flutter / react / nodejs / golang / other
  description TEXT NOT NULL DEFAULT '',
  sort        INTEGER NOT NULL DEFAULT 0        -- 导航排序
);

-- 标签表：与文章多对多
CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- 文章表：content_md 存 markdown 原文，渲染交给前端
CREATE TABLE articles (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  summary          TEXT NOT NULL,               -- 列表页摘要
  content_md       TEXT NOT NULL,               -- 正文 markdown
  cover            TEXT,                        -- 封面图 URL
  category_id      INTEGER NOT NULL REFERENCES categories(id),
  views            INTEGER NOT NULL DEFAULT 0,  -- 阅读量
  reading_minutes  INTEGER NOT NULL DEFAULT 1,  -- 预计阅读时长（分钟）
  status           TEXT NOT NULL DEFAULT 'published', -- draft / published
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT                         -- 软删除：为空即未删除
);
CREATE INDEX idx_articles_category ON articles(category_id, created_at DESC);

-- 文章-标签关联表
CREATE TABLE article_tags (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- 评论表：user_id 为空表示游客评论
CREATE TABLE comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id),      -- 游客为 NULL
  nickname   TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_comments_article ON comments(article_id, id DESC);
```

种子数据（分类与 UI 设计稿一致，账号沿用开发约定）：

```sql
INSERT INTO categories (name, slug, description, sort) VALUES
  ('Flutter', 'flutter', 'Dart 与 Flutter 工程的渲染、状态与性能实践。', 1),
  ('React',   'react',   'React 运行时、状态同步与大型应用的工程组织。', 2),
  ('NodeJs',  'nodejs',  'Node.js 运行时行为、服务端工程与线上问题排查。', 3),
  ('Golang',  'golang',  'Go 语言特性、并发模型与服务端工程实践。', 4),
  ('其他',     'other',   '未匹配分类的文章默认归入此处。', 9);

-- 种子账号：10000000000 = 管理员，20000000000 = 普通用户
INSERT INTO users (phone, nickname, role, created_at) VALUES
  ('10000000000', 'abert', 'admin', '2026-10-01T00:00:00.000Z'),
  ('20000000000', '访客',  'user',  '2026-10-01T00:00:00.000Z');
```

---

## 4. 前端请求封装

先写一个 `request` 封装，后面所有接口示例都复用它。**统一在这里做三件事**：自动带令牌、统一解包 `{code,message,data}`、把业务错误转成可捕获的 `ApiError`。

```ts
// src/lib/api.ts（React + Vite 版）
const BASE_URL = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/blog';

// 业务错误：code 非 0 或 HTTP 非 2xx 时抛出，页面里 catch 它做提示
export class ApiError extends Error {
  constructor(
    public code: number,    // 业务错误码，如 40100
    public status: number,  // HTTP 状态码
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // 登录后把令牌写进 localStorage，之后每个请求自动带上
  const token = localStorage.getItem('blog_token');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => null); // 防止返回非 JSON 时直接抛异常
  if (!res.ok || !body || body.code !== 0) {
    const envelope = body as Envelope<unknown> | null;
    throw new ApiError(
      envelope?.code ?? res.status,
      res.status,
      envelope?.message ?? `HTTP ${res.status}`,
    );
  }
  return (body as Envelope<T>).data;
}

// 常用方法简写
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

Next.js（:5002）的两处差异：

```ts
// 1. 环境变量前缀不同
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/blog';

// 2. localStorage 只在浏览器可用：涉及令牌的组件要加 'use client'；
//    服务端组件（Server Components）里直接 fetch，不带令牌即可（读公开接口）
```

公共类型定义（前后端字段一一对应）：

```ts
// src/lib/types.ts
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ArticleCard {
  id: number;
  title: string;
  summary: string;
  cover: string | null;
  category: string;
  categorySlug: string;
  views: number;
  readingMinutes: number;
  createdAt: string;
}

export interface ArticleDetail extends ArticleCard {
  contentMd: string;
  tags: string[];
  prev: { id: number; title: string } | null;
  next: { id: number; title: string } | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  articleCount: number;
}

export interface Comment {
  id: number;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface Profile {
  id: number;
  phone: string;
  nickname: string;
  avatar: string | null;
  role: 'admin' | 'user';
}
```

---

## 5. 文章接口（前台阅读）

这三个接口支撑 `doc/ui` 里的首页、分类页和文章详情页，是联调的第一步。

### 5.1 GET /blog/articles —— 文章列表

**场景**：用户打开首页，看到「最新文章」卡片流；点击顶部导航的 Flutter / React / NodeJs / Golang 进入分类页，复用同一接口加 `category` 过滤。每张卡片需要封面、标题、摘要、分类、日期、阅读时长——这些字段就是响应里要返回的。

**请求**：

| 参数 | 位置 | 必填 | 说明 |
| --- | --- | --- | --- |
| `page` | query | 否 | 页码，默认 1 |
| `pageSize` | query | 否 | 每页条数，默认 10，最大 50 |
| `category` | query | 否 | 分类 slug，如 `flutter`；不传 = 全部分类 |
| `tag` | query | 否 | 标签名精确匹配 |
| `sort` | query | 否 | `latest`（默认，最新）或 `hot`（按阅读量） |

```bash
# 首页最新 6 篇
curl -s "http://localhost:3001/blog/articles?sort=latest&pageSize=6"

# 分类页：Flutter 下的文章
curl -s "http://localhost:3001/blog/articles?category=flutter&page=1&pageSize=10"
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 12,
        "title": "Go 服务可观测性：pprof 与 trace 上手",
        "summary": "用标准库工具定位 CPU 热点、阻塞与内存分配，附一套可以直接复制的接入方式。",
        "cover": "/covers/golang/pprof-cover.jpg",
        "category": "Golang",
        "categorySlug": "golang",
        "views": 328,
        "readingMinutes": 10,
        "createdAt": "2026-10-14T09:30:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 6,
    "hasMore": true
  }
}
```

**前端示例**（首页「最新文章」区块）：

```tsx
// src/pages/Home.tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ArticleCard } from '../lib/types';

export function LatestPosts() {
  const [list, setList] = useState<ArticleCard[] | null>(null);

  useEffect(() => {
    api.get<{ list: ArticleCard[] }>('/articles?sort=latest&pageSize=6')
      .then((d) => setList(d.list))
      .catch((e) => console.error('加载文章列表失败:', e));
  }, []);

  if (!list) return <p>加载中…</p>;

  return (
    <ul className="post-list">
      {list.map((a) => (
        <li key={a.id} className="post">
          {/* 封面为空时前端给占位图，避免 <img src=null> */}
          <img src={a.cover ?? '/placeholder.svg'} alt="" />
          <h2><a href={`/article?id=${a.id}`}>{a.title}</a></h2>
          <p className="meta">
            {a.category} · {a.createdAt.slice(0, 10)} · 约 {a.readingMinutes} 分钟阅读
          </p>
          <p>{a.summary}</p>
        </li>
      ))}
    </ul>
  );
}
```

分类页只需把 `category` 传进去，其余逻辑与首页完全一致——这就是查询参数做过滤的好处。

**后端示例（Express）**：

```js
// routes/articles.js
const express = require('express');
const db = require('../db');
const { ok, fail, asyncHandler } = require('../helpers');

const router = express.Router();

// GET /blog/articles —— 文章列表（首页 / 分类页 / 标签过滤共用）
router.get('/', asyncHandler(async (req, res) => {
  // 1. 分页参数清洗：非法值回落到默认值，pageSize 夹在 1~50
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));
  const { category, tag, sort } = req.query;

  // 2. 动态拼 WHERE：条件与参数分离，永远走占位符，防 SQL 注入
  const where = ["a.status = 'published'", 'a.deleted_at IS NULL'];
  const params = [];
  if (category) { where.push('c.slug = ?'); params.push(String(category)); }
  if (tag) {
    where.push(`EXISTS (
      SELECT 1 FROM article_tags at
      JOIN tags t ON t.id = at.tag_id
      WHERE at.article_id = a.id AND t.name = ?
    )`);
    params.push(String(tag));
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;

  // 3. 排序：hot 按阅读量，其余按发布时间倒序
  const orderBy = sort === 'hot'
    ? 'a.views DESC, a.id DESC'
    : 'a.created_at DESC, a.id DESC';

  // 4. 总数与列表分两次查（数据量小时最简单可靠的做法）
  const total = db.prepare(`
    SELECT COUNT(*) AS n FROM articles a
    JOIN categories c ON c.id = a.category_id ${whereSql}
  `).get(...params).n;

  const list = db.prepare(`
    SELECT a.id, a.title, a.summary, a.cover, a.views, a.reading_minutes,
           a.created_at, c.name AS category, c.slug AS category_slug
    FROM articles a
    JOIN categories c ON c.id = a.category_id
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, (page - 1) * pageSize);

  // 5. 字段名转成前端的驼峰风格，日期保持 ISO 原样
  const items = list.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    cover: r.cover,
    category: r.category,
    categorySlug: r.category_slug,
    views: r.views,
    readingMinutes: r.reading_minutes,
    createdAt: r.created_at,
  }));

  ok(res, { list: items, total, page, pageSize, hasMore: page * pageSize < total });
}));

module.exports = router;
```

**常见错误**：`category` 传了不存在的 slug 时返回空列表而不是报错——过滤条件查不到数据属于正常结果；只有参数格式错误（如 `page=abc` 已回落默认值）才需要容忍，真正要拦的是 `pageSize=9999` 这类越界值。

### 5.2 GET /blog/articles/:id —— 文章详情

**场景**：在列表页点击文章卡片进入详情页。除正文外，UI 还需要面包屑（首页 · Flutter）、作者、日期、标签，以及底部「上一篇 / 下一篇」导航。详情页打开一次，阅读量 +1。

**请求**：路径参数 `id`（文章 ID）。

```bash
curl -s "http://localhost:3001/blog/articles/12"
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 12,
    "title": "Go 服务可观测性：pprof 与 trace 上手",
    "summary": "用标准库工具定位 CPU 热点、阻塞与内存分配。",
    "cover": "/covers/golang/pprof-cover.jpg",
    "category": "Golang",
    "categorySlug": "golang",
    "views": 329,
    "readingMinutes": 10,
    "createdAt": "2026-10-14T09:30:00.000Z",
    "contentMd": "## 为什么需要可观测性\n\n…",
    "tags": ["golang", "pprof", "可观测性"],
    "prev": { "id": 11, "title": "Node.js 内存泄漏排查实战" },
    "next": null
  }
}
```

**前端示例**（详情页：正文用 markdown 渲染库，如 `react-markdown`）：

```tsx
// src/pages/Article.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { api } from '../lib/api';
import type { ArticleDetail } from '../lib/types';

export function ArticlePage() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<ArticleDetail>(`/articles/${id}`)
      .then(setArticle)
      .catch((e) => setError(e.message)); // 如「文章不存在或已删除」
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!article) return <p>加载中…</p>;

  return (
    <article>
      {/* 面包屑：首页 · 分类 */}
      <p className="meta">首页 · {article.category}</p>
      <h1>{article.title}</h1>
      <p className="meta">
        作者 abert · {article.createdAt.slice(0, 10)} · 约 {article.readingMinutes} 分钟阅读
      </p>
      {/* 正文：contentMd 是 markdown 原文，交给渲染库 */}
      <ReactMarkdown>{article.contentMd}</ReactMarkdown>

      {/* 上下篇导航 */}
      <nav className="prev-next">
        {article.prev && <a href={`/article?id=${article.prev.id}`}>← {article.prev.title}</a>}
        {article.next && <a href={`/article?id=${article.next.id}`}>{article.next.title} →</a>}
      </nav>
    </article>
  );
}
```

**后端示例（Express）**：

```js
// GET /blog/articles/:id —— 文章详情
// 注意：/hot 是静态路径，必须注册在 /:id 之前，否则 'hot' 会被当成 id 匹配
router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return fail(res, 400, 40000, '参数错误：id 必须为正整数');
  }

  const article = db.prepare(`
    SELECT a.id, a.title, a.summary, a.content_md, a.cover, a.views,
           a.reading_minutes, a.created_at,
           c.name AS category, c.slug AS category_slug
    FROM articles a
    JOIN categories c ON c.id = a.category_id
    WHERE a.id = ? AND a.status = 'published' AND a.deleted_at IS NULL
  `).get(id);
  if (!article) return fail(res, 404, 40400, '文章不存在或已删除');

  // 标签：多对多关联查出来转成字符串数组
  const tags = db.prepare(`
    SELECT t.name FROM article_tags at
    JOIN tags t ON t.id = at.tag_id
    WHERE at.article_id = ?
  `).all(id).map((r) => r.name);

  // 上下篇：同分类内按发布时间相邻（UI 底部导航用）
  const prev = db.prepare(`
    SELECT id, title FROM articles
    WHERE category_id = (SELECT category_id FROM articles WHERE id = ?)
      AND status = 'published' AND deleted_at IS NULL AND created_at < ?
    ORDER BY created_at DESC LIMIT 1
  `).get(id, article.created_at) ?? null;
  const next = db.prepare(`
    SELECT id, title FROM articles
    WHERE category_id = (SELECT category_id FROM articles WHERE id = ?)
      AND status = 'published' AND deleted_at IS NULL AND created_at > ?
    ORDER BY created_at ASC LIMIT 1
  `).get(id, article.created_at) ?? null;

  // 阅读量 +1：详情页每次打开计一次（防刷可加 IP 去重，见 14.6）
  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(id);

  ok(res, {
    id: article.id,
    title: article.title,
    summary: article.summary,
    cover: article.cover,
    category: article.category,
    categorySlug: article.category_slug,
    views: article.views + 1,
    readingMinutes: article.reading_minutes,
    createdAt: article.created_at,
    contentMd: article.content_md,
    tags,
    prev,
    next,
  });
}));
```

### 5.3 GET /blog/articles/hot —— 热门文章

**场景**：首页与详情页侧栏的「热门文章」，按阅读量取前 5 篇，字段与列表卡片一致（复用 `ArticleCard` 渲染）。

**请求**：可选 `limit`（默认 5，最大 10）。

```bash
curl -s "http://localhost:3001/blog/articles/hot?limit=5"
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      { "id": 3, "title": "React 19 的并发渲染到底解决了什么问题", "views": 1024, "category": "React", "categorySlug": "react", "cover": "/covers/react/concurrent.jpg", "summary": "…", "readingMinutes": 8, "createdAt": "2026-08-20T10:00:00.000Z" }
    ]
  }
}
```

**前端示例**（侧栏组件，两个页面复用）：

```tsx
// src/components/HotPosts.tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ArticleCard } from '../lib/types';

export function HotPosts() {
  const [list, setList] = useState<ArticleCard[]>([]);
  useEffect(() => {
    api.get<{ list: ArticleCard[] }>('/articles/hot?limit=5').then((d) => setList(d.list));
  }, []);

  return (
    <aside>
      <h3>热门文章</h3>
      <ol>
        {list.map((a) => (
          <li key={a.id}><a href={`/article?id=${a.id}`}>{a.title}</a></li>
        ))}
      </ol>
    </aside>
  );
}
```

**后端示例（Express）**：

```js
// GET /blog/articles/hot —— 热门文章（按阅读量）
// 必须放在 router.get('/:id') 之前注册！
router.get('/hot', asyncHandler(async (req, res) => {
  const limit = Math.min(10, Math.max(1, Number.parseInt(req.query.limit, 10) || 5));
  const rows = db.prepare(`
    SELECT a.id, a.title, a.summary, a.cover, a.views, a.reading_minutes, a.created_at,
           c.name AS category, c.slug AS category_slug
    FROM articles a
    JOIN categories c ON c.id = a.category_id
    WHERE a.status = 'published' AND a.deleted_at IS NULL
    ORDER BY a.views DESC, a.id DESC
    LIMIT ?
  `).all(limit);
  ok(res, { list: rows.map(toCard) }); // toCard 为 5.1 中的字段转换函数，抽出来复用
}));
```

> 学习要点：Express 按注册顺序匹配路由，`/hot` 若写在 `/:id` 后面将永远匹配不到。这是新手最常踩的路由坑之一。

---

## 6. 分类与标签接口

### 6.1 GET /blog/categories —— 分类列表

**场景**：一个接口喂三处 UI——顶部导航（Flutter / React / NodeJs / Golang）、首页「文章分类」卡片区（名称 + 文章数 + 描述）、分类页头部统计。文章数要只统计已发布、未删除的文章。

**请求**：无参数。

```bash
curl -s "http://localhost:3001/blog/categories"
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      { "id": 1, "name": "Flutter", "slug": "flutter", "description": "Dart 与 Flutter 工程的渲染、状态与性能实践。", "articleCount": 3 },
      { "id": 4, "name": "Golang", "slug": "golang", "description": "Go 语言特性、并发模型与服务端工程实践。", "articleCount": 3 }
    ]
  }
}
```

**前端示例**（顶部导航）：

```tsx
// src/components/Nav.tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Category } from '../lib/types';

export function Nav() {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    api.get<{ list: Category[] }>('/categories').then((d) => setCategories(d.list));
  }, []);

  return (
    <nav>
      <a href="/">首页</a>
      {categories.map((c) => (
        <a key={c.id} href={`/category?slug=${c.slug}`}>{c.name}</a>
      ))}
      <a href="/about">关于</a>
    </nav>
  );
}
```

**后端示例（Express）**：

```js
// routes/categories.js
const express = require('express');
const db = require('../db');
const { ok, asyncHandler } = require('../helpers');
const router = express.Router();

// GET /blog/categories —— 分类列表（含文章数）
router.get('/', asyncHandler(async (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.slug, c.description,
           COUNT(a.id) AS article_count
    FROM categories c
    -- 关联时就把「已发布 + 未删除」条件放进 ON，避免统计到草稿和软删文章
    LEFT JOIN articles a
      ON a.category_id = c.id AND a.status = 'published' AND a.deleted_at IS NULL
    GROUP BY c.id
    ORDER BY c.sort
  `).all();

  ok(res, {
    list: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      articleCount: r.article_count,
    })),
  });
}));

module.exports = router;
```

### 6.2 GET /blog/tags —— 标签列表

**场景**：分类页与详情页的标签云。返回标签名及文章数，可按文章数降序（热标签在前）。

**请求**：可选 `limit`（默认 50）。

```bash
curl -s "http://localhost:3001/blog/tags?limit=20"
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      { "name": "riverpod", "articleCount": 2 },
      { "name": "pprof", "articleCount": 1 }
    ]
  }
}
```

**前端示例**（标签云，点击跳转列表页带 `tag` 过滤）：

```tsx
export function TagCloud() {
  const [tags, setTags] = useState<{ name: string; articleCount: number }[]>([]);
  useEffect(() => {
    api.get<{ list: { name: string; articleCount: number }[] }>('/tags?limit=30')
      .then((d) => setTags(d.list));
  }, []);

  return (
    <div className="tag-cloud">
      {tags.map((t) => (
        <a key={t.name} href={`/?tag=${encodeURIComponent(t.name)}`} className="tag">
          {t.name} ({t.articleCount})
        </a>
      ))}
    </div>
  );
}
```

**后端示例（Express）**：

```js
// GET /blog/tags —— 标签云（按文章数降序）
router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
  const rows = db.prepare(`
    SELECT t.name, COUNT(at.article_id) AS article_count
    FROM tags t
    JOIN article_tags at ON at.tag_id = t.id
    JOIN articles a ON a.id = at.article_id
      AND a.status = 'published' AND a.deleted_at IS NULL
    GROUP BY t.id
    ORDER BY article_count DESC, t.name
    LIMIT ?
  `).all(limit);
  ok(res, {
    list: rows.map((r) => ({ name: r.name, articleCount: r.article_count })),
  });
}));
```

---

## 7. 搜索接口

### GET /blog/search —— 关键词搜索

**场景**：页头搜索框输入关键词（如「内存」）回车，进入结果页。结果复用文章卡片列表。匹配范围：标题 + 摘要；标题命中排在前，然后按发布时间倒序。数据量小的时候 `LIKE` 足够，进阶可换 SQLite FTS5（见 14.5）。

**请求**：

| 参数 | 位置 | 必填 | 说明 |
| --- | --- | --- | --- |
| `keyword` | query | 是 | 关键词，1–50 字符 |
| `page` / `pageSize` | query | 否 | 同列表接口 |

```bash
curl -s "http://localhost:3001/blog/search?keyword=%E5%86%85%E5%AD%98&page=1&pageSize=5"
```

**响应**：结构与 `GET /blog/articles` 完全一致（`PageResult<ArticleCard>`），前端可直接复用列表组件。

**前端示例**（搜索框 + 结果页）：

```tsx
// src/pages/Search.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { ArticleCard, PageResult } from '../lib/types';

export function SearchPage() {
  const [params] = useSearchParams();
  const keyword = params.get('keyword') ?? '';
  const [result, setResult] = useState<PageResult<ArticleCard> | null>(null);

  useEffect(() => {
    if (!keyword.trim()) return;
    api.get<PageResult<ArticleCard>>(`/search?keyword=${encodeURIComponent(keyword)}`)
      .then(setResult)
      .catch(console.error);
  }, [keyword]);

  if (!result) return <p>搜索中…</p>;

  return (
    <>
      <p>「{keyword}」共找到 {result.total} 篇文章</p>
      <ul className="post-list">
        {result.list.map((a) => (
          <li key={a.id} className="post">
            <h2><a href={`/article?id=${a.id}`}>{a.title}</a></h2>
            <p className="meta">{a.category} · {a.createdAt.slice(0, 10)}</p>
          </li>
        ))}
      </ul>
      {result.list.length === 0 && <p>没有匹配的文章，换个关键词试试。</p>}
    </>
  );
}
```

**后端示例（Express）**：

```js
// GET /blog/search —— 关键词搜索（标题/摘要）
router.get('/', asyncHandler(async (req, res) => {
  const keyword = String(req.query.keyword ?? '').trim();
  if (keyword.length < 1 || keyword.length > 50) {
    return fail(res, 400, 40000, '参数错误：keyword 需为 1–50 个字符');
  }
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));

  const like = `%${keyword}%`;
  const baseWhere = `WHERE a.status = 'published' AND a.deleted_at IS NULL
                     AND (a.title LIKE ? OR a.summary LIKE ?)`;
  const params = [like, like];

  const total = db.prepare(
    `SELECT COUNT(*) AS n FROM articles a ${baseWhere}`,
  ).get(...params).n;

  // 排序技巧：标题命中的排前面（CASE 产生 0/1 排序键），其次按时间
  const rows = db.prepare(`
    SELECT a.id, a.title, a.summary, a.cover, a.views, a.reading_minutes, a.created_at,
           c.name AS category, c.slug AS category_slug
    FROM articles a
    JOIN categories c ON c.id = a.category_id
    ${baseWhere}
    ORDER BY CASE WHEN a.title LIKE ? THEN 0 ELSE 1 END, a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, like, pageSize, (page - 1) * pageSize);

  ok(res, { list: rows.map(toCard), total, page, pageSize, hasMore: page * pageSize < total });
}));
```

---

## 8. 评论接口

详情页底部评论区。设计取舍：**已登录用户用账户昵称，游客可凭昵称直接评论**（个人博客低门槛），登录不是强制的——所以 POST 接口的认证标为「可选」。

### 8.1 GET /blog/articles/:id/comments —— 评论列表

**场景**：进入详情页后，拉到评论区加载评论，按时间倒序（最新在上），分页加载。

**请求**：`page` / `pageSize`（默认每页 10）。

```bash
curl -s "http://localhost:3001/blog/articles/12/comments?page=1&pageSize=10"
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      { "id": 101, "nickname": "abert", "content": "pprof 那节很有用，收藏了。", "createdAt": "2026-10-15T14:20:00.000Z" }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "hasMore": false
  }
}
```

**前端示例**（评论区列表 + 「加载更多」）：

```tsx
// src/components/Comments.tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Comment, PageResult } from '../lib/types';

export function Comments({ articleId }: { articleId: number }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<Comment>>();

  useEffect(() => {
    api.get<PageResult<Comment>>(`/articles/${articleId}/comments?page=${page}&pageSize=10`)
      .then(setData)
      .catch(console.error);
  }, [articleId, page]);

  if (!data) return <p>加载评论…</p>;

  return (
    <section>
      <h3>评论（{data.total}）</h3>
      <ul>
        {data.list.map((c) => (
          <li key={c.id}>
            <strong>{c.nickname}</strong>
            <time>{c.createdAt.slice(0, 10)}</time>
            <p>{c.content}</p>
          </li>
        ))}
      </ul>
      {data.hasMore && <button onClick={() => setPage((p) => p + 1)}>加载更多</button>}
    </section>
  );
}
```

**后端示例（Express）**：

```js
// routes/comments.js
const express = require('express');
const db = require('../db');
const { ok, fail, asyncHandler } = require('../helpers');
const router = express.Router();

// GET /blog/articles/:id/comments —— 评论列表（最新在前）
router.get('/articles/:id/comments', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 40000, '参数错误：id 必须为正整数');

  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 10));

  // 文章不存在时返回空列表即可（评论接口不要求文章必须存在才可查询）
  const total = db.prepare(
    'SELECT COUNT(*) AS n FROM comments WHERE article_id = ? AND deleted_at IS NULL',
  ).get(id).n;
  const rows = db.prepare(`
    SELECT id, nickname, content, created_at
    FROM comments
    WHERE article_id = ? AND deleted_at IS NULL
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(id, pageSize, (page - 1) * pageSize);

  ok(res, { list: rows, total, page, pageSize, hasMore: page * pageSize < total });
}));

module.exports = router;
```

### 8.2 POST /blog/articles/:id/comments —— 发表评论

**场景**：详情页底部评论框，已登录用户直接提交（后端用账户昵称）；游客需填昵称。提交成功后把新评论插到列表顶部（或重新拉第一页）。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `content` | string | 是 | 评论内容，1–500 字 |
| `nickname` | string | 游客必填 | 未登录时的昵称，1–20 字 |

```bash
# 游客评论
curl -s -X POST http://localhost:3001/blog/articles/12/comments \
  -H "Content-Type: application/json" \
  -d '{"nickname":"路人甲","content":"写得很清楚，感谢！"}'

# 已登录评论（请求体只需 content，昵称取自账户）
curl -s -X POST http://localhost:3001/blog/articles/12/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"content":"补充一点：trace 也可以看锁竞争。"}'
```

**响应**（201 Created）：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "id": 102, "nickname": "路人甲", "content": "写得很清楚，感谢！", "createdAt": "2026-10-20T02:30:00.000Z" }
}
```

**前端示例**（评论提交表单）：

```tsx
// src/components/CommentForm.tsx
import { useState } from 'react';
import { api } from '../lib/api';
import type { Comment } from '../lib/types';

export function CommentForm({ articleId, onSuccess }: { articleId: number; onSuccess: (c: Comment) => void }) {
  const token = localStorage.getItem('blog_token');
  const [nickname, setNickname] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    try {
      // 游客才需要传 nickname；已登录时后端忽略它
      const created = await api.post<Comment>(`/articles/${articleId}/comments`, { nickname, content });
      setContent('');
      onSuccess(created);
    } catch (e) {
      setError((e as Error).message); // 如「游客评论需要填写昵称」
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {/* 未登录时才显示昵称输入框 */}
      {!token && (
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="昵称" maxLength={20} />
      )}
      <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下你的评论…" maxLength={500} />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={!content.trim()}>提交评论</button>
    </form>
  );
}
```

**后端示例（Express）**（「可选登录」的典型写法）：

```js
const jwt = require('jsonwebtoken');

// POST /blog/articles/:id/comments —— 发表评论（登录可选）
router.post('/articles/:id/comments', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 40000, '参数错误：id 必须为正整数');

  const content = String(req.body.content ?? '').trim();
  if (content.length < 1 || content.length > 500) {
    return fail(res, 400, 40000, '参数错误：content 需为 1–500 字');
  }

  // 1. 尝试解析令牌：有且有效 → 用账户昵称；没有或无效 → 按游客处理
  //    注意「可选登录」与「必须登录」的区别：这里解析失败不报错
  let userId = null;
  let nickname = null;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      userId = payload.sub;
      const user = db.prepare('SELECT nickname FROM users WHERE id = ?').get(userId);
      nickname = user?.nickname ?? null;
    } catch { /* 令牌无效时静默降级为游客 */ }
  }

  // 2. 游客必须自带昵称
  if (!nickname) {
    nickname = String(req.body.nickname ?? '').trim();
    if (nickname.length < 1 || nickname.length > 20) {
      return fail(res, 400, 40000, '游客评论需要填写昵称（1–20 字）');
    }
  }

  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO comments (article_id, user_id, nickname, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, nickname, content, now);

  ok(res, { id: Number(info.lastInsertRowid), nickname, content, createdAt: now }, 201);
}));
```

> 安全提示：评论内容入库前**原样保存**，展示时由前端转义（React 默认转义；若用 `dangerouslySetInnerHTML` 渲染富文本评论，必须先过 DOMPurify）。长度限制（500 字）要在服务端校验，不能只信前端。

---

## 9. 站点信息接口

### GET /blog/site/about —— 关于页

**场景**：点击导航「关于」进入关于页，内容来自 `doc/ui/about.html` 的设计稿：站点宣言、个人简介、技能与技术栈、联系方式、站点说明。这些是低频变更的配置型数据，做成一个接口返回，避免前端硬编码。

**请求**：无参数。

```bash
curl -s "http://localhost:3001/blog/site/about"
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "profile": {
      "name": "abert",
      "motto": "一个只写长文的技术博客：把一个问题的来龙去脉写清楚，而不是只给出可以复制的答案。",
      "bio": "我是 abert，客户端与服务端都写。日常工作集中在跨端应用的性能与架构，以及支撑它的服务端工程与可观测性建设。"
    },
    "skills": [
      { "group": "Flutter", "items": ["Dart", "Riverpod / Bloc", "自定义绘制与渲染管线", "DevTools 性能分析"] },
      { "group": "React", "items": ["Hooks 与并发特性", "状态同步", "组件库设计与大型应用结构"] },
      { "group": "NodeJs", "items": ["HTTP 服务与网关", "异步 IO 与事件循环", "内存与性能排查"] },
      { "group": "Golang", "items": ["并发模型与 context", "泛型", "服务可观测性与 pprof 分析"] }
    ],
    "contact": { "email": "hello@example.com", "github": "github.com/yourname" },
    "site": {
      "scope": "Flutter、React、NodeJs 与 Golang 四类技术文章。",
      "rhythm": "以完整长文为主，不追求高频更新。",
      "reading": "正文单栏排版，代码块可横向滚动，不加载任何外部资源。"
    }
  }
}
```

**前端示例**：

```tsx
// src/pages/About.tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface About {
  profile: { name: string; motto: string; bio: string };
  skills: { group: string; items: string[] }[];
  contact: { email: string; github: string };
}

export function AboutPage() {
  const [about, setAbout] = useState<About | null>(null);
  useEffect(() => {
    api.get<About>('/site/about').then(setAbout).catch(console.error);
  }, []);
  if (!about) return <p>加载中…</p>;

  return (
    <main>
      <h1>关于本站</h1>
      <p className="motto">{about.profile.motto}</p>
      <h2>个人简介</h2>
      <p>{about.profile.bio}</p>
      <h2>技能与技术栈</h2>
      {about.skills.map((s) => (
        <div key={s.group}>
          <h3>{s.group}</h3>
          <p>{s.items.join('、')}</p>
        </div>
      ))}
      <h2>联系方式</h2>
      <p>邮箱：{about.contact.email} ／ GitHub：{about.contact.github}</p>
    </main>
  );
}
```

**后端示例（Express）**（配置型数据直接内嵌，真实项目可存 `site_profile` 表单行）：

```js
// routes/site.js
const express = require('express');
const { ok } = require('../helpers');
const router = express.Router();

// GET /blog/site/about —— 关于页数据（与 doc/ui/about.html 设计稿对应）
const ABOUT = {
  profile: {
    name: 'abert',
    motto: '一个只写长文的技术博客：把一个问题的来龙去脉写清楚，而不是只给出可以复制的答案。',
    bio: '我是 abert，客户端与服务端都写。日常工作集中在跨端应用的性能与架构，以及支撑它的服务端工程与可观测性建设。',
  },
  skills: [
    { group: 'Flutter', items: ['Dart', 'Riverpod / Bloc', '自定义绘制与渲染管线', 'DevTools 性能分析'] },
    { group: 'React', items: ['Hooks 与并发特性', '状态同步', '组件库设计与大型应用结构'] },
    { group: 'NodeJs', items: ['HTTP 服务与网关', '异步 IO 与事件循环', '内存与性能排查'] },
    { group: 'Golang', items: ['并发模型与 context', '泛型', '服务可观测性与 pprof 分析'] },
  ],
  contact: { email: 'hello@example.com', github: 'github.com/yourname' },
  site: {
    scope: 'Flutter、React、NodeJs 与 Golang 四类技术文章。',
    rhythm: '以完整长文为主，不追求高频更新。',
    reading: '正文单栏排版，代码块可横向滚动，不加载任何外部资源。',
  },
};

router.get('/about', (req, res) => ok(res, ABOUT));

module.exports = router;
```

并在 `app.js` 挂载：`app.use('/blog/site', require('./routes/site'));`

---

## 10. 认证接口（阿里云短信 + JWT）

博客用**手机号 + 短信验证码**登录，不存密码。链路：前端获取验证码 → 阿里云短信下发（开发环境打印到控制台）→ 用户提交 → 服务端校验 → 签发 JWT → 前端存 `localStorage`。种子账号：`10000000000`（管理员）、`20000000000`（普通用户）。

### 10.1 POST /blog/auth/sms/code —— 发送验证码

**场景**：登录页输入手机号后点击「获取验证码」。服务端做三件事：校验手机号格式、60 秒防刷、生成 6 位验证码并记录过期时间；生产环境调用阿里云 `dysmsapi` 下发，**开发环境直接打印到后端控制台**（省短信钱，方便联调）。

**请求体**：`{ "phone": "10000000000" }`

```bash
curl -s -X POST http://localhost:3001/blog/auth/sms/code \
  -H "Content-Type: application/json" \
  -d '{"phone":"10000000000"}'
# 后端控制台会打印：[dev] 手机号 10000000000 的验证码是：123456
```

**响应**：

```json
{ "code": 0, "message": "ok", "data": { "expiredIn": 300 } }
```

**前端示例**（获取验证码按钮 + 60 秒倒计时，与后端防刷节奏对齐）：

```tsx
// src/pages/Login.tsx（片段）
function useSmsCode(phone: string) {
  const [countdown, setCountdown] = useState(0); // 倒计时秒数，0 表示可发送

  async function send() {
    await api.post('/auth/sms/code', { phone }); // 失败会抛 ApiError，如 42900「发送过于频繁」
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  return { countdown, send };
}
```

**后端示例（Express）**：

```js
// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { ok, fail, asyncHandler } = require('../helpers');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

const PHONE_RE = /^1[3-9]\d{9}$/; // 中国大陆手机号
const now = () => new Date().toISOString();

// POST /blog/auth/sms/code —— 发送短信验证码
router.post('/sms/code', asyncHandler(async (req, res) => {
  const phone = String(req.body.phone ?? '').trim();
  if (!PHONE_RE.test(phone)) return fail(res, 400, 40000, '参数错误：手机号格式不正确');

  // 60 秒防刷：同一手机号距上次发送不足 60s 直接拒绝
  const recent = db.prepare(
    'SELECT id FROM sms_codes WHERE phone = ? AND created_at > ?',
  ).get(phone, new Date(Date.now() - 60_000).toISOString());
  if (recent) return fail(res, 429, 42900, '发送过于频繁，请 60 秒后重试');

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 位数字
  db.prepare('INSERT INTO sms_codes (phone, code, expired_at, created_at) VALUES (?, ?, ?, ?)')
    .run(phone, code, new Date(Date.now() + 5 * 60_000).toISOString(), now());

  if (process.env.NODE_ENV !== 'production') {
    // 开发环境：打印到控制台，不真正发短信
    console.log(`[dev] 手机号 ${phone} 的验证码是：${code}`);
  } else {
    // 生产环境：调用阿里云短信（伪代码，按官方 SDK 接入）
    // await aliyunSms.send({ phone, templateCode: 'SMS_xxxxxxxx', param: { code } });
  }

  ok(res, { expiredIn: 300 }); // 5 分钟有效，单位秒
}));
```

### 10.2 POST /blog/auth/login —— 验证码登录

**场景**：用户输入收到的 6 位验证码，点击「登录」。服务端校验通过后：作废该手机号的验证码 → 查不到用户就自动注册（手机号即账号，种子手机号首次登录也能直接建号）→ 签发 JWT → 前端保存令牌并跳转回原页面。

**请求体**：`{ "phone": "10000000000", "code": "123456" }`

```bash
curl -s -X POST http://localhost:3001/blog/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"10000000000","code":"123456"}'
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 7200,
    "profile": { "id": 1, "phone": "10000000000", "nickname": "abert", "avatar": null, "role": "admin" }
  }
}
```

**前端示例**（登录提交 + 保存令牌）：

```tsx
// src/pages/Login.tsx（片段）
import { api, ApiError } from '../lib/api';
import type { Profile } from '../lib/types';

async function login(phone: string, code: string) {
  try {
    const data = await api.post<{ token: string; profile: Profile }>('/auth/login', { phone, code });
    // 1. 令牌存 localStorage，之后 request() 会自动带上
    localStorage.setItem('blog_token', data.token);
    // 2. 管理员才显示「后台管理」入口
    if (data.profile.role === 'admin') localStorage.setItem('blog_role', 'admin');
    // 3. 跳转回来源页（简化处理：回首页）
    location.href = '/';
  } catch (e) {
    if (e instanceof ApiError && e.code === 40101) {
      alert('验证码错误或已过期，请重新获取');
    } else {
      alert((e as Error).message);
    }
  }
}
```

**后端示例（Express）**：

```js
// POST /blog/auth/login —— 验证码登录，签发 JWT
router.post('/login', asyncHandler(async (req, res) => {
  const phone = String(req.body.phone ?? '').trim();
  const code = String(req.body.code ?? '').trim();
  if (!PHONE_RE.test(phone) || !/^\d{6}$/.test(code)) {
    return fail(res, 400, 40000, '参数错误：phone / code 格式不正确');
  }

  // 1. 取该手机号最新一条验证码核对（含过期判断）
  const row = db.prepare('SELECT * FROM sms_codes WHERE phone = ? ORDER BY id DESC LIMIT 1').get(phone);
  if (!row || row.code !== code) return fail(res, 401, 40101, '验证码错误');
  if (new Date(row.expired_at).getTime() < Date.now()) {
    return fail(res, 401, 40101, '验证码已过期，请重新获取');
  }

  // 2. 登录成功即作废验证码，防止同一验证码重复使用
  db.prepare('DELETE FROM sms_codes WHERE phone = ?').run(phone);

  // 3. 用户不存在则自动注册；ADMIN_PHONE 首次登录直接授予管理员
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) {
    const role = phone === (process.env.ADMIN_PHONE || '10000000000') ? 'admin' : 'user';
    const info = db.prepare(
      'INSERT INTO users (phone, nickname, role, created_at) VALUES (?, ?, ?, ?)',
    ).run(phone, `用户${phone.slice(-4)}`, role, now());
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  }

  // 4. 签发 JWT：payload 放 id / 手机号 / 角色，2 小时过期
  const token = jwt.sign(
    { sub: user.id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );

  ok(res, {
    token,
    expiresIn: 7200,
    profile: {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
    },
  });
}));
```

### 10.3 GET /blog/auth/profile —— 当前登录用户

**场景**：用户刷新页面后，`localStorage` 里还有令牌，但内存里的登录态丢了。前端拿令牌调一次本接口：成功则恢复登录态（导航显示昵称，管理员显示「后台管理」入口）；失败（401）则清除本地令牌，按游客渲染。

**请求**：Header 带 `Authorization: Bearer <token>`，无其他参数。

```bash
curl -s http://localhost:3001/blog/auth/profile -H "Authorization: Bearer <token>"
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "id": 1, "phone": "10000000000", "nickname": "abert", "avatar": null, "role": "admin" }
}
```

**前端示例**（应用启动时恢复登录态）：

```tsx
// src/App.tsx（片段）
import { useEffect, useState } from 'react';
import { api } from './lib/api';
import type { Profile } from './lib/types';

export function useSession() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('blog_token');
    if (!token) { setReady(true); return; } // 本地无令牌：游客态，无需请求
    api.get<Profile>('/auth/profile')
      .then((p) => { setProfile(p); localStorage.setItem('blog_role', p.role); })
      .catch(() => localStorage.removeItem('blog_token')) // 401：令牌失效，清掉
      .finally(() => setReady(true));
  }, []);

  return { profile, ready };
}
```

**后端示例（Express）**：

```js
// GET /blog/auth/profile —— 当前登录用户（requireAuth 中间件已解析令牌）
router.get('/profile', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, phone, nickname, avatar, role FROM users WHERE id = ?',
  ).get(req.user.sub);
  if (!user) return fail(res, 404, 40400, '用户不存在');
  ok(res, user);
});
```

### 10.4 POST /blog/auth/refresh —— 刷新令牌

**场景**（进阶）：JWT 2 小时过期，用户正编辑长文章时突然 401 体验很差。做法：在 `request()` 里捕获 401 → 用旧令牌换新令牌 → 重放原请求一次。本接口就是给这个自动续期用的。

**请求**：Header 带有效（或宽限期内）的 `Bearer <token>`。

```bash
curl -s -X POST http://localhost:3001/blog/auth/refresh -H "Authorization: Bearer <token>"
```

**响应**：

```json
{ "code": 0, "message": "ok", "data": { "token": "eyJhbGciOiJIUzI1NiJ9...", "expiresIn": 7200 } }
```

**前端示例**（401 自动续期 + 重放，接在 `request()` 里）：

```ts
// src/lib/api.ts（在 request 函数内追加）
if (res.status === 401 && !path.startsWith('/auth/') && retry !== false) {
  try {
    const d = await request<{ token: string }>('/auth/refresh', { method: 'POST' }, true);
    localStorage.setItem('blog_token', d.token);
    return request(path, options, true); // 带新令牌重放一次，防无限重试
  } catch {
    localStorage.removeItem('blog_token'); // 续期也失败：真的过期了
  }
}
```

**后端示例（Express）**：

```js
// POST /blog/auth/refresh —— 用有效令牌换一张新令牌
router.post('/refresh', requireAuth, (req, res) => {
  const token = jwt.sign(
    { sub: req.user.sub, phone: req.user.phone, role: req.user.role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
  ok(res, { token, expiresIn: 7200 });
});
```

> 生产环境更进一步：access token（2 小时）+ refresh token（7 天，可撤销）双令牌结构，refresh token 只调用一次即轮换。个人博客阶段单令牌 + 自动续期已够用。

---

## 11. 后台管理接口

这 5 个接口都需要「管理员」身份（`requireAuth` + `requireAdmin` 串联），喂 `doc/ui` 之外的运营后台：上传 `.md` 文章、编辑、删除、随机分配封面、上传图片。

### 11.1 POST /blog/admin/articles —— 上传 .md 文章

**场景**：管理员在后台选择 `.md` 文件上传。后端解析文件头部的 frontmatter（`title` / `category` / `tags` / `summary` / `cover`），正文存 `content_md`，自动计算阅读时长（按 400 字/分钟）；**分类名在分类表里匹配不到时归「其他」**。文件用 `multipart/form-data` 上传，字段名 `file`。

**请求**：`multipart/form-data`，字段 `file`（`.md`，≤2MB）。

上传的 markdown 长这样：

```markdown
---
title: Go 服务可观测性：pprof 与 trace 上手
category: Golang
tags: [golang, pprof, 可观测性]
summary: 用标准库工具定位 CPU 热点、阻塞与内存分配。
cover: /covers/golang/pprof-cover.jpg
---

## 为什么需要可观测性

……
```

```bash
curl -s -X POST http://localhost:3001/blog/admin/articles \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@posts/go-pprof.md"
```

**响应**（201 Created）：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "id": 13, "title": "Go 服务可观测性：pprof 与 trace 上手", "category": "Golang", "tags": ["golang", "pprof", "可观测性"], "readingMinutes": 10 }
}
```

**前端示例**（后台文章上传）：

```tsx
// src/pages/admin/ArticleUpload.tsx
import { useState } from 'react';
import { api } from '../../lib/api';

export function ArticleUpload() {
  const token = localStorage.getItem('blog_token')!;
  const [file, setFile] = useState<File | null>(null);

  async function upload() {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    // 注意：不要手动设 Content-Type，浏览器会自动带 boundary
    const res = await fetch('http://localhost:3001/blog/admin/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const body = await res.json();
    if (body.code === 0) alert(`上传成功：${body.data.title}（约 ${body.data.readingMinutes} 分钟）`);
    else alert(body.message);
  }

  return (
    <div>
      <input type="file" accept=".md" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button onClick={upload} disabled={!file}>上传文章</button>
    </div>
  );
}
```

**后端示例（Express）**（multer 接收文件 + 手写 frontmatter 解析）：

```js
// routes/admin.js
const express = require('express');
const multer = require('multer');
const db = require('../db');
const { ok, fail, asyncHandler } = require('../helpers');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

const now = () => new Date().toISOString();

// 全文接口都要求管理员
router.use(requireAuth, requireAdmin);

// multer：内存存储即可（解析后直接入库，不落盘）
const mdUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    cb(null, file.originalname.toLowerCase().endsWith('.md'));
  },
});

// 解析 frontmatter（生产环境可用 gray-matter，这里手写便于学习格式）
function parseFrontmatter(md) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(md);
  if (!m) return { data: {}, content: md.trim() };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([\w-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      // tags: [a, b, c] → 字符串数组
      v = v.slice(1, -1).split(/[,，]/).map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    } else {
      v = v.replace(/^['"]|['"]$/g, ''); // 去掉首尾引号
    }
    data[kv[1]] = v;
  }
  return { data, content: m[2].trim() };
}

// 阅读时长：按 400 字/分钟估算，至少 1 分钟
const readingMinutes = (text) => Math.max(1, Math.ceil(text.replace(/\s/g, '').length / 400));

// POST /blog/admin/articles —— 上传 .md 文章（字段名 file）
router.post('/articles', mdUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return fail(res, 400, 40000, '请上传 .md 文件（字段名 file）');

  const { data, content } = parseFrontmatter(req.file.buffer.toString('utf8'));
  if (!content) return fail(res, 400, 40000, '文章正文为空');

  const title = String(data.title ?? req.file.originalname.replace(/\.md$/i, '')).slice(0, 120);

  // 分类：按名称匹配，未匹配归「其他」（与后台约定一致）
  let category = db.prepare('SELECT * FROM categories WHERE name = ?')
    .get(String(data.category ?? '').trim());
  if (!category) category = db.prepare("SELECT * FROM categories WHERE slug = 'other'").get();

  const summary = String(data.summary ?? data.description ?? content.slice(0, 120));
  const minutes = readingMinutes(content);

  const info = db.prepare(`
    INSERT INTO articles (title, summary, content_md, cover, category_id, views, reading_minutes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, 'published', ?, ?)
  `).run(title, summary, content, data.cover ?? null, category.id, minutes, now(), now());
  const articleId = Number(info.lastInsertRowid);

  // 标签：不存在则创建，再建立关联（最多 10 个）
  const tagNames = Array.isArray(data.tags) ? data.tags.slice(0, 10) : [];
  for (const name of tagNames) {
    db.prepare('INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING').run(name);
    const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
    db.prepare('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)').run(articleId, tag.id);
  }

  ok(res, { id: articleId, title, category: category.name, tags: tagNames, readingMinutes: minutes }, 201);
}));
```

> 如果后台改用 JSON 提交（不传文件，直接传 `{title, category, tags, content}`），把 `mdUpload.single('file')` 中间件去掉、改用 `express.json()` 解析，`parseFrontmatter` 换成直接读 `req.body` 即可，其余逻辑不变。

### 11.2 PUT /blog/admin/articles/:id —— 更新文章

**场景**：后台文章列表点「编辑」，修改标题、摘要、分类、标签后保存。采用部分更新语义：只传要改的字段；`content` 不传表示不改正文（传了则重算阅读时长）。

**请求体**（均可选，至少传一个）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | 标题 |
| `summary` | string | 摘要 |
| `category` | string | 分类名（匹配不到归「其他」） |
| `tags` | string[] | 全量替换标签 |
| `content` | string | 正文 markdown（传了会重算阅读时长） |

```bash
curl -s -X PUT http://localhost:3001/blog/admin/articles/13 \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Go 服务可观测性：pprof 与 trace 上手（修订）","tags":["golang","pprof"]}'
```

**响应**：`{ "code": 0, "message": "ok", "data": { "id": 13, "updated": true } }`

**后端示例（Express）**（动态 SET 的写法，注意列名白名单）：

```js
// PUT /blog/admin/articles/:id —— 更新文章（部分字段）
router.put('/articles/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 40000, '参数错误：id 必须为正整数');

  const article = db.prepare(
    'SELECT * FROM articles WHERE id = ? AND deleted_at IS NULL',
  ).get(id);
  if (!article) return fail(res, 404, 40400, '文章不存在或已删除');

  // 白名单映射：请求字段 → 数据库列，杜绝拼接任意列名
  const body = req.body ?? {};
  const fields = [];
  const params = [];
  const columnMap = { title: 'title', summary: 'summary', content: 'content_md', cover: 'cover' };
  for (const [key, column] of Object.entries(columnMap)) {
    if (body[key] !== undefined) { fields.push(`${column} = ?`); params.push(String(body[key])); }
  }
  // 正文变了要重算阅读时长
  if (body.content !== undefined) {
    fields.push('reading_minutes = ?');
    params.push(readingMinutes(String(body.content)));
  }
  // 分类单独处理：名称 → id，未匹配归「其他」
  if (body.category !== undefined) {
    let category = db.prepare('SELECT id FROM categories WHERE name = ?').get(String(body.category).trim());
    if (!category) category = db.prepare("SELECT id FROM categories WHERE slug = 'other'").get();
    fields.push('category_id = ?');
    params.push(category.id);
  }

  if (fields.length === 0 && body.tags === undefined) {
    return fail(res, 400, 40000, '参数错误：没有需要更新的字段');
  }
  if (fields.length > 0) {
    fields.push('updated_at = ?');
    params.push(now(), id);
    db.prepare(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  // 标签是全量替换：先删旧关联，再按新列表建
  if (Array.isArray(body.tags)) {
    db.prepare('DELETE FROM article_tags WHERE article_id = ?').run(id);
    for (const name of body.tags.slice(0, 10)) {
      db.prepare('INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING').run(name);
      const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
      db.prepare('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)').run(id, tag.id);
    }
  }

  ok(res, { id, updated: true });
}));
```

### 11.3 DELETE /blog/admin/articles/:id —— 删除文章

**场景**：后台文章列表点「删除」，弹出确认框后调用。采用**软删除**（写 `deleted_at`），数据可恢复，也避免误删后关联数据全丢。

**请求**：无请求体。

```bash
curl -s -X DELETE http://localhost:3001/blog/admin/articles/13 \
  -H "Authorization: Bearer <admin-token>"
```

**响应**：`{ "code": 0, "message": "ok", "data": { "id": 13, "deleted": true } }`

**后端示例（Express）**：

```js
// DELETE /blog/admin/articles/:id —— 软删除文章
router.delete('/articles/:id', asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 40000, '参数错误：id 必须为正整数');

  // 已删除的文章再删一次返回 404，保持幂等语义清晰
  const info = db.prepare(
    'UPDATE articles SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL',
  ).run(now(), id);
  if (info.changes === 0) return fail(res, 404, 40400, '文章不存在或已删除');

  ok(res, { id, deleted: true });
}));
```

### 11.4 POST /blog/admin/covers/random —— 批量随机分配封面

**场景**：内置封面库按技术分类分文件夹存放（`public/covers/flutter/`、`react/`、`nodejs/`、`golang/`）。后台勾选某分类下的文章，点「随机分配封面」：后端从对应文件夹随机选一张没分配过的图，写回 `articles.cover`。`preview: true` 时只返回分配方案不落库，方便先看效果。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `category` | string | 是 | 分类 slug，决定从哪个封面文件夹取图 |
| `articleIds` | number[] | 是 | 要分配封面的文章 ID 列表 |
| `preview` | boolean | 否 | `true` 只预览不保存 |

```bash
curl -s -X POST http://localhost:3001/blog/admin/covers/random \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"category":"flutter","articleIds":[1,2,3],"preview":false}'
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "preview": false,
    "updated": [
      { "id": 1, "cover": "/covers/flutter/render-pipeline.jpg" },
      { "id": 2, "cover": "/covers/flutter/riverpod-refactor.jpg" },
      { "id": 3, "cover": "/covers/flutter/devtools-perf.jpg" }
    ]
  }
}
```

**前端示例**（后台封面分配，带预览切换）：

```tsx
// src/pages/admin/CoverAssign.tsx（片段）
async function assignRandom(category: string, articleIds: number[], preview: boolean) {
  const token = localStorage.getItem('blog_token')!;
  const res = await fetch('http://localhost:3001/blog/admin/covers/random', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ category, articleIds, preview }),
  });
  const body = await res.json();
  if (body.code !== 0) return alert(body.message);
  // 预览模式下先刷新页面看效果，确认后再以 preview=false 正式保存
  console.log(body.data.updated);
}
```

**后端示例（Express）**：

```js
// routes/admin.js 内追加
const fs = require('node:fs');
const path = require('node:path');

// POST /blog/admin/covers/random —— 按分类批量随机分配封面
router.post('/covers/random', asyncHandler(async (req, res) => {
  const { category, articleIds, preview } = req.body ?? {};
  const slug = String(category ?? '').toLowerCase();

  // 1. 读取该分类的封面库：public/covers/<slug>/*.jpg|png|webp
  const dir = path.join(__dirname, '..', 'public', 'covers', slug);
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  } catch { files = []; }
  if (files.length === 0) return fail(res, 400, 40000, `分类 ${category} 下没有可用封面`);

  // 2. 逐篇文章随机选一张；想避免同批次重复，可先 shuffle files 再依次取
  const ids = (Array.isArray(articleIds) ? articleIds : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const updated = ids.map((id) => {
    const cover = `/covers/${slug}/${files[Math.floor(Math.random() * files.length)]}`;
    if (preview !== true) {
      db.prepare('UPDATE articles SET cover = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
        .run(cover, now(), id);
    }
    return { id, cover };
  });

  ok(res, { preview: preview === true, updated });
}));
```

### 11.5 POST /blog/admin/upload —— 上传图片

**场景**：后台编辑文章时上传自定义封面或正文配图。图片存到 `public/uploads/`，返回可通过 HTTP 访问的 URL（`/uploads/xxx.png`），文章里直接引用。限制：≤2MB，仅 jpg/png/webp/gif。

**请求**：`multipart/form-data`，字段 `file`。

```bash
curl -s -X POST http://localhost:3001/blog/admin/upload \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@~/Desktop/cover.png"
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "data": { "url": "/uploads/1737000000000-a1b2c3.png", "size": 152400, "mimetype": "image/png" }
}
```

**后端示例（Express）**（磁盘存储 + 唯一文件名）：

```js
const crypto = require('node:crypto');

// POST /blog/admin/upload —— 上传图片（封面 / 正文配图）
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'public', 'uploads'),
    // 唯一文件名：时间戳 + 随机串，避免同名覆盖
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype));
  },
});

router.post('/upload', imageUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return fail(res, 400, 40000, '请上传图片文件（字段名 file，≤2MB）');
  // public 目录下的文件天然可通过 /uploads/... 访问（express.static 已挂载 public）
  ok(res, {
    url: `/uploads/${req.file.filename}`,
    size: req.file.size,
    mimetype: req.file.mimetype,
  }, 201);
}));
```

> 记得把 `public/uploads/` 加进 `.gitignore`（用户上传内容不进仓库），但 `public/covers/`（内置封面库）要提交。生产环境建议换成对象存储（OSS/COS），接口返回签名 URL，本地方案仅适合开发阶段。

---

## 12. 三端实现对照（Express / Nest / Go）

同一份契约、三种技术栈。以 `GET /blog/articles` 为例，对照阅读能看清「路由 → 参数清洗 → 查询 → 统一响应」在各框架里的写法差异。Nest 跑 :3002，Go 跑 :3003，路径与响应结构与 Express 版完全一致。

**Express（:3001）**：见 [5.1 后端示例](#51-get-blogarticles--文章列表)，核心是 `router.get` + 手写参数清洗。

**Nest（:3002）**：控制器只负责协议层，业务逻辑放 Service：

```ts
// apps/api_nest/src/articles/articles.controller.ts
import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service.js';

@Controller('blog/articles') // 类级前缀，方法路径拼在后面
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // GET /blog/articles?page=1&pageSize=10&category=flutter
  @Get()
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 10,
    @Query('category') category?: string,
  ) {
    // pageSize 上限在 Service 里夹紧，与 Express 版同一套规则
    return this.articlesService.list({ page, pageSize, category });
  }

  // GET /blog/articles/:id
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.detail(id);
  }
}
```

```ts
// apps/api_nest/src/articles/articles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ArticlesService {
  // 真实项目在这里注入 TypeORM/Prisma，伪代码演示结构
  list({ page, pageSize, category }: { page: number; pageSize: number; category?: string }) {
    const size = Math.min(50, Math.max(1, pageSize)); // 与 Express 相同的夹紧逻辑
    return { list: [], total: 0, page, pageSize: size, hasMore: false };
  }

  detail(id: number) {
    // 业务错误用异常表达，全局异常过滤器统一转成 { code, message, data }
    throw new NotFoundException({ code: 40400, message: '文章不存在或已删除' });
  }
}
```

Nest 的差异点：参数校验推荐配 `ValidationPipe` + DTO 类（`class ListQueryDto { @IsInt() @Min(1) page = 1; }`），把 Express 里手写的清洗逻辑声明化。

**Go + Gin（:3003）**：

```go
// apps/api_go/internal/handler/article.go
package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ArticleHandler struct {
	// db *gorm.DB // 真实项目注入 GORM
}

// List 文章列表：GET /blog/articles
func (h *ArticleHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	// 与 Express / Nest 保持同一套分页规则：1~50
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}
	category := c.Query("category")

	// 伪代码：GORM 查询部分省略，响应结构与另外两端逐字段一致
	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data": gin.H{
			"list":     []any{},
			"total":    0,
			"page":     page,
			"pageSize": pageSize,
			"hasMore":  false,
			"category": category,
		},
	})
}

// RegisterRoutes 统一挂 /blog 前缀
func (h *ArticleHandler) RegisterRoutes(r *gin.Engine) {
	blog := r.Group("/blog")
	{
		blog.GET("/articles", h.List)
		blog.GET("/articles/:id", h.Detail)
		blog.GET("/articles/hot", h.Hot)
		blog.GET("/categories", h.Categories)
		blog.POST("/auth/login", h.Login)
	}
}
```

| 关注点 | Express | Nest | Go/Gin |
| --- | --- | --- | --- |
| 路由定义 | `router.get(path, handler)` | 装饰器 `@Get()` | `group.GET(path, handler)` |
| 参数清洗 | 手写 `Math.max/min` | `ParseIntPipe` + DTO | 手写 `strconv.Atoi` + 判断 |
| 统一响应 | `helpers.ok()` | 拦截器 / 异常过滤器 | 每处手写 `gin.H{}` 或抽 helper |
| 鉴权中间件 | `router.use(requireAuth)` | Guard（`@UseGuards`） | `group.Use(AuthMiddleware())` |
| 适合阶段 | 快速上手、学习 HTTP 语义 | 工程化、多人协作 | 高性能、部署简单 |

学习建议：先用 Express 把 18 个接口跑通（理解契约），再挑 2–3 个核心接口用 Nest / Go 重写（体会框架差异），不要三端同时从零开始。

---

## 13. 跨域与联调

前端（:5001 / :5002）与后端（:3001 / :3002 / :3003）**端口不同即跨域**，浏览器会先发 OPTIONS 预检。两种解法任选其一，推荐联调早期用代理（改动小、无需动后端）。

**方案 A：后端开 CORS**（已在 2.3 的 `app.js` 示例中配置）：

```js
app.use(cors({
  origin: ['http://localhost:5001', 'http://localhost:5002'],
  credentials: true, // 允许携带 Cookie（本博客用 Bearer 令牌，此项可不开）
}));
```

**方案 B：Vite 代理**（:5001，把 `/blog` 转发到后端，前端无感）：

```ts
// apps/web_react/vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5001,
    proxy: {
      // 前端请求 /blog/xxx → http://localhost:3001/blog/xxx
      '/blog': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

用了代理后，前端的 Base URL 改成同源相对路径即可：`const BASE_URL = '/blog';`

Next.js（:5002）对应写法：

```ts
// apps/web_next/next.config.ts
const nextConfig = {
  async rewrites() {
    return [{ source: '/blog/:path*', destination: 'http://localhost:3001/blog/:path*' }];
  },
};
export default nextConfig;
```

**联调检查清单**（按顺序过一遍，能排除 80% 的「接口不通」）：

- [ ] 后端端口确实是 3001（`curl http://localhost:3001/blog/categories` 先自测）
- [ ] 前端 Base URL 与后端端口一致（或代理规则生效）
- [ ] 跨域已解决：浏览器 Network 里看不到红色 CORS 报错
- [ ] 需要登录的接口带了 `Authorization: Bearer <token>`，且 token 没过期
- [ ] 响应被正确解包：读的是 `body.data`，不是整个 `body`
- [ ] 上传接口没有手动设 `Content-Type`（`FormData` 场景）

---

## 14. 常见问题与排错

**14.1 登录后刷新页面又变游客了？**
检查两件事：① 登录成功后 `localStorage.setItem('blog_token', ...)` 有没有执行；② 应用启动时有没有调 `GET /blog/auth/profile` 恢复登录态（见 10.3）。令牌只在 localStorage 里、刷新后不会自动恢复，必须主动换一次。

**14.2 每个接口都返回 401？**
看后端全局错误中间件是不是把 `fail(res, 401, ...)` 也吞了——确认 `requireAuth` 抛出的错误走到了对应的响应分支；另外确认请求头格式是 `Bearer <token>`（一个空格，Bearer 大写 B）。

**14.3 `hasMore` 和实际不符？**
`hasMore = page * pageSize < total` 只在「不加过滤条件」时直观；带 `category`/`tag` 过滤时 `total` 必须是过滤后的总数——检查 COUNT 查询的 WHERE 和列表查询是否完全一致（这是新手高频 bug：两处条件写得不一致）。

**14.4 时间显示差 8 小时？**
服务端存的是 ISO 字符串（UTC），前端 `createdAt.slice(0, 10)` 直接切片在有时区偏移的字符串上会出错。稳妥做法：前端 `new Date(createdAt)` 再用本地时区格式化，或服务端统一存本地时间字符串并在文档中约定。**全项目只选一种，不要混用。**

**14.5 搜索想支持全文匹配？**
`LIKE` 无法利用索引且不支持相关性排序。SQLite 可建 FTS5 虚表：

```sql
CREATE VIRTUAL TABLE articles_fts USING fts5(title, summary, content_md, content='articles');
-- 写入后同步：INSERT INTO articles_fts(articles_fts) VALUES('rebuild');
```

查询改 `MATCH`。文章量到几百篇以上再上，个人博客前期 `LIKE` 完全够用。

**14.6 阅读量被刷 / 评论被灌水？**
- 阅读量：同一 IP 对同一文章 N 分钟内只计一次（内存 Map 或 Redis 计数器）。
- 评论：加频率限制（同 IP 每分钟 ≤3 条），敏感词过滤可后期再加。
- 验证码：`sms_codes` 表已带 60 秒防刷；再配一个图形验证码或 IP 限额更稳。

**14.7 SQL 注入风险？**
全文示例的 SQL 全部使用 `?` 占位符传参。唯一允许拼字符串的是 `ORDER BY` 和列名——这两处要用白名单枚举（如 `sort` 只接受 `latest`/`hot` 两个值），绝不把用户输入直接拼进 SQL。

**14.8 上传报 `Unexpected field`？**
multer 的字段名必须与前端 `FormData.append('file', ...)` 一致；用了 `upload.single('file')` 就不能再传其他字段（多字段用 `upload.fields([...])`）。

---

## 15. 推荐实现顺序

不要 18 个接口一起写。按「先让页面有数据，再补交互，最后做后台」的顺序推进，每步都能在浏览器里看到效果：

1. **搭底座**：`db.js` + `helpers.js` + 建表 + 种子数据（第 2、3 章），`curl /blog/categories` 能返回数据。
2. **文章三接口**（5.1 → 5.2 → 5.3）：首页列表 → 详情 → 热门侧栏。此时 `doc/ui/index.html` 的样式换成真实数据即可跑通主流程。
3. **分类 / 标签 / 关于**（第 6、9 章）：导航、分类页、关于页全静态化。
4. **前端封装**（第 4 章）：把散落的 fetch 收进 `api.ts`，接 `ApiError` 统一提示。
5. **认证链路**（第 10 章）：验证码（控制台打印）→ 登录 → 恢复登录态。先不接阿里云，联调完再切生产环境发送。
6. **评论**（第 8 章）：详情页底部从「只读」变「可写」。
7. **搜索**（第 7 章）：页头搜索框落地。
8. **后台五接口**（第 11 章）：md 上传 → 编辑 → 删除 → 封面分配 → 图片上传。此时把 `doc/ui` 之外补一个简易后台页即可完整运营。
9. **三端对照**（第 12 章）：挑文章列表 + 登录两个接口，用 Nest / Go 各写一遍，验证契约一致性。
10. **收尾**：跨域方案二选一（第 13 章），过一遍排错清单（第 14 章）。

每完成一步，先 `curl` 自测后端，再打开前端页面点一遍——**后端自测通过 + 前端联调通过**才算这个接口完成。
