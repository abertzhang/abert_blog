---
title: React Native + Expo 框架学习文档
create:2026-10-23
update:2026-10-23
category:react
cover:https://img-common.aknot.uk/cover/land-22.jpg
tags:[react-native,expo,rn,mobile,eas,expo-router,react]
summary:Expo SDK 57（基于 React Native 0.86）完整学习文档，覆盖 Expo 是什么、与裸 RN 的区别、开发构建/CNG、Expo CLI、app.json/app.config.js 配置、Config Plugins、Prebuild、Expo Modules、expo-router 文件路由、Expo UI 通用组件、核心 expo-* 模块（camera/location/notifications/secure-store/sqlite/file-system 等）、字体与资源、OTA 更新、EAS Build/Submit、推送、环境变量与调试，每节均含可直接运行的示例
keywords:[expo,sdk57,react-native,eas,expo-router,cng,development-build,prebuild,config-plugin,expo-modules,ota,react]
top:1
copyright:true
---

# React Native + Expo 框架学习文档

> 本文基于 **Expo SDK 57**（2026-07 发布，对应 **React Native 0.86.3** / **React 19.2.3**，Hermes V1 默认，New Architecture 强制启用）。Expo 是构建在 React Native 之上的**框架 + 工具链**：它提供一套精选的原生模块 SDK（相机、通知、文件系统、定位等 80+）、构建系统、OTA 更新服务、文件路由，以及把这一切串起来的开发工作流。自 2026 年起，RN 官方「Getting Started」就推荐用框架创建新应用，**Expo 是它点名的框架**——裸 RN 反而成了需要主动 opt-in 的特殊情况。
> 文档从「Expo 是什么」讲起，逐步推进到 **CLI / 配置 / 路由 / 核心模块 / 构建发布**，每节都给可直接跑的示例。

---

## 1. Expo 是什么 & 三大心智模型

Expo 在 React Native 之上提供了四件事：**SDK（原生模块集合）**、**构建系统（EAS）**、**更新服务（OTA）**、**路由与工作流**。理解现代 Expo 只需抓住三个概念：

| 概念 | 说明 |
| --- | --- |
| **Expo Go** | 应用商店里的沙盒 App，能即时跑你的 JS，但只能用 Expo Go 内置的原生模块。**只用于学习/原型，生产不通过它发布**。 |
| **Development Build** | 用 `expo-dev-client` 打出「你自己的 App」（含你真实需要的全部原生依赖）+ 快速刷新开发体验。**取代 Expo Go 成为开发/预发标配**。 |
| **CNG（Continuous Native Generation）** | 取代「eject」。`ios/` `android/` 被视为**构建产物**，由 `app.json` + Config Plugins 定义，`npx expo prebuild` 按需从配置重新生成，升级不再考古手写 Xcode 工程。 |

```bash
# 现代循环
npx create-expo-app my-app
cd my-app
npx expo prebuild      # 从配置生成原生工程
npx expo run:ios       # 本地跑；或交给云：EAS Build
```

---

## 2. 创建项目与目录结构

```bash
# 创建默认模板（SDK 57）
npx create-expo-app@latest my-app

# 指定 SDK 56 模板（上一版，仍受支持）
npx create-expo-app@latest my-app --template default@sdk-56
```

```text
my-app/
├── app/                 # expo-router 文件路由（见 §10）；若不用 router 则是 App.tsx
│   ├── _layout.tsx
│   └── index.tsx
├── app.json             # 静态配置（Expo 配置对象）
├── app.config.js        # 动态配置（支持 JS 计算/环境变量）
├── eas.json             # EAS Build/Submit/Update 配置
├── babel.config.js
└── package.json
```

> 新项目默认启用 **expo-router**（文件路由）与 **Expo UI**。若你用经典 `App.tsx` 入口也完全可行，二者不冲突。

---

## 3. Expo CLI 常用命令

```bash
npx expo start            # 启动 Metro + 开发服务器（扫码/模拟器打开）
npx expo start --tunnel   # 无局域网时用 ngrok 隧道
npx expo install <pkg>    # 按当前 SDK 安装兼容版本（关键！别直接 npm i）
npx expo install expo@latest --fix   # 升级 SDK 并修正依赖版本
npx expo prebuild         # 从配置生成/更新原生工程（CNG）
npx expo run:ios         # 编译并运行 iOS（需 Xcode）
npx expo run:android     # 编译并运行 Android
npx expo config          # 打印最终合并后的 Expo 配置
npx expo export          # 导出静态 bundle（用于自托管 OTA / Web）
```

> **铁律**：Expo 项目装依赖用 `npx expo install`，它会把 `expo-*` 包锁定到**当前 SDK 验证过**的版本；直接 `npm i expo-camera` 可能拉到不兼容版本。

---

## 4. 配置：app.json 与 app.config.js

```json
// app.json —— 静态配置
{
  "expo": {
    "name": "MyApp",
    "slug": "my-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "myapp",                 // 深链 scheme
    "userInterfaceStyle": "automatic", // light/dark/automatic
    "newArchEnabled": true,            // New Architecture（SDK 57 强制）
    "ios": { "bundleIdentifier": "com.example.myapp", "supportsTablet": true },
    "android": { "package": "com.example.myapp", "adaptiveIcon": { "foregroundImage": "./assets/icon.png" } },
    "plugins": ["expo-router", "expo-camera"]
  }
}
```

```js
// app.config.js —— 动态配置（可用 JS / 环境变量）
module.exports = ({ config }) => ({
  ...config,
  name: process.env.APP_NAME || 'MyApp',
  ios: { bundleIdentifier: 'com.example.myapp' },
});
```

> `app.config.js` 导出一个合并函数，返回最终配置。需要按环境切换 bundle id、注入密钥（通过 `process.env`）时非常有用。

---

## 5. Config Plugins：不改原生工程也能定制

Config Plugin 是**纯 JS 函数**，在 `prebuild` 时修改生成的 iOS/Android 工程（Info.plist、AndroidManifest、Gradle、源码）。它让「定制原生」无需手写原生、且随 CNG 自动复现。

```js
// my-plugin.js —— 最小 Config Plugin
module.exports = (config) => {
  // 修改 Android 权限
  config = withAndroidPermissions(config, ['android.permission.CAMERA']);
  // 修改 iOS Info.plist
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSPhotoLibraryUsageDescription = '需要访问相册';
    return cfg;
  });
  return config;
};
```

```js
// app.config.js 中引用
module.exports = {
  expo: { plugins: ['./my-plugin.js', ['expo-camera', { permission: '相机' }]] },
};
```

> 多数流行库（expo-camera、expo-notifications…）自带官方 plugin，直接在 `plugins` 数组写包名即可；只有非常规需求才手写 plugin。

---

## 6. Prebuild 与原生工程（CNG）

```bash
npx expo prebuild            # 生成 ios/ 和 android/
npx expo prebuild --platform ios
npx expo prebuild --clean    # 清空后重新生成（SDK 57 默认 clean）
npx expo run:android         # 等价于 prebuild + 编译运行
```

```js
// 仍可在需要时「掉回」原生工程：把 plugin/配置固化后直接改 ios/android
// 但默认不维护这两个目录——它们由配置重生
```

> CNG 的好处：升级 RN/SDK 时只要改 `app.json` + plugin，再 `prebuild` 即可，不用手动 merge 上千行 Xcode 工程。**不要手动长期维护 `ios/android` 目录**，否则失去 CNG 优势。

---

## 7. Expo Modules：写原生模块（Swift / Kotlin）

当 SDK 没有现成模块时，用 **Expo Modules API** 写类型安全的原生模块，自动生成 JS 绑定（Codegen）。

```ts
// modules/my-module/src/MyModule.ts —— 原生模块的 JS 视图
import { NativeModule, requireNativeModule } from 'expo-modules-core';

export interface MyModuleEvents {
  onChange?: (event: { value: number }) => void;
}
export interface MyModule extends NativeModule<MyModuleEvents> {
  getGreeting(name: string): string;   // 对应 Swift/Kotlin 实现
  setValueAsync(value: number): Promise<void>;
}
export default requireNativeModule<MyModule>('MyModule');
```

```swift
// modules/my-module/ios/MyModule.swift（节选）
public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyModule")
    Function("getGreeting") { (name: String) in "Hello \(name)" }
    AsyncFunction("setValueAsync") { (value: Double, promise: Promise) in
      promise.resolve(); 
    }
  }
}
```

> 完整原生模块涉及 Swift/Kotlin 与 `expo-module.config.json`，详见 Expo 官方「Expo Modules」指南。日常 90% 场景用现成 `expo-*` 包即可，无需自写。

---

## 8. expo-router：文件路由（推荐导航方案）

expo-router 用**文件系统**定义路由，对标 Next.js App Router，底层基于 React Navigation。

```tsx
// app/_layout.tsx —— 根布局（Stack 导航）
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: true }} />;
}
```

```tsx
// app/index.tsx —— 首页路由（路径 /）
import { Link, router } from 'expo-router';
import { View, Text, Button } from 'react-native';

export default function Home() {
  return (
    <View>
      <Text>首页</Text>
      <Link href="/detail/42">去详情</Link>
      <Button title="编程跳转" onPress={() => router.push({ pathname: '/detail/[id]', params: { id: '42' } })} />
    </View>
  );
}
```

```tsx
// app/detail/[id].tsx —— 动态路由 + 取参
import { useLocalSearchParams } from 'expo-router';

export default function Detail() {
  const { id } = useLocalSearchParams();   // { id: '42' }
  return <Text>详情 id = {id}</Text>;
}
```

```tsx
// app/(tabs)/_layout.tsx —— 分组 + Tab 导航
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: '首页' }} />
      <Tabs.Screen name="settings" options={{ title: '设置' }} />
    </Tabs>
  );
}
```

> `()` 包裹的目录是**路由分组**（不进 URL）；`[param]` 是动态段；`+not-found.tsx` 是 404。需在 `app.json` 的 `plugins` 加 `"expo-router"`，并设置入口 `"main": "expo-router/entry"`。

---

## 9. Expo UI：通用原生组件（SDK 56 起稳定）

`@expo/ui` 提供**跨 Android（Jetpack Compose）/ iOS（SwiftUI）/ Web** 的通用组件，无需再分 `.android.tsx` / `.ios.tsx`。

```tsx
import { Host, Column, Row, Text, Button, Switch, Slider, Checkbox } from '@expo/ui';

export default function Demo() {
  return (
    <Host>
      <Column>
        <Row>
          <Text>开启通知</Text>
          <Switch checked={true} onValueChange={(v) => console.log(v)} />
        </Row>
        <Button onPress={() => {}}>提交</Button>
        <Slider value={0.5} onValueChange={(v) => console.log(v)} />
        <Checkbox checked={false} onValueChange={(v) => console.log(v)} />
      </Column>
    </Host>
  );
}
```

> Expo UI 还提供 `BottomSheet`、`DateTimePicker` 等社区组件**平替**（换 import 即可迁移 `@gorhom/bottom-sheet` 等）。Web 端 API 仍实验性。

---

## 10. 核心模块（一）：相机 / 定位 / 通知

```tsx
// expo-camera —— 拍照
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function Cam() {
  const [perm, request] = useCameraPermissions();
  if (!perm?.granted) return <Button title="授权" onPress={request} />;
  return <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={(e) => console.log(e.data)} />;
}
```

```tsx
// expo-location —— 定位
import * as Location from 'expo-location';

async function getPos() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;
  const loc = await Location.getCurrentPositionAsync({});
  console.log(loc.coords.latitude, loc.coords.longitude);
}
```

```tsx
// expo-notifications —— 本地通知 + 权限
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldPlaySound: false, shouldSetBadge: false }),
});

async function notify() {
  await Notifications.scheduleNotificationAsync({
    content: { title: '提醒', body: '该休息了' },
    trigger: { seconds: 5 },
  });
}
```

---

## 11. 核心模块（二）：安全存储 / 数据库 / 文件

```tsx
// expo-secure-store —— 密钥安全存储（iOS Keychain / Android Keystore）
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('token', 'abc');
const token = await SecureStore.getItemAsync('token');
```

```tsx
// expo-sqlite —— 本地 SQLite（SDK 57 由 expo-file-system 增强）
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('app.db');
db.execSync('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT)');
db.runSync('INSERT INTO items (name) VALUES (?)', ['apple']);
const rows = db.getAllSync<{ id: number; name: string }>('SELECT * FROM items');
```

```tsx
// expo-file-system —— 文件系统
import * as FileSystem from 'expo-file-system';

const dir = FileSystem.documentDirectory;
await FileSystem.writeAsStringAsync(dir + 'a.txt', 'hello');
const txt = await FileSystem.readAsStringAsync(dir + 'a.txt');
```

---

## 12. 设备信息 / 常量 / 状态栏 / 字体 / 图片

```tsx
// expo-constants —— 应用常量（manifest、版本、系统）
import Constants from 'expo-constants';
Constants.expoConfig?.version;       // '1.0.0'
Constants.platform?.ios?.systemVersion;

// expo-device —— 设备型号/系统
import * as Device from 'expo-device';
Device.modelName;                    // 'iPhone15,2'

// expo-status-bar —— 状态栏
import { StatusBar } from 'expo-status-bar';
<StatusBar style="auto" />

// expo-font —— 加载自定义字体
import { useFonts } from 'expo-font';
const [loaded] = useFonts({ 'Inter': require('./assets/Inter.ttf') });
if (!loaded) return null;

// expo-image —— 高性能图片（缓存/CDN 优化）
import { Image } from 'expo-image';
<Image source={{ uri: 'https://cdn.example.com/a.jpg' }} style={{ width: 100, height: 100 }} />
```

---

## 13. 字体与静态资源

```tsx
// 用 expo-asset + useAssets 预加载图片/字体
import { useAssets } from 'expo-asset';

export default function App() {
  const [assets] = useAssets([require('./assets/logo.png')]);
  if (!assets) return null;   // 加载完成前不渲染
  return <Image source={assets[0]} />;
}
```

> 推荐 `expo-image` 替代原生 `Image`：内置缓存、模糊占位、AVIF/WebP 支持，性能更好。

---

## 14. OTA 更新：expo-updates 与 EAS Update

```json
// app.json 启用更新 + 默认 channel
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id",
      "requestHeaders": { "expo-channel-name": "production" }
    },
    "runtimeVersion": { "policy": "appVersion" }
  }
}
```

```bash
npx expo install expo-updates
npx eas update --branch production --message "hotfix"   # 推送 JS 更新（不重审商店）
```

```tsx
// 应用内检查并应用更新
import * as Updates from 'expo-updates';

if (Updates.isUpdateAvailable) {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();   // 应用新 bundle
}
```

> `runtimeVersion` 是 OTA 的**安全闸**：JS bundle 只在 runtimeVersion 匹配的 Native 层上才生效，避免不兼容崩溃。用 `appVersion` 策略即「每次发商店版才允许 OTA」。

---

## 15. EAS Build：云编译原生二进制

```json
// eas.json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  }
}
```

```bash
npx eas build --platform ios --profile development   # 打开发构建（含 dev-client）
npx eas build --platform all --profile production    # 打生产包（无需本地 Mac 即可出 iOS）
```

> EAS Build 在云上编译 iOS/Android 二进制，**出 iOS 包不需要本地 Mac**。配合 `developmentClient: true` 产出可在真机装的「开发构建」，扫二维码即可连 Metro。

---

## 16. EAS Submit 与发布

```bash
npx eas submit --platform ios --profile production   # 上传 TestFlight / App Store
npx eas submit --platform android --profile production # 上传 Play Store
```

> 凭据（证书/签名）首次由 EAS 引导生成并存于云端；后续自动复用。Submit 不重签，只上传已 build 的 artifact。

---

## 17. 推送通知（远端）

```tsx
// 1) 拿 Expo Push Token
import * as Notifications from 'expo-notifications';

async function getPushToken() {
  const { data } = await Notifications.getExpoPushTokenAsync();
  return data;   // ExponentPushToken[xxxx]
}

// 2) 把 token 发到你后端；后端用 Expo 推送服务 POST：
// POST https://exp.host/--/api/v2/push/send
// { "to": token, "title": "Hi", "body": "..." }
```

```bash
# 3) 也可用 EAS 直接发（无需自建后端）
npx eas push:android   # 需配置 FCM
```

> 远端推送链：设备 token → 你的后端 → Expo Push Service → APNs/FCM。生产推送需在 `eas.json` 配 `notification` 及对应证书/FCM key。

---

## 18. 环境变量与密钥

```js
// app.config.js —— 注入到 JS bundle 的公开变量
module.exports = ({ config }) => ({
  ...config,
  extra: { apiUrl: process.env.API_URL },
});

// 读取
import Constants from 'expo-constants';
Constants.expoConfig?.extra?.apiUrl;
```

```bash
# EAS 私密变量（不进 bundle，仅构建/更新时使用）
npx eas secret:create --name API_KEY --value xxx --scope project
```

> 公开配置走 `extra` + 环境变量；**密钥类**用 `eas secret:create` 存于云端，绝不写进仓库或 `extra`。

---

## 19. 调试

```tsx
// 屏蔽特定开发期警告
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Warning: ...']);
```

```bash
npx expo start        # 模拟器 Cmd+D / 真机摇一摇 → 开发者菜单
# 现代调试：React Native DevTools（Chrome DevTools Protocol，0.76+）
# 开发构建额外有 expo-dev-client 的内联错误覆盖层
```

> Expo Go 已不适配所有原生模块；**调试请用开发构建（dev-client）**。原生层问题用 Xcode/Android Studio 打开 `prebuild` 后的工程。

---

## 20. 常用 expo-* 模块速查表

| 模块 | 用途 | 关键 API |
| --- | --- | --- |
| `expo-camera` | 相机/扫码 | `CameraView`, `useCameraPermissions` |
| `expo-location` | 定位/地理围栏 | `getCurrentPositionAsync`, `requestForegroundPermissionsAsync` |
| `expo-notifications` | 本地/远端通知 | `scheduleNotificationAsync`, `getExpoPushTokenAsync` |
| `expo-secure-store` | 安全存储密钥 | `setItemAsync`, `getItemAsync` |
| `expo-sqlite` | 本地数据库 | `openDatabaseSync`, `runSync`, `getAllSync` |
| `expo-file-system` | 文件系统 | `documentDirectory`, `writeAsStringAsync` |
| `expo-constants` | 应用常量 | `expoConfig`, `platform` |
| `expo-device` | 设备信息 | `modelName`, `osName` |
| `expo-status-bar` | 状态栏 | `<StatusBar style>` |
| `expo-font` | 自定义字体 | `useFonts` |
| `expo-image` | 高性能图片 | `<Image source>` |
| `expo-asset` | 资源预加载 | `useAssets` |
| `expo-haptics` | 触感反馈 | `notificationAsync`, `impactAsync` |
| `expo-sharing` | 系统分享 | `shareAsync` |
| `expo-splash-screen` | 启动屏 | `preventAutoHideAsync`, `hideAsync` |
| `expo-router` | 文件路由 | `Stack`, `Tabs`, `Link`, `useLocalSearchParams` |
| `expo-updates` | OTA 更新 | `fetchUpdateAsync`, `reloadAsync` |
| `@expo/ui` | 通用原生组件 | `Host`, `Row`, `Column`, `Switch` |

---

## 21. 常见坑与最佳实践

- **永远用 `npx expo install`**：直接 `npm i expo-*` 容易装到与当前 SDK 不兼容的版本。
- **CNG 不要手动长期维护 `ios/android`**：它们由 `prebuild` 从配置重生，手工改会冲突丢失。
- **生产别用 Expo Go**：用 `developmentClient: true` 的开发构建；Expo Go 仅限学习。
- **OTA 必须设 `runtimeVersion`**：否则 JS 更新可能在不兼容的 Native 层上运行导致崩溃。
- **权限文案在 `plugins` 里配**：相机/相册/定位的 `NSxxxUsageDescription` 通过 Config Plugin 注入，别直接在 Info.plist 手改（会被 prebuild 覆盖）。
- **秘密不进 `extra`/`app.json`**：用 `eas secret:create`。
- **升级走 `npx expo install expo@latest --fix`**：SDK 57 起提供「无破坏性小升级」（如 56→57），一键拉齐依赖版本。

---

## 22. 参考文档

- [Expo 官方文档（首页）](https://docs.expo.dev/)
- [Expo SDK 57 发布说明](https://expo.dev/changelog/sdk-57)
- [Expo SDK 56 发布说明](https://expo.dev/changelog/sdk-56)
- [Expo Router 文档](https://docs.expo.dev/router/introduction/)
- [Expo Modules（写原生模块）](https://docs.expo.dev/modules/overview/)
- [Config Plugins 指南](https://docs.expo.dev/config-plugins/introduction/)
- [Prebuild / CNG 指南](https://docs.expo.dev/workflow/prebuild/)
- [Expo UI（@expo/ui）](https://docs.expo.dev/ui/)
- [expo-updates（OTA）文档](https://docs.expo.dev/versions/latest/sdk/updates/)
- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [EAS Submit 文档](https://docs.expo.dev/submit/introduction/)
- [EAS Update 文档](https://docs.expo.dev/eas-update/introduction/)
- [Expo Notifications 文档](https://docs.expo.dev/push-notifications/overview/)
- [Expo Camera 文档](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo SQLite 文档](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SecureStore 文档](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo 环境变量与 secrets](https://docs.expo.dev/build-reference/variables/)
- [React Native 官方文档](https://reactnative.dev/docs/getting-started)
- [Expo GitHub 仓库](https://github.com/expo/expo)
