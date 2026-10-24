---
title: Next.js 框架学习文档
create:2026-10-22
update:2026-10-22
category:react
cover:https://img-common.aknot.uk/cover/land-44.jpg
tags:[frontend,next.js,react,ssr,ssg,app-router,fullstack]
summary:Next.js 16（App Router + React 19）从基础到进阶的完整学习文档，覆盖项目结构、路由、布局、Server/Client 组件、数据获取与缓存、Route Handlers、中间件、样式/图片/字体、Metadata、错误处理、流式渲染、Server Actions、缓存体系、认证、环境变量、并行/拦截路由、性能优化与部署，每节均含可直接运行的示例
keywords:[next.js,react,app-router,ssr,ssg,isr,server-component,client-component,rsc,route-handler,middleware,server-actions,cache,fullstack,turbopack]
top:1
copyright:true
---

# Next.js 框架学习文档

> 适用版本：**Next.js 16.3（Active LTS 16.3.8，2026-08 发布）+ React 19.3**；同时兼容 Next.js 15 系列（Maintenance LTS 15.5.27）。16.4 已发布（2026-10），属小幅增量。
> 本文以 **App Router（Next.js 13.4+ 引入、16 默认）** 为主线，React 19 默认启用 Server Components。Pages Router 仅在第 1、29 章做对照。
> 生产环境推荐 **Node.js 20.19+/22.12+**（Next 16 最低要求；`next build` 在 16 默认走 Turbopack）。
> 本文定位「框架全景 + 可直接运行示例」，从**渲染模型 → 路由 → 数据 → 缓存 → 进阶特性 → 部署**逐步递进。

---

## 目录

- [1. Next.js 是什么与渲染模型](#1-nextjs-是什么与渲染模型)
- [2. 环境准备与创建项目](#2-环境准备与创建项目)
- [3. App Router 项目结构与文件约定](#3-app-router-项目结构与文件约定)
- [4. 路由基础：页面与嵌套](#4-路由基础页面与嵌套)
- [5. 动态路由与 Catch-all](#5-动态路由与-catch-all)
- [6. 布局 layout 与模板 template](#6-布局-layout-与模板-template)
- [7. 导航：Link 与 useRouter](#7-导航link-与-userouter)
- [8. Server Component 与数据获取](#8-server-component-与数据获取)
- [9. 静态渲染与动态渲染](#9-静态渲染与动态渲染)
- [10. Client Component 与 'use client'](#10-client-component-与-use-client)
- [11. 服务端/客户端组件边界](#11-服务端客户端组件边界)
- [12. 数据共享与请求去重](#12-数据共享与请求去重)
- [13. Route Handlers（API 路由）](#13-route-handlersapi-路由)
- [14. 中间件 Middleware](#14-中间件-middleware)
- [15. 样式方案](#15-样式方案)
- [16. 图片优化 next/image](#16-图片优化-nextimage)
- [17. 字体优化 next/font](#17-字体优化-nextfont)
- [18. Metadata 元数据](#18-metadata-元数据)
- [19. 错误处理 error/not-found](#19-错误处理-errornot-found)
- [20. 加载与流式渲染](#20-加载与流式渲染)
- [21. Server Actions 与服务端变更](#21-server-actions-与服务端变更)
- [22. 缓存体系（四层缓存）](#22-缓存体系四层缓存)
- [23. 认证与路由保护](#23-认证与路由保护)
- [24. 环境变量配置](#24-环境变量配置)
- [25. 并行路由与拦截路由](#25-并行路由与拦截路由)
- [26. 性能优化](#26-性能优化)
- [27. 部署（Vercel / 自托管 / Docker）](#27-部署vercel--自托管--docker)
- [28. 测试与代码质量](#28-测试与代码质量)
- [29. Pages Router 对照速查](#29-pages-router-对照速查)
- [30. 常见坑与最佳实践](#30-常见坑与最佳实践)
- [31. 参考文档](#31-参考文档)

---

## 1. Next.js 是什么与渲染模型

Next.js 是基于 React 的全栈框架，由 Vercel 维护，提供**约定式路由、混合渲染、内置优化**三大能力，让 React 从纯客户端框架升级为可服务端渲染的全栈方案。

**四种渲染策略：**

| 策略 | 渲染时机 | 适用 | 关键字 |
|---|---|---|---|
| **SSR**（服务端渲染） | 每次请求在服务器生成 HTML | 个性化/实时数据 | `force-dynamic` |
| **SSG**（静态生成） | 构建时预渲染为静态 HTML | 不常变的内容页 | 默认（静态） |
| **ISR**（增量静态再生） | 静态 + 按过期时间后台更新 | 内容站/博客 | `revalidate` |
| **CSR**（客户端渲染） | 浏览器拉取 JS 后渲染 | 强交互面板 | `'use client'` |

> **App Router vs Pages Router**：App Router 基于 React Server Components（RSC），默认组件为「服务端组件」，能用 `async/await` 直接在组件里取数；Pages Router 所有组件都是客户端组件，数据靠 `getServerSideProps` 等函数注入。新项目一律用 App Router。

---

## 2. 环境准备与创建项目

```bash
# 需要 Node.js 20.19+ 或 22.12+（Next.js 16 最低要求）
node -v

# 官方脚手架（推荐 TypeScript + App Router + Tailwind）
pnpm create next-app@latest my-app
# 交互项：TypeScript ✅ / ESLint ✅ / Tailwind CSS ✅
#         App Router ✅ / src/ 目录 ✅ / Turbopack ✅（Next16 默认）

cd my-app && pnpm dev      # 开发服务器 http://localhost:3000
pnpm build && pnpm start   # 生产构建 + 启动
```

脚手架生成的 `package.json` 关键依赖：

```json
{
  "dependencies": {
    "next": "16.3.0",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

> Next.js 16 中 **Turbopack 已是默认打包器**（开发与构建），`next dev --turbopack` 已隐含；如需回退 webpack，可在 `next.config` 显式关闭（不推荐）。

---

## 3. App Router 项目结构与文件约定

```
my-app/
├─ app/                      # 路由根目录（约定优于配置）
│  ├─ layout.tsx             # 根布局（必选，包裹所有页面）
│  ├─ page.tsx               # 对应 / 路由
│  ├─ template.tsx           # 每次导航重新挂载的布局（可选）
│  ├─ loading.tsx            # 路由级 Suspense 兜底（可选）
│  ├─ error.tsx              # 路由级错误边界（可选）
│  ├─ global-error.tsx       # 包裹根布局的错误边界（可选）
│  ├─ not-found.tsx          # 404 页面（可选）
│  ├─ route.ts               # Route Handler（API）
│  └─ blog/
│     ├─ page.tsx            # /blog
│     └─ [slug]/page.tsx     # /blog/:slug
├─ public/                   # 静态资源（图片等，直接 /xxx 访问）
├─ next.config.ts            # 配置
├─ tsconfig.json
└─ .env.local                # 环境变量
```

**文件约定（特殊文件名由框架识别）：**

| 文件名 | 作用 | 层级 |
|---|---|---|
| `layout` | 共享 UI + 嵌套 | 目录级 |
| `page` | 路由可见页面 | 目录级 |
| `route` | API 端点（非 UI） | 目录级 |
| `loading` / `error` / `not-found` / `template` | 特殊 UI | 目录级 |
| `middleware` | 请求拦截（置于 `src/` 或根） | 全局 |
| `default` | 并行路由兜底 | 目录级 |

---

## 4. 路由基础：页面与嵌套

App Router 中**文件夹即路由段**，每个目录放一个 `page.tsx` 即成为可访问路由。

```tsx
// app/page.tsx  —— 访问 /
export default function Home() {
  return <h1>首页</h1>;
}
```

```tsx
// app/dashboard/settings/page.tsx —— 访问 /dashboard/settings
export default function Settings() {
  return <h2>设置页</h2>;
}
```

> 没有 `page.tsx` 的目录**不会**生成路由（仅作布局/组织用途），这是与 Pages Router（`pages/` 下每个文件即路由）的重要区别。

---

## 5. 动态路由与 Catch-all

动态段用 `[param]` 文件夹，`page` 接收的 `params` 在 Next 15+ 中是 **Promise**（需 `await`）。

```tsx
// app/blog/[slug]/page.tsx —— 访问 /blog/hello
// Next 15+：params 是 Promise
export default async function Post({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <h1>文章：{slug}</h1>;
}
```

```tsx
// 捕获全部剩余段：app/docs/[...slug]/page.tsx
//  /docs/a        -> slug = ['a']
//  /docs/a/b/c    -> slug = ['a','b','c']
export default async function Docs({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <p>路径：{slug.join(' / ')}</p>;
}
```

```tsx
// 可选 catch-all：app/shop/[[...slug]]/page.tsx
// 同时匹配 /shop 与 /shop/x/y
```

> ⚠️ **Next 15+ 破坏性变更**：`params`、`searchParams`、`cookies()`、`headers()`、`draftMode()` 全部改为 **async（返回 Promise）**。旧版同步写法（`const { id } = params`）在 15/16 会报错，必须 `await`。

---

## 6. 布局 layout 与模板 template

`layout.tsx` 在路由切换间**保持状态、不重新渲染**，适合放导航栏/侧边栏。

```tsx
// app/layout.tsx —— 根布局（必须有 <html> 与 <body>）
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <nav>全局导航</nav>
        {children}
      </body>
    </html>
  );
}
```

```tsx
// app/dashboard/layout.tsx —— 嵌套布局，自动包裹同目录页面
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      <aside>侧边栏</aside>
      <main>{children}</main>
    </section>
  );
}
```

`template.tsx` 与 layout 类似，但**每次导航都会重新创建 DOM 与状态**（适合动画/重置状态）：

```tsx
// app/template.tsx
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="fade-in">{children}</div>;
}
```

---

## 7. 导航：Link 与 useRouter

优先用 `next/link`（支持预取与客户端软导航，不刷新整页）：

```tsx
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Nav() {
  const router = useRouter();

  return (
    <div>
      {/* 静态链接，自动预取 */}
      <Link href="/blog">博客</Link>

      {/* 动态链接 */}
      <Link href={{ pathname: '/blog/[slug]', params: { slug: 'hello' } }}>
        查看文章
      </Link>

      {/* 编程式导航（须在客户端组件） */}
      <button onClick={() => router.push('/dashboard')}>进入后台</button>

      {/* 替换历史（不可后退） */}
      <button onClick={() => router.replace('/login')}>登录</button>
    </div>
  );
}
```

> `next/link` 默认**视口内自动预取**（`prefetch`）；Next 16.3 起引入 **Partial Prefetching**：每个路由仅预取一个可复用的「外壳」并缓存，多个相同动态链接（如 20 个 `/chat/[id]`）从 20 次请求降为 1 次。

---

## 8. Server Component 与数据获取

App Router 中 **`page.tsx` 默认是 Server Component**，可直接 `async` + `fetch`，在服务端取数并渲染，**不向浏览器发送取数代码**，天然 SSR/SSG。

```tsx
// app/posts/page.tsx —— 服务端组件，构建时/请求时取数
async function getPosts() {
  const res = await fetch('https://api.example.com/posts');
  if (!res.ok) throw new Error('请求失败');
  return res.json();
}

export default async function PostsPage() {
  const posts = await getPosts(); // 直接在组件里 await
  return (
    <ul>
      {posts.map((p: { id: number; title: string }) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}
```

> Server Component 优势：数据离数据库/API 近、包体小（取数逻辑不上客户端）、默认安全（密钥只在服务端）。它**不能使用** `useState`/`useEffect`/浏览器 API —— 需要这些时改用 Client Component（第 10 章）。

---

## 9. 静态渲染与动态渲染

通过片段级指令控制单个路由的渲染方式：

```tsx
// app/page.tsx —— 强制静态（默认即静态，显式声明更清晰）
export const dynamic = 'force-static';
export default function Page() { /* ... */ }
```

```tsx
// app/dashboard/page.tsx —— 强制每次请求都动态渲染（SSR）
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const data = await fetch('https://api.example.com/me', { cache: 'no-store' });
  return <div>...</div>;
}
```

```tsx
// 动态路由的参数生成：构建时预渲染哪些 slug（SSG + ISR）
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p: { slug: string }) => ({ slug: p.slug }));
}

// ISR：构建后按 60s 过期后台再生
export const revalidate = 60;
```

```tsx
// 控制未预生成的动态参数是否按需渲染（默认 true）
export const dynamicParams = true;
```

> **核心思维**：不在页面里读取请求相关变量（cookie/header/搜索参数）的路由会被自动静态化；一旦用了 `cookies()`/`headers()` 或 `cache:'no-store'`，该路由自动转为动态。

---

## 10. Client Component 与 'use client'

当组件需要**交互、状态、浏览器 API** 时，在文件顶部加 `'use client'` 指令，将其标记为客户端组件。

```tsx
'use client';
import { useState, useEffect } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `计数：${count}`;
  }, [count]);

  return <button onClick={() => setCount(count + 1)}>点击 {count}</button>;
}
```

> `'use client'` 必须放在文件**最顶部**（注释之后第一行）。它不是「把整个应用搬到客户端」，而是声明「这个组件及其子树在客户端运行」。尽量缩小客户端组件范围，把取数/计算留在服务端。

---

## 11. 服务端/客户端组件边界

**规则**：服务端组件可以把数据作为 props 传给客户端组件；但**不能**把函数、非序列化对象（如 `Date` 之外的复杂实例）直接传给客户端组件。

```tsx
// app/page.tsx（服务端）
import { Counter } from './counter'; // 客户端组件

export default async function Page() {
  const initial = await getInitialCount(); // 服务端取数
  return <Counter initial={initial} />;     // ✅ 传可序列化 props
}
```

```tsx
'use client';
// app/counter.tsx（客户端）
export function Counter({ initial }: { initial: number }) {
  const [n, setN] = useState(initial);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
```

> ❌ **常见错误**：把 `async` 函数或事件回调从服务端组件传给客户端组件。客户端组件若需服务端逻辑，应通过 **Server Actions**（第 21 章）或 **Route Handler**（第 13 章）调用，而不是传函数引用。

---

## 12. 数据共享与请求去重

同一渲染树中多次调用相同 `fetch`，Next.js 会**自动去重**（Request Memoization），避免重复请求。

```tsx
// 两个组件都调用 getUser()，服务端只发一次请求
async function getUser() {
  const res = await fetch('https://api.example.com/user', {
    cache: 'no-store',
  });
  return res.json();
}
```

对于非 fetch 的取数（如直接查数据库），用 React 的 `cache()` 手动记忆化：

```tsx
import { cache } from 'react';

export const getUserId = cache(async (token: string) => {
  // 同一 token 在本次请求内只执行一次
  return db.users.findByToken(token);
});
```

> `cache()` 是 React 19 提供的请求级记忆化，作用域为**单次请求**；跨请求不要复用（它会自动失效）。

---

## 13. Route Handlers（API 路由）

`route.ts` 用于构建 HTTP API（替代 Pages Router 的 `pages/api`）。支持 `GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS`。

```tsx
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page') ?? '1';
  const posts = await db.posts.paginate(Number(page));
  return NextResponse.json({ page, posts });
}

export async function POST(req: NextRequest) {
  const body = await req.json(); // 解析 JSON body
  if (!body.title) {
    return NextResponse.json({ error: 'title 必填' }, { status: 400 });
  }
  const created = await db.posts.create(body);
  return NextResponse.json(created, { status: 201 });
}
```

```tsx
// 动态 API 路由：app/api/posts/[id]/route.ts
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Next 15+ 仍需 await
  await db.posts.delete(id);
  return new NextResponse(null, { status: 204 });
}
```

> Route Handler 运行在**服务端**，可安全访问数据库与密钥。它本质是「不带 UI 的 Server Component」，适合对外暴露 Webhook、第三方回调、移动端 API。

---

## 14. 中间件 Middleware

`middleware.ts`（放在项目根或 `src/` 下）在**请求进入路由前**运行，常用于鉴权跳转、重写、注入头。

```tsx
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;

  // 未登录访问受保护路由 → 重定向到登录页
  if (!token && req.nextUrl.pathname.startsWith('/dashboard')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 给请求注入自定义头，传给后续 Route Handler
  const res = NextResponse.next();
  res.headers.set('x-request-id', crypto.randomUUID());
  return res;
}

// 仅匹配部分路由（提升性能）
export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

> ⚠️ **Next 16.3 弃用 Edge Runtime**：`export const runtime = 'edge'` 已不建议，官方建议迁移到 Node Runtime。中间件默认运行在 Node 运行时。

---

## 15. 样式方案

Next.js 内置多套样式方案，无需额外配置：

```tsx
// 1) CSS Modules（局部作用域，推荐）
import styles from './button.module.css';

export default function Button() {
  return <button className={styles.primary}>提交</button>;
}
```

```css
/* button.module.css */
.primary { background: #0070f3; color: #fff; }
```

```tsx
// 2) 全局样式（仅在 app/layout.tsx 引入一次）
import './globals.css';
```

```tsx
// 3) Tailwind（脚手架默认集成）：直接在 className 写原子类
export default function Card() {
  return <div className="rounded-xl border p-4 shadow">卡片</div>;
}
```

```tsx
// 4) styled-jsx（客户端组件内联）
<div style={{}} /> // 或用 <style jsx>{`...`}</style>
```

> 第三方 CSS-in-JS（如 styled-components）在 RSC 时代需额外配置，官方更推荐 **Tailwind / CSS Modules**。

---

## 16. 图片优化 next/image

`next/image` 自动做**尺寸缩放、懒加载、现代格式（AVIF/WebP）、防布局抖动**。

```tsx
import Image from 'next/image';

// 本地图片（需配置宽高或用 fill）
import logo from '@/public/logo.png';

export default function Hero() {
  return (
    <>
      {/* 固定尺寸 */}
      <Image src={logo} alt="Logo" width={200} height={60} priority />

      {/* 响应式填充父容器 */}
      <div style={{ position: 'relative', width: '100%', height: 300 }}>
        <Image
          src="/cover.jpg"
          alt="封面"
          fill
          sizes="(max-width:768px) 100vw, 50vw"
        />
      </div>
    </>
  );
}
```

> `priority` 用于首屏关键图（跳过懒加载）；`sizes` 帮助生成正确分辨率；远程图片需在 `next.config.ts` 的 `images.remotePatterns` 中白名单域名，否则被拒绝。

---

## 17. 字体优化 next/font

`next/font` 在**构建时自托管字体**，消除外部请求并自动 `font-display: swap` 防布局抖动（CLS）。

```tsx
// app/layout.tsx
import { Inter, Noto_Sans_SC } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const sc = Noto_Sans_SC({ subsets: ['latin'], variable: '--font-sc' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${sc.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// 本地字体：next/font/local
import localFont from 'next/font/local';
const myFont = localFont({ src: '../fonts/my-font.woff2' });
```

> 中文站点务必用 `Noto_Sans_SC` 等 CJK 子集字体；Google 字体在国内访问慢，`next/font` 已将其**下载并打包进产物**，不依赖运行时网络。

---

## 18. Metadata 元数据

App Router 用**对象/函数导出**声明 SEO 信息，替代手动写 `<head>`。

```tsx
// 静态 metadata：app/blog/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '博客列表',
  description: '我的技术博客',
  openGraph: { title: '博客', images: ['/og.png'] },
};
```

```tsx
// 动态 metadata：依赖路由参数
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post.title, description: post.excerpt };
}
```

> 还支持 `metadataBase`、`robots`、`alternates`、`viewport` 等导出。Next 会自动注入 `<title>`、`<meta>`、OG 标签，无需手动操作 head。

---

## 19. 错误处理 error/not-found

App Router 用**特殊文件**做错误兜底，每个目录可独立提供。

```tsx
// app/dashboard/error.tsx —— 必须是客户端组件
'use client';
export default function Error({ reset }: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>出错啦</h2>
      <button onClick={() => reset()}>重试</button>
    </div>
  );
}
```

```tsx
// app/not-found.tsx —— 404（调用 notFound() 也会触发）
export default function NotFound() {
  return <h1>页面不存在（404）</h1>;
}
```

```tsx
// 在页面/动作里主动抛出 404
import { notFound } from 'next/navigation';

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound(); // 渲染最近的 not-found.tsx
  return <h1>{post.title}</h1>;
}
```

> `global-error.tsx` 可包裹根布局（连 `<html>` 都能替换），用于兜底致命错误；`error.tsx` 只能包裹其子树。

---

## 20. 加载与流式渲染

`loading.tsx` 基于 React Suspense，在页面数据就绪前展示骨架，**边加载边流式输出**。

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <p>加载中…</p>; // 或骨架屏组件
}
```

```tsx
// 手动 Suspense 细粒度流式：app/page.tsx
import { Suspense } from 'react';
import { SlowList } from './slow-list';

export default function Page() {
  return (
    <div>
      <h1>即时标题</h1>
      <Suspense fallback={<p>列表加载中…</p>}>
        <SlowList /> {/* 慢组件流式到达 */}
      </Suspense>
    </div>
  );
}
```

> 流式渲染（Streaming SSR）让首字节（TTFB）极快：外壳立即返回，慢数据块以 `<script>` 流的方式随后补完，显著提升感知性能。

---

## 21. Server Actions 与服务端变更

Server Actions 是 **App Router 原生的「服务端函数」**，让表单/按钮直接调用服务端逻辑，无需手写 API + fetch。

```tsx
// app/actions.ts —— 标记 'use server'
'use server';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  await db.posts.create({ title });
  revalidatePath('/posts'); // 刷新缓存的列表
}
```

```tsx
// app/posts/new/page.tsx —— 客户端表单直接调用
'use client';
import { useActionState } from 'react'; // React 19 取代 useFormState
import { createPost } from '@/app/actions';

export default function NewPost() {
  const [state, formAction, pending] = useActionState(createPost, null);
  return (
    <form action={formAction}>
      <input name="title" />
      <button disabled={pending}>提交</button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

```tsx
// 也可在客户端组件内联 action（渐进增强：无 JS 也能提交）
<form action={async (formData) => {
  'use server';
  await db.posts.create({ title: formData.get('title') as string });
}}>
```

> 与缓存联动：`revalidatePath(path)` 刷新整页缓存，`revalidateTag('posts')` 按标签刷新（需 fetch 时标 `next: { tags: ['posts'] }`）。Server Actions 默认带 CSRF 防护与渐进增强。

---

## 22. 缓存体系（四层缓存）

Next.js 16 的缓存分四层，理解它是性能调优的关键：

| 层 | 名称 | 作用域 | 控制 |
|---|---|---|---|
| 1 | **Request Memoization** | 单次请求内 `fetch`/`cache()` 去重 | 自动 |
| 2 | **Data Cache** | 跨请求/部署缓存 `fetch` 结果 | `revalidate` / `cache` 选项 |
| 3 | **Full Route Cache** | 整页 HTML 静态化 | `dynamic` / `revalidate` |
| 4 | **Router Cache** | 客户端路由跳转缓存 | `router.refresh()` |

```tsx
// 标 tag 以便精准失效
fetch('https://api.example.com/posts', {
  next: { tags: ['posts'], revalidate: 60 },
});

import { revalidateTag } from 'next/cache';
revalidateTag('posts'); // Server Action 里调用
```

> **Cache Components（`'use cache'`）**：Next 15/16 引入的新一代缓存，用指令标记任意异步函数/组件即可缓存其输出，比 Route/Data Cache 更细粒度。Next 16.4 起 `create-next-app` 新建项目默认开启；旧项目可在 `next.config` 显式开启 `cacheComponents: true`。

---

## 23. 认证与路由保护

典型「Session Cookie + 中间件」方案：

```tsx
// 1) 登录时写 HttpOnly Cookie（Server Action 或 Route Handler）
'use server';
import { cookies } from 'next/headers'; // Next 15+ 返回 Promise

export async function login(formData: FormData) {
  const token = await auth(formData);
  const c = await cookies();
  c.set('token', token, { httpOnly: true, path: '/', sameSite: 'lax' });
}
```

```tsx
// 2) 中间件保护路由（见第 14 章）
// 读取 req.cookies.get('token') 判断并重定向
```

```tsx
// 3) 服务端组件读取当前用户
import { cookies } from 'next/headers';

export default async function Profile() {
  const c = await cookies();
  const token = c.get('token')?.value;
  const user = await getUser(token);
  return <p>欢迎 {user.name}</p>;
}
```

> ⚠️ **安全铁律**：鉴权校验必须在**中间件 + 服务端组件/Route Handler 双重进行**。仅靠客户端隐藏按钮不能防越权——任何客户端渲染的「权限判断」都能被绕过。

---

## 24. 环境变量配置

```bash
# .env.local（不参与版本控制）
DATABASE_URL=postgres://...
# 暴露给浏览器的变量必须加前缀 NEXT_PUBLIC_
NEXT_PUBLIC_API_BASE=/api
```

```tsx
// 服务端读取（安全，不会进客户端包）
const dbUrl = process.env.DATABASE_URL;

// 客户端读取（仅 NEXT_PUBLIC_ 前缀可见）
const apiBase = process.env.NEXT_PUBLIC_API_BASE;
```

```tsx
// 防止密钥泄漏到客户端：server-only 包
import 'server-only'; // 一旦在客户端组件误引入即报错
```

> `.env.local` 默认仅在**服务端**可用；想给浏览器用，变量名必须以 `NEXT_PUBLIC_` 开头，构建时内联替换。敏感密钥（数据库密码、JWT 私钥）**绝不可**加此前缀。

---

## 25. 并行路由与拦截路由

**并行路由（Parallel Routes）**：用 `@folder` 在同一布局中同时渲染多个独立子树，常用于后台多面板。

```tsx
// app/dashboard/layout.tsx
export default function Layout({
  children,
  sidebar,
  analytics,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  analytics: React.ReactNode; // 对应 @analytics 槽位
}) {
  return (
    <div>
      {sidebar}
      {children}
      {analytics}
    </div>
  );
}
// 目录：app/dashboard/@analytics/page.tsx、@sidebar/page.tsx
```

**拦截路由（Intercepting Routes）**：用 `(.)` / `(..)` 等前缀在客户端「拦截」本应导航到别的路由，改为弹层展示（如点击图片在模态框打开，URL 仍是详情页）。

```text
app/
├─ photo/[id]/page.tsx        # 完整详情页（直接访问/刷新）
└─ feed/
   └─ (.)photo/[id]/page.tsx  # 从 /feed 点开时拦截 → 模态框
```

---

## 26. 性能优化

```tsx
// 1) 动态导入（减少首屏 JS）
import dynamic from 'next/dynamic';
const Heavy = dynamic(() => import('./heavy'), { ssr: false });
```

```tsx
// 2) 关闭不需要的预取（大量链接场景）
<Link href="/x" prefetch={false}>不预取</Link>
```

```tsx
// 3) Partial Prefetching（Next 16.3+，next.config 开启）
// next.config.ts
const nextConfig = {
  experimental: { partialPrefetching: true },
};
export default nextConfig;
```

```tsx
// 4) Instant Navigations（Next 16.3+，依赖 Cache Components）
// 让导航「即时」返回外壳，其余流式补齐，无需牺牲 RSC 优势
export const instant = true;        // 路由级开启
// export const instant = false;    // 明确标为非即时（如博客文章，避免误报）
```

> 其他要点：**优先 Server Component**（少发 JS）、`next/image` 自动优化、`next/font` 防 CLS、开启 Turbopack（16 默认，构建更快）、用 `next build && next start` 而非 `next dev` 上生产。

---

## 27. 部署（Vercel / 自托管 / Docker）

**Vercel（最简单）：** 推送到 Git 仓库，导入项目即自动构建部署，零配置启用全部优化。

**自托管（Node 服务）：**

```bash
pnpm build        # 产出 .next
pnpm start        # 启动生产服务器（默认 3000 端口）
```

**独立精简部署（standalone）：**

```ts
// next.config.ts
const nextConfig = { output: 'standalone' };
export default nextConfig;
```

```dockerfile
# Dockerfile（standalone 模式，镜像极小）
FROM node:22-alpine AS base
WORKDIR /app
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> `output: 'standalone'` 会把运行所需文件精简打包，配合多阶段 Docker 构建可把最终镜像压到 ~100MB 级别。

---

## 28. 测试与代码质量

```bash
# 内置 ESLint（框架规则）
pnpm lint

# 组件测试：@testing-library/react + vitest/jest
pnpm add -D @testing-library/react @testing-library/jest-dom vitest
```

```tsx
// __tests__/counter.test.tsx
import { render, screen } from '@testing-library/react';
import Counter from '@/app/counter';

test('渲染按钮', () => {
  render(<Counter initial={0} />);
  expect(screen.getByText('0')).toBeInTheDocument();
});
```

```tsx
// E2E：Playwright 验证关键流程
// npx playwright test
```

> Next.js 16 官方测试推荐 **Vitest**（轻量、快），`@testing-library/react` 负责渲染断言，Playwright 负责端到端。Server Component 测试建议走集成/E2E 层（直接测渲染结果）。

---

## 29. Pages Router 对照速查

若维护旧项目，以下是 App Router 的对应写法：

| 能力 | Pages Router | App Router |
|---|---|---|
| 页面 | `pages/index.tsx` | `app/page.tsx` |
| 布局 | `_app.tsx` 手写 | `app/layout.tsx` 约定 |
| 数据（服务端） | `getServerSideProps` | 直接 `async` 组件 |
| API | `pages/api/x.ts` | `app/api/x/route.ts` |
| 404 | `pages/404.tsx` | `app/not-found.tsx` |
| 错误 | `pages/_error.tsx` | `app/error.tsx` |
| 文档头 | `next/head` | `export const metadata` |
| 客户端 | 默认即客户端 | 需 `'use client'` |

> 新项目一律用 App Router；Pages Router 仅用于兼容存量代码，不再推荐新写。

---

## 30. 常见坑与最佳实践

1. **`params`/`searchParams`/`cookies()` 忘记 `await`**：Next 15+ 全部 async，同步解构会拿到 Promise 而非值，必报错。
2. **在 Server Component 用 `useState`/`useEffect`**：需交互就拆出 `'use client'` 子组件，别把整个页面标成客户端。
3. **把函数传给客户端组件**：只能传可序列化 props；服务端逻辑改用 Server Action / Route Handler。
4. **`'use client'` 位置错误**：必须文件最顶部（注释后第一行），放错位置指令失效。
5. **缓存导致数据不更新**：动态数据加 `cache: 'no-store'` 或 `revalidate`，变更后用 `revalidatePath/Tag` 主动失效。
6. **`NEXT_PUBLIC_` 误用**：密钥绝不能加此前缀，否则打包进浏览器。
7. **仅靠前端隐藏做权限**：必须在中间件 + 服务端双重校验。
8. **中间件用 Edge Runtime**：Next 16.3 起弃用，迁移到 Node Runtime。
9. **`next dev` 上生产**：生产必须用 `next build && next start`（或 standalone）。
10. **过度客户端化**：默认写 Server Component，仅在必要时下沉到客户端，减少包体。

---

## 31. 参考文档

- [Next.js 官方文档（首页）](https://nextjs.org/docs)
- [Next.js 安装指南](https://nextjs.org/docs/app/getting-started/installation)
- [App Router 总览](https://nextjs.org/docs/app)
- [路由基础（Defining Routes）](https://nextjs.org/docs/app/building-your-application/routing/defining-routes)
- [动态路由（Dynamic Routes）](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [布局与模板（Layouts and Templates）](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- [链接与导航（Linking and Navigating）](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [数据获取与缓存（Fetching Data）](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching)
- [Route Handlers（API）](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [中间件 Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [样式方案（Styling）](https://nextjs.org/docs/app/building-your-application/styling)
- [图片优化 next/image](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [字体优化 next/font](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- [Metadata 元数据](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [错误处理（Error Handling）](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [加载与流式（Loading UI and Streaming）](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [缓存体系（Caching）](https://nextjs.org/docs/app/building-your-application/caching)
- [缓存组件 'use cache'](https://nextjs.org/docs/app/building-your-application/caching/use-cache)
- [认证（Authentication）](https://nextjs.org/docs/app/building-your-application/security/authentication)
- [环境变量（Environment Variables）](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [并行路由（Parallel Routes）](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)
- [拦截路由（Intercepting Routes）](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes)
- [性能优化总览](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Turbopack](https://nextjs.org/docs/app/api-reference/turbopack)
- [部署（Deployment）](https://nextjs.org/docs/app/building-your-application/deploying)
- [Standalone 输出](https://nextjs.org/docs/app/building-your-application/deploying#standalone-server)
- [测试（Testing）](https://nextjs.org/docs/app/building-your-application/testing)
- [升级到 16（Upgrading）](https://nextjs.org/docs/app/building-your-application/upgrading/version-16)
- [升级到 15（破坏性变更）](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Next.js 博客（版本发布）](https://nextjs.org/blog)
- [React 官方文档](https://react.dev/)
- [React Server Components 介绍](https://react.dev/reference/rsc/server-components)
