---
title: React Native 常用第三方组件与插件学习文档
create:2026-10-23
update:2026-10-23
category:react
cover:https://img-common.aknot.uk/cover/land-52.jpg
tags:[react-native,rn,third-party,library,plugin,navigation,zustand,reanimated,community,expo]
summary:React Native 0.87 常用第三方库全解学习文档，覆盖导航(React Navigation v7)、状态管理(Zustand v5/Redux Toolkit/MobX)、存储(AsyncStorage/MMKV/SQLite)、网络(Axios/TanStack Query)、动画手势(Reanimated v4/Gesture Handler)、图标、UI 组件库、表单、图片媒体(SVG/FastImage/Vision Camera/Lottie/Skia)、地图、WebView、社区组件(Slider/DateTimePicker/Bottom Sheet/Toast)、设备能力、推送、基础设施工具等 40+ 库，每个库均含安装、基础用法、高阶用法与可直接运行的 TSX 示例
keywords:[react-native,rn,third-party,react-navigation,zustand,redux,mmkv,sqlite,axios,react-query,reanimated,gesture-handler,svg,vector-icons,paper,bottom-sheet,webview,maps,firebase]
top:1
copyright:true
---

# React Native 常用第三方组件与插件学习文档

> 本文基于 **React Native 0.87.1**（2026-08 稳定，New Architecture 默认，Hermes V1）。第三方库版本经搜索核实：**React Navigation v7**（native 7.5.0 / core 7.24.0）、**Reanimated v4.7**（仅 New Architecture，需 `react-native-worklets`）、**Zustand v5.0.15**、**Gesture Handler v2**、**react-native-svg v15**、**MMKV v3**、**lottie-react-native v7**、**@gorhom/bottom-sheet v5**、**react-native-vector-icons v10**、**react-native-paper v5**、**TanStack Query v5**、**react-native-webview v13**、**safe-area-context v5**、**react-native-screens v4**。
> 核心组件看 `rn00_component.md`，本文聚焦**生态库**：从导航、状态、存储、网络，到动画、UI、媒体、设备能力。每个库都给「安装命令 + 基础用法 + 高阶用法 + 可直接运行的示例」，**覆盖 40+ 库，越多越全**。

---

## 目录

- [1. 为什么用第三方库 & 选型原则](#1-为什么用第三方库--选型原则)
- [2. 安装规范（expo install 优先）](#2-安装规范expo-install-优先)
- [3. React Navigation 导航（v7）](#3-react-navigation-导航v7)
- [4. Zustand 状态管理（v5）](#4-zustand-状态管理v5)
- [5. Redux Toolkit 状态管理](#5-redux-toolkit-状态管理)
- [6. MobX 状态管理](#6-mobx-状态管理)
- [7. AsyncStorage 本地存储](#7-asyncstorage-本地存储)
- [8. MMKV 高性能键值存储](#8-mmkv-高性能键值存储)
- [9. SQLite 本地数据库](#9-sqlite-本地数据库)
- [10. Axios 网络请求](#10-axios-网络请求)
- [11. TanStack Query 服务端状态](#11-tanstack-query-服务端状态)
- [12. Reanimated 动画（v4）](#12-reanimated-动画v4)
- [13. Gesture Handler 手势（v2）](#13-gesture-handler-手势v2)
- [14. 图标库（vector-icons / expo vector-icons）](#14-图标库vector-icons--expo-vector-icons)
- [15. react-native-paper UI 组件库](#15-react-native-paper-ui-组件库)
- [16. react-hook-form + zod 表单](#16-react-hook-form--zod-表单)
- [17. FastImage 图片加载](#17-fastimage-图片加载)
- [18. image-picker 图片选择](#18-image-picker-图片选择)
- [19. Vision Camera 相机](#19-vision-camera-相机)
- [20. react-native-svg 矢量图](#20-react-native-svg-矢量图)
- [21. Lottie 动画](#21-lottie-动画)
- [22. Skia 自绘引擎](#22-skia-自绘引擎)
- [23. react-native-maps 地图](#23-react-native-maps-地图)
- [24. WebView 内嵌网页](#24-webview-内嵌网页)
- [25. 社区组件：Slider / DateTimePicker / Checkbox](#25-社区组件slider--datetimepicker--checkbox)
- [26. Bottom Sheet 底部弹层](#26-bottom-sheet-底部弹层)
- [27. Toast 轻提示](#27-toast-轻提示)
- [28. react-native-permissions 权限](#28-react-native-permissions-权限)
- [29. device-info 设备信息](#29-device-info-设备信息)
- [30. 屏幕方向 & 震动反馈](#30-屏幕方向--震动反馈)
- [31. biometrics 生物识别](#31-biometrics-生物识别)
- [32. 推送通知](#32-推送通知)
- [33. safe-area-context 安全区](#33-safe-area-context-安全区)
- [34. react-native-screens 屏幕优化](#34-react-native-screens-屏幕优化)
- [35. i18n-js 国际化](#35-i18n-js-国际化)
- [36. react-native-config 环境变量](#36-react-native-config-环境变量)
- [37. BootSplash 启动屏](#37-bootsplash-启动屏)
- [38. 常用库速查表](#38-常用库速查表)
- [39. 常见坑与最佳实践](#39-常见坑与最佳实践)
- [40. 参考文档](#40-参考文档)

---

## 1. 为什么用第三方库 & 选型原则

RN 核心只提供 View/Text/FlatList 等基础件，**导航、状态、存储、动画、图标、地图**等都要靠生态库补齐。选型原则：

- **优先 Expo 维护或 Software Mansion / Infinite Red / Callstack 等大厂背书**的库。
- **看维护活跃度**：是否支持 New Architecture（Fabric），RN 0.82+ 已移除旧架构。
- **看下载量 / Issue 响应**：npm weekly downloads、GitHub stars。
- **能用纯 JS 就不用原生依赖**：减少 iOS/Android 双端编译负担。

---

## 2. 安装规范（expo install 优先）

```bash
# Expo 项目：自动匹配 SDK 兼容版本（强烈推荐）
npx expo install @react-navigation/native @react-navigation/native-stack

# 普通 RN（非 Expo）：用包管理器
npm install @react-navigation/native
# 或 yarn / pnpm / bun

# 含原生代码的库需额外 pod install（iOS）
cd ios && pod install
```

> **坑**：很多库（尤其带原生模块的）有**版本锁定**，用 `npm install X@latest` 可能和当前 RN/Expo SDK 冲突。**Expo 项目一律 `npx expo install`**，它会自动选兼容版本。

---

## 3. React Navigation 导航（v7）

RN 的事实标准导航库。v7（2026 稳定）包含 `native-stack`、`bottom-tabs`、`drawer` 等。

### 基础用法：栈导航 + 底部 Tab

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Button } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Home({ navigation }: any) {
  return (
    <Text onPress={() => navigation.navigate('Detail', { id: 1 })}>
      首页，点我去详情
    </Text>
  );
}

function Detail({ route }: any) {
  return <Text>详情 id={route.params.id}</Text>;
}

function Tabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

export function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Detail" component={Detail} options={{ title: '详情页' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### 高阶用法：类型安全路由、头部按钮、深层链接

```tsx
// 类型安全（v7 推荐）：定义路由参数类型，navigation.navigate 有提示
export type RootStackParamList = {
  Detail: { id: number };
  Tabs: undefined;
};

// 头部右侧按钮
<Stack.Screen
  name="Detail"
  component={Detail}
  options={({ navigation }) => ({
    headerRight: () => <Button title="编辑" onPress={() => navigation.setParams({ id: 2 })} />,
  })}
/>

// 深层链接配置（App.tsx 外）
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Tabs: 'home',
      Detail: 'detail/:id',
    },
  },
};
<NavigationContainer linking={linking}>...</NavigationContainer>
```

### 常用 API

| API | 说明 |
| --- | --- |
| `NavigationContainer` | 导航根容器（必包最外层） |
| `createNativeStackNavigator` | 原生栈（性能最好，推荐） |
| `createStackNavigator` | JS 栈（兼容旧） |
| `createBottomTabNavigator` | 底部 Tab |
| `createDrawerNavigator` | 侧边抽屉 |
| `navigation.navigate / push / goBack / setParams` | 跳转与参数 |
| `useNavigation / useRoute` | Hook 取导航/路由 |
| `linking` prop | 深层链接（Universal Links） |

> v7 仍兼容 v6 组件式 API；v8 在 alpha（静态配置方向），生产建议先锁 v7。

---

## 4. Zustand 状态管理（v5）

极简状态库，无 Provider、无 boilerplate，靠 selector 精细订阅。v5 要求 React 18+。

### 基础用法

```tsx
import { create } from 'zustand';

interface CounterStore {
  count: number;
  inc: () => void;
  reset: () => void;
}

// 注意 TS 下中间件用 create()() 双层括号
const useCounter = create<CounterStore>()((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set({ count: 0 }),
}));

function Counter() {
  const count = useCounter((s) => s.count); // 只订阅 count
  const inc = useCounter((s) => s.inc);
  return <Text onPress={inc}>计数 {count}</Text>;
}
```

### 高阶用法：持久化 + 多值浅订阅 + 中间件

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

const useUser = create(
  persist(
    (set) => ({
      name: '',
      age: 0,
      setUser: (name: string, age: number) => set({ name, age }),
    }),
    { name: 'user-store', storage: createJSONStorage(() => localStorage) }
  )
);

// 一次性选多个字段（用 useShallow 浅比较，避免无谓重渲）
function Profile() {
  const { name, age } = useUser(useShallow((s) => ({ name: s.name, age: s.age })));
  return <Text>{name} / {age}</Text>;
}

// 组件外读取/修改
useUser.getState().setUser('Tom', 20);
useUser.setState({ age: 21 });
```

> 移动端持久化用 `AsyncStorage`（见 §7）；SSR/Web 才用 `localStorage`。

---

## 5. Redux Toolkit 状态管理

若团队熟悉 Redux，用官方 Toolkit 降低样板。

```tsx
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';

const slice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: { inc: (s) => { s.value += 1; } },
});
const store = configureStore({ reducer: { counter: slice.reducer } });

function App() {
  return (
    <Provider store={store}>
      <Counter />
    </Provider>
  );
}
function Counter() {
  const value = useSelector((s: any) => s.counter.value);
  const dispatch = useDispatch();
  return <Text onPress={() => dispatch(slice.actions.inc())}>{value}</Text>;
}
```

---

## 6. MobX 状态管理

响应式，适合表单/复杂对象模型。

```tsx
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';

class Store {
  count = 0;
  constructor() { makeAutoObservable(this); }
  inc() { this.count += 1; }
}
const store = new Store();

const Counter = observer(() => <Text onPress={() => store.inc()}>{store.count}</Text>);
```

---

## 7. AsyncStorage 本地存储

RN 官方维护的异步键值存储（基于 SQLite）。

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

// 存
await AsyncStorage.setItem('token', 'abc');
// 取
const token = await AsyncStorage.getItem('token');
// 删 / 批量
await AsyncStorage.removeItem('token');
const pairs = await AsyncStorage.multiGet(['a', 'b']);

// 高阶：封装带 TTL 的缓存
async function setWithTTL(key: string, value: any, ttl = 3600) {
  await AsyncStorage.setItem(key, JSON.stringify({ value, exp: Date.now() + ttl * 1000 }));
}
```

---

## 8. MMKV 高性能键值存储

`react-native-mmkv`（v3）：C++ 实现，**比 AsyncStorage 快 10–30 倍**，同步 API。

```tsx
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'user' });

storage.set('token', 'abc');        // 同步写入
const token = storage.getString('token'); // 同步读取
storage.set('age', 20);
storage.getNumber('age');
storage.delete('token');
storage.clearAll();

// 高阶：与 Zustand persist 结合
import { StateStorage } from 'zustand/middleware';
const mmkvStorage: StateStorage = {
  getItem: (k) => storage.getString(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};
```

---

## 9. SQLite 本地数据库

本地关系型数据库，适合结构化数据与离线。优先 `expo-sqlite`（Expo）或 `@op-engineering/op-sqlite`（裸 RN）。

```tsx
// expo-sqlite（Expo 推荐，API 最现代）
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('app.db');
db.execSync('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT);');
db.runSync('INSERT INTO items (name) VALUES (?);', ['apple']);
const rows = db.getAllSync<{ id: number; name: string }>('SELECT * FROM items;');

// 高阶：事务
db.withTransactionSync(() => {
  db.runSync('INSERT INTO items (name) VALUES (?);', ['b']);
  db.runSync('UPDATE items SET name=? WHERE id=?;', ['c', 1]);
});
```

---

## 10. Axios 网络请求

```tsx
import axios from 'axios';

const api = axios.create({ baseURL: 'https://api.example.com', timeout: 10000 });

// 请求/响应拦截器（高阶）
api.interceptors.request.use((cfg) => {
  cfg.headers.Authorization = `Bearer ${getToken()}`;
  return cfg;
});

export async function getPosts() {
  const { data } = await api.get('/posts');
  return data;
}
```

---

## 11. TanStack Query 服务端状态

`@tanstack/react-query` v5：缓存、重试、后台刷新、分页，替代手写 loading/error 状态。

```tsx
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { Text, Button } from 'react-native';

const client = new QueryClient();

function Posts() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetch('https://api.example.com/posts').then((r) => r.json()),
  });
  if (isLoading) return <Text>加载中…</Text>;
  if (error) return <Text>出错</Text>;
  return <Text>共 {data.length} 条</Text>;
}

// 写操作 + 失效刷新
function AddPost() {
  const mutation = useMutation({
    mutationFn: (title: string) => fetch('/posts', { method: 'POST', body: JSON.stringify({ title }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['posts'] }),
  });
  return <Button title="添加" onPress={() => mutation.mutate('new')} />;
}

export function App() {
  return <QueryClientProvider client={client}><Posts /></QueryClientProvider>;
}
```

---

## 12. Reanimated 动画（v4）

Software Mansion 出品，声明式高性能动画（跑在工作线程）。**v4 仅支持 New Architecture，需 `react-native-worklets`**。

### 基础用法

```tsx
import { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { View, Button } from 'react-native';

function Box() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return (
    <View>
      <View style={[{ width: 80, height: 80, backgroundColor: 'tomato' }, style]} />
      <Button title="弹一下" onPress={() => (x.value = withSpring(150))} />
      <Button title="渐变" onPress={() => (x.value = withTiming(0, { duration: 600 }))} />
    </View>
  );
}
```

### 高阶用法：滚动联动 + v4 迁移要点

```tsx
import { useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';

// 滚动驱动 header 透明度
const offset = useSharedValue(0);
const headerStyle = useAnimatedStyle(() => ({
  opacity: interpolate(offset.value, [0, 100], [1, 0], Extrapolation.CLAMP),
}));

/*
 * v4 迁移要点（2026）：
 * 1) 依赖改为 react-native-reanimated@4 + react-native-worklets；
 * 2) babel.config.js 的 plugin 从 'react-native-reanimated/plugin'
 *    换成 'react-native-worklets/plugin'；
 * 3) worklet 函数从 react-native-worklets 导入；
 * 4) v3 API（shared value / useAnimatedStyle / withTiming / withSpring）
 *    基本不变，业务代码无需大改。
 */
```

### 常用 API

| API | 说明 |
| --- | --- |
| `useSharedValue` | 动画共享值（在工作线程） |
| `useAnimatedStyle` | 把共享值映射成样式 |
| `withTiming / withSpring / withDecay` | 动画曲线 |
| `interpolate` | 区间插值 |
| `useDerivedValue` | 派生值 |
| `runOnJS / runOnUI` | 线程切换 |

---

## 13. Gesture Handler 手势（v2）

现代手势库（同样 Software Mansion），替代旧 `PanResponder`。必须与 Reanimated 配合做动画手势。

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

function SwipeCard() {
  const tx = useSharedValue(0);
  const gesture = Gesture.Pan()
    .onUpdate((e) => { tx.value = e.translationX; })
    .onEnd((e) => { if (e.translationX > 120) tx.value = 300; else tx.value = 0; });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return <GestureDetector gesture={gesture}><Animated.View style={style} /></GestureDetector>;
}
```

> 手势库需要在入口包一层 `GestureHandlerRootView`（Expo 项目默认已包）。

---

## 14. 图标库（vector-icons / expo vector-icons）

```tsx
// 方案 A：react-native-vector-icons v10（裸 RN）
import Icon from 'react-native-vector-icons/Ionicons';
<Icon name="home" size={24} color="#3498db" />

// 方案 B：Expo 内置（无需额外安装）
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="settings" size={20} color="#333" />
```

> 自定义字体图标：把 `.ttf` 放入 `assets/fonts`，在 `react-native.config.js` 配 `assets` 并 `npx react-native-asset`。

---

## 15. react-native-paper UI 组件库

Material Design 组件库（v5），开箱即用的 Button/Card/TextInput/Modal 等。

```tsx
import { Provider as PaperProvider, Button, TextInput, Card, FAB } from 'react-native-paper';

export function App() {
  return (
    <PaperProvider>
      <Card>
        <Card.Title title="标题" />
        <Card.Content><TextInput label="用户名" /></Card.Content>
        <Card.Actions><Button onPress={() => {}}>确定</Button></Card.Actions>
      </Card>
      <FAB icon="plus" onPress={() => {}} style={{ position: 'absolute', right: 16, bottom: 16 }} />
    </PaperProvider>
  );
}
```

---

## 16. react-hook-form + zod 表单

```tsx
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput, Button, Text } from 'react-native';

const schema = z.object({ email: z.string().email(), age: z.coerce.number().min(0) });
type Form = z.infer<typeof schema>;

function FormScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });
  const onSubmit = (d: Form) => console.log(d);
  return (
    <>
      <Controller control={control} name="email" render={({ field }) => (
        <TextInput value={field.value} onChangeText={field.onChange} placeholder="邮箱" />
      )} />
      {errors.email && <Text>{errors.email.message}</Text>}
      <Button title="提交" onPress={handleSubmit(onSubmit)} />
    </>
  );
}
```

---

## 17. FastImage 图片加载

`react-native-fast-image`：基于 SDWebImage / Glide，支持缓存优先级、淡入、占位。

```tsx
import FastImage from 'react-native-fast-image';

<FastImage
  style={{ width: 100, height: 100 }}
  source={{ uri: 'https://img-common.aknot.uk/cover/land-07.jpg', priority: FastImage.priority.high }}
  resizeMode={FastImage.resizeMode.cover}
/>;
```

---

## 18. image-picker 图片选择

`react-native-image-picker`：调系统相册/相机。

```tsx
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const pick = async () => {
  const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
  if (res.assets) console.log(res.assets[0].uri);
};
```

---

## 19. Vision Camera 相机

`react-native-vision-camera`（现代相机，替代废弃的 `react-native-camera`）：

```tsx
import { Camera, useCameraDevices } from 'react-native-vision-camera';

function Cam() {
  const devices = useCameraDevices();
  const device = devices.back;
  if (!device) return null;
  return <Camera device={device} isActive style={{ flex: 1 }} photo={true} />;
}
```

---

## 20. react-native-svg 矢量图

`react-native-svg` v15：绘制矢量图形、自定义图表、图标。

```tsx
import Svg, { Circle, Rect, Path } from 'react-native-svg';

function Logo() {
  return (
    <Svg width={100} height={100} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={40} fill="#3498db" />
      <Rect x={30} y={30} width={40} height={40} fill="#fff" />
    </Svg>
  );
}
```

---

## 21. Lottie 动画

`lottie-react-native` v7：播放 AE 导出的 JSON 矢量动画。

```tsx
import LottieView from 'lottie-react-native';

<LottieView source={require('./loading.json')} autoPlay loop style={{ width: 120, height: 120 }} />;
```

---

## 22. Skia 自绘引擎

`@shopify/react-native-skia`：基于 Skia（Chrome/Flutter 同款），可绘制高性能自定义画布、粒子、Shader。

```tsx
import { Canvas, Circle, Fill } from '@shopify/react-native-skia';

<Canvas style={{ flex: 1 }}>
  <Fill color="#fff" />
  <Circle cx={100} cy={100} r={50} color="#e74c3c" />
</Canvas>;
```

---

## 23. react-native-maps 地图

```tsx
import { MapView, Marker } from 'react-native-maps';

<MapView
  style={{ flex: 1 }}
  initialRegion={{ latitude: 39.9, longitude: 116.4, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
>
  <Marker coordinate={{ latitude: 39.9, longitude: 116.4 }} title="北京" />
</MapView>;
```

---

## 24. WebView 内嵌网页

`react-native-webview` v13：在 App 内嵌 H5 页面、支付、客服。

```tsx
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: 'https://example.com' }}
  onMessage={(e) => console.log(e.nativeEvent.data)} // H5 与 RN 通信
  injectedJavaScript="window.ReactNativeWebView.postMessage('hi');"
  style={{ flex: 1 }}
/>;
```

---

## 25. 社区组件：Slider / DateTimePicker / Checkbox

```tsx
// 滑块 @react-native-community/slider
import Slider from '@react-native-community/slider';
<Slider minimumValue={0} maximumValue={100} onValueChange={(v) => console.log(v)} />

// 日期选择 @react-native-community/datetimepicker
import DateTimePicker from '@react-native-community/datetimepicker';
<DateTimePicker value={new Date()} mode="date" onChange={(e, d) => console.log(d)} />

// 复选框 @react-native-community/checkbox
import CheckBox from '@react-native-community/checkbox';
<CheckBox value={checked} onValueChange={setChecked} />
```

---

## 26. Bottom Sheet 底部弹层

`@gorhom/bottom-sheet` v5：丝滑底部抽屉（基于 Reanimated）。

```tsx
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useRef } from 'react';

function Sheet() {
  const ref = useRef<BottomSheetModal>(null);
  return (
    <>
      <Button title="打开" onPress={() => ref.current?.present()} />
      <BottomSheetModal ref={ref} snapPoints={['25%', '50%']}>
        <BottomSheetView><Text>底部弹层内容</Text></BottomSheetView>
      </BottomSheetModal>
    </>
  );
}
```

---

## 27. Toast 轻提示

`react-native-toast-message`：全局轻提示。

```tsx
import Toast from 'react-native-toast-message';

// 任意位置调用
Toast.show({ type: 'success', text1: '保存成功' });

// 入口挂载
<Toast />;
```

---

## 28. react-native-permissions 权限

```tsx
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const result = await request(PERMISSIONS.ANDROID.CAMERA);
if (result === RESULTS.GRANTED) console.log('已授权');
```

---

## 29. device-info 设备信息

```tsx
import DeviceInfo from 'react-native-device-info';

const id = DeviceInfo.getUniqueId();
const brand = DeviceInfo.getBrand();
const isEmulator = await DeviceInfo.isEmulator();
```

---

## 30. 屏幕方向 & 震动反馈

```tsx
// 屏幕方向 react-native-orientation-locker
import Orientation from 'react-native-orientation-locker';
Orientation.lockToLandscape();

// 震动 react-native-haptic-feedback（或 Expo: expo-haptics）
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
ReactNativeHapticFeedback.trigger('impactLight');
```

---

## 31. biometrics 生物识别

```tsx
// react-native-biometrics（或 Expo: expo-local-authentication）
import ReactNativeBiometrics from 'react-native-biometrics';
const rnBio = new ReactNativeBiometrics();
const { success } = await rnBio.simplePrompt({ promptMessage: '验证指纹' });
```

---

## 32. 推送通知

```tsx
// @react-native-firebase/messaging（Firebase 方案，推荐）
import messaging from '@react-native-firebase/messaging';

const token = await messaging().getToken();
const unsub = messaging().onMessage(async (remote) => console.log(remote.notification));

// 或轻量方案 react-native-push-notification
import PushNotification from 'react-native-push-notification';
PushNotification.localNotification({ title: '标题', message: '内容' });
```

---

## 33. safe-area-context 安全区

比核心 `SafeAreaView` 更强大，提供 `useSafeAreaInsets()`。

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Screen() {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} />;
}
```

---

## 34. react-native-screens 屏幕优化

启用原生级屏幕栈，提升导航内存与性能（React Navigation v7 已默认依赖）。

```tsx
import { enableScreens } from 'react-native-screens';
enableScreens(); // 应用入口调用一次
```

---

## 35. i18n-js 国际化

```tsx
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';
i18n.translations = { en: { home: 'Home' }, zh: { home: '首页' } };
i18n.locale = Localization.locale;
// 使用：i18n.t('home')
```

---

## 36. react-native-config 环境变量

```tsx
import Config from 'react-native-config';
const apiUrl = Config.API_URL; // 读取 .env

// .env
// API_URL=https://api.example.com
```

---

## 37. BootSplash 启动屏

`react-native-bootsplash`：自定义启动图，避免白屏。

```tsx
import BootSplash from 'react-native-bootsplash';

// 入口
BootSplash.hide({ fade: true });
```

---

## 38. 常用库速查表

| 库 | 用途 | 安装（Expo） |
| --- | --- | --- |
| `@react-navigation/native` + 子包 | 导航 | `npx expo install @react-navigation/native` |
| `zustand` | 状态管理 | `npx expo install zustand` |
| `@reduxjs/toolkit` + `react-redux` | 状态管理 | 按需 |
| `mobx` + `mobx-react-lite` | 响应式状态 | 按需 |
| `@react-native-async-storage/async-storage` | 键值存储 | `npx expo install ...` |
| `react-native-mmkv` | 高性能键值 | `npx expo install react-native-mmkv` |
| `expo-sqlite` / `@op-engineering/op-sqlite` | 本地数据库 | `npx expo install expo-sqlite` |
| `axios` | HTTP 客户端 | `npm i axios` |
| `@tanstack/react-query` | 服务端状态 | `npx expo install @tanstack/react-query` |
| `react-native-reanimated` | 动画（v4） | `npx expo install react-native-reanimated` |
| `react-native-gesture-handler` | 手势 | `npx expo install react-native-gesture-handler` |
| `react-native-vector-icons` / `@expo/vector-icons` | 图标 | 内置/@expo |
| `react-native-paper` | Material UI | `npx expo install react-native-paper` |
| `react-hook-form` + `zod` | 表单校验 | `npm i react-hook-form zod` |
| `react-native-fast-image` | 图片缓存 | `npx expo install react-native-fast-image` |
| `react-native-image-picker` | 选图/拍照 | `npx expo install react-native-image-picker` |
| `react-native-vision-camera` | 相机 | `npx expo install react-native-vision-camera` |
| `react-native-svg` | 矢量图 | `npx expo install react-native-svg` |
| `lottie-react-native` | 矢量动画 | `npx expo install lottie-react-native` |
| `@shopify/react-native-skia` | 自绘引擎 | `npx expo install @shopify/react-native-skia` |
| `react-native-maps` | 地图 | `npx expo install react-native-maps` |
| `react-native-webview` | 内嵌网页 | `npx expo install react-native-webview` |
| `@react-native-community/slider` | 滑块 | `npx expo install ...slider` |
| `@react-native-community/datetimepicker` | 日期选择 | `npx expo install ...datetimepicker` |
| `@react-native-community/checkbox` | 复选框 | `npx expo install ...checkbox` |
| `@gorhom/bottom-sheet` | 底部弹层 | `npx expo install @gorhom/bottom-sheet` |
| `react-native-toast-message` | 轻提示 | `npm i react-native-toast-message` |
| `react-native-permissions` | 权限 | `npx expo install react-native-permissions` |
| `react-native-device-info` | 设备信息 | `npx expo install react-native-device-info` |
| `react-native-orientation-locker` | 屏幕方向 | `npx expo install react-native-orientation-locker` |
| `react-native-haptic-feedback` | 震动反馈 | `npx expo install react-native-haptic-feedback` |
| `react-native-biometrics` | 生物识别 | `npx expo install react-native-biometrics` |
| `@react-native-firebase/messaging` | 推送 | `npx expo install @react-native-firebase/messaging` |
| `react-native-safe-area-context` | 安全区 | `npx expo install react-native-safe-area-context` |
| `react-native-screens` | 屏幕优化 | `npx expo install react-native-screens` |
| `i18n-js` + `expo-localization` | 国际化 | `npx expo install i18n-js expo-localization` |
| `react-native-config` | 环境变量 | `npm i react-native-config` |
| `react-native-bootsplash` | 启动屏 | `npx expo install react-native-bootsplash` |

---

## 39. 常见坑与最佳实践

1. **第三方库版本要锁兼容**：Expo 项目用 `npx expo install`，别直接 `@latest`，否则原生模块不匹配 RN/SDK。
2. **New Architecture 兼容**：RN 0.82+ 移除旧架构，选库时确认支持 Fabric（Reanimated v4、Gesture Handler v2 都满足）。
3. **Reanimated v4 需 worklets**：Babel plugin 改成 `react-native-worklets/plugin`，并安装 `react-native-worklets`。
4. **MMKV 同步 API 别在首屏阻塞**：批量读写放后台或 `runOnUI`。
5. **Zustand selector 要选最小切片**：避免 `useStore()` 全量订阅导致整页重渲；多值用 `useShallow`。
6. **React Navigation 嵌套别过深**：超过 3 层栈会拖慢转场，考虑 `navigation.setOptions` 动态改头。
7. **WebView 通信走 `postMessage`/`onMessage`**：注意 iOS/Android 字符串格式差异。
8. **地图/相机等需配置原生权限**：iOS 在 `Info.plist`、Android 在 `AndroidManifest.xml` 声明。
9. **TanStack Query 设 `staleTime`**：避免频繁无效刷新；列表用 `getNextPageParam` 做分页。
10. **带原生模块的库 iOS 要 `pod install`**：改了依赖记得重跑。

---

## 40. 参考文档

- React Navigation 官方文档：[https://reactnavigation.org/](https://reactnavigation.org/)
- Zustand GitHub：[https://github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)
- Redux Toolkit 文档：[https://redux-toolkit.js.org/](https://redux-toolkit.js.org/)
- MobX 文档：[https://mobx.js.org/](https://mobx.js.org/)
- AsyncStorage 文档：[https://react-native-async-storage.github.io/async-storage/](https://react-native-async-storage.github.io/async-storage/)
- MMKV 文档：[https://github.com/mrousavy/react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)
- expo-sqlite 文档：[https://docs.expo.dev/versions/latest/sdk/sqlite/](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- Axios 文档：[https://axios-http.com/](https://axios-http.com/)
- TanStack Query 文档：[https://tanstack.com/query/latest](https://tanstack.com/query/latest)
- Reanimated 文档：[https://docs.swmansion.com/react-native-reanimated/](https://docs.swmansion.com/react-native-reanimated/)
- Worklets 文档：[https://docs.swmansion.com/react-native-worklets/](https://docs.swmansion.com/react-native-worklets/)
- Gesture Handler 文档：[https://docs.swmansion.com/react-native-gesture-handler/](https://docs.swmansion.com/react-native-gesture-handler/)
- react-native-vector-icons：[https://github.com/oblador/react-native-vector-icons](https://github.com/oblador/react-native-vector-icons)
- react-native-paper：[https://callstack.github.io/react-native-paper/](https://callstack.github.io/react-native-paper/)
- react-hook-form：[https://react-hook-form.com/](https://react-hook-form.com/)
- Zod 文档：[https://zod.dev/](https://zod.dev/)
- FastImage：[https://github.com/DylanVann/react-native-fast-image](https://github.com/DylanVann/react-native-fast-image)
- Vision Camera：[https://react-native-vision-camera.com/](https://react-native-vision-camera.com/)
- react-native-svg：[https://github.com/software-mansion/react-native-svg](https://github.com/software-mansion/react-native-svg)
- Lottie React Native：[https://github.com/lottie-react-native/lottie-react-native](https://github.com/lottie-react-native/lottie-react-native)
- Skia：[https://shopify.github.io/react-native-skia/](https://shopify.github.io/react-native-skia/)
- react-native-maps：[https://github.com/react-native-maps/react-native-maps](https://github.com/react-native-maps/react-native-maps)
- react-native-webview：[https://github.com/react-native-webview/react-native-webview](https://github.com/react-native-webview/react-native-webview)
- @gorhom/bottom-sheet：[https://github.com/gorhom/react-native-bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet)
- react-native-toast-message：[https://github.com/calintamas/react-native-toast-message](https://github.com/calintamas/react-native-toast-message)
- react-native-permissions：[https://github.com/zoontek/react-native-permissions](https://github.com/zoontek/react-native-permissions)
- react-native-device-info：[https://github.com/learn-more/react-native-device-info](https://github.com/learn-more/react-native-device-info)
- safe-area-context：[https://github.com/th3rdwave/react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context)
- react-native-screens：[https://github.com/software-mansion/react-native-screens](https://github.com/software-mansion/react-native-screens)
- Firebase Messaging：[https://rnfirebase.io/messaging/usage](https://rnfirebase.io/messaging/usage)
- React Native 第三方库推荐清单：[https://reactnative.dev/docs/libraries](https://reactnative.dev/docs/libraries)
