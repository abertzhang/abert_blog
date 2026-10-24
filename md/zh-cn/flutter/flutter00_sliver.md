---
title: Flutter Sliver 系列组件完全指南
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-17.jpg
tags:[flutter,sliver,CustomScrollView,SliverAppBar,SliverList,SliverGrid,SliverPersistentHeader,scroll,advanced]
summary:Flutter Sliver 系列组件完全学习文档，系统讲解 Sliver 概念、布局协议（SliverConstraints / SliverGeometry）、CustomScrollView 容器，以及 SliverAppBar、SliverList、SliverGrid、SliverToBoxAdapter、SliverPersistentHeader、SliverFillRemaining/Viewport、SliverOpacity/Visibility、SliverLayoutBuilder、SliverOverlapAbsorber、SliverReorderableList 等几乎全部常用 Sliver 的完整 API 与可直接运行的示例，并给出自定义 RenderSliver 与可折叠个人主页综合实战
keywords:[flutter,sliver,CustomScrollView,SliverAppBar,SliverPersistentHeader,SliverGrid,scroll,RenderSliver]
top:1
copyright:true
---

# Flutter Sliver 系列组件完全指南

> 本文档基于 **Flutter 3.47.7（stable）** + **Dart 3.13.5**（2026-10 最新稳定版），多数便捷构造器（如 `SliverList.list`、`SliverGrid.count`、`SliverAppBar.medium/.large`）需要 **Flutter 3.13+**。Sliver 是 Flutter 滚动体系的「底层积木」——ListView / GridView 本质上也是由 Sliver 组合而成。掌握 Sliver，你就能拼出 ListView 做不到的**折叠头图、吸顶分组、视差、交错网格 + 列表**等高级滚动布局。

## 目录

- [1. 什么是 Sliver](#1-什么是-sliver)
- [2. Sliver 的两大容器](#2-sliver-的两大容器)
- [3. Sliver 布局协议（原理）](#3-sliver-布局协议原理)
- [4. CustomScrollView 完整 API](#4-customscrollview-完整-api)
- [5. SliverAppBar 完整 API](#5-sliverappbar-完整-api)
- [6. 内容型 Sliver：List / Grid](#6-内容型-sliverlist--grid)
- [7. 适配型 Sliver：ToBoxAdapter / Padding / SafeArea / IgnorePointer](#7-适配型-slivertoboxadapter--padding--safearea--ignorepointer)
- [8. 头部型 Sliver：SliverPersistentHeader](#8-头部型-sliversliverpersistentheader)
- [9. 填充型 Sliver：FillRemaining / FillViewport](#9-填充型-sliverfillremaining--fillviewport)
- [10. 动画与可见性 Sliver](#10-动画与可见性-sliver)
- [11. 响应式 Sliver：SliverLayoutBuilder](#11-响应式-sliversliverlayoutbuilder)
- [12. 重叠吸收 Sliver：OverlapAbsorber / Injector](#12-重叠吸收-sliversliveroverlapabsorber--injector)
- [13. 其它实用 Sliver](#13-其它实用-sliver)
- [14. 自定义 Sliver（RenderSliver 入门）](#14-自定义-sliverrendersliver-入门)
- [15. 综合实战：可折叠个人主页](#15-综合实战可折叠个人主页)
- [16. 性能优化与最佳实践](#16-性能优化与最佳实践)
- [17. 常见坑与排查](#17-常见坑与排查)
- [18. 参考文档](#18-参考文档)

---

## 1. 什么是 Sliver

**Sliver** 字面意思是「薄片」，在 Flutter 中指代**可被滚动视口（Viewport）逐块裁切、按需布局与绘制的一段滚动内容**。普通 `Widget`（如 `Container`、`Row`）属于 **Box 协议**（`RenderBox`），只能在固定尺寸内布局；而 Sliver 属于 **Sliver 协议**（`RenderSliver`），它知道自己「能滚多远」「当前滚到哪了」「该画多长」。

> 一句话记忆：**Sliver 是「会滚动的碎片」，Box 是「固定尺寸的盒子」。** 两者不能直接混放——把普通 Widget 塞进滚动列表前，必须先用 `SliverToBoxAdapter` 包一层。

### 为什么要用 Sliver

| 需求 | ListView / GridView | Sliver 组合 |
|---|---|---|
| 滚动时头图折叠（expand → collapse） | ❌ 做不到 | ✅ `SliverAppBar` |
| 分组标题滚动到顶部后吸住 | ❌（需额外 stick 逻辑） | ✅ `SliverPersistentHeader(pinned:true)` |
| 头图 + 网格 + 列表 + 页脚无缝衔接 | ❌ 多个独立滚动区 | ✅ 全部塞进一个 `CustomScrollView` |
| 视差背景、拉伸回弹 | ❌ | ✅ `FlexibleSpaceBar(collapseMode:parallax)` + `stretch` |
| 按需回收、极致性能 | ✅ | ✅（更可控） |

`ListView` = `CustomScrollView` + `SliverList`，`GridView` = `CustomScrollView` + `SliverGrid`。Sliver 就是它们的「零件」，直接拼装可突破封装限制。

---

## 2. Sliver 的两大容器

Sliver **不能**直接放进 `Column` / `ListView`，必须放进实现了 `Scrollable` + `Viewport` 的容器中：

| 容器 | 场景 |
|---|---|
| `CustomScrollView` | 最常用的纯 Sliver 滚动容器，把多个 Sliver 顺序排进一个滚动视图 |
| `NestedScrollView` | 需要「外层 SliverAppBar + 内层 TabBarView 各自独立滚动」时使用，配合 `SliverOverlapAbsorber` 解决头图与内页重叠 |

```dart
// 最基础的 Sliver 容器
CustomScrollView(
  slivers: <Widget>[
    const SliverToBoxAdapter(child: Text('我是一个普通文本，被适配成 Sliver')),
    SliverList.list(children: [
      ListTile(title: Text('条目 1')),
      ListTile(title: Text('条目 2')),
    ]),
  ],
);
```

---

## 3. Sliver 布局协议（原理）

理解 Sliver 关键在两套数据结构。每次滚动，视口都会向每个 Sliver 下发 `SliverConstraints`，Sliver 计算后回传 `SliverGeometry`。

### 3.1 SliverConstraints（视口下发）

| 字段 | 含义 |
|---|---|
| `axisDirection` | 滚动主轴方向（down/up/left/right） |
| `growthDirection` | 子项增长方向（forward/reverse） |
| `scrollOffset` | 视口已经滚过本 Sliver 顶部的距离 |
| `precedingScrollExtent` | 本 Sliver 之前所有 Sliver 的滚动总距离 |
| `overlap` | 上方 Sliver 溢出覆盖到本 Sliver 的距离（吸顶时常见） |
| `remainingPaintExtent` | 视口当前还能画多少主轴线长度 |
| `crossAxisExtent` | 交叉轴可用长度 |
| `viewportMainAxisExtent` | 视口主轴总长 |
| `remainingCacheExtent` / `cacheOrigin` | 预渲染缓存区信息 |

### 3.2 SliverGeometry（Sliver 回传）

| 字段 | 含义 |
|---|---|
| `scrollExtent` | 本 Sliver 占据的**滚动总距离**（决定能滚多远） |
| `paintExtent` | 当前实际绘制的可见长度（≤ remainingPaintExtent） |
| `layoutExtent` | 参与后续布局的长度（默认 = paintExtent） |
| `maxPaintExtent` | paintExtent 的上限 |
| `cacheExtent` | 进入缓存区的长度 |
| `hasVisualOverflow` | 是否有内容溢出可视区（决定是否裁剪） |
| `scrollOffsetCorrection` | 校正滚动偏移（纠正错误布局后返回非 0） |

> 自定义 Sliver 时（见第 14 节），核心就是在 `performLayout()` 里**算出一个正确的 `SliverGeometry`**。

---

## 4. CustomScrollView 完整 API

`CustomScrollView` 是承载 Sliver 的滚动视口本身。

```dart
CustomScrollView({
  Key? key,
  Axis scrollDirection = Axis.vertical,        // 滚动方向
  bool reverse = false,                         // 是否反向滚动
  ScrollController? controller,                 // 滚动控制器（监听 offset、scrollTo）
  bool? primary,                                // 是否作为「主滚动视图」（无 controller 时自动接管）
  ScrollPhysics? physics,                       // 滚动物理（BouncingScrollPhysics / ClampingScrollPhysics…）
  bool shrinkWrap = false,                      // 子 Sliver 是否按内容收缩（嵌套时常用 true）
  Key? center,                                 // 以某个 Sliver 为「中心锚点」双向展开
  double anchor = 0.0,                          // 视口初始对齐位置 0.0~1.0（1.0 = 底部）
  double? cacheExtent,                          // 视口外预渲染缓冲长度
  List<Widget> slivers = const <Widget>[],       // ★ 核心：所有 Sliver 子项
  int? semanticChildCount,                      // 语义（无障碍）子项数量
  DragStartBehavior dragStartBehavior = DragStartBehavior.start,
  ScrollViewKeyboardDismissBehavior keyboardDismissBehavior = ScrollViewKeyboardDismissBehavior.manual,
  Clip clipBehavior = Clip.hardEdge,
  String? restorationId,                        // 滚动位置状态恢复
})
```

```dart
// 监听滚动、控制滚动位置
final ScrollController _controller = ScrollController();

@override
void initState() {
  super.initState();
  _controller.addListener(() {
    print('当前滚动偏移: ${_controller.offset}');
  });
}

CustomScrollView(
  controller: _controller,
  physics: const BouncingScrollPhysics(),  // iOS 回弹风格
  slivers: const [/* ... */],
);

// 滚动到顶部
_controller.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.ease);
```

---

## 5. SliverAppBar 完整 API

`SliverAppBar` 是 Sliver 体系里最常用的「可折叠顶栏」，必须放在 `CustomScrollView` 的 `slivers` 首位。

```dart
SliverAppBar({
  Key? key,
  Widget? leading,                              // 左侧返回键等
  bool automaticallyImplyLeading = true,         // 是否自动推断 leading（如返回箭头）
  Widget? title,                                // 标题
  List<Widget>? actions,                        // 右侧操作按钮
  Widget? flexibleSpace,                        // ★ 折叠区内容，通常用 FlexibleSpaceBar
  PreferredSizeWidget? bottom,                   // 底部固定条（如 TabBar）
  double? elevation,                            // 阴影高度
  double? scrolledUnderElevation,                // 滚动到内容下方时的阴影（Material3）
  Color? shadowColor,
  Color? surfaceTintColor,                       // Material3 表面着色
  bool forceElevated = false,                    // 是否始终显示阴影
  Color? backgroundColor,
  Color? foregroundColor,                        // 标题/图标颜色
  IconThemeData? iconTheme,
  IconThemeData? actionsIconTheme,
  bool primary = true,                           // 是否预留状态栏高度
  bool? centerTitle,                             // 标题是否居中
  bool excludeHeaderSemantics = false,
  double? collapsedHeight,                       // 折叠态固定高度
  double? expandedHeight,                        // ★ 展开态额外高度（折叠头图核心）
  bool floating = false,                         // 下滑时是否先露头栏再露内容
  bool pinned = false,                           // ★ 滚动时是否吸顶（始终可见）
  bool snap = false,                             // 是否「吸附」：配合 floating，轻滑即全展开/收起
  bool stretch = false,                          // 是否允许顶部拉伸回弹（需 overscroll）
  double stretchTriggerOffset = 100.0,           // 触发拉伸回调的偏移阈值
  AsyncCallback? onStretchTrigger,               // 下拉越过阈值时回调（如刷新）
  ShapeBorder? shape,
  double? toolbarHeight = kToolbarHeight,
  double? leadingWidth,
  double? titleSpacing,
  TextStyle? toolbarTextStyle,
  TextStyle? titleTextStyle,
  SystemUiOverlayStyle? systemOverlayStyle,
  bool automaticallyImplyLeadingOnTitle = true,
})
```

> **`pinned` / `floating` / `snap` 组合速记**：`pinned` 吸顶；`floating` 让头栏在向上滚内容时先跟随出现；`snap` 必须配合 `floating`，实现「轻推即全展开或全收起」的吸附效果。

### 5.1 FlexibleSpaceBar（折叠区内容）

```dart
FlexibleSpaceBar({
  Widget? title,
  Widget? background,                            // 背景（图片等），折叠时随 scrollExtent 变化
  bool? centerTitle,
  CollapseMode collapseMode = CollapseMode.parallax, // parallax 视差 / pin 钉住 / none 不处理
  List<FlexibleSpaceBarStretchMode> stretchModes = const [FlexibleSpaceBarStretchMode.zoomBackground], // zoomBackground / blurBackground / fadeTitle
  double expandedTitleScale = 1.5,               // 展开态标题相对折叠态的缩放
  String? semanticsLabel,
})
```

### 5.2 三种顶栏形态

```dart
// ① 经典可折叠头图（最常用）
SliverAppBar(
  expandedHeight: 220,
  pinned: true,
  flexibleSpace: FlexibleSpaceBar(
    title: const Text('个人主页'),
    background: Image.network('https://picsum.photos/800/400', fit: BoxFit.cover),
    collapseMode: CollapseMode.parallax,
  ),
)

// ② Material3 中型顶栏（Flutter 3.10+）
const SliverAppBar.medium(title: Text('中型标题栏'))

// ③ Material3 大型顶栏（大标题，向下滚时收缩为小标题）
const SliverAppBar.large(title: Text('大型标题栏'))
```

### 5.3 下拉刷新 / 拉伸回弹

```dart
SliverAppBar(
  expandedHeight: 200,
  pinned: true,
  stretch: true,
  onStretchTrigger: () async {
    // 用户下拉越过 stretchTriggerOffset 时触发，例如加载新数据
    await _loadNewData();
  },
  flexibleSpace: FlexibleSpaceBar(
    stretchModes: const [FlexibleSpaceBarStretchMode.zoomBackground],
    background: Image.network('https://picsum.photos/800/400', fit: BoxFit.cover),
  ),
)
```

---

## 6. 内容型 Sliver：List / Grid

### 6.1 SliverList

把一组「线性」子项排进滚动区，按需创建（builder 模式）或一次性给出（list 模式）。

```dart
// 方式一：builder 懒加载（推荐，长列表必备）
SliverList(
  delegate: SliverChildBuilderDelegate(
    (BuildContext context, int index) {
      return ListTile(title: Text('第 $index 项'));
    },
    childCount: 100,                 // 明确数量
    addAutomaticKeepAlives: true,    // 滚出视口后保留状态（默认 true）
    addRepaintBoundaries: true,      // 自动加重绘边界（默认 true）
    addSemanticIndexes: true,
  ),
)

// 方式二：直接给 List（Flutter 3.13+ 便捷构造，适合少量子项）
SliverList.list(
  children: const [
    ListTile(title: Text('A')),
    ListTile(title: Text('B')),
  ],
)
```

### 6.2 SliverFixedExtentList

所有子项**主轴线高度固定**，布局更快（无需逐项测量）。

```dart
SliverFixedExtentList(
  itemExtent: 56,                    // ★ 每项固定高度
  delegate: SliverChildBuilderDelegate(
    (ctx, i) => ListTile(title: Text('固定高度 $i')),
    childCount: 50,
  ),
)
// Flutter 3.13+：SliverFixedExtentList.list(itemExtent: 56, children: [...])
```

### 6.3 SliverPrototypeExtentList

以某个**原型控件**的尺寸作为所有子项的统一 extent（适合单元格尺寸由内容决定的固定高度场景）。

```dart
SliverPrototypeExtentList(
  prototypeItem: const ListTile(title: Text('原型')),  // 用它的高度作为统一高度
  delegate: SliverChildBuilderDelegate(
    (ctx, i) => ListTile(title: Text('项 $i')),
    childCount: 30,
  ),
)
```

### 6.4 SliverGrid

Sliver 版本的网格，通过 `SliverGridDelegate` 控制列数/尺寸。

```dart
// ① 固定列数
SliverGrid(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 3,              // 列数
    mainAxisSpacing: 8,             // 主轴间距
    crossAxisSpacing: 8,            // 交叉轴间距
    childAspectRatio: 1.0,          // 宽高比
    // mainAxisExtent: 可选，固定每行高度（与 childAspectRatio 二选一）
  ),
  delegate: SliverChildBuilderDelegate(
    (ctx, i) => Container(color: Colors.teal[100 * (i % 9 + 1)], child: Center(child: Text('$i'))),
    childCount: 30,
  ),
)

// ② 按最大宽度自适应列数
SliverGrid(
  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
    maxCrossAxisExtent: 140,        // 每项最大宽度，自动算列数
    mainAxisSpacing: 8,
    crossAxisSpacing: 8,
    childAspectRatio: 1.0,
  ),
  delegate: SliverChildBuilderDelegate(
    (ctx, i) => Container(color: Colors.amber, child: Center(child: Text('$i'))),
    childCount: 30,
  ),
)

// ③ 便捷构造（Flutter 3.13+）
SliverGrid.count(crossAxisCount: 2, children: [/* ... */])
SliverGrid.extent(maxCrossAxisExtent: 160, children: [/* ... */])
```

---

## 7. 适配型 Sliver：ToBoxAdapter / Padding / SafeArea / IgnorePointer

这些 Sliver 用来把「普通 Box Widget」或「边距/安全区/交互控制」接入 Sliver 体系。

### 7.1 SliverToBoxAdapter（普通 Widget → Sliver）

```dart
SliverToBoxAdapter(
  child: Container(
    padding: const EdgeInsets.all(16),
    color: Colors.grey[100],
    child: const Text('我是普通 Box Widget，被适配成一段 Sliver'),
  ),
)
```
> ⚠️ `SliverToBoxAdapter` 内的子项**不参与 Sliver 的按需回收**，内容很高时会一次性全部测量/绘制，长内容别塞它。

### 7.2 SliverPadding（给 Sliver 加内边距）

```dart
SliverPadding(
  padding: const EdgeInsets.symmetric(horizontal: 16),
  sliver: SliverList.list(children: const [ListTile(title: Text('有左右内边距'))]),
)
```

### 7.3 SliverSafeArea（避开刘海/底部手势条）

```dart
SliverSafeArea(
  top: true,
  bottom: true,
  sliver: SliverList.list(children: const [ListTile(title: Text('不会被刘海遮挡'))]),
)
```

### 7.4 SliverIgnorePointer（禁用交互穿透）

```dart
SliverIgnorePointer(
  ignoring: true,   // true = 该 Sliver 区域不响应点击事件
  sliver: SliverToBoxAdapter(child: Container(height: 80, color: Colors.grey)),
)
```

---

## 8. 头部型 Sliver：SliverPersistentHeader

实现**滚动到顶部后吸住的分组标题 / 自定义吸顶头**。必须提供一个 `SliverPersistentHeaderDelegate` 子类。

```dart
SliverPersistentHeader(
  pinned: true,        // 吸顶（滚到顶部停住）；floating 则上滑先露头再露内容
  floating: false,
  delegate: _SectionHeaderDelegate('我的作品'),
)

// —— 自定义吸顶分组标题 ——
class _SectionHeaderDelegate extends SliverPersistentHeaderDelegate {
  final String title;
  _SectionHeaderDelegate(this.title);

  @override
  double get minExtent => 48;          // 吸顶时的最小高度
  @override
  double get maxExtent => 48;          // 展开时的最大高度（相等即高度不变）

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    // shrinkOffset：已折叠的像素量；overlapsContent：下方内容是否叠到头上
    return Container(
      color: Theme.of(context).primaryColor,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(title, style: const TextStyle(color: Colors.white, fontSize: 16)),
    );
  }

  @override
  bool shouldRebuild(covariant _SectionHeaderDelegate old) => old.title != title;
}
```

> 想做「展开高 120、吸顶后缩到 48」的可变头？让 `maxExtent=120`、`minExtent=48`，在 `build` 里用 `shrinkOffset` 插值调整内容与透明度即可。

---

## 9. 填充型 Sliver：FillRemaining / FillViewport

### 9.1 SliverFillRemaining（填补剩余滚动空间）

常用于表单/详情页：让单个内容填满视口剩余高度，内容不足时也能占满，避免底部留白或键盘顶起布局错乱。

```dart
SliverFillRemaining(
  hasScrollBody: true,       // true：内部是滚动体；false：内部固定不滚
  fillOverscroll: false,     // 是否填满回弹溢出区
  child: Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: const [Text('内容不足一屏时我也占满剩余空间')],
  ),
)
```

### 9.2 SliverFillViewport（每屏一个整页）

每个子项都撑满一整屏，适合**整屏滑动的引导页 / 轮播**。

```dart
SliverFillViewport(
  viewportFraction: 1.0,     // 每项占视口比例
  padEnds: true,             // 首尾是否留出安全边距
  delegate: SliverChildBuilderDelegate(
    (ctx, i) => Container(color: Colors.primaries[i % Colors.primaries.length],
                          child: Center(child: Text('整屏 $i'))),
    childCount: 4,
  ),
)
// Flutter 3.13+：SliverFillViewport.list(children: [...])
```

---

## 10. 动画与可见性 Sliver

| 组件 | 作用 |
|---|---|
| `SliverOpacity` | 给整段 Sliver 加透明度（`opacity: 0.5`） |
| `SliverVisibility` | 控制 Sliver 显隐，可配置 `maintainState/maintainAnimation/maintainSize` 保持状态 |
| `SliverFadeTransition` | 用 `Animation<double>` 驱动淡入淡出 |
| `SliverAnimatedList` | 带增删动画的列表（类似 `AnimatedList` 的 Sliver 版） |

```dart
// SliverOpacity
SliverOpacity(
  opacity: _visible ? 1.0 : 0.3,
  sliver: SliverToBoxAdapter(child: Container(height: 60, color: Colors.blue)),
)

// SliverVisibility（隐藏但保留布局与状态）
SliverVisibility(
  visible: _show,
  maintainState: true,
  maintainAnimation: true,
  sliver: SliverToBoxAdapter(child: Container(height: 60, color: Colors.green)),
)

// SliverAnimatedList：带插入/删除动画
final GlobalKey<SliverAnimatedListState> _listKey = GlobalKey<SliverAnimatedListState>();
List<String> _items = ['A', 'B'];

SliverAnimatedList(
  key: _listKey,
  initialItemCount: _items.length,
  itemBuilder: (ctx, index, animation) {
    return SizeTransition(              // 用动画包一层
      sizeFactor: animation,
      child: ListTile(title: Text(_items[index])),
    );
  },
)

// 插入与删除
_items.insert(0, 'C');
_listKey.currentState!.insertItem(0);
// _listKey.currentState!.removeItem(index, (ctx, animation) => ...);
```

---

## 11. 响应式 Sliver：SliverLayoutBuilder

根据当前 `SliverConstraints`（如视口宽度、滚动偏移）动态返回不同的 Sliver 子树。

```dart
SliverLayoutBuilder(
  builder: (BuildContext context, SliverConstraints constraints) {
    final bool isWide = constraints.crossAxisExtent > 600;
    return SliverPadding(
      padding: const EdgeInsets.all(8),
      sliver: isWide
          ? SliverGrid.count(crossAxisCount: 4, children: _tiles())
          : SliverGrid.count(crossAxisCount: 2, children: _tiles()),
    );
  },
)
```

---

## 12. 重叠吸收 Sliver：OverlapAbsorber / Injector

当 `SliverAppBar(pinned:true)` 与**内层可滚动内容**共存（典型：`NestedScrollView` + `TabBarView`）时，头图会盖住内页顶部，需用这对组件「吸收并让出」重叠高度。

```dart
final SliverOverlapAbsorberHandle _handle = SliverOverlapAbsorberHandle();

NestedScrollView(
  headerSliverBuilder: (ctx, innerBoxIsScrolled) => [
    SliverOverlapAbsorber(
      handle: _handle,                 // 吸收的重叠量记到这里
      sliver: SliverAppBar(
        pinned: true,
        expandedHeight: 200,
        flexibleSpace: FlexibleSpaceBar(title: const Text('重叠示例')),
        bottom: const TabBar(tabs: [Tab(text: 'A'), Tab(text: 'B')]),
      ),
    ),
  ],
  body: TabBarView(
    children: [
      CustomScrollView(slivers: [
        SliverOverlapInjector(handle: _handle),  // 把吸收的高度补回来，避免内容被头图遮住
        SliverList.list(children: List.generate(30, (i) => ListTile(title: Text('A-$i')))),
      ]),
      // B 页同理
    ],
  ),
)
```

> 单独在 `CustomScrollView` 里一般**不需要**这对组件；只有当存在「外层 pinned 头 + 内层独立滚动」的嵌套结构（`NestedScrollView`）时才用。

---

## 13. 其它实用 Sliver

| 组件 | 作用 / 关键参数 |
|---|---|
| `SliverReorderableList` | 可拖拽重排的 Sliver 列表（`itemBuilder`、`itemCount`、`onReorder`、`proxyDecorator`），Flutter 3.14+ |
| `CupertinoSliverNavigationBar` | iOS 风格折叠导航栏（`largeTitle`、`middle`、`previousPageTitle`） |
| `CupertinoSliverRefreshControl` | iOS 风格下拉刷新指示器，配合 `CustomScrollView` 的 `onRefresh` 语义使用 |
| `SliverOverlapAbsorberHandle` | 见第 12 节，跨 Sliver 传递重叠高度 |

```dart
// SliverReorderableList 示例（Flutter 3.14+）
List<int> _data = [0, 1, 2, 3];

SliverReorderableList(
  itemBuilder: (ctx, index) {
    return ReorderableDelayedDragStartListener(
      key: ValueKey(_data[index]),
      index: index,
      child: ListTile(title: Text('可拖拽项 ${_data[index]}'), trailing: const Icon(Icons.drag_handle)),
    );
  },
  itemCount: _data.length,
  onReorder: (from, to) {
    if (to > from) to -= 1;
    final item = _data.removeAt(from);
    _data.insert(to, item);
  },
)
```

---

## 14. 自定义 Sliver（RenderSliver 入门）

当内置 Sliver 都不够用时，可以继承 `RenderSliver` 写自己的。下面实现一个**纯间距 Sliver**（`SliverSpacer`），在滚动流中留出一段固定空白——演示 `performLayout` 计算 `SliverGeometry` 的最小闭环。

```dart
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

/// 用法：CustomScrollView(slivers: [SliverSpacer(80), ...])
class SliverSpacer extends SingleChildRenderObjectWidget {
  final double extent;                 // 留白高度
  const SliverSpacer(this.extent, {Key? key}) : super(key: key);

  @override
  RenderObject createRenderObject(BuildContext context) => _RenderSliverSpacer(extent);

  @override
  void updateRenderObject(BuildContext context, _RenderSliverSpacer renderObject) {
    renderObject.extent = extent;
  }
}

class _RenderSliverSpacer extends RenderSliver {
  _RenderSliverSpacer(this._extent);
  double _extent;
  double get extent => _extent;
  set extent(double value) {
    if (_extent == value) return;
    _extent = value;
    markNeedsLayout();               // 高度变化时重新布局
  }

  @override
  void performLayout() {
    // 实际可见绘制长度不能超过视口剩余可用长度
    final double paintExtent =
        constraints.remainingPaintExtent.clamp(0.0, _extent);
    geometry = SliverGeometry(
      scrollExtent: _extent,          // 占用的滚动距离
      paintExtent: paintExtent,       // 当前可见绘制长度
      maxPaintExtent: _extent,
      cacheExtent: 0,
      hasVisualOverflow: paintExtent < _extent,
    );
  }

  @override
  void paint(PaintingContext context, Offset offset) {
    // 纯间距，不绘制任何内容
  }

  @override
  bool hitTestChildren(SliverHitTestResult result,
      {required double mainAxisPosition, required double crossAxisPosition}) => false;
}
```

> 进阶方向：`RenderSliver` 还提供 `childScrollOffset()`、`childMainAxisPosition()` 等方法，用于**带子节点的容器型 Sliver**（如 `RenderSliverList`）。自定义带子项的 Sliver 复杂度陡增，日常需求优先用内置组件。

---

## 15. 综合实战：可折叠个人主页

把前面学到的组件拼起来：折叠头图 + 简介 + 吸顶分组 + 网格作品 + 列表文章 + 底部署满。

```dart
class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // ① 可折叠头图（吸顶）
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: const Text('Abert'),
              background: Image.network('https://picsum.photos/800/400', fit: BoxFit.cover),
              collapseMode: CollapseMode.parallax,
            ),
          ),

          // ② 简介（普通 Widget 适配成 Sliver）
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text('全栈开发工程师，深耕 Flutter / React / NodeJs / Golang。',
                  style: Theme.of(context).textTheme.bodyMedium),
            ),
          ),

          // ③ 吸顶分组标题
          SliverPersistentHeader(
            pinned: true,
            delegate: _SectionHeaderDelegate('我的作品'),
          ),

          // ④ 作品网格
          SliverGrid.count(
            crossAxisCount: 3,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1,
            children: List.generate(9, (i) => Container(
              color: Colors.teal[100 * (i % 8 + 1)],
              child: Center(child: Text('作品 $i')),
            )),
          ),

          // ⑤ 吸顶分组标题（第二段）
          SliverPersistentHeader(
            pinned: true,
            delegate: _SectionHeaderDelegate('最新文章'),
          ),

          // ⑥ 文章列表
          SliverList.builder(           // Flutter 3.13+ 便捷写法
            itemCount: 20,
            itemBuilder: (ctx, i) => ListTile(
              title: Text('文章标题 $i'),
              subtitle: Text('2026-10-${(i % 28) + 1}'),
            ),
          ),

          // ⑦ 底部署满
          SliverFillRemaining(
            hasScrollBody: false,
            child: const Center(child: Text('—— 已经到底啦 ——')),
          ),
        ],
      ),
    );
  }
}

// 复用第 8 节的吸顶标题 Delegate
class _SectionHeaderDelegate extends SliverPersistentHeaderDelegate {
  final String title;
  _SectionHeaderDelegate(this.title);
  @override double get minExtent => 48;
  @override double get maxExtent => 48;
  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Theme.of(context).primaryColor,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(title, style: const TextStyle(color: Colors.white, fontSize: 16)),
    );
  }
  @override bool shouldRebuild(covariant _SectionHeaderDelegate old) => old.title != title;
}
```

---

## 16. 性能优化与最佳实践

- **长列表一律用 builder 委托**（`SliverChildBuilderDelegate` / `SliverList.builder`），并尽量用 `SliverFixedExtentList` 固定高度，避免逐项测量。
- **别把长内容塞进 `SliverToBoxAdapter`**：它不参与按需回收，内容很长会一次性测量全部子节点，导致卡顿。长文本考虑切成多条 Sliver 或用 `SliverList`。
- **`addAutomaticKeepAlives` / `addRepaintBoundaries`** 默认开启即可，手动关闭需自担状态丢失/重绘代价。
- **`cacheExtent` 适度**：过大增加内存，过小导致滚动白屏。
- **吸顶头用 `SliverPersistentHeader` 而非 Stack 固定**：前者随滚动协议正确参与布局与命中测试。
- **复用 `SliverOverlapAbsorberHandle`**：嵌套滚动时务必配对 `Absorber` + `Injector`，否则内页顶部会被头图遮挡。

---

## 17. 常见坑与排查

| 现象 | 原因 / 解法 |
|---|---|
| `The following assertion was thrown: A Sliver is not a child of a viewport` | 把 Sliver 直接放进了 `Column`/`ListView`。改用 `CustomScrollView`，普通 Widget 用 `SliverToBoxAdapter` 包 |
| 头图折叠后标题不居中 / 布局跳动 | 检查 `expandedHeight` 与 `FlexibleSpaceBar` 是否配对；`centerTitle` 在折叠态才生效 |
| `pinned` 头吸住但内容被盖住 | 嵌套滚动场景漏了 `SliverOverlapAbsorber` + `SliverOverlapInjector` |
| 网格/列表高度报错 `hasSize` | `SliverGrid` 必须给 `gridDelegate`，`SliverList` 必须给 `delegate` 且 `childCount` 与 builder 一致 |
| 滚动卡顿 | 长内容误用 `SliverToBoxAdapter`；或 `cacheExtent` 过大；或缺少 `itemExtent` 导致频繁测量 |
| `SliverFillRemaining` 内控件溢出 | `hasScrollBody:false` 时内部不可滚动，内容过高会溢出；改为 `true` 或限制内容高度 |
| `snap` 无效果 | `snap` 必须配合 `floating:true` 才有意义 |

---

## 18. 参考文档

- 官方 Sliver 总览：https://docs.flutter.dev/ui/layout/scrolling/slivers
- `CustomScrollView` 类：https://api.flutter.dev/flutter/widgets/CustomScrollView-class.html
- `SliverAppBar` 类：https://api.flutter.dev/flutter/material/SliverAppBar-class.html
- `SliverPersistentHeader` 类：https://api.flutter.dev/flutter/widgets/SliverPersistentHeader-class.html
- `SliverConstraints` / `SliverGeometry`：https://api.flutter.dev/flutter/rendering/SliverConstraints-class.html
- `NestedScrollView` 重叠处理：https://api.flutter.dev/flutter/widgets/NestedScrollView-class.html
