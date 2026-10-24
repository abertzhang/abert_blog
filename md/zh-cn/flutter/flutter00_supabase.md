---
title: Flutter Supabase 后端即服务学习文档
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-17.jpg
tags:[flutter,dart,supabase,supabase_flutter,baas,auth,database,storage,realtime,edge-functions,postgrest,row-level-security]
summary:Flutter 接入 Supabase（开源 Firebase 替代 / BaaS）完全学习文档，覆盖 supabase_flutter 2.x 的初始化、Auth（注册/登录/OAuth/OTP/会话监听/重置密码/更新资料）、PostgREST 数据库（查询/过滤/插入/更新/删除/upsert/排序分页/stream 实时流/rpc）、Storage 存储、Edge Functions、Realtime（postgres changes/broadcast/presence）、RLS、实战与最佳实践，接口尽量齐全并附可运行示例
keywords:[flutter,supabase,supabase_flutter,auth,database,storage,realtime,postgrest,edge functions,rls]
top:1
copyright:true
---

# Flutter Supabase 后端即服务学习文档

> 本文档基于 **Flutter 3.47.7（stable）** + **Dart 3.13.5**（2026-10 最新稳定版），核心库 **`supabase_flutter` 2.18.3**（依赖 `supabase` 2.16.5）。文档遵循 Dart 3 空安全语法，示例统一使用 `final supabase = Supabase.instance.client` 单例。适合想用一套 SDK 同时解决「认证 + 数据库 + 文件存储 + 实时 + 云函数」的开发者。

Supabase 是**开源的 Firebase 替代品（BaaS）**，本质是一个托管 **PostgreSQL** 数据库，外加 Auth、Storage、Realtime 与 Edge Functions。客户端通过 `supabase_flutter` 这**一个**包就能访问全部能力，所有请求都经过 **PostgREST**（把 REST 请求翻译成 SQL），并受 **Row Level Security（RLS）** 行级权限控制保护。

## 目录

- [1. 核心架构与组件](#1-核心架构与组件)
- [2. 安装与初始化](#2-安装与初始化)
- [3. Auth 认证全解](#3-auth-认证全解)
- [4. 数据库（PostgREST）](#4-数据库postgrest)
- [5. Storage 文件存储](#5-storage-文件存储)
- [6. Edge Functions 边缘函数](#6-edge-functions-边缘函数)
- [7. Realtime 实时通信](#7-realtime-实时通信)
- [8. Row Level Security 简述](#8-row-level-security-简述)
- [9. 综合实战](#9-综合实战)
- [10. 错误处理与调试](#10-错误处理与调试)
- [11. 最佳实践与常见坑](#11-最佳实践与常见坑)
- [12. 参考文档](#12-参考文档)

---

## 1. 核心架构与组件

| 组件 | 底层 | Flutter 访问点 | 用途 |
| :-- | :-- | :-- | :-- |
| **Auth** | GoTrue | `supabase.auth`（`GoTrueClient`） | 注册、登录、OAuth、会话管理 |
| **Database** | PostgREST + Postgres | `supabase.from(...)` | 表查询 / 增删改 / 关系嵌套 |
| **Storage** | S3 兼容对象存储 | `supabase.storage` | 文件上传 / 下载 / 签名 URL |
| **Realtime** | WebSocket | `supabase.channel(...)` | 表变更监听 / 广播 / 在线状态 |
| **Edge Functions** | Deno 边缘运行时 | `supabase.functions` | 服务端代码（支付、Webhook 等） |

> 所有写库操作都受 **RLS** 约束：即使客户端拼出了请求，数据库也会按「当前登录用户」的权限策略决定是否放行。因此**客户端永远只持有 `publishableKey`（anon key）**，真正的权限在数据库策略里。

---

## 2. 安装与初始化

### 2.1 添加依赖

```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.18.3
```

```bash
flutter pub get
```

### 2.2 初始化（必须在 `runApp` 前）

```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  // Flutter 绑定初始化（用到 plugin 的平台能力时必须）
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://YOUR-PROJECT.supabase.co',
    publishableKey: 'YOUR-PUBLISHABLE-ANON-KEY', // 即 anon key，可发布到客户端
    // 可选：认证流类型（v2 默认 PKCE）
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );

  runApp(const MyApp());
}

// 全局单例，整个 App 复用同一个 client
final supabase = Supabase.instance.client;
```

> **`publishableKey` 与 `anonKey`**：2.x 推荐用 `publishableKey`，旧的 `anonKey` 参数已废弃但仍被接受（两者都传时 `publishableKey` 优先）。其余可选参数：`headers`、`httpClient`、`authOptions`、`postgrestOptions`、`realtimeClientOptions`、`storageOptions`。

### 2.3 移动端深链配置（OAuth / 魔法链接必需）

OAuth 与邮件魔法链接登录后，系统会带着 `myapp://callback` 这样的 URL 把 App 唤醒。需要在原生工程里声明该 Scheme：

- **Android**（`android/app/src/main/AndroidManifest.xml`）：在 `<activity>` 内加 `<intent-filter>`，声明 `<data android:scheme="myapp" android:host="callback" />`。
- **iOS**（`ios/Runner/Info.plist`）：添加 `CFBundleURLTypes` → `CFBundleURLSchemes` 包含 `myapp`。

初始化时把回调地址传进去：`redirectTo: 'myapp://callback'`、`emailRedirectTo: 'myapp://callback'`。

---

## 3. Auth 认证全解

### 3.1 核心概念

| 类型 | 说明 |
| :-- | :-- |
| `Session` | 一次登录会话：`accessToken`、`refreshToken`、`expiresIn`、`expiresAt`、`user` |
| `User` | 用户：`id`(UUID)、`email`、`phone`、`appMetadata`、`userMetadata`、`createdAt`、`updatedAt` |
| `AuthState` | 状态变更事件：`event`（AuthChangeEvent）+ `session` |
| `AuthChangeEvent` | `initialSession` / `signedIn` / `signedOut` / `tokenRefreshed` / `userUpdated` / `passwordRecovery` / `userDeleted` / `mfaChallengeVerified` |
| `AuthResponse` | `signUp` / `signIn*` 的返回，含 `session` 与 `user` |

> v2 默认 **PKCE** 授权流，无需再配置 `webview_flutter`；OAuth 走系统原生浏览器/ASWebAuthenticationSession。

### 3.2 邮箱密码注册 `signUp`

```dart
try {
  final AuthResponse res = await supabase.auth.signUp(
    email: 'user@example.com',
    password: 'a-strong-password',
    // 可选：写入 user_metadata，供 RLS / 业务使用
    data: {'username': 'alice', 'age': 28},
  );
  final Session? session = res.session;
  final User? user = res.user;

  if (session == null) {
    // 开启了「注册需邮件确认」时会返回 null，需等用户点确认链接
    print('请到邮箱完成验证');
  } else {
    print('注册并直接登录成功：${user?.email}');
  }
} on AuthException catch (e) {
  // e.message 是给用户看的可读错误信息
  print('注册失败：${e.message}');
}
```

### 3.3 邮箱密码登录 `signInWithPassword`

```dart
final AuthResponse res = await supabase.auth.signInWithPassword(
  email: 'user@example.com',
  password: 'a-strong-password',
);
print('已登录，accessToken=${res.session?.accessToken}');
```

### 3.4 第三方 OAuth 登录 `signInWithOAuth`

```dart
// 枚举已从 Provider 改名为 OAuthProvider（避免与 provider 包冲突）
await supabase.auth.signInWithOAuth(
  OAuthProvider.google,
  redirectTo: 'myapp://callback',          // 移动端深链
  // authScreenLaunchMode: LaunchMode.inAppWebView, // 可选
);

// 其它常见 provider
// OAuthProvider.apple / .github / .gitlab / .azure /
// .bitbucket / .discord / .facebook / .slack / .spotify / .twitch / .twitter
```

> v2 移除了 `context` 参数，iOS 走原生登录、不再依赖 webview，调用更简洁。

### 3.5 魔法链接 / 邮件 OTP `signInWithOtp`

```dart
// 不记名「魔法链接」：点链接即登录（无需密码）
await supabase.auth.signInWithOtp(
  email: 'user@example.com',
  emailRedirectTo: 'myapp://callback',
);

// 或「邮箱验证码」：用户收到 6 位码后手动 verifyOTP
await supabase.auth.signInWithOtp(email: 'user@example.com');

// 用收到的 token 校验
final AuthResponse res = await supabase.auth.verifyOTP(
  email: 'user@example.com',
  token: '123456',
  type: OtpType.email,
);
```

### 3.6 手机号 OTP

```dart
await supabase.auth.signInWithOtp(phone: '+8613800000000');

final AuthResponse res = await supabase.auth.verifyOTP(
  phone: '+8613800000000',
  token: '123456',
  type: OtpType.sms,
);
```

### 3.7 登出 `signOut`

```dart
// 仅清除本机会话（默认）
await supabase.auth.signOut();

// 同时让该 refresh_token 在其它设备也失效（global）
await supabase.auth.signOut(scope: SignOutScope.global);

// 让该用户在全部设备登出（others）
await supabase.auth.signOut(scope: SignOutScope.others);
```

### 3.8 读取当前会话与用户

```dart
// 同步 getter（可能来自内存缓存）
final Session? session = supabase.auth.currentSession;
final User? user = supabase.auth.currentUser;
print('当前用户 id=${user?.id}, email=${user?.email}');
print('token 是否过期：${session?.isExpired}');

// 异步拉取最新（会校验/刷新）
final Session? fresh = await supabase.auth.getSession();
final UserResponse ur = await supabase.auth.getUser();
print('服务端最新用户：${ur.user?.email}');
```

### 3.9 监听认证状态 `onAuthStateChange`

```dart
final Stream<AuthState> authStream = supabase.auth.onAuthStateChange;
final StreamSubscription<AuthState> sub = authStream.listen((AuthState data) {
  final AuthChangeEvent event = data.event;
  final Session? session = data.session;
  switch (event) {
    case AuthChangeEvent.signedIn:
      print('登录：${session?.user.email}');
      break;
    case AuthChangeEvent.signedOut:
      print('登出');
      break;
    case AuthChangeEvent.tokenRefreshed:
      print('令牌已刷新');
      break;
    case AuthChangeEvent.passwordRecovery:
      print('进入密码重置流程');
      break;
    default:
      break;
  }
});

// 不需要时取消
await sub.cancel();
```

### 3.10 重置密码 `resetPasswordForEmail`

```dart
await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  redirectTo: 'myapp://reset-callback',
);
// 用户点邮件链接后回到 App，再用 updateUser 设置新密码
```

### 3.11 更新用户资料 `updateUser`

```dart
// 改密码（需近期登录）
await supabase.auth.updateUser(
  UserAttributes(password: 'new-strong-password'),
);

// 改邮箱 / 补充 metadata
await supabase.auth.updateUser(
  UserAttributes(
    email: 'new@example.com',
    data: {'username': 'bob'},
  ),
);
```

### 3.12 原生 ID Token 登录（Apple / Google）`signInWithIdToken`

```dart
// 先用各平台原生 SDK 拿到 idToken（及 Apple 的 nonce），再交给 Supabase
final AuthResponse res = await supabase.auth.signInWithIdToken(
  provider: OAuthProvider.apple,
  idToken: appleIdToken,
  nonce: rawNonce, // Apple 登录必须
);
```

> 可用 `supabase.auth.generateRawNonce()` 生成安全的 nonce。

### 3.13 Auth 接口速查表

| 方法 | 说明 | 关键参数 |
| :-- | :-- | :-- |
| `signUp({email, password, phone, data})` | 注册 | 返回 `AuthResponse`；开启邮件确认时 `session` 为 null |
| `signInWithPassword({email, password})` | 邮箱密码登录 | — |
| `signInWithOtp({email, phone, emailRedirectTo})` | 魔法链接 / OTP | 配 `verifyOTP` 使用 |
| `verifyOTP({email/phone, token, type})` | 校验验证码 | `OtpType.email/sms/phone` |
| `signInWithOAuth(OAuthProvider, {redirectTo, authScreenLaunchMode})` | 第三方登录 | `OAuthProvider.*` |
| `signInWithIdToken({provider, idToken, nonce, accessToken})` | 原生 ID Token 登录 | Apple 必传 `nonce` |
| `signOut({scope})` | 登出 | `SignOutScope.local/global/others` |
| `resetPasswordForEmail(email, {redirectTo})` | 发重置邮件 | — |
| `updateUser(UserAttributes)` | 改密码/邮箱/资料 | — |
| `resend({type, email/phone})` | 重发确认/OTP | `OtpType.signup/email/sms` |
| `getSession()` / `getUser()` | 拉取最新会话/用户 | 异步、会刷新 |
| `currentSession` / `currentUser` | 同步读取缓存 | getter |
| `onAuthStateChange` | 状态变更流 | `Stream<AuthState>` |
| `generateRawNonce()` | 生成 nonce | 用于 Apple 登录 |

---

## 4. 数据库（PostgREST）

所有数据库操作都从 `supabase.from('table')` 开始，返回一个**查询构造器**，方法链最终返回一个 `Future`。

### 4.1 查询列与关系嵌套 `select`

```dart
// 取全部列
final List<Map<String, dynamic>> rows = await supabase
    .from('todos')
    .select();

// 只取部分列
await supabase.from('todos').select('id, title, is_done');

// 嵌套关系（!, 表示外键关联）：取 todo 及其所属作者的名字
await supabase.from('todos').select('id, title, author:profiles(name)');

// 一对多：取分类及其下所有文章
await supabase.from('categories').select('name, articles(title)');

// 计数：返回 [{count: 42}]
final List<Map<String, dynamic>> c = await supabase
    .from('todos')
    .select('*', const CountOption.count);
```

### 4.2 过滤器全表

```dart
supabase.from('todos').select().eq('is_done', false);        // 等于
supabase.from('todos').select().neq('status', 'archived');    // 不等于
supabase.from('todos').select().gt('priority', 3);           // 大于
supabase.from('todos').select().gte('age', 18);              // 大于等于
supabase.from('todos').select().lt('price', 100);            // 小于
supabase.from('todos').select().lte('price', 100);           // 小于等于
supabase.from('todos').select().like('title', '%urgent%');    // 区分大小写模糊
supabase.from('todos').select().ilike('title', '%urgent%');   // 不区分大小写
supabase.from('todos').select().inFilter('status', ['open', 'pending']); // IN
supabase.from('todos').select().isFilter('deleted_at', null); // IS (null/true/false)
supabase.from('todos').select().contains('tags', ['work']);   // JSON/数组包含
supabase.from('todos').select().textSearch('body', "'cat' & 'food'"); // 全文检索
supabase.from('todos').select().filter('votes', 'gte', 10);   // 任意运算符
supabase.from('todos').select().or('status.eq.open, priority.gt.3'); // OR
supabase.from('todos').select().and('status.eq.open, is_done.eq.false'); // AND
supabase.from('todos').select().not('status', 'eq', 'archived'); // NOT
```

> 过滤器是**链式可叠加**的（多个 `eq` 之间默认 AND）。`inFilter` / `isFilter` 是 2.x 推荐写法（旧 `in_` / `is_` 仍可用）。

### 4.3 插入 `insert`

```dart
final Map<String, dynamic> inserted = await supabase
    .from('todos')
    .insert({'title': '买牛奶', 'is_done': false})
    .select()          // 让 insert 返回刚插入的行
    .single();         // 只取一行（否则是 List）
print('新行 id=${inserted['id']}');

// 一次插入多行
await supabase.from('todos').insert([
  {'title': 'A'},
  {'title': 'B'},
]);
```

### 4.4 更新 `update`

```dart
await supabase
    .from('todos')
    .update({'is_done': true})
    .eq('id', 42);     // 务必加过滤，否则全表更新！

// 返回更新后的行
final List<Map<String, dynamic>> updated = await supabase
    .from('todos')
    .update({'title': '改标题'})
    .eq('id', 42)
    .select();
```

### 4.5 删除 `delete`

```dart
await supabase.from('todos').delete().eq('id', 42);
```

### 4.6  upsert（存在则更新，否则插入）

```dart
// onConflict 指定冲突判定的列（通常是主键/唯一约束）
await supabase.from('todos').upsert(
  {'id': 42, 'title': '覆盖或新建'},
  onConflict: 'id',
);
```

### 4.7 排序、分页、限制

```dart
await supabase
    .from('todos')
    .select()
    .order('created_at', ascending: false)   // 默认 asc = true
    .limit(20)                               // 取前 20
    .range(0, 19);                           // 等价区间（含两端），用于分页
```

### 4.8 `single` / `maybeSingle` / `count`

```dart
// single：期望恰好 1 行，返回 Map；0 行或多行会抛错
final Map<String, dynamic> one =
    await supabase.from('todos').select().eq('id', 42).single();

// maybeSingle：0 行返回 null，不抛错（适合「查是否存在」）
final Map<String, dynamic>? maybe =
    await supabase.from('todos').select().eq('id', 999).maybeSingle();

// count：拿到满足条件的总数
final List<Map<String, dynamic>> withCount = await supabase
    .from('todos')
    .select('*', const CountOption.count);
final int total = withCount[0]['count'] as int;
```

### 4.9 调用数据库函数 `rpc`

```dart
// 假设数据库里有函数 add_one(x int) returns int
final int result = await supabase
    .rpc('add_one', params: {'x': 41})
    .single();
print(result); // 42
```

### 4.10 实时数据流 `stream`

```dart
// 把某张表（按主键）变成持续推送的 Stream<List<Map>>
final Stream<List<Map<String, dynamic>>> todoStream = supabase
    .from('todos')
    .stream(primaryKey: ['id'])
    .eq('user_id', supabase.auth.currentUser!.id)
    .order('created_at');

final StreamSubscription<List<Map<String, dynamic>>> sub =
    todoStream.listen((List<Map<String, dynamic>> rows) {
  print('当前列表：${rows.length} 条');
});
await sub.cancel();
```

> `stream` 底层也是 Realtime 的 Postgres Changes，但封装成了 Dart `Stream`，比手动订阅频道更省心。

### 4.11 数据库接口速查表

| 构造 / 方法 | 说明 |
| :-- | :-- |
| `from('table')` | 进入某张表，返回 `SupabaseQueryBuilder` |
| `select(columns)` | 查询；可选 `CountOption.count` 返回总数 |
| `insert(data)` / `upsert(data, {onConflict})` | 插入 / 插入或更新 |
| `update(data)` / `delete()` | 更新 / 删除（**务必跟过滤器**） |
| `eq/neq/gt/gte/lt/lte` | 比较过滤 |
| `like/ilike` | 模糊匹配（区分 / 不区分大小写） |
| `inFilter/isFilter/contains/textSearch/filter` | IN / IS / 数组包含 / 全文 / 任意运算符 |
| `or/and/not` | 逻辑组合 |
| `order(col, ascending:)` / `limit` / `range(a,b)` | 排序 / 限制 / 分页 |
| `single()` / `maybeSingle()` | 单行（或多行报错 / 返回 null） |
| `rpc(name, params:)` | 调用数据库函数 |
| `stream(primaryKey:)` | 实时数据流 |

---

## 5. Storage 文件存储

### 5.1 指定 Bucket 与上传

```dart
// 移动端：传 File
final String path = await supabase.storage
    .from('avatars')
    .upload(
      'public/${supabase.auth.currentUser!.id}.png',
      File('path/to/local.png'),
      fileOptions: const FileOptions(
        cacheControl: '3600',
        upsert: true, // 同名覆盖
      ),
    );

// Flutter Web：传字节
final String path2 = await supabase.storage
    .from('avatars')
    .uploadBinary('public/a.png', bytes);
```

### 5.2 下载与 URL

```dart
// 下载为字节
final Uint8List? bytes =
    await supabase.storage.from('avatars').download('public/a.png');

// 公开 URL（仅当 bucket 设为 public）
final String publicUrl =
    supabase.storage.from('avatars').getPublicUrl('public/a.png');

// 私有文件：生成带过期的签名 URL
final String signedUrl = await supabase.storage
    .from('avatars')
    .createSignedUrl('public/a.png', 60); // 60 秒有效
```

### 5.3 列表、移动、删除

```dart
// 列出某前缀下的文件
final List<FileObject> files =
    await supabase.storage.from('avatars').list(path: 'public');

// 删除（可一次多路径）
await supabase.storage.from('avatars').remove(['public/a.png', 'public/b.png']);

// 移动 / 复制
await supabase.storage.from('avatars').move('public/a.png', 'old/a.png');
await supabase.storage.from('avatars').copy('public/a.png', 'backup/a.png');
```

### 5.4 管理 Bucket

```dart
// 仅限有 service_role 权限（通常放 Edge Function，别在客户端做）
await supabase.storage.createBucket('avatars');
await supabase.storage.emptyBucket('avatars');
await supabase.storage.deleteBucket('avatars');
```

### 5.5 存储接口速查表

| 方法 | 说明 |
| :-- | :-- |
| `storage.from('bucket')` | 进入某 bucket |
| `upload(path, File, {fileOptions})` | 上传文件（移动端） |
| `uploadBinary(path, bytes, {fileOptions})` | 上传字节（Web） |
| `download(path)` | 下载为字节 |
| `getPublicUrl(path)` | 公开 URL（public bucket） |
| `createSignedUrl(path, expiresIn)` | 带时效的签名 URL |
| `list(path)` | 列出文件，返回 `List<FileObject>` |
| `remove(paths)` / `move` / `copy` | 删除 / 移动 / 复制 |
| `createBucket/emptyBucket/deleteBucket` | Bucket 管理（服务端） |

---

## 6. Edge Functions 边缘函数

Edge Functions 是跑在 Deno 上的服务端代码，客户端用 `functions.invoke` 调用，**适合放密钥、复杂业务逻辑、第三方 API 代理**。

```dart
// 调用名为 'get_countries' 的函数
final FunctionResponse res = await supabase.functions.invoke(
  'get_countries',
  // 请求体（会被序列化为 JSON）
  body: {'page': 1},
  // 附加请求头
  headers: {'x-custom': 'abc'},
  // query 参数
  queryParameters: {'lang': 'zh'},
);

print('status: ${res.status}');  // HTTP 状态码
print('data: ${res.data}');      // 解析后的响应体（dynamic）
```

> 返回 `FunctionResponse`，`.data` 是已解析对象、`.status` 是 HTTP 状态码。函数里 `throw` 的错误会以非 2xx 透传回来。

---

## 7. Realtime 实时通信

实时能力基于 WebSocket。先 `channel` 创建/复用频道，注册监听，再 `subscribe`。

### 7.1 监听数据库变更 `onPostgresChanges`

```dart
final RealtimeChannel channel = supabase.channel('public:todos');

channel.onPostgresChanges(
  event: PostgresChangeEvent.all,  // insert / update / delete / all
  schema: 'public',
  table: 'todos',
  // 可选：只监听属于当前用户的行
  filter: 'user_id=eq.${supabase.auth.currentUser!.id}',
  callback: (RealtimePostgresChangesPayload payload) {
    // payload.eventType: 'INSERT' / 'UPDATE' / 'DELETE'
    // payload.newRecord / payload.oldRecord
    print('变更类型：${payload.eventType}，新行：${payload.newRecord}');
  },
);

// 订阅（回调里可拿到订阅状态）
channel.subscribe((RealtimeSubscribeStatus status, [Object? err]) {
  if (status == RealtimeSubscribeStatus.subscribed) {
    print('已订阅');
  }
});

// 用完后清理
await supabase.removeChannel(channel);
// 或一次性清掉所有：await supabase.removeAllChannels();
```

### 7.2 广播 Broadcast（低延迟消息）

```dart
final RealtimeChannel channel = supabase.channel('room-1');

channel.onBroadcastEvent(
  event: 'draw',
  callback: (Map<String, dynamic> payload) {
    print('收到绘图点：$payload');
  },
).subscribe((RealtimeSubscribeStatus status, [Object? err]) async {
  if (status == RealtimeSubscribeStatus.subscribed) {
    // 订阅成功后才发广播
    await channel.sendBroadcastMessage(
      event: 'draw',
      payload: {'x': 10, 'y': 20},
    );
  }
});
```

### 7.3 在线状态 Presence

```dart
final RealtimeChannel channel = supabase.channel('room-1');

channel.onPresenceEvent(
  event: PresenceEvent.sync,
  callback: (RealtimePresencePayload payload) {
    // 当前房间所有在线用户
    final List<Map<String, dynamic>> here =
        channel.presenceState();
    print('在线人数：${here.length}');
  },
).subscribe((RealtimeSubscribeStatus status, [Object? err]) async {
  if (status == RealtimeSubscribeStatus.subscribed) {
    // 声明自己在线（可带任意元数据）
    await channel.track({'user_id': supabase.auth.currentUser!.id});
  }
});

// 离开：await channel.untrack();
```

---

## 8. Row Level Security 简述

RLS 是 Supabase 安全的核心：**没有策略 = 默认拒绝一切**，必须显式写策略才能读写。常见策略模式（在 Supabase Dashboard → Table Editor → Policies，或 SQL 里写）：

```sql
-- 例：todos 表，只允许操作「属于自己的行」
create policy "自己可读自己" on todos
  for select using (auth.uid() = user_id);

create policy "自己可写自己" on todos
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

> `auth.uid()` 是 PostgREST 注入的当前用户 ID。客户端代码里**不需要、也不能**传这个 ID 来「证明身份」——它由会话令牌自动解析。写错策略会直接表现为「客户端查询返回空 / 插入失败」。

---

## 9. 综合实战

### 9.1 一个最小可运行的待办 App 骨架

```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final supabase = Supabase.instance.client;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: 'https://YOUR-PROJECT.supabase.co',
    publishableKey: 'YOUR-PUBLISHABLE-ANON-KEY',
  );
  runApp(const TodoApp());
}

class TodoApp extends StatelessWidget {
  const TodoApp({super.key});
  @override
  Widget build(BuildContext context) {
    // 根据登录态切换页面
    final Session? session = supabase.auth.currentSession;
    return MaterialApp(
      home: session != null ? const TodoPage() : const LoginPage(),
    );
  }
}

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});
  @override
  Widget build(BuildContext context) {
    final email = TextEditingController();
    final password = TextEditingController();
    return Scaffold(
      appBar: AppBar(title: const Text('登录')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(controller: email, decoration: const InputDecoration(labelText: '邮箱')),
            TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: '密码')),
            ElevatedButton(
              onPressed: () async {
                try {
                  await supabase.auth.signInWithPassword(
                    email: email.text, password: password.text);
                  // onAuthStateChange 已驱动 rebuild；也可手动跳
                } on AuthException catch (e) {
                  ScaffoldMessenger.of(context)
                      .showSnackBar(SnackBar(content: Text(e.message)));
                }
              },
              child: const Text('登录'),
            ),
          ],
        ),
      ),
    );
  }
}

class TodoPage extends StatefulWidget {
  const TodoPage({super.key});
  @override
  State<TodoPage> createState() => _TodoPageState();
}

class _TodoPageState extends State<TodoPage> {
  List<Map<String, dynamic>> _todos = [];

  @override
  void initState() {
    super.initState();
    _load();
    // 实时监听变化（也可改用 from(...).stream）
    supabase
        .channel('public:todos')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'todos',
          filter: 'user_id=eq.${supabase.auth.currentUser!.id}',
          callback: (_) => _load(),
        )
        .subscribe();
  }

  Future<void> _load() async {
    final rows = await supabase
        .from('todos')
        .select()
        .eq('user_id', supabase.auth.currentUser!.id)
        .order('created_at');
    setState(() => _todos = rows);
  }

  Future<void> _add(String title) async {
    await supabase.from('todos').insert({
      'user_id': supabase.auth.currentUser!.id,
      'title': title,
      'is_done': false,
    });
    _load(); // 或由实时监听自动刷新
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('待办'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => supabase.auth.signOut(),
          ),
        ],
      ),
      body: ListView.builder(
        itemCount: _todos.length,
        itemBuilder: (ctx, i) => CheckboxListTile(
          title: Text(_todos[i]['title'] as String),
          value: _todos[i]['is_done'] as bool,
          onChanged: (v) => supabase
              .from('todos')
              .update({'is_done': v})
              .eq('id', _todos[i]['id']),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _add('新待办 ${_todos.length + 1}'),
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

### 9.2 根 widget 里监听登录态切换

```dart
class AppRoot extends StatelessWidget {
  const AppRoot({super.key});
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: supabase.auth.onAuthStateChange,
      builder: (context, snapshot) {
        final session = snapshot.data?.session;
        if (snapshot.hasData && session != null) {
          return const TodoPage();
        }
        return const LoginPage();
      },
    );
  }
}
```

---

## 10. 错误处理与调试

```dart
// Auth 与多数 Supabase 错误都抛 AuthException / PostgrestException / StorageException
try {
  await supabase.from('todos').insert({'title': 'x'});
} on PostgrestException catch (e) {
  print('数据库错误：code=${e.code}, message=${e.message}, details=${e.details}');
} on AuthException catch (e) {
  print('认证错误：${e.message}');
} catch (e) {
  print('其它错误：$e');
}
```

> 开启日志（调试期有用）：`Supabase.initialize(..., debug: true)`（不同小版本参数名可能为 `debug` 或自行配置 logger）。遇到「查不到数据」，第一步永远去 Dashboard 看该表的 **RLS 策略**是否放行。

---

## 11. 最佳实践与常见坑

1. **永远在客户端只用 `publishableKey`（anon key）**：service_role key 拥有绕过 RLS 的超级权限，**绝不能**进客户端（含前端代码、GitHub 公开仓库）。
2. **`update` / `delete` 必须带过滤器**：漏掉 `eq`/过滤会把整张表更新/删空。改动前先用 `select` 验证影响范围。
3. **数据查不到先查 RLS**：客户端写法正确却返回空，99% 是策略没放行，而不是代码错。
4. **`signUp` 后 `session` 可能为 null**：开启了「注册需邮件确认」时本就是 null，要引导用户去验证，而不是当成失败。
5. **实时频道要清理**：`onPostgresChanges` 用完调用 `removeChannel` / `removeAllChannels`，否则连接泄漏。
6. **`stream` 的 `primaryKey` 必须正确**：它决定如何 diff 新旧行，填错会导致 UI 不更新或错乱。
7. **OAuth / 魔法链接必须配深链**：移动端漏配 `myapp://callback` 的 Scheme，登录后回不来。
8. **`single()` vs `maybeSingle()`**：确定有且仅有一行用 `single`（否则抛错）；可能为空用 `maybeSingle` 拿到 null 更安全。
9. **签名 URL 有有效期**：`createSignedUrl` 的秒数按需给，别硬编码过长或过短。
10. **密钥等敏感逻辑放 Edge Function**：涉及第三方 API key、复杂校验的，用 `functions.invoke` 走服务端，别在客户端裸奔。
11. **初始化仅一次**：`Supabase.initialize` 应在 `main` 顶层的 `runApp` 前调用一次，不要重复初始化。
12. **`onAuthStateChange` 驱动路由**：用 `StreamBuilder` 监听它来切换登录/主页，比手动 `Navigator.push` 更稳。

---

## 12. 参考文档

- 官方文档（Dart 参考）：<https://supabase.com/docs/reference/dart/introduction>
- `supabase_flutter` 包：<https://pub.dev/packages/supabase_flutter>（最新 2.18.3）
- `supabase`（Dart 核心）包：<https://pub.dev/packages/supabase>（最新 2.16.5）
- Auth 指南：<https://supabase.com/docs/guides/auth>
- 数据库（PostgREST）指南：<https://supabase.com/docs/guides/database>
- Storage 指南：<https://supabase.com/docs/guides/storage>
- Realtime 指南：<https://supabase.com/docs/guides/realtime>
- Edge Functions 指南：<https://supabase.com/docs/guides/functions>
- RLS 行级安全：<https://supabase.com/docs/guides/database/postgres/row-level-security>
- 官方 Flutter 快速上手：<https://supabase.com/docs/guides/getting-started/tutorials/with-flutter>
- GitHub：`supabase/supabase-flutter`
