---
title: React Native 基础（语言 + 核心 API）学习文档
create:2026-10-23
update:2026-10-23
category:react
cover:https://img-common.aknot.uk/cover/land-07.jpg
tags:[react-native,rn,mobile,javascript,typescript,harmony,basic]
summary:React Native 0.87 基础学习文档，覆盖 JavaScript/TypeScript 语言层（变量、数据类型、运算符、流程控制、函数、异步、TS 类型/接口/泛型/类型收窄）与 RN 核心 API（JSX、组件、Props、State、StyleSheet/Flexbox、核心组件、列表渲染、平台 API、常用 Hook、调试），每节均含可直接运行的示例
keywords:[react-native,rn,javascript,typescript,jsx,component,props,state,stylesheet,flexbox,flatlist,hermes,new-architecture]
top:1
copyright:true
---

# React Native 基础（语言 + 核心 API）学习文档

> 本文基于 **React Native 0.87.1**（2026-08 发布的稳定版，peer 依赖 React ^19.2.3，Node 22.13+）。自 0.76 起 **New Architecture（Fabric + TurboModules + JSI）为默认**，0.82 起旧 Bridge 架构被彻底移除，0.84 起 **Hermes V1** 为默认 JS 引擎，0.87 起 **Strict TypeScript API** 成为默认 JavaScript API。
> 文档分两大部分：**第一部分「语言基础」是 RN 的骨架（JS/TS 的数据类型、运算符、函数、异步）**；**第二部分「RN 核心 API」是把语言落到移动端的写法（JSX、组件、Props、State、样式、核心组件、列表、平台 API、调试）**。每节都给出可直接跑的示例，初学者按 §1→§25 顺序读即可。

---

## 1. React Native 是什么 & 与 Web React 的区别

React Native 用 **React 的组件模型 + JavaScript/TypeScript** 写 iOS / Android /（OpenHarmony 等）原生 App，但它渲染的是**真实原生控件**（不是 WebView），所以外观与手感接近原生。

| 维度 | Web React | React Native |
| --- | --- | --- |
| 渲染目标 | DOM（`div`/`span`） | 原生视图（`View`/`Text`） |
| 样式 | CSS | `StyleSheet`（类 CSS 的 JS 对象，Flexbox 为主） |
| 运行环境 | 浏览器 | 原生（Hermes 引擎 + JSI 直接调用原生） |
| 单位 | `px` / `rem` | 无单位，逻辑像素（dp）；`px` 会被当作 dp |
| 入口 | `index.html` | `index.js` → `App` 组件 |

> **New Architecture 要点**：Fabric（新渲染器，同步、并发友好）+ TurboModules（懒加载原生模块，JSI 直接通信，不再是异步 Bridge 批处理）+ Codegen（按 TS/JS 接口自动生成原生绑定）。新项目默认就是 New Arch，无需任何配置。

---

## 2. 环境准备与创建项目

```bash
# 前置：Node 22.13+（RN 0.87 硬性要求）
node -v

# 方式一：官方 React Native CLI（推荐用于需要原生定制的项目）
npx @react-native-community/cli@latest init MyApp --pm npm

# 指定版本（0.72.5 是最后一个内置 OpenHarmony/鸿蒙支持的版本）
npx @react-native-community/cli init MyApp --version 0.72.5

# 方式二：Expo（SDK 新版默认启用 New Architecture，适合快速起步）
npx create-expo-app@latest MyApp
```

```bash
# 运行（CLI 项目）
npm run android      # 需要已连接设备或模拟器
npm run ios          # macOS + Xcode
# 鸿蒙（仅 0.72.5 等含鸿蒙支持的版本）
hdc list targets
npm run harmony
```

> 本机若用 pnpm，可用 `--pm pnpm`；若用 monorepo，官方 CLI 支持 `--skip-install --skip-git-init` 后再手动接入。

---

## 3. 项目结构与入口

```tsx
// index.js —— 注册根组件（CLI 项目默认存在）
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

```tsx
// App.tsx —— 你的根组件（一切从这里开始）
import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View>
      <Text>Hello React Native!</Text>
    </View>
  );
}
```

> 关键认知：**RN 没有 HTML 文件**。`App` 是一个返回 JSX 的函数组件，`AppRegistry.registerComponent` 把它挂到原生根视图上。Metro 是 RN 的打包器（对标 Web 的 webpack/Vite）。

---

## 4. 变量声明：let / const / var

```tsx
let count = 0;          // 可重新赋值（块级作用域）
count = 1;

const name = 'RN';      // 常量绑定（块级作用域），引用不可变
// name = 'x';          // ❌ TypeError: Assignment to constant variable

var legacy = 1;         // 函数作用域（会变量提升），现代代码尽量不用
```

> **坑**：`const` 只保证「绑定不变」，对象/数组内部仍可改：`const o = {a:1}; o.a = 2;` 合法。要彻底只读请用 `Object.freeze` 或 `as const`。

---

## 5. 基础数据类型

JavaScript 有 **7 种原始类型 + object**：

```tsx
const n: number   = 42;        // 数字（无 int/float 之分，均为双精度浮点）
const b: bigint   = 42n;       // 大整数（精度无损，不能和 number 混算）
const s: string   = 'RN';      // 字符串
const ok: boolean = true;      // 布尔
const nu: null    = null;      // 空值（已明确赋值「无」）
const un: undefined = undefined; // 未定义（变量声明未赋值）
const sym: symbol = Symbol('id'); // 唯一标识，常做对象键

const obj = { a: 1 };          // object（含 array / function / 普通对象）
```

```tsx
// 类型判断
typeof 42;        // 'number'
typeof 'x';       // 'string'
typeof null;      // 'object'  ⚠️ 历史 bug，需用 === null 判断
Array.isArray([]); // true
```

> **NaN 陷阱**：`typeof NaN === 'number'`，判断用 `Number.isNaN(x)` 而非 `x === NaN`（`NaN !== NaN`）。

---

## 6. 字符串与模板字面量

```tsx
const name = 'RN';
const msg = `Hello ${name}, version ${0.87}`; // 模板字面量（反引号 + ${}）

'abc'.toUpperCase();          // 'ABC'
'  hi  '.trim();              // 'hi'
'apple,banana'.split(',');    // ['apple', 'banana']
'abc'.includes('b');          // true
`x`.padStart(3, '0');         // '00x'
```

> RN 的 `Text` 组件只接受**字符串**，数字需转字符串：`{String(42)}` 或直接 `${42}` 模板。

---

## 7. 数组：创建与常用方法

```tsx
const arr = [1, 2, 3];

arr.map(x => x * 2);            // [2,4,6]     映射
arr.filter(x => x > 1);         // [2,3]       过滤
arr.reduce((s, x) => s + x, 0); // 6           累加
arr.find(x => x === 2);         // 2           查找首个匹配
arr.some(x => x > 2);           // true        存在
arr.every(x => x > 0);          // true        全部
[3,1,2].sort((a,b) => a-b);     // [1,2,3]     ⚠️ 默认按字符串排，要传比较函数
[...arr, 4];                    // [1,2,3,4]   展开
arr.includes(2);                // true
```

> **坑**：`sort()` 默认把元素转字符串再比，`[10,2].sort()` 得 `[10,2]`。永远传 `(a,b)=>a-b`（升序）。

---

## 8. 对象、解构与展开

```tsx
const user = { id: 1, name: 'A', age: 20 };

// 解构
const { name, age } = user;

// 重命名 + 默认值
const { name: userName, email = 'no@email' } = user;

// 展开（浅拷贝 + 覆盖）
const next = { ...user, age: 21 };   // {id:1, name:'A', age:21}

// 解构函数参数（RN 中 Props 常用）
function greet({ name, age }: { name: string; age: number }) {
  return `${name} is ${age}`;
}
```

---

## 9. 运算符：可选链与空值合并

```tsx
const obj = { a: { b: 1 } };

obj?.a?.b;          // 1   可选链：任意一环为 null/undefined 直接返回 undefined
obj?.x?.y;          // undefined（不报错）

const v = obj.x?.y ?? 'default';  // 空值合并：仅 null/undefined 时取默认值
// 区别：|| 会在 0 / '' / false 时也取默认值，?? 不会
const n = 0;
n || 10;   // 10   （0 被当作 falsy）
n ?? 10;   // 0    （0 不是 null/undefined）
```

> `?.` 和 `??` 是 RN/现代 JS 高频运算符，处理嵌套数据（如 API 返回）必备。

---

## 10. 流程控制

```tsx
// if / else if / else
if (score >= 90) {
  grade = 'A';
} else if (score >= 60) {
  grade = 'B';
} else {
  grade = 'C';
}

// switch
switch (platform) {
  case 'ios':   return 'iOS';
  case 'android': return 'Android';
  default:      return 'unknown';
}

// for / for...of（可迭代）/ for...in（枚举键）
for (let i = 0; i < arr.length; i++) {}
for (const item of arr) {}        // 推荐遍历数组
for (const key in obj) {}         // 遍历对象可枚举键

while (n > 0) { n--; }
```

> 遍历对象值用 `Object.values(obj)` 或 `for (const v of Object.values(obj))`，别用 `for...in` 拿值（拿到的是键名）。

---

## 11. 函数：声明 / 箭头 / 默认参数 / 剩余参数 / 回调

```tsx
// 函数声明（会被提升）
function add(a: number, b: number): number {
  return a + b;
}

// 箭头函数（无自己的 this，RN 回调首选）
const multiply = (a: number, b: number) => a * b;

// 默认参数
const greet = (name: string, prefix = 'Hello') => `${prefix}, ${name}`;

// 剩余参数
const sum = (...nums: number[]) => nums.reduce((s, x) => s + x, 0);
sum(1, 2, 3); // 6

// 回调函数（RN 事件处理的核心形态）
const handlePress = (onDone: () => void) => {
  // 做事…
  onDone();
};
```

> **坑**：类方法 / 对象方法里用 `function` 会有 `this` 绑定问题；事件中永远用箭头函数或 `.bind(this)`。函数组件里基本不用 `this`，配合 Hook 即可。

---

## 12. 异步：Promise 与 async/await

```tsx
// Promise
fetch('https://api.example.com/users')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// async/await（推荐，读起来像同步）
async function loadUsers() {
  try {
    const res = await fetch('https://api.example.com/users');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('加载失败', err);
    return [];
  }
}
```

> RN 内置 `fetch`（基于原生网络栈）。注意 `await` 只能在 `async` 函数内；事件回调若要 `await`，写成 `onPress={async () => { ... }}`。

---

## 13. TypeScript 基础类型注解

```tsx
let age: number = 18;
let name: string = 'RN';
let active: boolean = true;
let ids: number[] = [1, 2, 3];      // 数组
let tuple: [string, number] = ['v', 1]; // 元组（固定长度+类型）
let level: 'low' | 'high' = 'low';  // 字面量联合类型
let anything: any = 1;              // 绕过检查（尽量少用）
let unknownVal: unknown = 'x';      // 比 any 安全：用前必须收窄
```

> RN 0.87 默认 **Strict TypeScript API**，类型能帮你提前发现 Props/状态错配。新项目直接用 `.tsx` + 类型注解。

---

## 14. 接口与类型别名

```tsx
// interface 描述对象/组件 Props 形状
interface User {
  id: number;
  name: string;
  email?: string;        // 可选
  readonly token: string; // 只读
}

// type 别名（与 interface 多数场景等价，更灵活）
type ID = number | string;
type Point = { x: number; y: number };

const u: User = { id: 1, name: 'A', token: 't' };
```

> RN 中**组件 Props 几乎都用 interface 定义**，这是和 Web React 一致的最佳实践。

---

## 15. 泛型与类型收窄

```tsx
// 泛型函数
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
first<number>([1, 2]); // 1

// 类型收窄（用前确保类型安全）
function print(v: string | number) {
  if (typeof v === 'string') {
    console.log(v.toUpperCase()); // 此处 v 被收窄为 string
  } else {
    console.log(v.toFixed(2));     // 此处 v 为 number
  }
}
//TypeScript的类型谓词（type guard），作用是：`x is User` 告诉编译器 
//—— 如果函数返回 `true`，后面就可以把 `x` 当 `User` 用
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x;
}
```

> `x is User` 是**类型谓词**，配合 `if (isUser(x))` 可在分支内获得精确类型——处理 API 返回时极有用。

---

## 16. JSX 与组件基础（函数组件 / Props / Children）

```tsx
import React from 'react';
import { View, Text } from 'react-native';

// 定义 Props 类型
interface GreetingProps {
  name: string;
  bold?: boolean;
  children?: React.ReactNode; // 包裹的子内容
}

// 函数组件（首字母大写）
function Greeting({ name, bold, children }: GreetingProps) {
  return (
    <View>
      <Text style={bold ? { fontWeight: 'bold' } : undefined}>
        Hello {name}
      </Text>
      {children}
    </View>
  );
}

// 使用
<Greeting name="RN" bold>额外内容</Greeting>;
```

> 组件 = 返回 JSX 的函数。JSX 里的 `{}` 用来嵌入 JS 表达式（不能是语句）。`style` 属性接收对象（后面 §18 详述）。

---

## 17. State 与事件

```tsx
import React, { useState } from 'react';
import { View, Text, Button, TextInput } from 'react-native';

function Counter() {
  const [count, setCount] = useState(0);     // 状态 + 更新函数
  const [text, setText] = useState('');

  return (
    <View>
      <Text>点击了 {count} 次</Text>
      <Button title="+" onPress={() => setCount(count + 1)} />
      <TextInput
        value={text}
        onChangeText={setText}   // 受控输入
        placeholder="输入…"
      />
    </View>
  );
}
```

> `useState` 是 RN 最常用的 Hook（完整 Hook 清单见 `react_built_hook.md`）。`onPress`/`onChangeText` 是事件回调，命名随组件而定。

---

## 18. 样式系统：StyleSheet 与 Flexbox

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function Box() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>标题</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,            // 占满父容器
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',   // 主轴方向：row 横向 / column 纵向（默认）
    justifyContent: 'center', // 主轴对齐
    alignItems: 'center',     // 交叉轴对齐
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});
```

```tsx
// 行内样式 / 多样式合并（数组，后者覆盖前者）
<View style={[styles.container, { marginTop: 8 }]} />
```

> **Flexbox 三件套**：`flexDirection`（主轴）、`justifyContent`（主轴排布）、`alignItems`（交叉轴排布）。`flex: 1` 表示占满剩余空间。RN 默认 `display: 'flex'`，无需写。

---

## 19. 核心组件速查

| 组件 | 用途 | 关键属性 |
| --- | --- | --- |
| `View` | 容器（对标 `div`） | `style` |
| `Text` | 文本（**必须包在 Text 内**才能显示） | `style`、`numberOfLines`、`onPress` |
| `Image` | 图片 | `source={{ uri }}`、`resizeMode` |
| `ScrollView` | 滚动容器（少量内容） | `horizontal`、`contentContainerStyle` |
| `FlatList` | 高性能长列表 | `data`、`renderItem`、`keyExtractor` |
| `TextInput` | 输入框 | `value`、`onChangeText`、`placeholder` |
| `Button` | 系统按钮 | `title`、`onPress` |
| `Pressable` | 可按压（自定义反馈） | `onPress`、`style` 函数 |
| `TouchableOpacity` | 半透明按压反馈 | `onPress`、`activeOpacity` |

```tsx
import { Image, Pressable, TouchableOpacity } from 'react-native';

<Image source={{ uri: 'https://example.com/a.png' }} style={{ width: 100, height: 100 }} />
<TouchableOpacity onPress={() => {}}>
  <Text>点我</Text>
</TouchableOpacity>
<Pressable onPress={() => {}} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
  <Text>按压反馈</Text>
</Pressable>
```

> RN 没有 `div`/`span`；**所有文字都必须放在 `Text` 里**，否则白屏报错。这是 RN 与 Web 最容易踩的坑。

---

## 20. 列表渲染：FlatList

```tsx
import React from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';

interface Item { id: string; title: string; }

function List({ data }: { data: Item[] }) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}      // 稳定唯一 key
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text>{item.title}</Text>
        </View>
      )}
      ListEmptyComponent={<Text>暂无数据</Text>}
    />
  );
}
```

> 长列表**一律用 `FlatList`**（虚拟列表，只渲染可视区），别用 `ScrollView` 包 `map`，否则数据多会卡死。`keyExtractor` 必须稳定唯一。

---

## 21. 平台 API：Platform / Dimensions / useWindowDimensions

```tsx
import { Platform, Dimensions } from 'react-native';

Platform.OS;                 // 'ios' | 'android' | 'harmony'（鸿蒙等）
Platform.select({           // 按平台返回不同值
  ios: '#f00',
  android: '#0f0',
  default: '#00f',
});

const { width, height } = Dimensions.get('window'); // 屏幕尺寸

// 推荐：响应式尺寸 Hook（横竖屏切换自动更新）
import { useWindowDimensions } from 'react-native';
function C() {
  const { width } = useWindowDimensions();
  return <Text>{width}</Text>;
}
```

> 平台差异逻辑优先用 `Platform.select`，比 `if (Platform.OS === 'ios')` 更干净。

---

## 22. 常用 Hook 速览

```tsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

function Demo() {
  const [n, setN] = useState(0);
  const ref = useRef<number>(0);          // 可变引用，不触发重渲染

  useEffect(() => {                        // 副作用：挂载/更新/卸载
    const id = setInterval(() => setN(x => x + 1), 1000);
    return () => clearInterval(id);         // 清理
  }, []);                                  // 空依赖 = 仅挂载时执行

  const doubled = useMemo(() => n * 2, [n]);          // 缓存计算
  const onPress = useCallback(() => setN(0), []);      // 缓存函数

  return null;
}
```

> 完整 15 个内置 Hook（含 `useReducer`/`useContext`/`useImperativeHandle` 等）及场景代码见 `react_built_hook.md`，本篇只列 RN 最高频的 5 个。

---

## 23. 调试与开发者菜单

```tsx
// 1) 控制台日志（真机/模拟器可见）
console.log('debug', value);

// 2) 屏蔽开发期红色警告（谨慎使用）
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Warning: ...']);

// 3) 真机摇一摇 / 模拟器 Cmd+D 打开开发者菜单
//    - Reload / Fast Refresh
//    - Open React Native DevTools（0.76+ 取代 Flipper）
```

> RN 0.76 起调试统一用 **React Native DevTools**（Chrome DevTools Protocol）；旧 Flipper 插件生态逐步迁移。Fast Refresh 让你改代码不丢状态。

---

## 24. 常见坑与最佳实践

```tsx
// ❌ 1) == 类型强制转换，永远用 ===
0 == '';     // true
0 === '';    // false

// ❌ 2) 直接比较对象/数组（比的是引用）
{ a: 1 } === { a: 1 };  // false，用 JSON 或 lodash isEqual

// ❌ 3) 在 Text 外写文字
<View>hello</View>;     // 白屏报错，必须 <Text>hello</Text>

// ❌ 4) 在 render 中改 state 或用未初始化的 useState
// ✅ 5) 长列表用 FlatList 而非 ScrollView+map
// ✅ 6) 样式用 StyleSheet.create（有校验+性能优化），少用行内大对象
// ✅ 7) 大对象/数组状态用不可变更新（展开运算符），别直接 push
setList(prev => [...prev, newItem]);
```

> **浮点坑**：`0.1 + 0.2 === 0.30000000000000004`，金额用整数分或 `Intl.NumberFormat`/`Decimal.js`。

---

## 25. 参考文档

- [React Native 官方文档（入门）](https://reactnative.dev/docs/getting-started)
- [React Native 发布说明（0.87）](https://reactnative.dev/blog/2026/08/10/react-native-0.87)
- [New Architecture 指南](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [Hermes 引擎](https://reactnative.dev/docs/hermes)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript Handbook（Everyday Types）](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Expo 官方文档](https://docs.expo.dev/)
- [React 官方文档（组件/Hook 通用）](https://react.dev/reference/react)
- [React Hooks 参考](https://react.dev/reference/react/hooks)
- [MDN JavaScript 指南](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide)
- [MDN 运算符（可选链/空值合并）](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators)
- [FlatList 参考](https://reactnative.dev/docs/flatlist)
- [StyleSheet 参考](https://reactnative.dev/docs/stylesheet)
- [Platform 参考](https://reactnative.dev/docs/platform)
- [Dimensions 参考](https://reactnative.dev/docs/dimensions)
- [React Native DevTools](https://reactnative.dev/docs/react-native-devtools)
- [OpenHarmony / 鸿蒙 RN 适配（0.72.x 含支持）](https://gitee.com/openharmony-sig/community)
- [npm react-native 包](https://www.npmjs.com/package/react-native)
