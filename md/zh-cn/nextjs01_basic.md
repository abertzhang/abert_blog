---
title: Next.js训练营：基础
create:2026-10-09
update:2026-10-09
category:react
cover:https://img-common.aknot.uk/cover/land-41.jpg
tags:[frontend,web,next]
summary:
keywords:[nextjs,react,ssr,frontend,env,fullstack]
top:1
copyright:true
---

### 环境变量

Next.js 约定使用 `.env.local` 文件存放本地开发环境变量

```
# .env.loca
l（不应提交至版本控制系统）
DATABASE_URL=postgresql://localhost:5432/mydb
OPENAI_API_KEY=sk-xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000

```

### 端口被占用

```
# 方法一：指定其他端口
npm run dev -- -p 3001

# 方法二：查找并终止占用进程
# macOS/Linux
lsof -ti:3000 | xargs kill

# Windows
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F

```

依赖冲突

```
rm -rf node_modules package-lock.json  # Windows: del /s /q node_modules
npm install
```

### 项目结构

```
src/
├── app/               ← Next.js 路由（仅存放路由相关文件）
│   ├── (auth)/        ← 认证相关页面
│   ├── (main)/        ← 主应用页面
│   └── api/           ← API 路由
├── components/        ← 可复用的 React 组件
│   ├── ui/            ← 纯 UI 组件（Button、Input、Modal 等）
│   └── features/      ← 业务功能组件（PostCard、UserAvatar 等）
├── lib/               ← 工具函数和业务逻辑
│   ├── db.ts          ← 数据库客户端配置
│   ├── auth.ts        ← 认证相关逻辑
│   └── utils.ts       ← 通用工具函数
├── hooks/             ← 自定义 React Hooks
├── types/             ← TypeScript 类型定义
└── styles/            ← 全局样式文件（可选）

```

