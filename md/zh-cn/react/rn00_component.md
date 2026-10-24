---
title: React Native 常用组件（基础 + 高阶）学习文档
create:2026-10-23
update:2026-10-23
category:react
cover:https://img-common.aknot.uk/cover/land-41.jpg
tags:[react-native,rn,component,ui,mobile,harmony,view,text,flatlist,modal]
summary:React Native 0.87 常用组件全解学习文档，覆盖 View/Text/Image/TextInput/ScrollView/FlatList/SectionList/Pressable/TouchableOpacity/Button/Switch/ActivityIndicator/Modal/Alert/SafeAreaView/KeyboardAvoidingView/StatusBar/RefreshControl/Animated/Dimensions/Platform/Appearance/BackHandler/StyleSheet 等 30+ 组件，每个组件均含基础用法、高阶用法、常用属性表与可直接运行的 TSX 示例
keywords:[react-native,rn,view,text,image,textinput,scrollview,flatlist,pressable,touchableopacity,modal,statusbar,animated,components,ui]
top:1
copyright:true
---

# React Native 常用组件学习文档

> 本文基于 **React Native 0.87.1**（2026-08 发布的稳定版，peer 依赖 React ^19.2.3，Node 22.13+）。自 0.76 起 **New Architecture（Fabric + TurboModules + JSI）为默认**，0.82 起旧 Bridge 移除，0.84 起 **Hermes V1** 为默认 JS 引擎，0.87 起 **Strict TypeScript API** 默认开启。
> 组件是 RN 的砖块。本文按「**基础布局 → 文本与输入 → 滚动与列表 → 交互反馈 → 弹层与系统栏 → 动画与尺寸 → 平台与无障碍 → 第三方常用**」递进，覆盖 **30+ 组件**，每个组件都给「基础用法 + 高阶用法 + 常用属性表 + 可直接运行的示例」。**基础组件（View / Text / Image / TextInput / ScrollView / FlatList / Pressable / Button 等）已全覆盖**，并且组件越多越全越好。

---

## 目录

- [1. 组件总览与分类](#1-组件总览与分类)
- [2. View 基础容器](#2-view-基础容器)
- [3. Text 文本](#3-text-文本)
- [4. Image 图片](#4-image-图片)
- [5. ImageBackground 背景图](#5-imagebackground-背景图)
- [6. TextInput 输入框](#6-textinput-输入框)
- [7. ScrollView 滚动视图](#7-scrollview-滚动视图)
- [8. FlatList 高性能长列表](#8-flatlist-高性能长列表)
- [9. SectionList 分组列表](#9-sectionlist-分组列表)
- [10. VirtualizedList 底层虚拟列表](#10-virtualizedlist-底层虚拟列表)
- [11. Pressable 通用可按压](#11-pressable-通用可按压)
- [12. TouchableOpacity 透明度反馈](#12-touchableopacity-透明度反馈)
- [13. TouchableHighlight 高亮反馈](#13-touchablehighlight-高亮反馈)
- [14. TouchableWithoutFeedback 无视觉反馈](#14-touchablewithoutfeedback-无视觉反馈)
- [15. Button 原生按钮](#15-button-原生按钮)
- [16. Switch 开关](#16-switch-开关)
- [17. ActivityIndicator 加载指示器](#17-activityindicator-加载指示器)
- [18. ProgressBarAndroid / ProgressViewIOS 进度条](#18-progressbarandroid--progressviewios-进度条)
- [19. Modal 模态弹层](#19-modal-模态弹层)
- [20. Alert 对话框](#20-alert-对话框)
- [21. ActionSheetIOS iOS 动作面板](#21-actionsheetios-ios-动作面板)
- [22. ToastAndroid Android 轻提示](#22-toastandroid-android-轻提示)
- [23. SafeAreaView 安全区](#23-safeareaview-安全区)
- [24. KeyboardAvoidingView 键盘避让](#24-keyboardavoidingview-键盘避让)
- [25. Keyboard 键盘 API](#25-keyboard-键盘-api)
- [26. StatusBar 状态栏](#26-statusbar-状态栏)
- [27. RefreshControl 下拉刷新](#27-refreshcontrol-下拉刷新)
- [28. Animated 动画](#28-animated-动画)
- [29. Dimensions 屏幕尺寸](#29-dimensions-屏幕尺寸)
- [30. PixelRatio 像素比](#30-pixelratio-像素比)
- [31. Platform 平台判断](#31-platform-平台判断)
- [32. Appearance / useColorScheme 暗黑模式](#32-appearance--usecolorscheme-暗黑模式)
- [33. BackHandler Android 返回键](#33-backhandler-android-返回键)
- [34. AccessibilityInfo 无障碍](#34-accessibilityinfo-无障碍)
- [35. DrawerLayoutAndroid 抽屉](#35-drawerlayoutandroid-抽屉)
- [36. StyleSheet 样式表](#36-stylesheet-样式表)
- [37. 第三方常用组件速查](#37-第三方常用组件速查)
- [38. 常见坑与最佳实践](#38-常见坑与最佳实践)
- [39. 参考文档](#39-参考文档)

---

## 1. 组件总览与分类

RN 没有 `<div>`、`<span>`，一切都是原生组件。按用途分类：

| 类别 | 组件 |
| --- | --- |
| **布局容器** | `View`、`SafeAreaView`、`KeyboardAvoidingView`、`ScrollView` |
| **文本与输入** | `Text`、`TextInput` |
| **图片** | `Image`、`ImageBackground` |
| **列表** | `FlatList`、`SectionList`、`VirtualizedList` |
| **交互/触摸** | `Pressable`、`TouchableOpacity`、`TouchableHighlight`、`TouchableWithoutFeedback`、`Button`、`Switch` |
| **反馈/加载** | `ActivityIndicator`、`ProgressBarAndroid`、`ProgressViewIOS`、`Modal`、`Alert`、`RefreshControl` |
| **系统栏/状态** | `StatusBar` |
| **动画** | `Animated`（含 `Animated.View`/`Text`/`Image`/`ScrollView`） |
| **尺寸/平台** | `Dimensions`、`PixelRatio`、`Platform`、`Appearance`、`BackHandler`、`AccessibilityInfo` |

> 基础组件（View / Text / Image / TextInput / ScrollView / FlatList / Pressable / Button / Modal）是**必须掌握**的，本文每一节都给完整示例。

---

## 2. View 基础容器

`View` 是所有布局的基础，相当于 Web 的 `<div>`，但**只支持 Flexbox**。

### 基础用法

```tsx
import { View, Text, StyleSheet } from 'react-native';

export function Box() {
  return (
    <View style={styles.container}>
      <View style={styles.red} />
      <View style={styles.blue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', padding: 16, gap: 8 },
  red: { width: 60, height: 60, backgroundColor: '#e74c3c' },
  blue: { width: 60, height: 60, backgroundColor: '#3498db' },
});
```

### 高阶用法：测量与变换

```tsx
import { View, StyleSheet } from 'react-native';
import { useRef } from 'react';

export function TransformDemo() {
  const ref = useRef<View>(null);

  const measure = () => {
    ref.current?.measure((x, y, w, h, px, py) => {
      console.log('相对父级:', x, y, '尺寸:', w, h, '页面坐标:', px, py);
    });
  };

  return (
    <View
      ref={ref}
      onLayout={(e) => console.log('onLayout 尺寸:', e.nativeEvent.layout)}
      style={{
        width: 100, height: 100, backgroundColor: '#2ecc71',
        transform: [{ rotate: '15deg' }, { scale: 1.2 }], // 高阶：组合变换
        zIndex: 10,                                       // 层级
        pointerEvents: 'box-none',                        // 高阶：透传触摸
        opacity: 0.9,
      }}
    />
  );
}
```

### 常用属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `style` | `ViewStyle` | Flexbox 样式、背景、边框、阴影 |
| `onLayout` | `(e)=>void` | 布局完成后拿到 `x/y/width/height` |
| `onStartShouldSetResponder` | `()=>bool` | 手动接管触摸响应链 |
| `pointerEvents` | `'auto'\|'box-none'\|'none'\|'box-only'` | 触摸事件穿透控制 |
| `collapsable` | `boolean` | 无背景/子视图时可被 RN 优化移除（默认 true） |
| `removeClippedSubviews` | `boolean` | 裁剪屏幕外子视图，长列表性能优化 |
| `testID` | `string` | 自动化测试定位 |
| `accessibilityRole` | `string` | 无障碍角色（如 `'button'`） |

> **坑**：`View` 里不能直接放字符串文本，必须包 `<Text>`；`zIndex` 在同一 `position` 上下文内才生效。

---

## 3. Text 文本

`Text` 承载所有文字，支持嵌套、样式继承（子 `Text` 继承父 `Text` 部分样式）。

### 基础用法

```tsx
import { Text, StyleSheet } from 'react-native';

export function Hello() {
  return <Text style={styles.base}>Hello RN</Text>;
}

const styles = StyleSheet.create({
  base: { fontSize: 16, color: '#333' },
});
```

### 高阶用法：嵌套、省略号、可点击

```tsx
import { Text, StyleSheet, Pressable } from 'react-native';

export function RichText() {
  return (
    <Text style={styles.line} numberOfLines={2} ellipsizeMode="tail">
      这是一段很长的文本，超过两行会{' '}
      <Text style={styles.bold}>被截断</Text> 并显示省略号。
    </Text>
  );
}

export function Tappable() {
  return (
    <Text style={styles.link} onPress={() => console.log('clicked')}>
      点我跳转
    </Text>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 14, lineHeight: 22 },
  bold: { fontWeight: '700', color: '#e74c3c' },
  link: { color: '#3498db', textDecorationLine: 'underline' },
});
```

### 常用属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `numberOfLines` | `number` | 最大行数，配合 `ellipsizeMode` 省略 |
| `ellipsizeMode` | `'head'\|'middle'\|'tail'\|'clip'` | 省略位置 |
| `onPress` / `onLongPress` | `()=>void` | 文本也可点击 |
| `selectable` | `boolean` | 是否允许长按选择复制（默认 false） |
| `style` | `TextStyle` | 字体、颜色、对齐 |

> **坑**：文本必须用 `<Text>` 包裹，直接写 `<View>文字</View>` 会报错；`Text` 默认不继承父级字体大小，需显式设置或抽公共 `style`。

---

## 4. Image 图片

`Image` 既可以显示本地资源（`require`）也可以显示网络图片（`{uri}`）。

### 基础用法

```tsx
import { Image, StyleSheet } from 'react-native';

export function LocalImg() {
  // 本地资源：require 静态路径（不能是变量拼接）
  return <Image source={require('./logo.png')} style={styles.img} />;
}

export function NetworkImg() {
  return (
    <Image
      source={{ uri: 'https://img-common.aknot.uk/cover/land-41.jpg' }}
      style={styles.img}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  img: { width: 120, height: 120, borderRadius: 8 },
});
```

### 高阶用法：加载状态、淡入、预加载

```tsx
import { Image, ActivityIndicator, View, StyleSheet } from 'react-native';
import { useState } from 'react';

export function SmartImage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  return (
    <View style={styles.box}>
      {loading && <ActivityIndicator style={StyleSheet.absoluteFill} />}
      {err && <Text>加载失败</Text>}
      <Image
        source={{ uri: 'https://example.com/a.jpg' }}
        style={styles.img}
        resizeMode="contain"
        blurRadius={loading ? 4 : 0}              // 占位模糊
        progressiveRenderingEnabled              // iOS 渐进式
        onLoad={() => setLoading(false)}
        onError={() => { setErr(true); setLoading(false); }}
      />
    </View>
  );
}

// 高阶：提前预加载网络图（列表滚动前预热）
Image.prefetch('https://example.com/a.jpg');

const styles = StyleSheet.create({ box: { width: 200, height: 200 }, img: { flex: 1 } });
```

### 常用属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `source` | `{uri}` 或 `require()` | 网络或本地 |
| `resizeMode` | `'cover'\|'contain'\|'stretch'\|'repeat'\|'center'` | 缩放方式 |
| `defaultSource` | `require()` | 加载中的占位图（iOS） |
| `blurRadius` | `number` | 模糊半径 |
| `fadeDuration` | `number` | 淡入时长（Android，ms） |
| `onLoad` / `onError` / `onProgress` | 回调 | 加载生命周期 |

> **坑**：网络图**必须**显式设置 `width/height`，否则不显示；`require('./x.png')` 路径必须是字面量（打包期确定），不能拼接字符串。

---

## 5. ImageBackground 背景图

把图片当作容器背景，子元素叠在上面。

```tsx
import { ImageBackground, Text, StyleSheet } from 'react-native';

export function Card() {
  return (
    <ImageBackground
      source={{ uri: 'https://img-common.aknot.uk/cover/land-07.jpg' }}
      style={styles.bg}
      resizeMode="cover"
      imageStyle={{ borderRadius: 12 }}   // 只作用于图片本身
    >
      <Text style={styles.title}>封面卡片</Text>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { width: 220, height: 120, justifyContent: 'flex-end', padding: 12 },
  title: { color: '#fff', fontWeight: '700' },
});
```

---

## 6. TextInput 输入框

`TextInput` 是受控组件，`onChangeText` 拿值、`value` 回灌。

### 基础用法

```tsx
import { TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';

export function NameInput() {
  const [name, setName] = useState('');
  return (
    <TextInput
      style={styles.input}
      placeholder="请输入姓名"
      value={name}
      onChangeText={setName}
    />
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, height: 44 },
});
```

### 高阶用法：多行、键盘类型、焦点控制、安全输入

```tsx
import { TextInput, StyleSheet, Keyboard } from 'react-native';
import { useRef, useState } from 'react';

export function AdvancedInput() {
  const ref = useRef<TextInput>(null);
  const [pwd, setPwd] = useState('');

  return (
    <>
      <TextInput
        ref={ref}
        style={styles.input}
        placeholder="邮箱"
        keyboardType="email-address"     // 邮箱键盘
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => ref.current?.focus()} // 回车跳到下一个
      />
      <TextInput
        style={styles.input}
        placeholder="密码"
        secureTextEntry                    // 密码掩码
        value={pwd}
        onChangeText={setPwd}
        textContentType="password"
        onSubmitEditing={() => Keyboard.dismiss()}  // 收起键盘
      />
    </>
  );
}

const styles = StyleSheet.create({ input: { height: 44, borderBottomWidth: 1, marginVertical: 6 } });
```

### 常用属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `value` / `onChangeText` | `string` / `(t)=>void` | 受控值 |
| `placeholder` / `placeholderTextColor` | — | 占位符 |
| `keyboardType` | `'default'\|'email-address'\|'numeric'\|'phone-pad'\|...` | 软键盘类型 |
| `secureTextEntry` | `boolean` | 密码掩码 |
| `multiline` | `boolean` | 多行（高度自增） |
| `maxLength` | `number` | 最大长度 |
| `editable` | `boolean` | 是否可编辑 |
| `onSubmitEditing` | `(e)=>void` | 回车提交 |
| `blurOnSubmit` | `boolean` | 提交后失焦 |
| `selection` / `selectionColor` | — | 选中范围/光标色 |
| `inputAccessoryViewID` | `string` | 关联 iOS 顶部工具条 |

> **坑**：`onChangeText` 是唯一可靠取值方式，不要靠 `event.nativeEvent.text` 之外的旧 API；多行输入在 Android 高度需设 `textAlignVertical="top"` 才从顶部开始。

---

## 7. ScrollView 滚动视图

适合**内容不多**的滚动（内容会一次性全部渲染）。长列表请用 `FlatList`。

### 基础用法

```tsx
import { ScrollView, Text, StyleSheet } from 'react-native';

export function Page() {
  return (
    <ScrollView style={styles.box} contentContainerStyle={styles.content}>
      {Array.from({ length: 20 }).map((_, i) => (
        <Text key={i} style={styles.item}>第 {i + 1} 行</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1 },
  content: { padding: 16, gap: 8 },
  item: { fontSize: 16 },
});
```

### 高阶用法：横向 + 分页 + 下拉刷新 + 滚动监听

```tsx
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';

export function Banner() {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <ScrollView
      horizontal
      pagingEnabled                          // 整页翻动
      showsHorizontalScrollIndicator={false}
      snapToInterval={300}                   // 吸附到 300 宽度
      decelerationRate="fast"
      onScroll={(e) => {
        const x = e.nativeEvent.contentOffset.x; // 滚动监听
      }}
      scrollEventThrottle={16}               // 节流（ms）
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); }}
          tintColor="#3498db"
        />
      }
    >
      {[1, 2, 3].map((n) => (
        <View key={n} style={styles.slide}><Text>幻灯片 {n}</Text></View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ slide: { width: 300, height: 160, backgroundColor: '#ddd' } });
```

### 常用属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `horizontal` | `boolean` | 横向滚动 |
| `pagingEnabled` | `boolean` | 整页翻动 |
| `showsVerticalScrollIndicator` | `boolean` | 是否显示滚动条 |
| `refreshControl` | `ReactNode` | 下拉刷新控件 |
| `stickyHeaderIndices` | `number[]` | 吸顶的 item 下标 |
| `keyboardDismissMode` | `'none'\|'on-drag'\|'interactive'` | 拖拽收起键盘 |
| `onScroll` / `scrollEventThrottle` | — | 滚动回调（需设 throttle 才高频触发） |
| `contentContainerStyle` | `style` | 内容容器（区别于 ScrollView 本身） |

---

## 8. FlatList 高性能长列表

`FlatList` 是**虚拟列表**，只渲染可见项，万级数据也不卡。这是 RN 最常用的组件之一。

### 基础用法

```tsx
import { FlatList, Text, StyleSheet } from 'react-native';

type Item = { id: string; title: string };
const data: Item[] = Array.from({ length: 100 }, (_, i) => ({ id: String(i), title: `项 ${i}` }));

export function List() {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <Text style={styles.row}>{item.title}</Text>}
    />
  );
}

const styles = StyleSheet.create({ row: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' } });
```

### 高阶用法：分组头尾、上拉加载、分隔、性能调优

```tsx
import { FlatList, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useState } from 'react';

export function AdvancedList() {
  const [list, setList] = useState(data);
  const [loading, setLoading] = useState(false);

  const loadMore = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      setList((p) => [...p, ...moreData()]);
      setLoading(false);
    }, 800);
  };

  return (
    <FlatList
      data={list}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => <Text style={styles.row}>{item.title}</Text>}
      // —— 高阶组合件 ——
      ListHeaderComponent={<Text style={styles.header}>列表头部</Text>}
      ListFooterComponent={loading ? <ActivityIndicator /> : null}
      ListEmptyComponent={<Text>暂无数据</Text>}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      // —— 上拉加载 ——
      onEndReached={loadMore}
      onEndReachedThreshold={0.2}            // 距底部 20% 触发
      // —— 性能调优 ——
      initialNumToRender={10}                // 首屏渲染数
      windowSize={5}                         // 渲染窗口（屏高倍数）
      maxToRenderPerBatch={10}
      removeClippedSubviews={true}
      getItemLayout={(d, i) => ({ length: 56, offset: 56 * i, index: i })} // 定高优化
      numColumns={2}                         // 多列网格
    />
  );
}

const styles = StyleSheet.create({
  row: { height: 56, paddingHorizontal: 16, justifyContent: 'center' },
  header: { padding: 16, fontWeight: '700' },
  sep: { height: 1, backgroundColor: '#eee' },
});
```

### 常用属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `data` | `T[]` | 数据数组 |
| `renderItem` | `({item,index})=>Node` | 渲染单行 |
| `keyExtractor` | `(item,index)=>string` | 稳定 key |
| `ListHeader/Footer/Empty/ItemSeparatorComponent` | `component` | 组合件 |
| `onEndReached` / `onEndReachedThreshold` | — | 上拉触底加载 |
| `initialNumToRender` / `windowSize` / `maxToRenderPerBatch` | `number` | 性能三件套 |
| `getItemLayout` | `fn` | 定高跳过测量，提速 |
| `numColumns` | `number` | 多列 |
| `extraData` | `any` | 外部状态变化时强制刷新 |
| `refreshControl` | `node` | 下拉刷新（同 ScrollView） |

> **坑**：`keyExtractor` 必须返回**稳定唯一**字符串，否则会复用错乱；`FlatList` 每项默认有 `key`，但仍建议显式设置；列表卡顿先从 `getItemLayout` + `windowSize` 调起。

---

## 9. SectionList 分组列表

带分组标题的列表，适合通讯录、设置分组。

```tsx
import { SectionList, Text, StyleSheet } from 'react-native';

const sections = [
  { title: 'A', data: ['Alice', 'Anna'] },
  { title: 'B', data: ['Bob', 'Bella'] },
];

export function Contacts() {
  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, i) => item + i}
      renderSectionHeader={({ section }) => (
        <Text style={styles.header}>{section.title}</Text>
      )}
      renderItem={({ item }) => <Text style={styles.row}>{item}</Text>}
      stickySectionHeadersEnabled            // 分组头吸顶
    />
  );
}

const styles = StyleSheet.create({
  header: { fontWeight: '700', backgroundColor: '#f5f5f5', padding: 8 },
  row: { padding: 16 },
});
```

---

## 10. VirtualizedList 底层虚拟列表

`FlatList`/`SectionList` 都是基于它。**仅当你需要完全自定义数据结构**（如二维不规则数据）时才直接用。

```tsx
import { VirtualizedList, Text } from 'react-native';

export function CustomVList() {
  return (
    <VirtualizedList
      data={[10, 20, 30]}
      initialNumToRender={2}
      renderItem={({ item }) => <Text>{item}</Text>}
      getItem={(d, i) => d[i]}
      getItemCount={(d) => d.length}
      keyExtractor={(item, i) => String(i)}
    />
  );
}
```

> 普通业务**优先用 `FlatList`**，除非 `FlatList` 的数据模型无法直接表达。

---

## 11. Pressable 通用可按压

RN 0.63+ 推荐的新一代触摸组件，取代旧 `Touchable*`，提供**按压状态回调**，跨平台一致。

### 基础用法

```tsx
import { Pressable, Text, StyleSheet } from 'react-native';

export function Btn() {
  return (
    <Pressable style={styles.btn} onPress={() => console.log('tap')}>
      <Text style={styles.txt}>点我</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 12, backgroundColor: '#3498db', borderRadius: 8 },
  txt: { color: '#fff' },
});
```

### 高阶用法：按压态样式、长按、水波纹、命中区域

```tsx
import { Pressable, StyleSheet } from 'react-native';

export function RichPress() {
  return (
    <Pressable
      onPress={() => console.log('tap')}
      onLongPress={() => console.log('long')}   // 长按
      delayLongPress={500}                       // 长按延时
      hitSlop={{ top: 20, bottom: 20, left: 10, right: 10 }} // 扩大命中区
      android_ripple={{ color: '#00000030', borderless: true }} // Android 水波纹
      style={({ pressed }) => [
        styles.btn,
        pressed && styles.pressed,               // 按压态样式
      ]}
    >
      {({ pressed }) => <Text>{pressed ? '松开' : '按住'}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 14, backgroundColor: '#3498db' },
  pressed: { opacity: 0.6 },
});
```

### 常用属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `onPress` / `onLongPress` | 回调 | 点击 / 长按 |
| `delayLongPress` | `number` | 长按触发延时（ms） |
| `pressRetentionOffset` | `Rect` | 移出多远仍算按下 |
| `hitSlop` | `Rect` | 扩大可点区域 |
| `android_ripple` | `{color,borderless,radius}` | Android 水波纹 |
| `style` / `children` 函数式 | `(state)=>` | 接收 `{pressed,hovered,focused}` |

> **推荐**：新项目一律用 `Pressable`，它同时兼容 iOS/Android 且支持按压态，旧 `Touchable*` 会逐渐淘汰。

---

## 12. TouchableOpacity 透明度反馈

按压时降低透明度，是最常用的"老牌"交互组件（底层仍可用，但优先 `Pressable`）。

```tsx
import { TouchableOpacity, Text } from 'react-native';

export function OpacityBtn() {
  return (
    <TouchableOpacity
      activeOpacity={0.6}                  // 按下时的透明度
      onPress={() => console.log('tap')}
    >
      <Text>透明度按钮</Text>
    </TouchableOpacity>
  );
}
```

---

## 13. TouchableHighlight 高亮反馈

按下时显示底层颜色（如按钮反色）。

```tsx
import { TouchableHighlight, Text, StyleSheet } from 'react-native';

export function HighlightBtn() {
  return (
    <TouchableHighlight
      underlayColor="#2980b9"              // 按下时底色
      onPress={() => console.log('tap')}
      style={styles.btn}
    >
      <Text style={styles.txt}>高亮按钮</Text>
    </TouchableHighlight>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 12, borderRadius: 8, backgroundColor: '#3498db' },
  txt: { color: '#fff' },
});
```

---

## 14. TouchableWithoutFeedback 无视觉反馈

**不提供任何视觉反馈**，仅拦截触摸。官方建议尽量不用——用户感知不到点击。

```tsx
import { TouchableWithoutFeedback, View, Text } from 'react-native';

export function NoFeedback() {
  return (
    <TouchableWithoutFeedback onPress={() => console.log('tap')}>
      <View><Text>看不到反馈的点击区</Text></View>
    </TouchableWithoutFeedback>
  );
}
```

> **坑**：它必须包裹**单一**子节点；常用来配合点击空白收起键盘（`Keyboard.dismiss()`）。

---

## 15. Button 原生按钮

最简单的原生按钮，样式由系统决定（iOS/Android 外观不同），自定义能力弱。

```tsx
import { Button, Alert } from 'react-native';

export function NativeBtn() {
  return (
    <Button
      title="提交"
      color="#e74c3c"          // 仅能改主色，不能改尺寸/圆角
      onPress={() => Alert.alert('已提交')}
      disabled={false}
    />
  );
}
```

> 需要自定义外观请用 `Pressable` / `TouchableOpacity` 自己画。

---

## 16. Switch 开关

iOS/Android 原生开关，受控组件。

```tsx
import { Switch, View, Text } from 'react-native';
import { useState } from 'react';

export function Toggle() {
  const [on, setOn] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text>启用通知</Text>
      <Switch
        value={on}
        onValueChange={setOn}             // 直接拿到布尔
        trackColor={{ false: '#ccc', true: '#3498db' }}
        thumbColor={on ? '#fff' : '#f4f3f4'}
        ios_backgroundColor="#ccc"
      />
    </View>
  );
}
```

---

## 17. ActivityIndicator 加载指示器

转圈 loading，跨平台（iOS 自带风格 / Android Material）。

```tsx
import { ActivityIndicator, View } from 'react-native';

export function Loading() {
  return (
    <View style={{ padding: 20 }}>
      <ActivityIndicator size="large" color="#3498db" />
      {/* size 还可传数字，如 size={36} */}
    </View>
  );
}
```

---

## 18. ProgressBarAndroid / ProgressViewIOS 进度条

两个平台各自的进度条组件（注意不是跨平台统一组件）。

```tsx
import { ProgressBarAndroid, ProgressViewIOS, Platform, View, StyleSheet } from 'react-native';

export function Progress({ value }: { value: number }) {
  return (
    <View style={styles.box}>
      {Platform.OS === 'android' ? (
        <ProgressBarAndroid styleAttr="Horizontal" progress={value} color="#3498db" />
      ) : (
        <ProgressViewIOS progress={value} progressTintColor="#3498db" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ box: { height: 8 } });
```

> 跨平台统一进度条建议用社区库 `@react-native-community/slider` 或自定义 `View` 宽度。

---

## 19. Modal 模态弹层

覆盖在父视图之上的浮层，用于弹窗、选图、登录框。

### 基础用法

```tsx
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';

export function Dialog() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable style={styles.btn} onPress={() => setVisible(true)}>
        <Text>打开弹窗</Text>
      </Pressable>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.mask}>
          <View style={styles.card}>
            <Text>我是弹窗内容</Text>
            <Pressable onPress={() => setVisible(false)}>
              <Text>关闭</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
```

### 高阶用法：Android 返回键、状态栏穿透、半透明遮罩

```tsx
import { Modal, View, StyleSheet, BackHandler } from 'react-native';
import { useEffect } from 'react';

export function RobustModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();          // Android 物理返回键关闭
      return true;        // 拦截默认行为
    });
    return () => sub.remove();
  }, [visible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent               // 遮罩覆盖状态栏
      onRequestClose={onClose}           // Android 必需（否则警告）
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.mask}>
        <View style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.95)' }]} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 12, backgroundColor: '#3498db' },
  mask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { width: 280, padding: 24, borderRadius: 12, backgroundColor: '#fff' },
});
```

### 常用属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `visible` | `boolean` | 显示/隐藏 |
| `transparent` | `boolean` | 是否透明背景（可叠遮罩） |
| `animationType` | `'none'\|'slide'\|'fade'` | 进出场动画 |
| `onRequestClose` | `()=>void` | Android 返回/点击外关闭（必需） |
| `statusBarTranslucent` | `boolean` | 覆盖状态栏 |
| `presentationStyle` | `'fullScreen'\|'pageSheet'\|'formSheet'` | iOS 弹窗样式 |
| `supportedOrientations` | `string[]` | 支持的屏幕方向 |

---

## 20. Alert 对话框

跨平台弹窗，iOS 是原生 Alert，Android 是对话框。

```tsx
import { Alert } from 'react-native';

// 简单提示
Alert.alert('标题', '内容');

// 带按钮回调（最后一個按钮为「取消」高亮）
Alert.alert(
  '删除确认',
  '确定删除该项？',
  [
    { text: '取消', style: 'cancel' },
    { text: '删除', style: 'destructive', onPress: () => doDelete() },
  ],
  { cancelable: true, onDismiss: () => {} }
);

// iOS 文本输入（仅 iOS）
Alert.prompt('输入名字', '请输入', (text) => console.log(text));
```

---

## 21. ActionSheetIOS iOS 动作面板

iOS 专属底部动作面板。Android 通常用第三方或自定义 Modal 模拟。

```tsx
import { ActionSheetIOS } from 'react-native';

export function showSheet() {
  ActionSheetIOS.showActionSheetWithOptions(
    {
      options: ['取消', '拍照', '从相册选择'],
      cancelButtonIndex: 0,
      destructiveButtonIndex: 1,
      title: '选择图片来源',
    },
    (buttonIndex) => {
      if (buttonIndex === 1) openCamera();
      if (buttonIndex === 2) openAlbum();
    }
  );
}
```

---

## 22. ToastAndroid Android 轻提示

Android 专属短提示（iOS 无对应原生组件，常用第三方库）。

```tsx
import { ToastAndroid, Platform } from 'react-native';

export function toast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
    // 或 ToastAndroid.showWithGravity(msg, ToastAndroid.LONG, ToastAndroid.CENTER)
  }
}
```

---

## 23. SafeAreaView 安全区

避开刘海、圆角、状态栏、底部 Home Indicator。

```tsx
import { SafeAreaView, Text, StyleSheet } from 'react-native';

export function Screen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text>内容不会被刘海遮挡</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#fff' } });
```

> 也可配合 `useSafeAreaInsets()` 拿到具体 `top/bottom/left/right` 内边距做精细布局。

---

## 24. KeyboardAvoidingView 键盘避让

输入框被键盘遮挡时，自动上推内容。

```tsx
import { KeyboardAvoidingView, TextInput, Platform, StyleSheet } from 'react-native';

export function Chat() {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS 用 padding
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TextInput style={styles.input} placeholder="输入消息" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, input: { height: 44, borderTopWidth: 1 } });
```

---

## 25. Keyboard 键盘 API

手动控制键盘与监听。

```tsx
import { Keyboard, TextInput } from 'react-native';
import { useEffect, useState } from 'react';

export function KeyboardDemo() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  return <TextInput placeholder="点我弹出键盘" />;
}

// 主动收起键盘
Keyboard.dismiss();
```

---

## 26. StatusBar 状态栏

控制顶部系统栏（颜色、明暗、显隐）。

```tsx
import { StatusBar } from 'react-native';

export function App() {
  return (
    <>
      <StatusBar
        barStyle="dark-content"        // 文字深色（浅色背景用）
        backgroundColor="#ffffff"      // Android 背景色
        translucent={false}
        hidden={false}
      />
      {/* 也可命令式：StatusBar.setHidden(true) */}
    </>
  );
}
```

> `barStyle`：`'dark-content'`（深字，浅背景）/`'light-content'`（浅字，深背景）。iOS 仅控制文字色。

---

## 27. RefreshControl 下拉刷新

`./scrollview` 已展示，这里给出与 `FlatList` 配合的独立写法。

```tsx
import { FlatList, RefreshControl, Text } from 'react-native';
import { useState } from 'react';

export function Refreshable() {
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([1, 2, 3]);

  const onRefresh = async () => {
    setRefreshing(true);
    const fresh = await fetchData();
    setData(fresh);
    setRefreshing(false);
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(i) => String(i)}
      renderItem={({ item }) => <Text>{item}</Text>}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3498db']} />
      }
    />
  );
}
```

---

## 28. Animated 动画

RN 内置动画 API（核心动画用 `Animated.View`/`Text`/`Image`/`ScrollView`）。需要注意：**核心 `Animated` 默认在 JS 线程**，复杂动画建议用 `react-native-reanimated`（见 §37）。

### 基础用法：淡入

```tsx
import { Animated, Text, StyleSheet } from 'react-native';
import { useRef, useEffect } from 'react';

export function FadeIn() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,        // 尽量用原生驱动，避免掉帧
    }).start();
  }, []);

  return <Animated.View style={[styles.box, { opacity }]}><Text>淡入</Text></Animated.View>;
}

const styles = StyleSheet.create({ box: { padding: 20, backgroundColor: '#3498db' } });
```

### 高阶用法：插值、弹性、组合

```tsx
import { Animated, Easing } from 'react-native';
import { useRef } from 'react';

export function AdvancedAnim() {
  const anim = useRef(new Animated.Value(0)).current;

  const run = () => {
    anim.setValue(0);
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 600, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, friction: 4, useNativeDriver: true }),  // 弹性
    ]).start();
  };

  const translateX = anim.interpolate({           // 插值：0→1 映射 -100→0
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  return <Animated.View style={{ transform: [{ translateX }] }} />;
}
```

### 常用 API

| API | 说明 |
| --- | --- |
| `Animated.Value` / `ValueXY` | 动画值 |
| `Animated.timing` | 时间驱动（可缓动） |
| `Animated.spring` | 弹性物理动画 |
| `Animated.decay` | 惯性衰减 |
| `Animated.parallel/sequence/loop/stagger` | 组合多个动画 |
| `value.interpolate` | 输入区间映射到输出区间 |
| `useNativeDriver: true` | 原生线程驱动（仅支持 transform/opacity 等少数属性） |

> **坑**：`useNativeDriver:true` 只支持非布局属性（transform、opacity、backgroundColor），不支持 `height/width/left/top` 等；需要布局动画请用 Reanimated 或用 `LayoutAnimation`。

---

## 29. Dimensions 屏幕尺寸

```tsx
import { Dimensions, Text } from 'react-native';
import { useWindowDimensions } from 'react-native';

// 命令式（注意旋转后需监听）
const { width, height } = Dimensions.get('window');

// 推荐：响应式 Hook（旋转自动更新）
export function Responsive() {
  const { width, height } = useWindowDimensions();
  return <Text>屏幕 {width}x{height}</Text>;
}

// 监听变化
Dimensions.addEventListener('change', ({ window }) => console.log(window));
```

---

## 30. PixelRatio 像素比

处理高清屏下 1px 边框、字体缩放。

```tsx
import { PixelRatio, StyleSheet } from 'react-native';

const ratio = PixelRatio.get();         // 设备像素比，如 2 / 3
const fontScale = PixelRatio.getFontScale(); // 用户字体缩放
const onePx = PixelRatio.roundToNearestPixel(1 / ratio); // 真正的 1 物理像素

const styles = StyleSheet.create({
  hairline: { borderWidth: StyleSheet.hairlineWidth }, // 平台统一细线（推荐）
});
```

> 画 1px 细线请直接用 `StyleSheet.hairlineWidth`，它会自动按平台取整，避免模糊。

---

## 31. Platform 平台判断

```tsx
import { Platform, StyleSheet } from 'react-native';

// 1) 平台常量
if (Platform.OS === 'ios') { /* ... */ }
if (Platform.OS === 'android') { /* ... */ }

// 2) 版本判断（Android SDK / iOS 系统版本）
console.log(Platform.Version);

// 3) 按平台选值（推荐）
const styles = StyleSheet.create({
  box: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2 },
      android: { elevation: 4 },
    }),
  },
});

// 4) 平台专属代码文件（自动解析 .ios.tsx / .android.tsx）
//    import Comp from './Comp'; // 自动选 Comp.ios.tsx 或 Comp.android.tsx
```

---

## 32. Appearance / useColorScheme 暗黑模式

```tsx
import { useColorScheme, Appearance, Text, StyleSheet } from 'react-native';

export function ThemeAware() {
  const scheme = useColorScheme(); // 'light' | 'dark' | null
  const isDark = scheme === 'dark';
  return <Text style={{ color: isDark ? '#fff' : '#000' }}>当前主题：{scheme}</Text>;
}

// 命令式读取 / 监听
Appearance.getColorScheme();
Appearance.addChangeListener(({ colorScheme }) => console.log(colorScheme));
```

---

## 33. BackHandler Android 返回键

```tsx
import { BackHandler } from 'react-native';
import { useEffect } from 'react';

export function useBack(handler: () => boolean) {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [handler]);
}

// handler 返回 true 表示拦截（不退出 App），false 表示放行
```

---

## 34. AccessibilityInfo 无障碍

```tsx
import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

export function A11y() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return null;
}

// 查询：AccessibilityInfo.isScreenReaderEnabled()
```

> 配合组件 `accessibilityLabel` / `accessibilityRole` / `accessibilityHint` 提升无障碍体验。

---

## 35. DrawerLayoutAndroid 抽屉

Android 专属侧滑抽屉（iOS 一般用 `react-navigation` 的 drawer）。

```tsx
import { DrawerLayoutAndroid, Text, View, TouchableWithoutFeedback } from 'react-native';
import { useRef } from 'react';

export function Drawer() {
  const ref = useRef<DrawerLayoutAndroid>(null);
  const navView = (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 40 }}>
      <Text onPress={() => ref.current?.closeDrawer()}>关闭抽屉</Text>
    </View>
  );
  return (
    <DrawerLayoutAndroid
      ref={ref}
      drawerWidth={260}
      drawerPosition="left"
      renderNavigationView={() => navView}
    >
      <TouchableWithoutFeedback onPress={() => ref.current?.openDrawer()}>
        <View><Text>点我打开抽屉</Text></View>
      </TouchableWithoutFeedback>
    </DrawerLayoutAndroid>
  );
}
```

---

## 36. StyleSheet 样式表

样式本质就是普通 JS 对象，但用 `StyleSheet.create` 会做**优化与校验**。

```tsx
import { StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
  box: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 8, elevation: 2 },
});

// 常用工具
StyleSheet.flatten([styles.box, styles.card]); // 合并样式对象
StyleSheet.absoluteFill;                       // 等价 {position:'absolute',0,0,0,0}
StyleSheet.hairlineWidth;                      // 细线
StyleSheet.compose(s1, s2);                    // 合并（后者覆盖前者）
```

> 样式支持简写数组（后者覆盖前者，便于条件样式）：`style={[styles.box, focused && styles.focused]}`。

---

## 37. 第三方常用组件速查

核心组件不够时，社区生态补位（均通过 `npx expo install <pkg>` 安装，见 `rn00_expo.md`）：

| 组件/库 | 用途 |
| --- | --- |
| `@react-native-community/slider` | 跨平台滑块 |
| `react-native-vector-icons` / `@expo/vector-icons` | 图标 |
| `react-native-gesture-handler` | 高级手势（拖拽、缩放、滑动） |
| `react-native-reanimated` | 高性能声明式动画（取代核心 Animated 的复杂场景） |
| `react-native-screens` | 原生级屏幕栈，性能更好 |
| `@react-navigation/native` + `stack`/`bottom-tabs` | 路由导航 |
| `react-native-safe-area-context` | 更强大的安全区（`useSafeAreaInsets`） |
| `@react-native-picker/picker` | 下拉选择器 |
| `react-native-modal-datetime-picker` | 日期时间选择 |
| `@react-native-community/blur` | 毛玻璃 |

---

## 38. 常见坑与最佳实践

1. **文本必须包 `<Text>`**：`View` 内直接放字符串会抛红屏。
2. **网络图必须设宽高**：`Image` 不写尺寸不渲染。
3. **长列表用 `FlatList` 而非 `ScrollView` 堆叠**：万级数据前者虚拟渲染不卡。
4. **`keyExtractor` 要稳定唯一**：否则滚动复用错乱。
5. **新交互优先 `Pressable`**：旧 `Touchable*` 逐步淘汰，且 `Pressable` 按压态更好用。
6. **`Modal` 在 Android 必须写 `onRequestClose`**：否则物理返回/点击外会警告甚至崩溃。
7. **动画 `useNativeDriver:true` 只支持 transform/opacity**：布局属性动画用它无效。
8. **`Keyboard.dismiss()` 收起键盘**：点击空白常配合 `TouchableWithoutFeedback`。
9. **`require()` 路径必须字面量**：不能 `'./' + name + '.png'` 拼接，打包期无法确定。
10. **平台差异用 `Platform.select`**：iOS 阴影 vs Android elevation 写法不同。
11. **细线用 `StyleSheet.hairlineWidth`**：避免 1px 模糊。
12. **`StatusBar` 在 Android 可设背景色，iOS 仅字色**：跨平台注意。

---

## 39. 参考文档

- React Native 核心组件与 API 总览：[https://reactnative.dev/docs/components-and-apis](https://reactnative.dev/docs/components-and-apis)
- View 参考：[https://reactnative.dev/docs/view](https://reactnative.dev/docs/view)
- Text 参考：[https://reactnative.dev/docs/text](https://reactnative.dev/docs/text)
- Image 参考：[https://reactnative.dev/docs/image](https://reactnative.dev/docs/image)
- TextInput 参考：[https://reactnative.dev/docs/textinput](https://reactnative.dev/docs/textinput)
- ScrollView 参考：[https://reactnative.dev/docs/scrollview](https://reactnative.dev/docs/scrollview)
- FlatList 参考：[https://reactnative.dev/docs/flatlist](https://reactnative.dev/docs/flatlist)
- SectionList 参考：[https://reactnative.dev/docs/sectionlist](https://reactnative.dev/docs/sectionlist)
- Pressable 参考：[https://reactnative.dev/docs/pressable](https://reactnative.dev/docs/pressable)
- Switch 参考：[https://reactnative.dev/docs/switch](https://reactnative.dev/docs/switch)
- Modal 参考：[https://reactnative.dev/docs/modal](https://reactnative.dev/docs/modal)
- Alert 参考：[https://reactnative.dev/docs/alert](https://reactnative.dev/docs/alert)
- StatusBar 参考：[https://reactnative.dev/docs/statusbar](https://reactnative.dev/docs/statusbar)
- Animated 参考：[https://reactnative.dev/docs/animated](https://reactnative.dev/docs/animated)
- Dimensions 参考：[https://reactnative.dev/docs/dimensions](https://reactnative.dev/docs/dimensions)
- PixelRatio 参考：[https://reactnative.dev/docs/pixelratio](https://reactnative.dev/docs/pixelratio)
- Platform 参考：[https://reactnative.dev/docs/platform](https://reactnative.dev/docs/platform)
- SafeAreaView 参考：[https://reactnative.dev/docs/safeareaview](https://reactnative.dev/docs/safeareaview)
- KeyboardAvoidingView 参考：[https://reactnative.dev/docs/keyboardavoidingview](https://reactnative.dev/docs/keyboardavoidingview)
- Keyboard 参考：[https://reactnative.dev/docs/keyboard](https://reactnative.dev/docs/keyboard)
- StyleSheet 参考：[https://reactnative.dev/docs/stylesheet](https://reactnative.dev/docs/stylesheet)
- BackHandler 参考：[https://reactnative.dev/docs/backhandler](https://reactnative.dev/docs/backhandler)
- RefreshControl 参考：[https://reactnative.dev/docs/refreshcontrol](https://reactnative.dev/docs/refreshcontrol)
- Appearance 参考：[https://reactnative.dev/docs/appearance](https://reactnative.dev/docs/appearance)
- Android ProgressBar 参考：[https://reactnative.dev/docs/progressbarandroid](https://reactnative.dev/docs/progressbarandroid)
- iOS ProgressView 参考：[https://reactnative.dev/docs/progressviewios](https://reactnative.dev/docs/progressviewios)
- DrawerLayoutAndroid 参考：[https://reactnative.dev/docs/drawerlayoutandroid](https://reactnative.dev/docs/drawerlayoutandroid)
- React Native 发布说明（0.87）：[https://reactnative.dev/blog/2026/08/10/react-native-0.87](https://reactnative.dev/blog/2026/08/10/react-native-0.87)
- Reanimated 动画库：[https://docs.swmansion.com/react-native-reanimated/](https://docs.swmansion.com/react-native-reanimated/)
- React Navigation 导航库：[https://reactnavigation.org/](https://reactnavigation.org/)
