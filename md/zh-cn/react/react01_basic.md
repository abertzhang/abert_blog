---
title: React训练营：基础
create:2026-10-09
update:2026-10-09
category:react
cover:https://img-common.aknot.uk/cover/land-13.jpg
tags:[frontend,web,next]
summary:
keywords:[react,frontend,component,vite,jsx,hook]
top:1
copyright:true
---



## 创建项目

```
pnpm create vite my-app --template react
pnpm create vite my-app --template react-ts
pnpm install
pnpm run
pnpm dev
```



```
// 创建目录javacript
npm create vite@latest my-react-app -- --template react
// 创建目录typescript
npm create vite@latest my-react-app -- --template react-ts
//当前目录创建
npm create vite@latest . -- --template react
```

```
// 启动开发服务器（默认端口 5173）
npm run dev
// 打包生产代码，输出到 dist 文件夹
npm run build
// 本地预览打包结果
npm run preview

```



## 项目结构

```
├── build/                         # 构建产物
├── mock/                          # 本地模拟数据
│   ├── index.[j,t]s
├── public/
│   ├── index.html                 # 应用入口 HTML
│   └── favicon.png                # Favicon
├── src/                           # 源码路径
│   ├── components/                # 自定义业务组件
│   │   └── Guide/
│   │       ├── index.[j,t]sx
│   │       ├── index.module.scss
│   ├── layouts/                   # 布局组件
│   │   └── BasicLayout/
│   │       ├── index.[j,t]sx
│   │       └── index.module.scss
│   ├── pages/                     # 页面
│   │   └── Home/                  # home 页面，约定路由转成小写
│   │       ├── components/        # 页面级自定义业务组件
│   │       ├── models.[j,t]sx     # 页面级数据状态
│   │       ├── index.[j,t]sx      # 页面入口
│   │       └── index.module.scss  # 页面样式文件
│   ├── configs/                   # [可选] 配置文件
│   │   └── menu.[j,t]s            # [可选] 菜单配置
│   ├── models/                    # [可选] 应用级数据状态
│   │   └── user.[j,t]s
│   ├── utils/                     # [可选] 工具库
│   ├── global.scss                # 全局样式
│   ├── routes.[j,t]s              # 路由配置
│   └── app.[j,t]s[x]              # 应用入口脚本
├── build.json                     # 工程配置
├── README.md
├── package.json
├── .editorconfig
├── .eslintignore
├── .eslintrc.[j,t]s
├── .gitignore
├── .stylelintignore
├── .stylelintrc.[j,t]s
├── .gitignore
└── [j,t]sconfig.json

```

