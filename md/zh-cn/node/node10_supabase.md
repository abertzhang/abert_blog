---
title: Node.js Supabase 学习文档
create:2026-10-20
update:2026-10-21
category:backend
tags:[node,supabase,postgresql,auth,storage,backend,database]
summary:Node.js 使用 Supabase 的学习文档，覆盖 Auth/Database/Storage/Realtime/Edge Functions，含详细 API 与示例
keywords:[node,supabase,postgresql,auth,storage,realtime,database]
top:1
copyright:true
---

# Node.js Supabase 学习文档

> 适用：Node.js 服务端（也可在浏览器/Edge 使用同一 SDK）。基于 `@supabase/supabase-js` v2。
> Supabase = Postgres 数据库 + Auth 认证 + Storage 对象存储 + Realtime 实时 + Edge Functions，全部通过一套 JS SDK 调用。
> 本文对每个 API 给出**签名 / 参数 / 返回结构 / 示例场景**，并在末尾附**安全清单**。

---

## 目录

- [1. 安装与初始化](#1-安装与初始化)
- [2. anon key 与 service_role key](#2-anon-key-与-service_role-key)
- [3. 统一返回结构与错误处理](#3-统一返回结构与错误处理)
- [4. Auth 认证](#4-auth-认证)
- [5. Database 数据库（PostgREST）](#5-database-数据库postgrest)
- [6. Storage 对象存储](#6-storage-对象存储)
- [7. Realtime 实时](#7-realtime-实时)
- [8. Edge Functions 边缘函数](#8-edge-functions-边缘函数)
- [9. 安全与最佳实践清单](#9-安全与最佳实践清单)
- [10. 综合示例：用户 + 文章 CRUD](#10-综合示例用户--文章-crud)

---

## 1. 安装与初始化

```bash
npm install @supabase/supabase-js
```

```js
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

// createClient(url, key, options?)
//  - url:   项目地址，形如 https://<project-ref>.supabase.co
//  - key:   项目密钥（anon/publishable 或 service_role，见第 2 节）
//  - options.auth: 服务端建议关闭持久化与 URL 检测
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false, // 服务端无浏览器，常关
      persistSession: false,    // 不在服务端落盘会话
      detectSessionInUrl: false,
    },
  }
)
```

**常用 options**：`db.schema`（切换 schema）、`auth.*`（令牌刷新/持久化）、`global.fetch`（自定义 fetch）、`global.headers`（每个请求附加头，如携带用户 JWT 实现「按用户身份走 RLS」，见下）、`realtime`（实时选项）。

> **服务端按用户身份走 RLS**：把用户的 access token 注入请求头，让数据库按该用户行级权限执行：
> ```js
> const userClient = createClient(URL, ANON_KEY, {
>   global: { headers: { Authorization: `Bearer ${userJwt}` } },
> })
> ```
> 若用 Next.js 等 Web 框架，官方推荐 `@supabase/ssr` / `@supabase/server` 管理 Cookie 会话；纯 Node 服务用上面的 header 注入即可。

---

## 2. anon key 与 service_role key

| Key | 对应数据库角色 | 权限 | 使用位置 |
|---|---|---|---|
| `anon` / publishable key | `anon` | 仅被显式授权的操作，**受 RLS 约束** | 前端、按用户 JWT 调用的服务端 |
| `authenticated` | `authenticated` | 已登录用户角色，受 RLS 约束 | 登录后客户端/服务端 |
| `service_role` | `service_role` | **绕过 RLS，拥有全部权限** | **仅受信任的服务端** |

```js
// 普通客户端（走 RLS，安全）
const supabase = createClient(URL, process.env.SUPABASE_ANON_KEY)

// 管理客户端（绕过 RLS，仅在服务端！）
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
```

> ⚠️ **service_role key 永远不要出现在前端或任何可能暴露给浏览器的地方**（包括 `NEXT_PUBLIC_` 环境变量）。它一旦泄露等于数据库裸奔。

---

## 3. 统一返回结构与错误处理

supabase-js **所有网络请求**都返回 `{ data, error }`：成功时 `error` 为 `null`；失败时 `data` 为 `null`，`error` 含 `{ message, status, code, details }`。

```js
const { data, error } = await supabase.from('posts').select()
if (error) {
  // 统一错误处理
  console.error('状态码:', error.status, '| 信息:', error.message, '| 代码:', error.code)
  throw error
}
console.log(data)
```

> 数据库操作常见错误：`PGRST` 前缀（PostgREST 层，多为 RLS/权限/列不存在）、`23505`（唯一约束冲突）、`42P01`（表不存在）。排查实时/Auth/函数错误前，先看 `error.message`。

---

## 4. Auth 认证

所有方法挂在 `supabase.auth` 下（管理员方法在 `supabase.auth.admin`，需 service_role 客户端）。

### 4.1 注册 —— `auth.signUp`

```ts
// 签名
signUp({ email, password, options?: { data?, emailRedirectTo?, channel? } })
// 返回 { data: { user: User|null, session: Session|null }, error }
```

```js
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secret-password',
  options: {
    data: { name: '小明' },                 // 写入 raw_user_meta_data
    emailRedirectTo: 'https://app.com/welcome',
  },
})
// 邮箱确认开启时：session 为 null，需用户点确认邮件链接
// 关闭邮箱确认：直接拿到 session
```

**场景**：新用户注册，注册后发送确认邮件。

### 4.2 密码登录 —— `auth.signInWithPassword`

```ts
// 签名
signInWithPassword({ email, password })
// 返回 { data: { user, session }, error }
```

```js
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secret-password',
})
if (error) return console.error('登录失败:', error.message)
const accessToken = data.session.access_token // 后续请求携带
```

**场景**：账号密码登录，拿到 `session.access_token` 用于后续接口鉴权。

### 4.3 登出 —— `auth.signOut`

```ts
// 签名 signOut({ scope?: 'global'|'local'|'others' })
// 返回 { error }
await supabase.auth.signOut() // 默认 local：清除当前会话
```

### 4.4 获取当前用户 / 会话

```ts
// getUser() 会向 Auth 服务器校验 JWT，最可靠（推荐）
const { data: { user }, error } = await supabase.auth.getUser()
// getSession() 只读本地/携带的会话，不同步校验
const { data: { session } } = await supabase.auth.getSession()
```

> 服务端用 `getUser(jwt)` 或直接 `auth.getUser()`（需已注入用户 JWT 到客户端）校验身份。

### 4.5 三方登录 —— `auth.signInWithOAuth`

```ts
// 签名 signInWithOAuth({ provider, options?: { redirectTo?, scopes? } })
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: { redirectTo: 'https://app.com/callback' },
})
// data.url 为跳转地址（服务端渲染场景需重定向到该 url）
```

### 4.6 重置密码 —— `auth.resetPasswordForEmail`

```ts
// 签名 resetPasswordForEmail(email, { redirectTo? })
await supabase.auth.resetPasswordForEmail('user@example.com', {
  redirectTo: 'https://app.com/reset',
})
// 用户点邮件链接后，用 auth.updateUser({ password }) 设置新密码
```

### 4.7 修改用户 —— `auth.updateUser`

```ts
// 签名 updateUser({ email?, password?, data?, ... })
await supabase.auth.updateUser({ password: 'new-password' })
await supabase.auth.updateUser({ data: { name: '新名字' } })
```

### 4.8 交换授权码 —— `auth.exchangeCodeForSession`（OAuth/PKCE 回调用）

```ts
// 在回调路由里，把 URL 中的 code 换成 session
const { data, error } = await supabase.auth.exchangeCodeForSession(code)
```

### 4.9 管理员方法（`auth.admin`，需 service_role 客户端）

```ts
// 列出用户：listUsers({ page?, perPage? }) -> { data: { users, aud }, error }
const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 })

// 按 id 查：getUserById(id)
await admin.auth.admin.getUserById('user-uuid')

// 直接创建（跳过确认邮件）：createUser({ email, password, email_confirm?, user_metadata? })
await admin.auth.admin.createUser({ email: 'a@b.com', password: 'x', email_confirm: true })

// 删除：deleteUser(id)
await admin.auth.admin.deleteUser('user-uuid')

// 邀请：inviteUserByEmail(email, { redirectTo? })
await admin.auth.admin.inviteUserByEmail('a@b.com')
```

**场景**：后台管理系统列出/封禁/创建用户（用 admin 客户端）。

> ⚠️ 删用户**不会**自动让已签发的 token 失效，敏感场景需先 `signOut`/吊销会话，并保持 JWT 有效期较短。

---

## 5. Database 数据库（PostgREST）

通过 `supabase.from(table)` 构造查询，全部返回 `{ data, error }`。

### 5.1 查询 —— `select`

```ts
// from(table).select(columns?, { count?, head? })
// columns: 逗号分隔列名；可用 别名:列名 重命名；* 表示全部
const { data } = await supabase
  .from('posts')
  .select('id, title, author:id (name)') // 嵌套关系（author 是外键关联表）
```

### 5.2 过滤器方法（可链式组合）

| 方法 | 作用 | 示例 |
|---|---|---|
| `eq(col, val)` | 等于 | `.eq('status', 'published')` |
| `neq(col, val)` | 不等于 | `.neq('status', 'draft')` |
| `gt / gte(col, val)` | 大于 / 大于等于 | `.gte('views', 100)` |
| `lt / lte(col, val)` | 小于 / 小于等于 | `.lte('age', 18)` |
| `like(col, '%x%')` | 模糊（区分大小写） | `.like('title', '%node%')` |
| `ilike(col, '%x%')` | 模糊（不区分大小写） | `.ilike('title', '%node%')` |
| `in(col, [..])` | 在集合中 | `.in('id', [1,2,3])` |
| `is(col, null\|true\|false)` | IS（判空用 is 不用 eq） | `.is('deleted_at', null)` |
| `or('a.eq.1, b.eq.2')` | 或条件 | `.or('status.eq.draft, views.gt.100')` |
| `contains(col, val)` | 包含（jsonb/数组） | `.contains('tags', ['js'])` |

**示例：组合过滤**

```js
const { data, error } = await supabase
  .from('posts')
  .select('id, title, views')
  .eq('status', 'published')
  .gte('views', 100)
  .ilike('title', '%node%')
  .order('views', { ascending: false }) // 排序
  .limit(20)                            // 限制条数
```

### 5.3 排序 / 分页 / 计数

```js
await supabase.from('posts')
  .select('*', { count: 'exact' })      // 同时返回总数（data 为数组，count 在返回对象上）
  .order('created_at', { ascending: false })
  .range(0, 9)                          // 分页：第 1~10 行（0-based 起止，含两端）

// 单条结果：返回对象是对象而非数组
const { data } = await supabase.from('posts').select().eq('id', 1).single()
// maybeSingle()：无匹配时返回 null 而非报错（single 无匹配会报错）
```

> 默认单请求最多返回 1000 行，超出用 `range()` 翻页。

### 5.4 写入 —— `insert` / `upsert`

```ts
// insert(rows, { returning?, count? })  rows 可为对象或数组
await supabase.from('posts').insert({ title: 'Hello', body: '...' })
// 返回插入的行：.insert({...}).select()

// upsert(rows, { onConflict?: 'id', ignoreDuplicates? }) 冲突时更新
await supabase.from('posts')
  .upsert({ id: 1, title: '更新后标题' }, { onConflict: 'id' })
```

### 5.5 更新 / 删除

```ts
// update(values, { returning? }) 必须配合过滤，否则全表更新！
await supabase.from('posts').update({ status: 'archived' }).eq('id', 1)

// delete() 同样必须配合过滤
const { error } = await supabase.from('posts').delete().eq('id', 1)
```

**场景：更新当前用户的文章（靠 RLS 保证只能改自己的）**

```js
await supabase.from('posts')
  .update({ title: '新标题' })
  .eq('id', postId)
  .eq('user_id', currentUser.id) // 双保险
```

### 5.6 调用 Postgres 函数 —— `rpc`

```ts
// rpc(fnName, args?, options?)
const { data } = await supabase.rpc('increment_counter', { row_id: 42 })
```

> 数据库操作总结：`select` 查、`insert` 增、`update` 改、`delete` 删、`upsert` 增或改、`rpc` 调函数；除了 `insert`，其余几乎都要 `.eq(...)` 之类过滤来限定范围。

---

## 6. Storage 对象存储

通过 `supabase.storage.from(bucket)` 操作某个 bucket（存储桶）。

### 6.1 上传 —— `upload`

```ts
// from(bucket).upload(path, fileBody, { upsert?, cacheControl?, contentType? })
//  - path: 对象在桶内的路径（含文件名）
//  - fileBody: Buffer / Blob / File / ArrayBuffer / 字符串
// 返回 { data: { path, id, fullPath }, error }
import fs from 'node:fs'

const file = fs.readFileSync('./avatar.png')
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('public/user-1.png', file, {
    upsert: true,                 // true 则覆盖同名文件
    contentType: 'image/png',
    cacheControl: '3600',
  })
```

**场景**：用户上传头像（Node 端读取文件 Buffer 后上传）。

### 6.2 下载 —— `download`

```ts
// from(bucket).download(path) -> { data: Blob, error }
const { data, error } = await supabase.storage.from('avatars').download('public/user-1.png')
const buf = Buffer.from(await data.arrayBuffer()) // Node 中转 Buffer
```

### 6.3 获取公开 URL —— `getPublicUrl`

```ts
// from(bucket).getPublicUrl(path) -> { data: { publicUrl } }
// 仅当 bucket 设为 public 时链接才可直接访问
const { data } = supabase.storage.from('avatars').getPublicUrl('public/user-1.png')
console.log(data.publicUrl)
```

### 6.4 签名 URL（临时私有访问）—— `createSignedUrl`

```ts
// from(bucket).createSignedUrl(path, expiresInSeconds) -> { data: { signedUrl }, error }
const { data, error } = await supabase.storage
  .from('avatars')
  .createSignedUrl('private/user-1.png', 60) // 60 秒有效
console.log(data.signedUrl)
```

### 6.5 删除 / 列举 / 建桶

```ts
// remove([paths]) -> { data, error }
await supabase.storage.from('avatars').remove(['public/user-1.png'])

// list(path?, { limit?, offset?, sortBy? }) -> { data: FileObject[], error }
const { data } = await supabase.storage.from('avatars').list('public', { limit: 100 })

// 建桶 / 列桶（需 service_role 或服务端）
await supabase.storage.createBucket('avatars', { public: false })
const { data: buckets } = await supabase.storage.listBuckets()
```

> ⚠️ **覆盖上传（upsert）需要 INSERT + SELECT + UPDATE 三种权限**，只给 INSERT 会让覆盖静默失败。

---

## 7. Realtime 实时

监听数据库变更、广播（broadcast）与在线状态（presence）。

### 7.1 监听表变更 —— `postgres_changes`

```ts
// channel(name).on('postgres_changes', { event, schema, table, filter? }, cb).subscribe()
const channel = supabase
  .channel('public:posts')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'posts', filter: 'status=eq.published' },
    (payload) => {
      console.log('新文章:', payload.new)
    }
  )
  .subscribe()

// 退订
await supabase.removeChannel(channel)
```

`event` 取值：`INSERT` / `UPDATE` / `DELETE` / `*`。

### 7.2 在线状态（presence）

```ts
const channel = supabase.channel('room-1', { config: { presence: { key: 'user-1' } } })
channel.on('presence', { event: 'sync' }, () => {
  console.log('在线成员:', channel.presenceState())
})
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({ user_id: 'user-1', online_at: new Date().toISOString() })
  }
})
```

**场景**：聊天室/协作文档实时收到新消息或看到谁在线。

---

## 8. Edge Functions 边缘函数

在 Deno 边缘运行时部署的函数，用 `functions.invoke` 调用。

```ts
// functions.invoke(name, { body?, headers? }) -> { data, error }
const { data, error } = await supabase.functions.invoke('send-email', {
  body: { to: 'user@example.com', subject: '欢迎' },
  headers: { 'x-custom': 'value' },
})
```

**场景**：在 Node 后端触发一个部署在 Supabase 的邮件发送函数，避免把邮件服务密钥放在应用服务器。

---

## 9. 安全与最佳实践清单

> 以下来自 Supabase 官方安全要点，务必遵守：

1. **service_role key 只在受信任的服务端使用**，绝不进前端 / `NEXT_PUBLIC_*` / 客户端包。
2. **暴露 schema（public）里的每张表都开启 RLS**（行级安全），并写与真实访问模型匹配的策略，不要一律套 `auth.uid()`。
3. **不要拿 `user_metadata`（raw_user_meta_data）做授权判断** —— 它用户可改、会出现在 `auth.jwt()` 里，不安全；授权信息放 `app_metadata`。
4. **视图默认绕过 RLS**：Postgres 15+ 用 `CREATE VIEW ... WITH (security_invoker = true)`；老版本把视图放进未暴露 schema 或收回 `anon/authenticated` 权限。
5. **UPDATE 需要 SELECT 策略**：没有 SELECT 策略时 UPDATE 会静默更新 0 行（不报错）。
6. **策略用 `TO authenticated` + 归属谓词**，不要只用 `TO authenticated`（那是认证非授权，存在 BOLA/IDOR）；例如 `using ((select auth.uid()) = user_id)`。
7. **UPDATE 策略同时写 `USING` 和 `WITH CHECK`**，否则用户能把 `user_id` 改成别人的。
8. **`SECURITY DEFINER` 函数会绕过 RLS**，别用它「解决权限报错」；放在未暴露 schema，函数体内加 `auth.uid()` 校验。
9. **Storage upsert 需要 INSERT+SELECT+UPDATE** 权限。
10. **固定依赖版本并提交 lockfile**（`@supabase/supabase-js` 等），避免供应链风险。
11. 新表可能未自动暴露给 Data API：**除了开 RLS，还要显式 `GRANT` 给 `anon`/`authenticated` 角色**。
12. 删用户后记得吊销其会话；敏感操作可校验 `session_id` 对 `auth.sessions` 的有效性。

---

## 10. 综合示例：用户 + 文章 CRUD

```js
// 场景：一个服务端接口，验证用户身份后，读取/新建/更新该用户的文章
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

async function handle(userJwt, action, payload) {
  // 1) 校验身份（向 Auth 服务器核实 JWT）
  const { data: { user }, error: authErr } = await supabase.auth.getUser(userJwt)
  if (authErr || !user) throw new Error('未授权')

  // 2) 用同一客户端（已带用户 JWT）走 RLS，只能操作自己的数据
  if (action === 'list') {
    const { data, error } = await supabase
      .from('posts').select('id, title, status').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  if (action === 'create') {
    const { data, error } = await supabase
      .from('posts')
      .insert({ ...payload, user_id: user.id })
      .select().single()
    if (error) throw error
    return data
  }

  if (action === 'update') {
    const { data, error } = await supabase
      .from('posts').update(payload.fields)
      .eq('id', payload.id).eq('user_id', user.id) // 归属双保险
      .select().single()
    if (error) throw error
    return data
  }
}
```

---

> 更多细节以官方文档为准：<https://supabase.com/docs/reference/javascript/introduction>。所有方法均遵循 `{ data, error }` 返回约定；遇到错误优先看 `error.message` 与状态码。

---

## 11. 参考文档

本文档的方法签名、参数与返回结构均以 Supabase 官方资料为准。下方按模块列出权威入口，便于按需深入查阅（均为可点击链接）。

### 11.1 官方总入口

- **Supabase 官方文档首页**：[https://supabase.com/docs](https://supabase.com/docs)
- **JavaScript / TypeScript SDK（supabase-js v2）参考总览**：[https://supabase.com/docs/reference/javascript/introduction](https://supabase.com/docs/reference/javascript/introduction)
- **supabase-js GitHub 仓库**：[https://github.com/supabase/supabase-js](https://github.com/supabase/supabase-js)
- **Supabase 控制台（建项目 / 建表 / 配置 RLS）**：[https://supabase.com/dashboard](https://supabase.com/dashboard)

### 11.2 分模块参考

- **Auth（认证）**
  - 客户端方法 `signUp` / `signInWithPassword` / `signOut` / `getUser` / `getSession` / `signInWithOAuth` / `resetPasswordForEmail` / `updateUser`：[auth-signInWithPassword 参考](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
  - Admin 方法（服务端 `service_role`）`listUsers` / `getUserById` / `createUser` / `deleteUser` / `inviteUserByEmail`：[auth-admin-listUsers 参考](https://supabase.com/docs/reference/javascript/auth-admin-listusers)
- **Database（PostgREST 查询）**
  - 查询构建器总览 `select` / `insert` / `upsert` / `update` / `delete` / `rpc`：[select 参考](https://supabase.com/docs/reference/javascript/select)
  - 过滤器与排序 `eq` / `neq` / `gt` / `gte` / `lt` / `lte` / `like` / `ilike` / `in` / `is` / `or` / `order` / `limit` / `range`：[eq 过滤器参考](https://supabase.com/docs/reference/javascript/eq)
- **Storage（对象存储）**
  - `upload` / `download` / `getPublicUrl` / `createSignedUrl` / `remove` / `list` / `createBucket`：[storage-from-upload 参考](https://supabase.com/docs/reference/javascript/storage-from-upload)
- **Realtime（实时订阅）**
  - `postgres_changes` / `presence` / `broadcast`：[Realtime 指南](https://supabase.com/docs/guides/realtime)
- **Edge Functions（边缘函数）**
  - `functions.invoke`（部署/调用 Deno 函数）：[functions-invoke 参考](https://supabase.com/docs/reference/javascript/functions-invoke)
- **安全与权限（RLS）**
  - 行级安全策略编写指南：[Row Level Security 指南](https://supabase.com/docs/guides/database/postgres/row-level-security)

### 11.3 延伸学习

- **Node.js 官方文档**：[https://nodejs.org/docs](https://nodejs.org/docs)
- **PostgreSQL 官方文档（SQL / 函数）**：[https://www.postgresql.org/docs](https://www.postgresql.org/docs)
- **PostgREST API 说明（Supabase 数据库底层）**：[https://postgrest.org](https://postgrest.org)

> 说明：以上链接均为 Supabase / 相关项目官方域名。Supabase 文档会随版本演进更新，文中示例基于 supabase-js **v2** 编写，若 SDK 升级导致 API 变动，请以官方 reference 的最新说明为准。
