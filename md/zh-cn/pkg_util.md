---
title: MangoDB（pkg_util）
create:2026-10-04
update:2026-10-07
category:other
cover:https://img-common.aknot.uk/cover/land-32.jpg
tags:[database]
summary:
keywords:[node,npm,package,cli,dependency,tool]
top:1
copyright:true
---

## npm

### 常用命令

```
npm init
npm init -y
npm install
nmp i
npm i uniq
// 生产依赖
npm i -S uniq
npm i --save uniq
// 开发依赖
npm i -D less
npm i --save-dev
// 搜索数学相关的包
npm s math
// 全局安装,node自动重启工具
npm i -g nodemon
//
npm root -g
```

### nmp包网站

npmjs.com

### 配置镜像

### 常用库

### package.json

```
```

常用开发命令

```
npm run dev     # 启动开发服务器，支持热更新
npm run build   # 构建生产版本，执行类型检查和代码优化
npm run start   # 运行生产构建（本地预览）
npm run lint    # 执行 ESLint 代码质量检查
```



## npx

## pnpm

### 基础配置和镜像

```
npm install -g pnpm
# 查看当前源
pnpm config get registry
// pnpm 配置
pnpm config set registry https://registry.npmmirror.com
// npm 配置
npm config set registry https://registry.npmmirror.com
// 切回官方源（需要发包到npm官方仓库时使用）
pnpm config set registry https://registry.npmjs.org
```

### 配置npmrc

在项目中配置 可以在项目根目录下增加`.npmrc`文件

```
registry = https://registry.npmmirror.com
```

### Turborepo

```
// 当前项目创建
pnpm dlx create-turbo@latest .
cd projext-name
cd apps
# 在 apps/service 创建nest项目，--package-manager pnpm
pnpm dlx @nestjs/cli new service --package-manager pnpm
```

```
// apps/web(Next) + apps/api(Nest) + prisma + shared 类型包
pnpm dlx create-turborepo-full-stack-template@latest
```

```
# 只跑nest后端dev
pnpm dev --filter service
# 只build前端web
pnpm build --filter web
```

### 已有项目

```
//turbo初始化
pnpm dlx create-tubo@latest .
// 普通nodejs
cd apps/project
pnpm init
// 旧式 express 生成器
pnpm create express apps/project_name        
// express生成器，显式调用生成器
pnpm dlx express-generator apps/api_express
//创建nestjs子项目
pnpm dlx @nestjs/cli new apps/api_nest -p pnpm
//创建nextjs子项目
pnpm create next-app my-app --use-pnpm --yes
//创建react项目
pnpm create vite@latest apps/web_react --template react-ts 
//创建nextjs项目
pnpm create next-app my-app --use-pnpm
//创建ReactNative
pnpm dlx @react-native-community/cli@latest init phone_rn --pm pnpm
pnpm dlx @react-native-community/cli@latest init MyApp --skip-install
```

```
// 1. 安装 Nest CLI
pnpm add -g @nestjs/cli
// 2. 创建项目，-p 直接指定 pnpm，跳过交互选择
nest new my-project -p pnpm
```

```
# React + JavaScript
pnpm create vite@latest my-app --template react         
# React + TypeScript ✅ 推荐
pnpm create vite@latest my-app --template react-ts   
# React + TS，用 SWC 编译（更快）
pnpm create vite@latest my-app --template react-swc-ts   
# React Router v7 框架模式（全栈路由
pnpm create vite@latest my-app --template react-router   
```

```
// 全局安装creat-next-app
pnpm add -g create-next-app
# 跳过所有交互，按默认配置创建
pnpm create next-app my-app --use-pnpm --yes
# 显式指定常用配置（TS + Tailwind + ESLint + App Router）
pnpm create next-app my-app --use-pnpm --ts --tailwind --eslint --app
```

### 修改package.json

nodejs

```
 "name": "@repo/api_express",
  "version": "0.0.0",
  "private": true,
  "description": "Express API —— 纯 CommonJS，运行时直接执行，无构建步骤",
  "scripts": {
    "dev": "nodemon --watch app.js --watch routes --watch bin --ext js,json ./bin/www",
    "start": "node ./bin/www",
    "build": "echo \"api_express: 无构建步骤，pnpm start 直接运行\"",
    "lint": "node --check app.js && node --check routes/index.js && node --check routes/userRouter.js && node --check bin/www"
  },
```

nestjs

```
```



## yarn
