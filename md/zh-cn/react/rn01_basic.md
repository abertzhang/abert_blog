---
title: RN训练营：基础
create:2026-10-11
update:2026-10-13
category:react
cover:https://img-common.aknot.uk/cover/land-43.jpg
tags:[frontend,react,ReactNative,RN]
summary:
keywords:[react-native,rn,frontend,mobile,harmony,cli]
top:1
copyright:true
---



## 项目创建

```
// 0.72.5是含鸿蒙的稳定版
npx @react-native-community/cli init all_in_rn --version 0.72.5
```

```
hdc list targets // 显式已连接设备如：NZPJYL65NNL7K7YL
npx react-native run-android --deviceId=NZPJYL65NNL7K7YL
```

## ppm创建turborepo

```
npx @react-native-community/cli@latest init phone \
  --version 0.84.1 \
  --pm pnpm \
  --skip-install \
  --skip-git-init
```

```
//pnpm-workspace.yaml
packages:
  - 'web'
  - 'backend'
  - 'packages/*'
  - 'phone'
```

```
//根 .npmrc
node-linker=hoisted
```

```
//安装与运行
pnpm install
// iOS 还需装 pods
pnpm --filter phone exec pod install
//
pnpm --filter mobile start      # Metro 开发服务器
pnpm --filter mobile android    # Android
pnpm --filter mobile ios        # iOS（仅 macOS）
```

```
// Turborepo添加
"android": { "cache": false, "persistent": true },
"ios":     { "cache": false, "persistent": true }
```



## 鸿蒙改造

```
在all_in_rn根目录创建名为harmony的鸿蒙项目
```

```
npm install @react-native-oh/react-native-harmony@0.72.112 --save
// 默认参数
npm i @react-native-oh/react-native-harmony
```

```
// 在entry目录下执行
ohpm i @rnoh/react-native-openharmony
```

```
//配置环境zsh或bash
# ~/.zshrc 末尾追加
export HDC_SERVER_PORT=7035
export RNOH_C_API_ARCH=1
export PATH="$HOME/Library/OpenHarmony/Sdk/$(ls ~/Library/OpenHarmony/Sdk | sort -n | tail -1)/openharmony/toolchains:$PATH"
source ~/.zshrc
```

```
// 项目根目录，最外层
npm install @react-native-oh/react-native-harmony@0.72.108
```

```
// 改 package.json 的 scripts（新增 dev）
// 在 "test": "jest" 后加一行：
// "dev": "react-native bundle-harmony --dev"
```

```
//改 metro.config.js（整文件替换为）
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {createHarmonyMetroConfig} = require('@react-native-oh/react-native-harmony/metro.config');
const config = {};
module.exports = mergeConfig(
  getDefaultConfig(__dirname),
  createHarmonyMetroConfig({
    reactNativeHarmonyPackageName: '@react-native-oh/react-native-harmony',
  }),
  config,
);
```

```
// 签名
// 自动或手动签名
// 打开Deveco和连接鸿蒙手机运行
```



```
// 编译运行
// 整体项目根目录
npm run dev
npm run start        # 电脑起 Metro
hdc rport tcp:8081 tcp:8081   # 手机 8081 反向转发到电脑
// 鸿蒙目录

```



## Expo

鸿蒙不支持该方式

```
# 创建项目
pnpm create expo rn-demo
cd rn-demo
# 启动
pnpm start
```

````
pnpm dlx @react-native-community/cli init rn-demo
cd rn-demo
pnpm run android
# Mac可执行 pnpm run ios
````

## Reload

```
curl -X GET http://localhost:8081/reload
```

## 项目结构

### Expo

```
my-app/
├── app/                        # Expo Router 文件路由（页面即路由）
│   ├── (auth)/                 # 分组：登录/注册（无底栏）
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                 # 分组：主 Tab 导航
│   │   ├── index.tsx           # 首页
│   │   └── settings.tsx
│   ├── _layout.tsx             # 根布局
│   └── +not-found.tsx
├── src/
│   ├── features/               # 功能模块（按业务切，Flutter 同思路）
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   └── home/
│   ├── components/             # 全局通用组件（跨 feature 复用）
│   │   └── ui/                 #   Button.tsx / Input.tsx 等
│   ├── hooks/                  # 全局 hooks
│   ├── services/               # API 请求 / 网络层（axios/fetch + TanStack）
│   │   ├── httpClient.ts
│   │   └── endpoints.ts
│   ├── stores/                 # 全局状态（zustand slices）
│   ├── navigation/             # 若用 React Navigation 而非文件路由
│   ├── constants/              # 常量：env、config、枚举
│   ├── types/                  # 全局 TS 类型 / 接口
│   ├── theme/                  # 主题：colors / spacing / typography
│   ├── utils/                  # 工具函数（格式化、校验等）
│   └── assets/                 # 图片、字体、图标
├── .env                        # 环境变量
├── app.json
├── expo-env.d.ts
├── tsconfig.json
└── package.json

```

### 非Expo

```
my-rn-app/
├── ios/                       # 原生 iOS 工程（保留）
├── android/                   # 原生 Android 工程（保留）
├── harmony/
├── index.js                   # 入口：注册 App 组件
├── App.tsx                    # 根组件：挂 Provider + RootNavigator
├── src/
│   ├── navigation/            # 【关键】React Navigation 集中管理
│   │   ├── RootNavigator.tsx  #  根导航（判断登录态切换 Auth/Main）
│   │   ├── AuthNavigator.tsx  #  登录/注册 Stack
│   │   ├── MainTabs.tsx       #  主 Tab（底部导航）
│   │   ├── HomeStack.tsx      #  每个 Tab 内的 Stack
│   │   └── types.ts #  路由参数表 RootStackParamList / TabParamList
│   ├── screens/               # 页面组件（薄壳，逻辑在 features）
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   └── main/
│   │       ├── HomeScreen.tsx
│   │       └── SettingsScreen.tsx
│   ├── features/              # 业务功能模块（自包含）
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   └── home/
│   ├── components/            # 全局通用组件
│   │   └── ui/                #  Button / Input / Card...
│   ├── hooks/                 # 全局自定义 hooks
│   ├── services/              # 网络层（axios/fetch + TanStack Query）
│   │   ├── httpClient.ts
│   │   └── endpoints.ts
│   ├── stores/                # 全局状态（Zustand slices）
│   ├── constants/             # 常量 / env 配置
│   ├── types/                 # 全局 TS 类型
│   ├── theme/                 # 颜色 / 间距 / 字号
│   ├── utils/                 # 工具函数
│   └── assets/                # 图片 / 字体
├── tsconfig.json
└── package.json

```

### 结构差异

| 维度             | Expo                          | Bare RN（本推荐）                                            |
| ---------------- | ----------------------------- | ------------------------------------------------------------ |
| **路由**         | `app/` 文件路由（页面即文件） | **`src/navigation/` + `src/screens/`**，React Navigation 声明式 |
| **入口**         | `expo-router` 自动            | **`index.js` → `App.tsx`** → 挂 `RootNavigator`              |
| **页面目录**     | `app/(tabs)/xxx.tsx`          | `src/screens/main/xxx.tsx`（配对应 Navigator）               |
| **路由类型定义** | 文件系统自动                  | 手动在 `navigation/types.ts` 定义 `ParamList`                |
| **原生目录**     | 无（EAS 云构建）              | `ios/`、`android/` 保留在仓库                                |



```
├── src
│   ├── actions      // Redux Actions
│   ├── api          // API SDK
│   ├── assets       // Media files
│   ├── components   // View Components
│   ├── config	     // Configuration
│   ├── pages        // Container Components
│   ├── reducers     // Redux Reducers
│   ├── router       // Router configuration
│   ├── store        // Redux Store
│   ├── utils        // Utility tools
│   ├── appIntro.js  // Welcome pages
│   ├── init.js      // Some useful function or tools
│   └── root.js      // The root of whole app
├── android          // Android Project
├── ios              // iOS Project
├── index.android.js // The entry file for android platform
├── index.ios.js     // The entry file for iOS platform
├── package.json     // Component packages file
└── readme.md        // readme note file
```



## 开发IDE

### VsCode

| 插件                                       | 作用                                                         | 说明                                                        |
| ------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------- |
| **React Native Tools**                     | RN 核心：启动 / 停止 Metro、运行 / 调试 App、模拟器控制、RN 调试器入口 | 唯一真正的 "RN 专用" 插件，调试依赖它                       |
| **ESLint**                                 | 代码规范检查                                                 | RN/TS 项目标配，装插件后需在设置里开 `eslint.validate`      |
| **Prettier - Code formatter**              | 统一格式化                                                   | 与 ESLint 配合，设成默认格式化器                            |
| **ES7+ React/Redux/React-Native snippets** | 代码片段                                                     | 输入 `rnf`（函数组件）`rnstyle`（样式）等秒出模板，效率关键 |

| 插件                                    | 作用                                                     |
| --------------------------------------- | -------------------------------------------------------- |
| **TypeScript + JavaScript**（微软官方） | TS 智能提示、类型检查、跳转定义                          |
| **Error Lens**                          | 报错 / 警告内联显示在行尾，不用悬停看                    |
| **Tailwind / StyleSheet 相关**          | 若项目用 `NativeWind`（Tailwind for RN）则装对应提示插件 |

| 插件                         | 适用场景                              |
| ---------------------------- | ------------------------------------- |
| **Auto Rename Tag**          | 改 JSX 标签名成对同步                 |
| **Path Intellisense**        | 路径自动补全                          |
| **Bracket Pair Colorizer 2** | 括号着色（新 VS Code 已内建，可不装） |
| **GitLens**                  | 看代码 git 历史 / 作者                |

编译运行

```
// 需 Xcode + CocoaPods
npx react-native run-ios
// Android Studio + SDK
npx react-native run-android
// Expo 项目
npx expo start
```







### WebStorm
