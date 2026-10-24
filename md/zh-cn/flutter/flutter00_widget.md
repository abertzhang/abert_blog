---
title: Flutter 常用 Widget 组件学习文档
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-42.jpg
tags:[flutter,dart,widget,ui,component,layout,animation,theme,material3]
summary:本文系统讲解 Flutter 最常用的 Widget 组件。从 Widget 三棵树与生命周期理念出发，覆盖文本与图片、容器装饰、尺寸定位、线性/弹性/层叠布局、ListView/GridView/Slivers 滚动体系、手势事件、按钮与输入表单、选择控件、对话框与提示、数据展示、导航骨架（Scaffold/AppBar/BottomNavigationBar/NavigationRail）、隐式与显式动画、主题与响应式、FutureBuilder/StreamBuilder 异步 Widget 等 18 章内容，几乎涵盖日常开发全部常用接口，每个接口均配可直接运行的示例代码。
keywords:[flutter,widget,dart,ui,text,container,listview,gridview,sliver,gesture,button,textfield,form,animation,theme,material3,scaffold,appbar,navigator]
top:1
copyright:true
---

# Flutter 常用 Widget 组件学习文档

> 基于 Flutter 3.x（Dart 3.x，Material 3 为默认设计语言）。所有示例均可直接粘贴到 `lib/main.dart` 或任意 Widget 文件中运行。

## 目录

1. [Widget 理念与三棵树](#1-widget-理念与三棵树)
2. [基础显示 Widget：Text / Image / Icon](#2-基础显示-widgettext--image--icon)
3. [容器与装饰 Widget](#3-容器与装饰-widget)
4. [尺寸与定位 Widget](#4-尺寸与定位-widget)
5. [裁剪与视觉效果 Widget](#5-裁剪与视觉效果-widget)
6. [线性 / 弹性 / 层叠布局](#6-线性--弹性--层叠布局)
7. [滚动列表：ListView / GridView / Slivers](#7-滚动列表listview--gridview--slivers)
8. [手势与事件](#8-手势与事件)
9. [按钮 Widget](#9-按钮-widget)
10. [输入与表单](#10-输入与表单)
11. [选择控件](#11-选择控件)
12. [对话框、提示与浮层](#12-对话框提示与浮层)
13. [数据展示 Widget](#13-数据展示-widget)
14. [导航与页面骨架](#14-导航与页面骨架)
15. [动画 Widget](#15-动画-widget)
16. [主题、响应式与 InheritedWidget](#16-主题响应式与-inheritedwidget)
17. [生命周期与异步 Widget](#17-生命周期与异步-widget)
18. [速查表与常见问题](#18-速查表与常见问题)

---

## 1. Widget 理念与三棵树

### 1.1 一切皆 Widget

Flutter 的界面完全由 Widget 组合而成：一个按钮是 Widget，一段文字是 Widget，甚至"居中"、"内边距"、"主题"、"路由"都是 Widget。Widget 本身**不可变**（immutable），它只是一份"配置描述"；真正干活的在后面两层。

### 1.2 三棵树（Widget / Element / RenderObject）

```
Widget（配置，轻量，每次 build 重建）
   ↓ createElement()
Element（实例，持有 Widget + RenderObject，负责复用与 diff）
   ↓ createRenderObject()
RenderObject（真正负责布局、绘制、命中测试）
```

- **Widget 树**：你写的代码，`build()` 的产物，可以频繁丢弃重建。
- **Element 树**：框架自动维护，决定"哪些 Widget 可以复用"（`canUpdate` 比较 `runtimeType` + `key`）。
- **RenderObject 树**：做实际测量（measure）与布局（layout）。

> 实战意义：`setState()` 只会重建**当前子树**的 Widget 树；Element 层能复用就复用，所以 `const Widget` 可以跳过整个子树的重建，是性能优化的第一武器。

### 1.3 StatelessWidget 与 StatefulWidget

```dart
// 无状态：配置不变，只需 build 一次
class MyText extends StatelessWidget {
  const MyText({super.key, required this.label});
  final String label; // final：不可变

  @override
  Widget build(BuildContext context) => Text(label);
}

// 有状态：数据会变（计数、输入、动画……）
class Counter extends StatefulWidget {
  const Counter({super.key});
  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0; // 可变状态放 State 里

  void _increment() => setState(() => _count++);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('count: $_count'),
        ElevatedButton(onPressed: _increment, child: const Text('+1')),
      ],
    );
  }
}
```

**选型口诀**：数据会不会变？不会 → `StatelessWidget`；会 → `StatefulWidget`；只想共享只读配置 → `InheritedWidget`（见第 16 章）。

### 1.4 BuildContext 是什么

`BuildContext` 是当前 Widget 在 **Element 树中的句柄**，最常见的用途：

```dart
Theme.of(context)         // 往上找最近的 Theme 数据
MediaQuery.of(context)    // 屏幕尺寸/安全区
ScaffoldMessenger.of(context).showSnackBar(...)  // 找 Scaffold 的信使
Navigator.of(context).push(...)                  // 找路由
DefaultTextStyle.of(context)   // 继承的默认文字样式
```

> ⚠️ **异步回调里用 context 前先判 `mounted`**（State 基类提供的布尔值），否则页面已销毁时会抛异常，详见 17.2。

---

## 2. 基础显示 Widget：Text / Image / Icon

### 2.1 Text —— 最常用的 Widget

```dart
Text(
  'Hello Flutter',
  style: TextStyle(
    fontSize: 18,              // 字号（逻辑像素，与 DensityConfigScreen 里的 density 独立，勿混淆）
    fontWeight: FontWeight.bold, // w100~w900 + normal/bold
    color: Colors.blue.shade700, // Color / Colors.xxx / Color(0xFF123456)
    fontStyle: FontStyle.italic, // normal | italic
    letterSpacing: 1.5,         // 字间距
    wordSpacing: 2,             // 词间距（英文生效明显）
    height: 1.5,                // 行高倍数（fontSize * height）
    decoration: TextDecoration.underline, // 下划线 / lineThrough / overline / none
    decorationColor: Colors.red,   // 装饰线颜色
    decorationStyle: TextDecorationStyle.dashed, // solid/double/dotted/dashed
    decorationThickness: 2,     // 装饰线粗细
    backgroundColor: Colors.yellow, // 文字背景色
    shadows: [Shadow(offset: Offset(2, 2), blurRadius: 4, color: Colors.black26)], // 阴影列表
    fontFamily: 'Roboto',       // 字体族（需在 pubspec.yaml 声明）
    fontFamilyFallback: ['Arial'], // 兜底字体
    overflow: TextOverflow.ellipsis, // 溢出：clip | ellipsis | fade | visible
    // fontSize 随系统字体缩放（无障碍），关掉它：textScaler: TextScaler.noScaling
  ),
  textAlign: TextAlign.center,       // left/right/center/justify/start/end
  textDirection: TextDirection.ltr,  // ltr | rtl
  maxLines: 2,                       // 最多行数，超出按 overflow 处理
  softWrap: true,                    // false 时不自动换行（横向可溢出）
  semanticsLabel: '问候语',           // 无障碍朗读文本
  strutStyle: StrutStyle(fontSize: 20, height: 1.4), // 强制行高盒模型
  selectionColor: Colors.blue.withOpacity(0.3),      // 长按选择的颜色
)
```

### 2.2 富文本 TextSpan（同一段文字多种样式）

```dart
Text.rich(
  TextSpan(
    style: const TextStyle(fontSize: 16, color: Colors.black), // 父样式，子节点继承
    children: [
      const TextSpan(text: '订单金额：'),
      TextSpan(
        text: '¥99.00',
        style: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.bold),
      ),
      const TextSpan(text: '，点击'),
      TextSpan(
        text: '查看详情',
        style: const TextStyle(color: Colors.blue, decoration: TextDecoration.underline),
        recognizer: TapGestureRecognizer()..onTap = () => debugPrint('tap link'), // 需要 import 'package:flutter/gestures.dart'
      ),
    ],
  ),
)
```

### 2.3 Image —— 四种来源

```dart
// 1) 网络图（最常用）
Image.network(
  'https://picsum.photos/300/200',
  width: 300,
  height: 200,
  fit: BoxFit.cover,          // contain | cover | fill | fitWidth | fitHeight | scaleDown | none
  alignment: Alignment.center, // cover 裁切时的锚点
  repeat: ImageRepeat.noRepeat, // 平铺：noRepeat | repeat | repeatX | repeatY
  // 降采样：按显示尺寸解码，大图省内存（Flutter 3.x 推荐用 cacheWidth 替代 ResizeImage）
  cacheWidth: 600,
  filterQuality: FilterQuality.medium, // none | low | medium | high
  // 加载中 / 失败占位（Flutter 3.7+）
  loadingBuilder: (context, child, progress) =>
      progress == null ? child : const Center(child: CircularProgressIndicator()),
  errorBuilder: (context, error, stack) => const Center(child: Icon(Icons.broken_image)),
  // 灰度/模糊后期处理
  color: Colors.grey,
  colorBlendMode: BlendMode.saturation,
  // isAntiAlias: true, // 无 scale 的 transform 时减少锯齿
)

// 2) 资源图（先在 pubspec.yaml 声明 assets）
Image.asset(
  'assets/images/logo.png',
  width: 100,
  // 不同分辨率：assets/images/2.0x/logo.png、3.0x/logo.png
  // package: 'my_pkg', // 引用依赖包里的资源
)

// 3) 文件图
Image.file(File('/tmp/a.png'), fit: BoxFit.cover)

// 4) 内存图（Uint8List，如相机帧、Base64 解码结果）
Image.memory(bytes, width: 200, gaplessPlayback: true) // 换图时交叉淡入而非闪烁
```

**BoxFit 速查**：

| 值 | 行为 |
| --- | --- |
| `contain` | 完整显示，可能留白 |
| `cover` | 填满裁切（头像/封面首选） |
| `fill` | 拉伸填满，会变形 |
| `fitWidth` / `fitHeight` | 单方向撑满 |
| `scaleDown` | 图片小时缩小、大时不放大（等价 contain + clamp） |
| `none` | 原始尺寸，超出裁剪 |

### 2.4 Icon 与 IconTheme

```dart
Icon(
  Icons.favorite,             // Icons 内置 2000+ 图标；CupertinoIcons.xxx 是 iOS 风
  size: 32,
  color: Colors.pink,
  semanticLabel: '收藏',       // 无障碍
  fill: 1,                    // 0~1，填充粗细（部分图标支持）
  weight: 400,                // 线条粗细 100~700
  grade: 0,                   // 填充浓度微调 -25~25
  opticalSize: 24,            // 视觉尺寸 20~48，配合可变字体
  shadows: [Shadow(blurRadius: 4, color: Colors.black38)],
  applyTextScaling: false,    // 不随系统字号缩放
  blendMode: BlendMode.srcIn,
)

// 给整棵子树统一图标样式（省去逐个写）
IconTheme(
  data: const IconThemeData(size: 28, color: Colors.teal),
  child: Row(children: const [Icon(Icons.star), Icon(Icons.star_half)]),
)
```

### 2.5 SelectableText / DefaultTextStyle

```dart
const SelectableText(
  '这段文字可以被长按选择、复制',
  style: TextStyle(fontSize: 16),
  maxLines: 3,
  textAlign: TextAlign.center,
  toolbarOptions: ToolbarOptions(copy: true, selectAll: true, share: false),
  onSelectionChanged: (selection, cause) => debugPrint('$selection'),
)

// 给子树设默认文字样式（不指定 style 的 Text 会继承它）
const DefaultTextStyle(
  style: TextStyle(fontSize: 18, color: Colors.black87),
  textAlign: TextAlign.center,
  child: Text('继承默认样式'),
)
```

---

## 3. 容器与装饰 Widget

### 3.1 Container —— 万能盒子（尺寸 + 内边距 + 外边距 + 装饰 + 变换）

```dart
Container(
  // —— 尺寸与约束（有 child 时：约束 child；无 child 时：尽可能大）——
  width: 200,
  height: 100,
  constraints: const BoxConstraints(minWidth: 100, maxHeight: 80),
  // —— 内外边距 ——
  margin: const EdgeInsets.all(8),      // 外边距
  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), // 内边距
  // EdgeInsets: all / symmetric(vertical:,horizontal:) / only(left:..,top:..) / fromLTRB / fromWindowPadding
  // —— 对齐（有 child 时生效）——
  alignment: Alignment.center,          // Alignment(x, y) / Alignment.center / centerLeft / topRight ……
  // —— 装饰与背景 ——
  decoration: BoxDecoration(
    color: Colors.white,                          // 背景色（与 gradient 二选一）
    gradient: const LinearGradient(               // 渐变：linear / radial / sweep
      colors: [Colors.blue, Colors.purple],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      stops: [0, 1],                              // 每色位置 0~1
      tileMode: TileMode.clamp,                   // clamp / mirrored / repeated
    ),
    image: const DecorationImage(                 // 背景图
      image: NetworkImage('https://picsum.photos/400/200'),
      fit: BoxFit.cover,
      opacity: 0.8,
    ),
    border: Border.all(color: Colors.grey, width: 1), // 四边同线
    // 单边/圆角边框：Border(top: BorderSide(...))、BorderRadius.circular(12) 配 border
    borderRadius: BorderRadius.circular(12),      // circular / vertical(top:..) / horizontal(..) / all(Radius.circular)
    boxShadow: [                                 // 阴影列表（多层叠加很有质感）
      BoxShadow(
        color: Colors.black.withOpacity(0.15),
        offset: const Offset(0, 4),              // x/y 位移
        blurRadius: 12,                          // 模糊半径
        spreadRadius: 2,                         // 扩散半径
      ),
    ],
    shape: BoxShape.rectangle,                   // circle 时 width/height 需相等且忽略 radius
    backgroundBlendMode: BlendMode.multiply,     // 背景色/图混合模式
  ),
  // —— 变换（不影响布局占位，视觉层变换）——
  transform: Matrix4.identity()..rotateZ(0.05),  // 任意矩阵变换
  transformAlignment: Alignment.center,
  // —— 裁剪 ——
  clipBehavior: Clip.antiAlias,                 // none | hardEdge | antiAlias | antiAliasWithSaveLayer
  // 便捷裁剪：Container 的 foregroundDecoration 同理
  child: const Text('Container 示例'),
)
```

> ⚠️ **有 `decoration` 时不能直接用 `color` 参数**，颜色要写进 `decoration.color`，否则运行时报错 "Cannot provide both a color and a decoration"。

### 3.2 DecoratedBox / BoxDecoration 组件化

```dart
// 只想要装饰（不带尺寸边距）时，用 DecoratedBox 更轻
DecoratedBox(
  decoration: BoxDecoration(
    gradient: const SweepGradient(colors: [Colors.red, Colors.green, Colors.blue]),
    borderRadius: BorderRadius.circular(60),
  ),
  child: const SizedBox(width: 120, height: 120),
)

// 形状裁剪装饰
DecoratedBox(
  decoration: ShapeDecoration(
    color: Colors.amber,
    shape: StadiumBorder(side: BorderSide(color: Colors.brown, width: 2)), // 胶囊形
    // 其他 shape：CircleBorder / RoundedRectangleBorder / BeveledRectangleBorder / StarBorder
  ),
  child: const Text('胶囊'),
)
```

### 3.3 渐变工具类

```dart
LinearGradient( // 线性：begin/end 控制方向
  colors: const [Color(0xFF6A11CB), Color(0xFF2575FC)],
  begin: Alignment.centerLeft, end: Alignment.centerRight,
)
RadialGradient( // 径向：center/radius/focal
  colors: const [Colors.yellow, Colors.orange, Colors.transparent],
  radius: 0.8,
)
SweepGradient( // 扫描（雷达）：startAngle/endAngle
  colors: const [Colors.red, Colors.green, Colors.blue, Colors.red],
  startAngle: 0, endAngle: 6.28,
)
```

### 3.4 颜色与透明度

```dart
Colors.red                    // Material 色板 red/pink/purple/…（带 50~900 shade）
Colors.red.shade700          // .shadeXXX
Colors.red.withOpacity(0.5)  // 透明度（Flutter 3.27+ 推荐 withValues(alpha: 0.5)，语义更明确）
Color(0xFF3F51B5)            // ARGB 十六进制
Color.fromRGBO(63, 81, 181, 1)
Colors.transparent
// 混合两种颜色：Color.alphaBlend(Colors.red, Colors.blue)
// 明暗：HSLColor.fromColor(c).withLightness(0.8).toColor()
```

---

## 4. 尺寸与定位 Widget

### 4.1 SizedBox —— 强制尺寸 / 间隔

```dart
const SizedBox(width: 100, height: 50, child: Text('固定尺寸'))
const SizedBox.shrink()                    // 零尺寸
SizedBox.square(dimension: 80)             // 正方形容器
const SizedBox.expand(child: Text('撑满'))  // 占满父级可用空间
// 列表里做间隔（比 Padding 语义更清晰）
const Column(children: [Text('A'), SizedBox(height: 12), Text('B')])
const Row(children: [Icon(Icons.star), SizedBox(width: 8), Text('评分')])
```

### 4.2 Padding / Margin 的等价写法

```dart
// Padding 只有内边距，比 Container 轻量
const Padding(
  padding: EdgeInsets.all(16),
  child: Text('四周 16'),
)
// 语义化方向（自动适配 RTL，国际项目优先用 directional 版）
const Padding(
  padding: EdgeInsetsDirectional.only(start: 16, end: 8),
  child: Text('RTL 感知内边距'),
)
```

### 4.3 Center / Align / FractionallySizedBox

```dart
const Center(child: Text('居中')) // == Align(alignment: Alignment.center)

Align(
  alignment: Alignment.bottomRight, // 九宫格位置 + Alignment(x,y) 小数偏移
  widthFactor: 0.8,   // 宽度因子（可选，收紧自身尺寸）
  heightFactor: 0.5,
  child: const Text('右下角'),
)

// 按父级百分比占位
const FractionallySizedBox(
  widthFactor: 0.75,   // 父宽的 75%
  heightFactor: 0.3,   // 父高的 30%
  alignment: Alignment.center,
  child: ColoredBox(color: Colors.teal),
)
```

### 4.4 AspectRatio / Baseline / LimitedBox

```dart
// 固定宽高比（视频封面、Banner 常用）
const AspectRatio(
  aspectRatio: 16 / 9,
  child: ColoredBox(color: Colors.black26),
)

// 基线对齐：同一行文字大小不一时，按文字基线对齐（Row 里替代 CrossAxisAlignment.baseline）
const Row(
  crossAxisAlignment: CrossAxisAlignment.baseline,
  children: [
    Baseline(baseline: 20, baselineType: TextBaseline.alphabetic, child: Text('大', style: TextStyle(fontSize: 24))),
    Baseline(baseline: 20, baselineType: TextBaseline.alphabetic, child: Text('小', style: TextStyle(fontSize: 14))),
  ],
)

// 只有父级宽度受限时才生效的最大尺寸
const LimitedBox(maxHeight: 100, child: ColoredBox(color: Colors.orange))
```

### 4.5 ConstrainedBox / BoxConstraints

```dart
ConstrainedBox(
  constraints: const BoxConstraints(
    minWidth: 80, maxWidth: 200,
    minHeight: 40, maxHeight: 120,
  ),
  child: const Text('被约束的盒子'),
)
// 便捷版
SizedBox(width: 150, height: 150)  // tight 约束
ConstrainedBox(constraints: const BoxConstraints.expand(width: 100, height: 100))
// 常用组合：让 TextField 在 Column 里既能收缩又有最小高度
// IntrinsicHeight 里包 ConstrainedBox(minHeight: 48)

// ⚠️ 注意：约束是"父传子、子返回尺寸"的单向流动，多层 ConstrainedBox 叠加取交集
```

### 4.6 FittedBox / OverflowBox / Transform

```dart
// 内容按比例缩放适配父级（图表、长数字不溢出）
const FittedBox(
  fit: BoxFit.contain,       // 同 Image.fit
  alignment: Alignment.center,
  child: Text('很长很长很长的一段文字'),
)

// 允许 child 溢出父级边界绘制（Stack 里做角标很方便）
OverflowBox(
  alignment: Alignment.topRight,
  minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 60,
  child: const ColoredBox(color: Colors.red, child: Text('角标')),
)

// 几何变换（不影响布局，纯视觉）
Transform(
  alignment: Alignment.center,
  transform: Matrix4.identity()..rotateZ(0.1)..scale(1.2),
  transformHitTests: true, // 点击区域跟随变换后的位置
  child: const Text('旋转缩放'),
)
Transform.rotate(angle: 0.5, child: const Icon(Icons.arrow_forward)) // 便捷构造
Transform.scale(scale: 1.5, child: const Text('放大'))
Transform.translate(offset: const Offset(10, -10), child: const Text('位移'))

// 仅旋转绘制方向（布局仍是原方向，比 Transform 便宜）
const RotatedBox(quarterTurns: 1, child: Text('竖排'))
```

---

## 5. 裁剪与视觉效果 Widget

### 5.1 Opacity —— 透明度

```dart
Opacity(
  opacity: 0.5, // 0~1
  alwaysIncludeSemantics: false, // true 时对无障碍始终可见
  child: const Text('半透明'),
)
// 只让"绘制"半透明（不影响命中/子交互），用 ColoredBox + withOpacity 更省
```

### 5.2 ClipRRect / ClipOval / ClipPath

```dart
// 圆角裁剪（头像/卡片首选，性能优于 Container 的 borderRadius）
ClipRRect(
  borderRadius: BorderRadius.circular(16),
  clipBehavior: Clip.antiAlias, // hardEdge 更快但锯齿明显
  child: Image.network('https://picsum.photos/200/200', fit: BoxFit.cover),
)

// 圆形裁剪
const ClipOval(child: Image.network('https://picsum.photos/200/200', fit: BoxFit.cover))

// 任意路径裁剪（波浪、星形、斜切……）
ClipPath(
  clipper: WaveClipper(), // 自定义 CustomClipper<Path>
  child: const SizedBox(height: 160, child: ColoredBox(color: Colors.blue)),
)

class WaveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    path.lineTo(0, size.height - 30);
    // 二次贝塞尔画一个波浪
    path.quadraticBezierTo(size.width / 4, size.height, size.width / 2, size.height - 30);
    path.quadraticBezierTo(size.width * 3 / 4, size.height - 60, size.width, size.height - 30);
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(covariant WaveClipper oldClipper) => false; // 返回 false 避免重复裁剪
}
```

### 5.3 BackdropFilter —— 毛玻璃

```dart
BackdropFilter(
  filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8, tileMode: TileMode.clamp), // 需 import 'dart:ui'
  child: Container(
    color: Colors.white.withOpacity(0.3), // 蒙层让毛玻璃更明显
    child: const Center(child: Text('毛玻璃效果')),
  ),
)
```

> ⚠️ BackdropFilter 开销大，只包住需要模糊的小区域（如弹窗背景），不要整页包。

### 5.4 ShaderMask / PhysicalModel

```dart
// 渐变蒙版：让子 Widget（常为 Icon/Text）按渐变着色
ShaderMask(
  shaderCallback: (bounds) => const LinearGradient(
    colors: [Colors.purple, Colors.pink],
  ).createShader(bounds),
  blendMode: BlendMode.srcIn,
  child: const Text('渐变文字', style: TextStyle(fontSize: 40, color: Colors.white)),
)

// 物理高程阴影（比 boxShadow 更真实的层级阴影）
PhysicalModel(
  color: Colors.white,
  elevation: 8,
  shadowColor: Colors.black,
  borderRadius: BorderRadius.circular(12),
  clipBehavior: Clip.antiAlias,
  child: const SizedBox(width: 100, height: 60),
)
```

---

## 6. 线性 / 弹性 / 层叠布局

### 6.1 Row 与 Column（Flex 的两个子类）

```dart
Row(
  mainAxisAlignment: MainAxisAlignment.spaceBetween, // 主轴对齐
  crossAxisAlignment: CrossAxisAlignment.center,     // 交叉轴对齐
  mainAxisSize: MainAxisSize.max,                    // max 撑满 | min 包裹内容
  textDirection: TextDirection.ltr,                  // 主轴方向（RTL 时自动反转）
  verticalDirection: VerticalDirection.down,         // down | up
  textBaseline: TextBaseline.alphabetic,             // crossAxisAlignment=baseline 时用
  children: const [Icon(Icons.menu), Text('标题'), Spacer(), Icon(Icons.search)],
)
```

**MainAxisAlignment 六值**：`start` / `center` / `end` / `spaceBetween`（两端贴边）/ `spaceAround`（每个两侧等距）/ `spaceEvenly`（含两端完全等距）。

**CrossAxisAlignment 五值**：`start` / `center` / `end` / `stretch`（交叉轴拉满，需子无固定尺寸）/ `baseline`（文字基线对齐，配 `textBaseline`）。

**Flexible 三兄弟**（只能放在 Row/Column/Flex 里）：

```dart
Row(children: [
  Expanded(          // 占满剩余空间（flex 分配比例）
    flex: 2,         // 剩余空间按 2:1 分
    child: ColoredBox(color: Colors.red.shade200, child: const Text('2/3')),
  ),
  Expanded(
    flex: 1,
    child: ColoredBox(color: Colors.blue.shade200, child: const Text('1/3')),
  ),
])

Row(children: [
  Flexible(          // 松散占用：内容比剩余空间小时保持原样
    fit: FlexFit.loose,
    child: const Text('可伸缩文字'),
  ),
])

Row(children: [
  const Text('左侧'),
  const Spacer(flex: 1),  // 弹性空白，把后面的推到右边
  const Text('右侧'),
])
```

> 💡 **溢出排查口诀**：Row/Column 出现 "A RenderFlex overflowed" 黄黑条纹，99% 是交叉轴里放了不收缩的大内容（长文本/大图）。解法：文本加 `maxLines + overflow`、`Expanded/Flexible` 包住要压缩的 child、或换 `Wrap`。

### 6.2 Wrap —— 自动换行的流式布局（标签云/芯片组）

```dart
Wrap(
  direction: Axis.horizontal,   // 主轴方向
  alignment: WrapAlignment.start,     // 主轴对齐（同 MainAxisAlignment 语义）
  spacing: 8,                    // 主轴间距
  runAlignment: WrapAlignment.center, // run（行/列）在交叉轴的对齐
  runSpacing: 6,                 // 行间距
  crossAxisAlignment: WrapCrossAlignment.center, // 行内交叉轴对齐
  textDirection: TextDirection.ltr,
  verticalDirection: VerticalDirection.down,
  children: [
    for (final tag in ['Flutter', 'Dart', 'Widget', 'Row', 'Column', 'Stack'])
      Chip(label: Text(tag)),
  ],
)
```

### 6.3 Stack 与 Positioned —— 层叠布局

```dart
Stack(
  alignment: AlignmentDirectional.center, // 非 Positioned 子元素的默认位置
  fit: StackFit.loose,     // loose：子按自身尺寸 | passthrough：沿用父约束 | expand：撑满
  clipBehavior: Clip.hardEdge, // Stack 默认裁剪超出部分
  textDirection: TextDirection.ltr,
  children: [
    Image.network('https://picsum.photos/400/300', fit: BoxFit.cover),
    // 渐变蒙版叠在图上
    const Positioned.fill(
      child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(
        begin: Alignment.topCenter, end: Alignment.bottomCenter,
        colors: [Colors.transparent, Colors.black54],
      ))),
    ),
    // 左下角文字
    const Positioned(left: 12, bottom: 12, child: Text('封面标题', style: TextStyle(color: Colors.white, fontSize: 18))),
    // 右上角角标（可用 OverflowBox 溢出 Stack 边界）
    const Positioned(top: 0, right: 0, child: CircleAvatar(radius: 16, child: Text('4.9'))),
    // 未定位的子元素按 alignment 摆放
    const Center(child: Icon(Icons.play_circle, size: 56, color: Colors.white)),
  ],
)
```

**Positioned 四要素**：`left/right/top/bottom` 到对应边的距离 + `width/height`（可省）。未指定 left 又未指定 right 时水平按 Stack 的 alignment。

### 6.4 IndexedStack 与 Flow

```dart
// IndexedStack：所有子都构建但只显示 index 那个（页面切换保活，如底部 Tab 保状态）
IndexedStack(
  index: 1,
  sizing: StackFit.loose, // loose：按最大子确定尺寸 | expand：撑满 | passthrough
  alignment: AlignmentDirectional.topStart,
  children: const [PageOne(), PageTwo()],
)

// Flow：自定义布局委托（RaycastFlutter 的 delegate 模式，比 Stack 灵活但手写布局逻辑）
Flow(
  delegate: FlowMenuDelegate(), // 继承 FlowDelegate，重写 getConstraintsForChild / getSize / paintChildren
  children: const [Icon(Icons.share), Icon(Icons.copy), Icon(Icons.delete)],
)
```

> 💡 Flow 日常很少用，一般场景 Stack + Positioned 足够；要做复杂自定义布局优先考虑 CustomMultiChildLayout 或直接用 Sliver。

---

## 7. 滚动列表：ListView / GridView / Slivers

### 7.1 ListView —— 最常用的滚动列表

```dart
// ① 少量固定子元素（全部构建，不适合长列表）
ListView(
  scrollDirection: Axis.vertical,   // vertical | horizontal
  reverse: false,                   // true 时反向滚动（聊天记录从底部开始）
  controller: _scrollCtrl,          // ScrollController（监听/跳转/保持位置）
  physics: const BouncingScrollPhysics(), // 滚动物理效果，见 7.6 表
  padding: const EdgeInsets.all(12),
  cacheExtent: 250,                 // 预加载视口外 250px 的子项
  shrinkWrap: false,                // ⚠️ true 时高度包裹内容（嵌套滚动/下拉刷新里用，但有性能代价）
  primary: false,                   // true 时自动关联 PrimaryScrollController
  clipBehavior: Clip.hardEdge,
  addAutomaticKeepAlives: true,     // 配合 AutomaticKeepAliveClientMixin 保活子项
  addRepaintBoundaries: true,       // 每项加重绘边界（长列表默认开，减少重绘范围）
  addSemanticIndexes: true,         // 无障碍索引
  dragStartBehavior: DragStartBehavior.start, // 触摸开始即拖拽 | down（按下等阈值）
  hitTestBehavior: HitTestBehavior.opaque,
  children: const [ListTile(title: Text('一')), ListTile(title: Text('二'))],
)

// ② builder：懒加载，长列表唯一正确姿势
ListView.builder(
  itemCount: items.length + 1,      // 可含 header/footer
  itemExtent: 72,                   // 固定行高时指定，布局计算 O(1)，性能更好
  prototypeItem: const ListTile(title: Text('x')), // 无 itemExtent 时的估算基准
  findChildIndexCallback: (key) {   // 滑动到指定 key 的位置（如定位到某条消息）
    final v = items.indexWhere((e) => e.id == (key as ValueKey<String>).value);
    return v < 0 ? null : v + 1;
  },
  itemBuilder: (context, index) {
    if (index == 0) return const ListTile(title: Text('头部'), tileColor: Colors.black12);
    final item = items[index - 1];
    return ListTile(
      key: ValueKey(item.id),       // 列表数据增删排序时，key 保证正确复用动画
      leading: CircleAvatar(backgroundImage: NetworkImage(item.avatar)),
      title: Text(item.title),
      subtitle: Text(item.subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => debugPrint('tap ${item.id}'),
    );
  },
)

// ③ separated：带分割线
ListView.separated(
  itemCount: 20,
  separatorBuilder: (_, i) => i % 4 == 3
      ? const Divider(height: 1, thickness: 1)
      : const SizedBox(height: 8),  // 每 4 条后加分割线，否则空白
  itemBuilder: (_, i) => ListTile(title: Text('item $i')),
)

// ④ custom：SliverChildBuilderDelegate 完全控制
ListView.custom(
  childrenDelegate: SliverChildBuilderDelegate(
    (context, index) => ListTile(title: Text('$index')),
    childCount: 50,
    findChildIndexCallback: null,
    addAutomaticKeepAlives: false,
    addRepaintBoundaries: true,
    addSemanticIndexes: false,
  ),
)
```

**ScrollController 常用 API**：

```dart
final _ctrl = ScrollController();

// 监听滚动位置（上拉加载/吸顶标题）
_ctrl.addListener(() {
  if (_ctrl.position.pixels >= _ctrl.position.maxScrollExtent - 200) _loadMore();
});

// 动画跳转（offset 单位 px）
_ctrl.animateTo(0, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
_ctrl.jumpTo(120); // 无动画瞬移

// 保持页面状态：列表页外持有 controller，配合 PageStorageKey/ AutomaticKeepAliveClientMixin

// 页面销毁时务必 dispose
@override
void dispose() { _ctrl.dispose(); super.dispose(); }
```

### 7.2 GridView —— 五种网格委托

```dart
// ① count：固定列数（最常用）
GridView.count(
  crossAxisCount: 2,            // 列数（水平滚动时为行数）
  mainAxisSpacing: 10,          // 主轴间距
  crossAxisSpacing: 10,         // 交叉轴间距
  childAspectRatio: 0.8,       // 子项宽高比（width/height）
  padding: const EdgeInsets.all(12),
  scrollDirection: Axis.vertical,
  reverse: false,
  controller: _gridCtrl,
  physics: const ClampingScrollPhysics(),
  shrinkWrap: false,
  primary: false,
  cacheExtent: 500,
  children: List.generate(20, (i) => Card(
    child: Center(child: Text('卡片 $i')),
  )),
)

// ② extent：固定交叉轴尺寸（"每项宽 160"），列数自适应
GridView.extent(
  maxCrossAxisExtent: 180,     // 交叉轴最大尺寸
  mainAxisSpacing: 8,
  crossAxisSpacing: 8,
  childAspectRatio: 1,        // ⚠️ 与 maxCrossAxisExtent 二选一，都指定 extent 优先
  children: List.generate(12, (i) => Container(color: Colors.primaries[i % 18])),
)

// ③ builder：懒加载网格（瀑布场景长列表）
GridView.builder(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 2,
    mainAxisSpacing: 10,
    crossAxisSpacing: 10,
    childAspectRatio: 1,
  ),
  itemCount: 100,
  itemBuilder: (_, i) => Card(child: Center(child: Text('grid $i'))),
)

// ④ custom：SliverGridDelegate 完全自定义（瀑布流用 staggered_grid_view 三方库）
GridView.custom(
  gridDelegate: _MyGridDelegate(), // 继承 SliverGridDelegate，实现 getLayout
  childrenDelegate: SliverChildListDelegate(List.generate(9, (i) => Text('$i'))),
)

// ⑤ SliverGridDelegateWithMaxCrossAxisExtent（同 extent 的委托形式）
GridView(
  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
    maxCrossAxisExtent: 200,
    mainAxisExtent: 260,       // 主轴尺寸也可固定
    crossAxisSpacing: 8,
    mainAxisSpacing: 8,
  ),
  children: const [],
)
```

**三种 SliverGridDelegate 对比**：

| 委托 | 决定 | 适用 |
| --- | --- | --- |
| `SliverGridDelegateWithFixedCrossAxisCount` | 列数固定 | 常见宫格 |
| `SliverGridDelegateWithMaxCrossAxisExtent` | 交叉轴最大尺寸 | 响应式/瀑布列数自适应 |
| `SliverGridDelegateWithFixedCrossAxisExtent` | 每项固定尺寸 | 对齐严格的网格 |

### 7.3 CustomScrollView + Sliver 家族

一个页面里组合多种滚动头（AppBar 折叠 + 网格 + 列表）的唯一正解：

```dart
CustomScrollView(
  controller: _ctrl,
  scrollDirection: Axis.vertical,
  reverse: false,
  physics: const BouncingScrollPhysics(),
  anchor: 0,                       // 初始锚点子项索引（配合 center: ValueKey 用）
  center: null,
  cacheExtent: 100,
  slivers: <Widget>[
    // 大标题折叠 AppBar
    SliverAppBar(
      pinned: true,                // 滚动到顶部也保留
      expandedHeight: 220,         // 展开高度
      flexibleSpace: FlexibleSpaceBar(
        title: const Text('我的主页'),
        centerTitle: true,
        background: Image.network('https://picsum.photos/800/400', fit: BoxFit.cover),
        collapseMode: CollapseMode.pin, // parallax | pin | hero
      ),
    ),

    // 普通 Sliver：分组头 + 网格
    SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text('热门推荐', style: Theme.of(context).textTheme.titleLarge),
      ),
    ),
    SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2, childAspectRatio: 0.85, crossAxisSpacing: 10, mainAxisSpacing: 10,
        ),
        delegate: SliverChildBuilderDelegate(
          (_, i) => Card(child: Center(child: Text('商品 $i'))),
          childCount: 6,
        ),
      ),
    ),

    // 分组吸顶头（滚动到这段时钉在顶部）
    SliverPersistentHeader(
      pinned: true,
      delegate: _StickyHeaderDelegate(height: 48, title: '最新动态'),
    ),

    // 列表
    SliverPadding(
      padding: const EdgeInsets.all(12),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (_, i) => ListTile(title: Text('动态 $i')),
          childCount: 15,
        ),
      ),
    ),

    // 横向滚动（嵌套时给外层加 NeverScrollableScrollPhysics 防冲突）
    SliverToBoxAdapter(
      child: SizedBox(
        height: 120,
        child: ListView(
          scrollDirection: Axis.horizontal,
          physics: const ClampingScrollPhysics(),
          children: List.generate(10, (i) => Container(
            width: 120, margin: const EdgeInsets.all(8), color: Colors.primaries[i % 18],
          )),
        ),
      ),
    ),

    // 撑满剩余空间（"没有更多了"）
    const SliverFillRemaining(
      hasScrollBody: false, // false：内容不足时撑满；true：内部可滚动
      child: Center(child: Text('— 没有更多了 —')),
    ),
  ],
)

// 吸顶头委托示例
class _StickyHeaderDelegate extends SliverPersistentHeaderDelegate {
  _StickyHeaderDelegate({required this.height, required this.title});
  final double height;
  final String title;

  @override
  double get minExtent => height;   // 收起后高度
  @override
  double get maxExtent => height;   // 展开后高度

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return ColoredBox(
      color: Theme.of(context).colorScheme.surface,
      child: Center(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold))),
    );
  }

  @override
  bool shouldRebuild(covariant _StickyHeaderDelegate old) => old.title != title || old.height != height;
}
```

**Sliver 速查表**：

| Sliver | 用途 |
| --- | --- |
| `SliverList` | 懒加载列表 |
| `SliverFixedExtentList` | 固定行高列表（比 SliverList 更快） |
| `SliverGrid` | 懒加载网格 |
| `SliverBox`/`SliverToBoxAdapter` | 把一个普通 Widget 放进 sliver 列表 |
| `SliverFillRemaining` | 填充剩余空间 |
| `SliverPadding` / `SliverVisibility` / `SliverOpacity` | 内边距 / 显隐 / 透明度 |
| `SliverAppBar` | 可折叠 AppBar |
| `SliverPersistentHeader` | 吸顶分组头 |
| `SliverAnimatedList` | 增删带动画的列表（见 15 章） |
| `SliverOverlapAbsorber`/`SliverOverlapInjector` | NestedScrollView 联动 |

### 7.4 PageView —— 轮播 / 引导页

```dart
final _pageCtrl = PageController(initialPage: 0, viewportFraction: 0.9); // 视口占比（中间放大效果）

PageView(
  controller: _pageCtrl,
  scrollDirection: Axis.horizontal,
  reverse: false,
  physics: const PageScrollPhysics(),     // 整页吸附
  pageSnapping: true,                     // 松手自动吸附整页
  padEnds: true,                          // 首尾不贴边
  allowImplicitScrolling: false,          // 无障碍翻页
  onPageChanged: (i) => setState(() => _current = i),
  children: const [BannerPage('一'), BannerPage('二'), BannerPage('三')],
)

// 无限轮播常见做法：100000 项 + 初始 index = 500000，itemBuilder: items[i % n]
// builder 版（无限/懒加载）
PageView.builder(
  controller: _pageCtrl,
  itemCount: 3,
  itemBuilder: (_, i) => Center(child: Text('page $i', style: const TextStyle(fontSize: 40))),
)

// 页面指示器
SmoothPageIndicator(
  controller: _pageCtrl,
  count: 3,
  effect: const WormEffect(dotWidth: 8, dotHeight: 8, activeDotColor: Colors.blue), // smooth_page_indicator 三方库
)

@override
void dispose() { _pageCtrl.dispose(); super.dispose(); }
```

### 7.5 NestedScrollView —— 内嵌滚动联动

```dart
// 典型场景：外层面 AppBar 折叠，内层 TabView 滚动
NestedScrollView(
  controller: _outerCtrl,               // 外层 ScrollController
  scrollDirection: Axis.vertical,
  physics: const ClampingScrollPhysics(),
  headerSliverBuilder: (context, innerBoxIsScrolled) => [
    SliverAppBar(
      pinned: true,
      expandedHeight: 200,
      forceElevated: innerBoxIsScrolled, // 内层开始滚动时加阴影
      flexibleSpace: const FlexibleSpaceBar(title: Text('个人中心')),
    ),
  ],
  body: TabBarView(
    children: [
      // 内层滚动必须用可滚动 Widget 并配 SliverOverlapAbsorber
      _TabScrollView(title: '关注'),
      _TabScrollView(title: '粉丝'),
    ],
  ),
)
```

### 7.6 SingleChildScrollView / Scrollbar / RefreshIndicator

```dart
// 单 child 滚动（内容确定不高、表单页）
SingleChildScrollView(
  scrollDirection: Axis.vertical,
  reverse: false,
  padding: const EdgeInsets.all(16),
  physics: const AlwaysScrollableScrollPhysics(), // 配 RefreshIndicator 必须
  primary: false,
  controller: _ctrl,
  child: Column(children: const [TextField(), TextField(), TextField()]),
)

// 滚动条（3.x 全平台显示）
Scrollbar(
  controller: _ctrl,
  thumbVisibility: true,      // 一直显示
  trackVisibility: true,      // 显示轨道
  thickness: WidgetStateProperty.all(6), // 粗细
  radius: const Radius.circular(3),
  child: ListView.builder(...),
)

// 下拉刷新
RefreshIndicator(
  onRefresh: () async {
    await Future.delayed(const Duration(seconds: 1)); // 模拟请求
    setState(() => items = List.generate(20, (i) => '新数据 $i'));
  },
  color: Colors.blue,             // 指示器颜色
  backgroundColor: Colors.white,
  displacement: 40,               // 指示器下拉距离
  edgeOffset: 0,                  // 触发位置偏移
  triggerMode: RefreshIndicatorTriggerMode.onEdge, // onEdge | anywhere
  notificationPredicate: (n) => n.depth == 0,      // 只响应最外层滚动
  child: ListView(children: items.map((e) => ListTile(title: Text(e))).toList()),
)

// 滚动物理效果速查
// ClampingScrollPhysics    Android 风格（边界回弹停住）
// BouncingScrollPhysics    iOS 风格（边界弹性）—— ⚠️ Android 平台默认 clamp，iOS 默认 bounce
// AlwaysScrollableScrollPhysics  总有滚动反馈（配 overscroll 监听）
// NeverScrollableScrollPhysics   禁用滚动
// RangeMaintainingScrollPhysics  滚动到超出范围时保持位置
// PageScrollPhysics            整页吸附
// 局部覆盖：Physics: const ClampingScrollPhysics(parent: BouncingScrollPhysics()) 叠加继承
```

---

## 8. 手势与事件

### 8.1 GestureDetector —— 手势全家桶

```dart
GestureDetector(
  behavior: HitTestBehavior.opaque, // translucent | opaque | deferToChild
  onTap: () => debugPrint('单击'),
  onTapDown: (d) => debugPrint('按下位置: ${d.localPosition}'), // 全局: d.globalPosition
  onTapUp: (d) => debugPrint('抬起'),
  onTapCancel: () => debugPrint('取消'),
  onDoubleTap: () => debugPrint('双击'),
  onDoubleTapDown: (d) => debugPrint('双指按下'),
  onLongPress: () => debugPrint('长按'),
  onLongPressStart: (d) => debugPrint('长按开始'),
  onLongPressMoveUpdate: (d) => debugPrint('长按移动'),
  onLongPressEnd: (d) => debugPrint('长按结束'),
  onSecondaryTap: () => debugPrint('右键/双指点击'),
  onTertiaryTap: () => debugPrint('中键点击'),
  // —— 拖拽 ——
  onVerticalDragStart: (d) => debugPrint('垂直拖拽开始'),
  onVerticalDragUpdate: (d) => debugPrint('移动 ${d.primaryDelta}'), // 每帧回调
  onVerticalDragEnd: (d) => debugPrint('结束速度 ${d.primaryVelocity}'),
  onHorizontalDragStart: (_) {}, onHorizontalDragUpdate: (_) {}, onHorizontalDragEnd: (_) {},
  onPanStart: (_) {}, onPanUpdate: (_) {}, onPanEnd: (_) {},   // 任意方向平移
  // —— 缩放（双指）——
  onScaleStart: (d) => debugPrint('缩放开始 ${d.focalPoint}'),
  onScaleUpdate: (d) => debugPrint('缩放比 ${d.scale} 旋转 ${d.rotation}'),
  onScaleEnd: (_) {},
  onForcePressStart: (_) {}, onForcePressEnd: (_) {}, onForcePressUpdate: (_) {}, // 3D Touch（iOS）
  excludeFromSemantics: false,   // 排除在手势语义外
  dragStartBehavior: DragStartBehavior.start, // start：移动阈值后触发 | down：按下即触发
  child: const SizedBox(width: 200, height: 100, child: ColoredBox(color: Colors.blue)),
)
```

> ⚠️ `onTap` 与 `onVerticalDragUpdate` 同时存在时，一旦判定为拖拽，`onTap` 就被取消（竞争仲裁）。要"既能点又能拖"就分别写好回调，手势竞技场会自动仲裁。

### 8.2 InkWell / InkResponse —— Material 水波纹

```dart
InkWell(
  onTap: () {},
  onTapDown: (_) {}, onTapCancel: () {}, onDoubleTap: () {},
  onLongPress: () {},
  onHighlightChanged: (v) => debugPrint('高亮: $v'),
  onHover: (v) => debugPrint('悬停: $v'),       // 桌面/Web
  onFocusChange: (v) => debugPrint('焦点: $v'),  // 键盘导航
  mouseCursor: SystemMouseCursors.click,        // 桌面鼠标指针
  borderRadius: BorderRadius.circular(12),
  customBorder: const CircleBorder(),
  splashColor: Colors.blue.withOpacity(0.3),    // 水波纹颜色
  highlightColor: Colors.blue.withOpacity(0.1), // 按住高亮
  hoverColor: Colors.blue.withOpacity(0.05),    // 悬停色
  focusColor: Colors.blue.withOpacity(0.1),
  splashFactory: InkSparkle.splashFactory,      // ripple | splash | inkSparkle(M3 默认)
  enableFeedback: true,                          // 触觉反馈
  excludeFromSemantics: false,
  autofocus: false,
  canRequestFocus: true,
  radius: 24,                                    // 波纹半径
  containedInkWell: false,                       // 波纹限制在自身内
  child: const ListTile(title: Text('点我有水波纹')),
)

// 无 background 的纯 Ink 响应（用于自定义形状/背景上）
InkResponse(onTap: () {}, containedInk: true, highlightShape: BoxShape.circle, child: const Icon(Icons.add))
```

> 💡 水波纹必须画在 **Material 之上**：`InkWell` 的祖先链里要有 `Material`（Scaffold 自带，自定义背景请用 `Material(color: ..., child: InkWell(...))`）。

### 8.3 Dismissible —— 侧滑删除

```dart
Dismissible(
  key: ValueKey(item.id),      // ⚠️ 必填且唯一，列表重排靠它复用
  direction: DismissDirection.horizontal, // endToStart | startToEnd | horizontal | vertical | up | down | none
  resizeDuration: const Duration(milliseconds: 300), // 删除后列表收缩动画
  dismissThresholds: const {DismissDirection.endToStart: 0.4}, // 滑动超过 40% 才删
  movementDuration: const Duration(milliseconds: 200), // 滑行动画时长
  onDismissed: (direction) => _removeAt(index),
  onUpdate: (details) {},      // Flutter 3.22+ 拖拽过程回调
  dragStartBehavior: DragStartBehavior.start,
  crossAxisEndOffset: 0.0,     // 完全滑出的位置比例
  background: const ColoredBox(color: Colors.orange, child: Align(alignment: Alignment.centerLeft, child: Icon(Icons.archive))), // 从左滑出的背景
  secondaryBackground: const ColoredBox(color: Colors.red, child: Align(alignment: Alignment.centerRight, child: Icon(Icons.delete))), // 从右滑出
  confirmDismiss: (direction) async { // 返回 false 取消删除（确认弹窗）
    return await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('确认删除？'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('取消')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('删除')),
      ],
    )) ?? false;
  },
  child: ListTile(title: Text(item.title)),
)
```

### 8.4 Draggable / DragTarget —— 拖拽与放置

```dart
// 可拖拽源
Draggable<String>(
  data: 'payload-data',          // 拖动时携带的数据
  feedback: Opacity(opacity: 0.8, child: const Chip(label: Text('跟随中的筹码'))), // 手指上的投影
  childWhenDragging: const Opacity(opacity: 0.3, child: Chip(label: Text('原位'))), // 拖走后的占位
  childOffset: const Offset(0, -20),      // 投影相对手指偏移
  affinity: Axis.vertical,                // 竞争轴
  maxSimultaneousDrags: 1,                // 同时拖几个
  onDragStarted: () {}, onDraggableCanceled: (v, o) {}, onDragCompleted: () {}, onDragEnd: (d) {},
  child: const Chip(label: Text('拖我')),
)

// 放置目标
DragTarget<String>(
  builder: (context, candidateData, rejectedData) {
    final hovering = candidateData.isNotEmpty;
    return Container(
      width: 200, height: 100,
      color: hovering ? Colors.green.shade200 : Colors.grey.shade200,
      child: Center(child: Text(hovering ? '松手放入' : '拖到这里')),
    );
  },
  onWillAccept: (data) => data.isNotEmpty,  // 能否接收
  onAccept: (data) => debugPrint('收到: $data'),
  onLeave: (_) {}, onAcceptWithDetails: (d) {}, onMove: (d) {},
  hitTestBehavior: HitTestBehavior.translucent,
)

// 长按拖拽排序（Flutter 3.7+，替代 ReorderableListView 的简单场景）
LongPressDraggable<String>(data: 'x', feedback: const Chip(label: Text('拖')), child: const Chip(label: Text('长按拖')))
```

### 8.5 InteractiveViewer —— 双指缩放平移

```dart
InteractiveViewer(
  boundaryMargin: const EdgeInsets.all(20),  // 可拖出边界
  constrained: true,                          // 限制在父尺寸内
  maxScale: 4,                                // 最大倍率
  minScale: 0.5,
  scaleFactor: 200,                           // 滚轮缩放步长（Web/桌面）
  scaleEnabled: true,
  panEnabled: true,
  trackpadScrollCausesScale: false,
  transformationController: _matrixCtrl,      // Matrix4 控制器（编程式缩放/复位）
  alignment: Alignment.center,
  clipBehavior: Clip.none,                    // none：溢出部分也可见
  onInteractionStart: (d) {}, onInteractionUpdate: (d) {}, onInteractionEnd: (d) {},
  child: Image.network('https://picsum.photos/600/600'),
)
```

### 8.6 事件传递与监听

```dart
// 滚动通知监听（列表滚动到底、滚动方向吸顶）
NotificationListener<ScrollNotification>(
  onNotification: (n) {
    if (n is ScrollStartNotification) debugPrint('开始滚动');
    if (n is ScrollUpdateNotification) debugPrint('滚动中 ${n.metrics.pixels}');
    if (n is ScrollEndNotification) debugPrint('停止滚动');
    if (n is OverscrollNotification) debugPrint('过度滚动 ${n.overscroll}'); // 下拉刷新可拦
    if (n is UserScrollNotification) debugPrint('用户方向 ${n.direction}');
    return false; // true 则阻止继续向上传递
  },
  child: ListView.builder(itemBuilder: (_, i) => ListTile(title: Text('$i')), itemCount: 30),
)

// 布局尺寸变化通知（键盘弹出导致的高度变化）
NotificationListener<SizeChangedLayoutNotification>(
  onNotification: (n) { debugPrint('尺寸变化'); return false; },
  child: NotificationListener<LayoutChangedNotification>(
    onNotification: (_) => false,
    child: const TextField(),
  ),
)

// 阻止子 Widget 接收事件
IgnorePointer(ignoring: true, child: ElevatedButton(onPressed: () {}, child: const Text('点不动')))
AbsorbPointer(absorbing: true, child: ElevatedButton(onPressed: () {}, child: const Text('被吸收')))

// 键盘监听（PhysicalKeyboardKey / LogicalKeyboardKey，需 import 'package:flutter/services.dart'）
RawKeyboardListener(
  focusNode: _keyboardFocus,
  onKey: (event) {
    if (event is RawKeyDownEvent && event.logicalKey == LogicalKeyboardKey.escape) Navigator.pop(context);
  },
  autofocus: true,
  child: const TextField(),
)
```

> 💡 **事件冒泡**：Flutter 的命中测试从手指位置往下找到最深的目标，再**向上**冒泡（与 Web 相反）。`GestureDetector` 的 `onTap` 只能收到冒泡上来的事件，要"只让自己响应"就包 `AbsorbPointer`。

---

## 9. 按钮 Widget

### 9.1 Material 3 五大按钮

```dart
// ① ElevatedButton：凸起主按钮（最重要操作）
ElevatedButton(
  onPressed: () {},              // null 时自动置灰禁用
  onLongPress: () {},
  onHover: (_) {},               // 桌面悬停
  onFocusChange: (_) {},
  autofocus: false,
  clipBehavior: Clip.antiAlias,
  style: ButtonStyle(
    foregroundColor: WidgetStateProperty.all(Colors.white),        // 文字/图标色
    backgroundColor: WidgetStateProperty.resolveWith((states) {    // 按状态解析背景色
      if (states.contains(WidgetState.disabled)) return Colors.grey;
      if (states.contains(WidgetState.pressed)) return Colors.blue.shade700;
      return Colors.blue;
    }),
    disabledForegroundColor: WidgetStateProperty.all(Colors.white54),
    disabledBackgroundColor: WidgetStateProperty.all(Colors.grey.shade300),
    shadowColor: WidgetStateProperty.all(Colors.black45),
    surfaceTintColor: WidgetStateProperty.all(Colors.transparent), // M3 色调，设为 transparent 恢复经典色
    elevation: WidgetStateProperty.all(2),                         // 阴影
    padding: WidgetStateProperty.all(const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
    minimumSize: WidgetStateProperty.all(const Size(88, 40)),      // 最小尺寸
    fixedSize: WidgetStateProperty.all(const Size(200, 48)),       // 固定尺寸（覆盖 minimumSize）
    maximumSize: WidgetStateProperty.all(Size.infinite),
    side: WidgetStateProperty.all(const BorderSide(color: Colors.blue, width: 1)), // 边框
    shape: WidgetStateProperty.all(RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
    mouseCursor: WidgetStateProperty.all(SystemMouseCursors.click),
    visualDensity: VisualDensity.compact,          // 紧凑布局
    tapTargetSize: MaterialTapTargetSize.padded,   // 点击区域尺寸
    animationDuration: const Duration(milliseconds: 200),
    enableFeedback: true,
    alignment: Alignment.center,
    splashFactory: InkSparkle.splashFactory,
    overlayColor: WidgetStateProperty.all(Colors.white24), // 高亮波纹色
  ),
  child: const Text('主要按钮'),
)

// ② TextButton：文字按钮（次级操作）
TextButton(onPressed: () {}, style: TextButton.styleFrom(foregroundColor: Colors.blue), child: const Text('文字按钮'))

// ③ OutlinedButton：描边按钮（并列操作）
OutlinedButton(onPressed: () {}, style: OutlinedButton.styleFrom(
  side: const BorderSide(color: Colors.blue),
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
), child: const Text('描边按钮'))

// ④ FilledButton / FilledButton.tonal / FilledButton.icon（M3 高对比按钮）
FilledButton(onPressed: () {}, child: const Text('填充按钮'))
FilledButton.tonal(onPressed: () {}, child: const Text('柔和填充'))
FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.add), label: const Text('新建'))

// ⑤ styleFrom 快捷构造（等价 ButtonStyle，常用）
ElevatedButton.styleFrom(
  backgroundColor: Colors.teal,
  foregroundColor: Colors.white,
  elevation: 0,
  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
  minimumSize: const Size(120, 48),
  shape: const StadiumBorder(),
  textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
  alignment: Alignment.center,
  enabledMouseCursor: SystemMouseCursors.click,
  disabledMouseCursor: SystemMouseCursors.forbidden,
  visualDensity: VisualDensity.standard,
  tapTargetSize: MaterialTapTargetSize.padded,
  animationDuration: const Duration(milliseconds: 150),
  enableFeedback: true,
)

// 图标 + 文字组合
ElevatedButton.icon(onPressed: () {}, icon: const Icon(Icons.download), label: const Text('下载'))
```

### 9.2 IconButton 与变体

```dart
IconButton(
  onPressed: () {},
  onLongPress: () {},
  icon: const Icon(Icons.thumb_up),
  iconSize: 24,                    // 图标尺寸
  visualDensity: VisualDensity.compact,
  padding: const EdgeInsets.all(8), // 内边距
  alignment: Alignment.center,
  splashRadius: 24,                // 波纹半径
  splashColor: Colors.blue.withOpacity(0.3),
  highlightColor: Colors.blue.withOpacity(0.1),
  hoverColor: Colors.blue.withOpacity(0.05),
  focusColor: Colors.blue.withOpacity(0.1),
  color: Colors.grey.shade700,
  disabledColor: Colors.grey.shade300,
  autofocus: false,
  tooltip: '点赞',                  // 长按提示
  enableFeedback: true,
  constraints: const BoxConstraints(minWidth: 48, minHeight: 48), // 命中区域
  isSelected: false,                // 选中态（配合 selectedIcon）
  selectedIcon: const Icon(Icons.thumb_up, color: Colors.blue),
  mouseCursor: SystemMouseCursors.click,
)

// 常用变体
IconButton.filled(onPressed: () {}, icon: const Icon(Icons.add))                    // 填充底
IconButton.filledTonal(onPressed: () {}, icon: const Icon(Icons.edit))              // 柔和填充
IconButton.outlined(onPressed: () {}, icon: const Icon(Icons.share))                // 描边
BackButton(onPressed: () {})   // 平台感知返回键
CloseButton(onPressed: () {})  // 关闭 X
```

### 9.3 FloatingActionButton

```dart
FloatingActionButton(
  onPressed: () {},
  onLongPress: () {},
  child: const Icon(Icons.add),
  tooltip: '新建',              // 长按提示（必填，无障碍）
  foregroundColor: Colors.white,
  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
  focusColor: Colors.blue.shade100,
  hoverColor: Colors.blue.shade200,
  splashColor: Colors.white24,
  heroTag: 'fab-main',          // ⚠️ 同屏多个 FAB 必须区分
  elevation: 6,
  focusElevation: 8,
  hoverElevation: 10,
  highlightElevation: 12,       // 按下阴影
  disabledElevation: 0,
  shape: const CircleBorder(),  // 也可 RoundedRectangleBorder 做圆角方形 FAB
  clipBehavior: Clip.antiAlias,
  isExtended: false,            // true 时显示 extendedText 图标
  enableFeedback: true,
  autofocus: false,
  materialTapTargetSize: MaterialTapTargetSize.padded,
  mini: false,                  // 小尺寸
  extendedPadding: const EdgeInsets.symmetric(horizontal: 20),
  // extendedTextStyle: const TextStyle(fontSize: 16),
)

// 扩展 FAB（图标 + 文字）
FloatingActionButton.extended(
  onPressed: () {},
  icon: const Icon(Icons.edit),
  label: const Text('写文章'),
  extendedIconLabelSpacing: 8,
  heroTag: 'fab-write',
)

// 定位（Scaffold 的 floatingActionButtonLocation）
floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,        // 右下浮动
// endDocked（贴 BottomAppBar）| centerDocked | centerFloat | startTop | endTop | mini 系列
```

### 9.4 SegmentedButton 与 PopupMenuButton

```dart
// 分段选择（M3，替代 Radio 组）
SegmentedButton<String>(
  segments: const [
    ButtonSegment(value: 'day', label: Text('日'), icon: Icon(Icons.calendar_view_day)),
    ButtonSegment(value: 'week', label: Text('周'), icon: Icon(Icons.calendar_view_week)),
    ButtonSegment(value: 'month', label: Text('月'), icon: Icon(Icons.calendar_view_month)),
  ],
  selected: const {'day'},          // Set，支持多选
  onSelectionChanged: (s) => setState(() => _selected = s),
  multiSelectionEnabled: false,     // true 允许多选
  emptySelectionAllowed: false,     // 能否全不选
  showSelectedIcon: true,           // 选中段右侧显示 ✓
  selectedIcon: const Icon(Icons.check),
  style: ButtonStyle(
    visualDensity: VisualDensity.compact,
    side: WidgetStateProperty.all(BorderSide(color: Colors.grey.shade400)),
  ),
)

// 溢出菜单
PopupMenuButton<String>(
  icon: const Icon(Icons.more_vert),
  iconSize: 24,
  tooltip: '更多操作',
  onSelected: (v) => debugPrint('选择 $v'),
  onCanceled: () {},
  onOpened: () {},
  enabled: true,
  elevation: 8,
  shadowColor: Colors.black45,
  position: PopupMenuPosition.under,        // over | under
  padding: const EdgeInsets.symmetric(vertical: 4),
  color: Colors.white,
  surfaceTintColor: null,
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  constraints: const BoxConstraints(minWidth: 160),
  popUpAnimationStyle: AnimationStyle(duration: const Duration(milliseconds: 150)),
  itemBuilder: (_) => const [
    PopupMenuItem(value: 'edit', child: ListTile(leading: Icon(Icons.edit), title: Text('编辑'))),
    PopupMenuItem(value: 'share', child: ListTile(leading: Icon(Icons.share), title: Text('分享'))),
    PopupMenuDivider(height: 1),
    PopupMenuItem(value: 'delete', child: ListTile(leading: Icon(Icons.delete, color: Colors.red), title: Text('删除', style: TextStyle(color: Colors.red)))),
  ],
)
```

---

## 10. 输入与表单

### 10.1 TextField —— 完整参数

```dart
final _ctrl = TextEditingController(text: '初始值');   // 文本控制器
final _focus = FocusNode();                            // 焦点控制

TextField(
  controller: _ctrl,
  focusNode: _focus,
  decoration: InputDecoration(
    labelText: '手机号',                 // 浮动标签
    hintText: '请输入 11 位手机号',       // 占位提示（与 labelText 二选一更清爽）
    helperText: '用于登录验证',           // 辅助说明（常驻下方）
    helperStyle: const TextStyle(color: Colors.grey),
    errorText: _error,                   // 错误文案（非空即红态）
    counterText: '',                     // 计数器文案（'' 隐藏）
    prefixIcon: const Icon(Icons.phone), // 前缀图标
    prefixIconColor: Colors.grey,        // 3.29+
    prefix: const Text('+86 '),          // 前缀组件
    suffixIcon: _ctrl.text.isNotEmpty
        ? IconButton(icon: const Icon(Icons.clear), onPressed: _ctrl.clear)
        : null,                          // 后缀图标（清空按钮经典写法）
    suffixText: '已验证',                 // 后缀文字
    suffixIconColor: Colors.grey,
    icon: const Icon(Icons.person),      // 装饰外左侧图标（旧式，优先 prefixIcon）
    filled: true,                         // 填充背景
    fillColor: Colors.grey.shade100,      // 填充色
    // 边框：underline（默认）| outline（盒型）
    border: const OutlineInputBorder(     // 常规态
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: Colors.grey),
    ),
    enabledBorder: const OutlineInputBorder(borderSide: BorderSide(color: Colors.grey)),
    focusedBorder: const OutlineInputBorder(borderSide: BorderSide(color: Colors.blue, width: 2)),
    errorBorder: const OutlineInputBorder(borderSide: BorderSide(color: Colors.red)),
    focusedErrorBorder: const OutlineInputBorder(borderSide: BorderSide(color: Colors.red, width: 2)),
    disabledBorder: const OutlineInputBorder(borderSide: BorderSide(color: Colors.grey)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    isDense: true,                        // 紧凑模式
    isCollapsed: false,                   // 完全去掉内边距（自定义高度）
    semanticCounterText: '3 字',
  ),
  keyboardType: TextInputType.phone,       // 键盘类型
  textInputAction: TextInputAction.next,   // 键盘动作键
  textCapitalization: TextCapitalization.none, // words | sentences | characters | none
  textAlign: TextAlign.start,
  textDirection: TextDirection.ltr,
  textAlignVertical: TextAlignVertical.center, // 多行时垂直对齐
  style: const TextStyle(fontSize: 16),
  strutStyle: const StrutStyle(),
  cursorColor: Colors.blue,                // 光标颜色
  cursorWidth: 2,
  cursorHeight: 20,                       // null 时随字号
  cursorRadius: const Radius.circular(2),
  cursorOpacityAnimates: true,
  selectionControls: materialTextSelectionControls, // 全平台复制条
  selectionHeightStyle: BoxHeightStyle.tight,
  selectionWidthStyle: BoxWidthStyle.tight,
  obscureText: false,                      // 密码模式
  obscuringCharacter: '•',                 // 掩码字符
  autocorrect: true,
  smartDashesType: SmartDashesType.enabled,
  smartQuotesType: SmartQuotesType.enabled,
  enableSuggestions: true,
  maxLines: 1,                             // null 为自动换行多行
  minLines: 1,
  maxLength: 11,                           // null 不限；配 counterText: '' 隐藏计数
  maxLengthEnforcement: MaxLengthEnforcement.enforced, // 严格限长
  inputFormatters: [
    FilteringTextInputFormatter.digitsOnly, // 只允许数字
    LengthLimitingTextInputFormatter(11),
    // TextInputFormatter.withFunction(...) 自定义
  ],
  onChanged: (v) => debugPrint('输入: $v'), // 每次输入
  onTap: () {},                            // 点击输入框
  onTapAlwaysCalled: false,
  onTapOutside: (event) {                  // 点击外部（收键盘）
    FocusManager.instance.primaryFocus?.unfocus();
  },
  onEditingComplete: () {},                // 点击键盘完成键
  onSubmitted: (v) => debugPrint('提交: $v'), // 回车/完成
  onAppPrivateCommand: (_, __) {},         // 输入法私有命令
  enabled: true,                           // false 置灰不可编辑
  readOnly: false,                         // 只读（可点选复制，如扫码结果）
  canRequestFocus: true,
  autofocus: false,                        // 进入页面自动聚焦
  ignorePointers: true,                    // 忽略指针（键盘由 focusNode 控制）
  magnifierConfiguration: TextMagnifierConfiguration.disabled, // 长按放大镜
  scribbleEnabled: true,                   // Apple Pencil 手写
  enableInteractiveSelection: true,        // 长按选择
  scrollPadding: const EdgeInsets.all(20), // 键盘弹出时的滚动内边距
  dragStartBehavior: DragStartBehavior.start,
  scrollController: _scrollCtrl,           // 多行时的滚动控制器
  scrollPhysics: const ClampingScrollPhysics(),
  restorationId: 'phone_field',            // 状态恢复
  clipBehavior: Clip.hardEdge,
  keyboardAppearance: Brightness.light,    // iOS 键盘深浅色
  mouseCursor: SystemMouseCursors.text,
  buildCounter: (_, {required currentLength, required maxLength, required isFocused}) => null, // 自定义计数器
  contextMenuBuilder: (context, editableTextState) {
    // 自定义长按菜单（复制/全选/分享）
    return AdaptiveTextSelectionToolbar.buttonItems(
      buttonItems: [
        ContextMenuButtonItem(onPressed: () {}, label: '复制'),
        ContextMenuButtonItem(onPressed: () {}, label: '全选'),
      ],
    );
  },
)

// 监听 controller（同步后缀按钮显隐）
_ctrl.addListener(() => setState(() {}));

@override
void dispose() {
  _ctrl.dispose();   // ⚠️ 必须 dispose，否则内存泄漏
  _focus.dispose();
  super.dispose();
}
```

**TextInputType 速查**：`text` / `multiline` / `number` / `phone` / `datetime` / `emailAddress` / `url` / `name` / `streetAddress` / `none` / `visiblePassword`；手机号键盘可加 `.withOptions(isSigned:, isDecimal:)`。

### 10.2 TextFormField + Form —— 表单校验

```dart
final _formKey = GlobalKey<FormState>();   // 表单全局键
final _phoneCtrl = TextEditingController();
final _pwdCtrl = TextEditingController();

Form(
  key: _formKey,
  onChanged: () {},                        // 任意字段变化
  onWillPop: () async {                     // 返回前询问（有未保存内容时）
    if (_formKey.currentState!.validate()) return true;
    return false;
  },
  autovalidateMode: AutovalidateMode.onUserInteraction, // disabled | always | onUserInteraction
  child: Column(children: [
    TextFormField(
      controller: _phoneCtrl,
      decoration: const InputDecoration(labelText: '手机号', prefixIcon: Icon(Icons.phone)),
      keyboardType: TextInputType.phone,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      // —— 校验 ——
      validator: (v) {
        if (v == null || v.isEmpty) return '请输入手机号';
        if (!RegExp(r'^1[3-9]\d{9}$').hasMatch(v)) return '手机号格式不正确';
        return null; // null = 通过
      },
      onSaved: (v) => debugPrint('保存手机号: $v'), // FormState.save() 时回调
      autovalidateMode: AutovalidateMode.onUserInteraction,
      enabled: true,
      initialValue: null,                   // ⚠️ 与 controller 二选一
      forceErrorText: null,                 // 强制显示错误文案
    ),
    TextFormField(
      controller: _pwdCtrl,
      obscureText: true,
      decoration: const InputDecoration(labelText: '密码', prefixIcon: Icon(Icons.lock)),
      validator: (v) {
        if (v == null || v.length < 6) return '密码至少 6 位';
        return null;
      },
    ),
    ElevatedButton(
      onPressed: _submit,
      child: const Text('登录'),
    ),
  ]),
)

void _submit() {
  final ok = _formKey.currentState!.validate(); // 触发所有 validator
  if (!ok) return;
  _formKey.currentState!.save();               // 触发所有 onSaved
  // 提交……
}

@override
void dispose() { _phoneCtrl.dispose(); _pwdCtrl.dispose(); super.dispose(); }
```

### 10.3 输入辅助与键盘控制

```dart
// 自动补全
Autocomplete<String>(
  optionsBuilder: (textEditingValue) {
    if (textEditingValue.text.isEmpty) return const Iterable.empty();
    return _allOptions.where((o) => o.contains(textEditingValue.text.toLowerCase()));
  },
  onSelected: (s) => debugPrint('选中 $s'),
  displayStringForOption: (o) => o.toUpperCase(),
  optionsViewBuilder: (context, onSelected, options) => Align(
    alignment: Alignment.topLeft,
    child: Material(
      elevation: 4,
      child: SizedBox(
        height: 200,
        child: ListView.builder(
          itemCount: options.length,
          itemBuilder: (_, i) => ListTile(
            title: Text(options.elementAt(i)),
            onTap: () => onSelected(options.elementAt(i)),
          ),
        ),
      ),
    ),
  ),
  fieldViewBuilder: (context, ctrl, focusNode, onSubmitted) =>
      TextField(controller: ctrl, focusNode: focusNode, decoration: const InputDecoration(labelText: '搜索')),
)

// 键盘工具栏 / 焦点遍历（表单"下一项"跳转）
FocusTraversalGroup(
  policy: OrderedTraversalPolicy(), // ReadingOrderTraversalPolicy | WidgetOrderTraversalPolicy
  child: Column(children: [
    TextField(textInputAction: TextInputAction.next, onSubmitted: (_) => FocusScope.of(context).nextFocus()),
    const TextField(textInputAction: TextInputAction.done),
  ]),
)
```

---

## 11. 选择控件

### 11.1 Checkbox 与 CheckboxListTile

```dart
bool _checked = false;

Checkbox(
  value: _checked,
  onChanged: (v) => setState(() => _checked = v ?? false), // null 禁用
  tristate: false,               // true 时 value 可null（半选态）
  activeColor: Colors.teal,      // 选中色
  checkColor: Colors.white,      // ✓ 颜色
  fillColor: WidgetStateProperty.resolveWith((s) => // 3.29+ 按状态填色
      s.contains(WidgetState.selected) ? Colors.teal : Colors.transparent),
  overlayColor: WidgetStateProperty.all(Colors.teal.withOpacity(0.1)),
  materialTapTargetSize: MaterialTapTargetSize.padded,
  visualDensity: VisualDensity.compact,
  autofocus: false,
  side: const BorderSide(color: Colors.grey), // 未选中边框
  isError: false,                // 错误红态
  semanticLabel: '同意协议',
  mouseCursor: WidgetStateProperty.all(SystemMouseCursors.click),
)

// 带文字的复选框（整行可点）
CheckboxListTile(
  value: _checked,
  onChanged: (v) => setState(() => _checked = v ?? false),
  title: const Text('同意用户协议'),
  subtitle: const Text('《协议》与《隐私政策》'),
  secondary: const Icon(Icons.verified_user),        // 左侧图标
  isThreeLine: false,                                // 三行模式
  dense: false,                                      // 紧凑
  selected: _checked,                                // 选中时标题高亮
  controlAffinity: ListTileControlAffinity.leading,  // 复选框位置：leading | trailing | platform
  autofocus: false,
  contentPadding: const EdgeInsets.symmetric(horizontal: 12),
  tristate: false,
  activeColor: Colors.teal,
  checkboxShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)), // 方角/圆角
  checkboxScaleFactor: 1.2,     // 3.29+
  selectedTileColor: Colors.teal.withOpacity(0.1),
  enabled: true,
  shape: const StadiumBorder(),
)
```

### 11.2 Radio / RadioListTile 与 CupertinoSwitch

```dart
enum Gender { male, female }

// 单选（一组同 groupValue）
Radio<Gender>(
  value: Gender.male,
  groupValue: _gender,
  onChanged: (v) => setState(() => _gender = v!),
  activeColor: Colors.blue,
  fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? Colors.blue : Colors.grey),
  focusColor: Colors.blue.withOpacity(0.1),
  hoverColor: Colors.blue.withOpacity(0.05),
  overlayColor: WidgetStateProperty.all(Colors.blue.withOpacity(0.1)),
  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
  visualDensity: VisualDensity.compact,
  autofocus: false,
  enabled: true,
  toggleable: false,        // true：点已选项可取消
  mouseCursor: SystemMouseCursors.click,
  useCheckmarkStyle: false, // M3：选中显示 ✓ 而非实心圆
)

RadioListTile<Gender>(
  value: Gender.female,
  groupValue: _gender,
  onChanged: (v) => setState(() => _gender = v!),
  title: const Text('女'),
  subtitle: const Text(''),
  secondary: const Icon(Icons.female),
  controlAffinity: ListTileControlAffinity.trailing,
  selected: _gender == Gender.female,
  dense: false,
  isThreeLine: false,
  contentPadding: const EdgeInsets.symmetric(horizontal: 8),
  autofocus: false,
  activeColor: Colors.pink,
  toggleable: false,
)

// iOS 风开关
CupertinoSwitch(
  value: _on,
  onChanged: (v) => setState(() => _on = v),
  activeColor: CupertinoColors.systemGreen,     // 3.22+ 可传 WidgetStateProperty
  trackColor: Colors.grey.shade300,
  thumbColor: Colors.white,
  focusColor: Colors.green.withOpacity(0.2),
  applyTheme: true,                             // 是否应用 CupertinoTheme
  autofocus: false,
  focusNode: null,
  dragStartBehavior: DragStartBehavior.start,
)
```

### 11.3 Switch / SwitchListTile

```dart
Switch(
  value: _on,
  onChanged: (v) => setState(() => _on = v),
  activeColor: Colors.white,                // 滑块色（thumb）
  activeTrackColor: Colors.green,           // 开启轨道色
  inactiveThumbColor: Colors.white,         // 关闭滑块色
  inactiveTrackColor: Colors.grey.shade300, // 关闭轨道色
  focusColor: Colors.green.withOpacity(0.1),
  hoverColor: Colors.green.withOpacity(0.05),
  materialTapTargetSize: MaterialTapTargetSize.padded,
  dragStartBehavior: DragStartBehavior.start,
  autofocus: false,
  splashRadius: 24,
  thumbIcon: WidgetStateProperty.resolveWith((s) => // 滑块内图标（对勾）
      s.contains(WidgetState.selected) ? const Icon(Icons.check, size: 14) : null),
  trackOutlineColor: WidgetStateProperty.all(Colors.transparent), // 描边
  trackOutlineWidth: WidgetStateProperty.all(0),
  mouseCursor: WidgetStateProperty.all(SystemMouseCursors.click),
)

SwitchListTile(
  value: _on,
  onChanged: (v) => setState(() => _on = v),
  title: const Text('夜间模式'),
  subtitle: const Text('跟随系统或手动'),
  secondary: const Icon(Icons.dark_mode),
  selected: _on,
  controlAffinity: ListTileControlAffinity.trailing,
  dense: false,
  contentPadding: const EdgeInsets.symmetric(horizontal: 12),
  activeThumbColor: Colors.white,
  activeTrackColor: Colors.indigo,
  inactiveThumbColor: Colors.white70,
  inactiveTrackColor: Colors.grey.shade400,
  thumbIcon: null,
  tileColor: null,
  selectedTileColor: Colors.indigo.withOpacity(0.1),
  enableFeedback: true,
  shape: const RoundedRectangleBorder(),
)
```

### 11.4 Slider / RangeSlider

```dart
double _value = 0.3;

Slider(
  value: _value,
  min: 0, max: 1,
  divisions: 10,                       // 分段数（null 连续）
  label: '${(_value * 100).round()}%', // 拖动时气泡文案
  activeColor: Colors.blue,
  inactiveColor: Colors.blue.shade100,
  secondaryActiveColor: Colors.red,    // min~value 区间叠加色（3.10+）
  // secondaryTrackValue: 0.8,         // 叠加区间终点
  allowedInteraction: SliderInteraction.slideOnly, // tapOnly | slideOnly | tapAndSlide | slideThumb
  autofocus: false,
  focusNode: null,
  onChanged: (v) => setState(() => _value = v),
  onChangeStart: (v) => debugPrint('开始拖动 $v'),
  onChangeEnd: (v) => debugPrint('结束拖动 $v'),
  mouseCursor: SystemMouseCursors.click,
  semanticFormatterCallback: (v) => '${(v * 100).round()}%', // 无障碍朗读
  // 滑块与轨道形状（M3）
  sliderShape: const RoundedRectSliderTrackShape(), // 默认 | RectangularSliderTrackShape | 自定义
  trackShape: null,      // 轨道形状（SliderTrackShape）
  tickMarkShape: null,   // 刻度形状（SliderTickMarkShape）
  thumbShape: null,      // 滑块形状（SliderComponentShape，如 RoundSliderThumbShape）
  overlayShape: null,    // 按压涟漪形状
  year2023: null,        // 实验开关
  padding: null,
  min: 0,
)

// 区间选择
RangeSlider(
  values: RangeValues(0.2, 0.7),
  min: 0, max: 1,
  divisions: 20,
  labels: RangeLabels('${(0.2 * 100).round()}%', '${(0.7 * 100).round()}%'),
  activeColor: Colors.teal,
  inactiveColor: Colors.teal.shade100,
  onChanged: (v) => setState(() => _range = v),
)
```

### 11.5 DropdownButton / DropdownMenu / DatePicker

```dart
// 经典下拉
DropdownButton<String>(
  value: _selected,
  hint: const Text('请选择分类'),
  disabledHint: const Text('不可选'),
  icon: const Icon(Icons.arrow_drop_down),
  iconSize: 24,
  iconEnabledColor: Colors.grey,
  iconDisabledColor: Colors.grey.shade300,
  elevation: 8,                          // 菜单阴影
  isDense: false,
  isExpanded: false,                     // true 撑满父宽
  itemHeight: 48,                        // 每项高度（kMinInteractiveDimension 等常量可选）
  focusColor: Colors.blue.withOpacity(0.1),
  autofocus: false,
  dropdownColor: Colors.white,
  borderRadius: BorderRadius.circular(12),
  padding: const EdgeInsets.symmetric(horizontal: 8),
  selectedItemBuilder: null,             // 自定义选中项展示
  underline: Container(),                // 去掉默认下划线
  style: const TextStyle(fontSize: 16, color: Colors.black),
  alignment: AlignmentDirectional.centerStart,
  menuMaxHeight: 300,
  enableFeedback: true,
  onChanged: (v) => setState(() => _selected = v), // null 禁用
  onTap: () {},
  focusNode: null,
  items: [
    for (final c in categories)
      DropdownMenuItem<String>(
        value: c,
        enabled: true,
        alignment: AlignmentDirectional.centerStart,
        onTap: () {},
        child: Text(c),
      ),
  ],
)

// M3 下拉菜单（支持搜索/文本输入）
DropdownMenu<String>(
  initialSelection: _selected,
  label: const Text('分类'),
  leadingIcon: const Icon(Icons.category),
  trailingIcon: const Icon(Icons.arrow_drop_down),
  hintText: '选择或输入',
  helperText: '支持模糊匹配',
  errorText: null,
  enabled: true,
  enableFilter: true,       // 输入过滤
  enableSearch: true,       // 搜索框（3.7+，需 menuHeight 足够）
  requestFocusOnTap: true,
  menuHeight: 300,
  width: 280,               // null 时撑满
  inputDecorationTheme: null,
  menuStyle: const MenuStyle(
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    elevation: WidgetStateProperty.all(4),
  ),
  textStyle: const TextStyle(fontSize: 16),
  textAlign: TextAlign.start,
  selectedTrailingIcon: const Icon(Icons.check),
  onSelected: (v) => setState(() => _selected = v),
  dropdownMenuEntries: [
    for (final c in categories) DropdownMenuEntry(value: c, label: c, leadingIcon: const Icon(Icons.folder)),
  ],
)

// 日期/时间选择器
final date = await showDatePicker(
  context: context,
  initialDate: DateTime.now(),
  firstDate: DateTime(2020),
  lastDate: DateTime(2030),
  currentDate: DateTime.now(),      // "今天" 高亮
  initialEntryMode: DatePickerEntryMode.calendar, // calendar | input | inputOnly | calendarOnly
  selectableDayPredicate: (d) => d.weekday != DateTime.sunday, // 禁选周日
  helpText: '选择日期',
  cancelText: '取消',
  confirmText: '确定',
  errorFormatText: '格式错误',
  fieldHintText: '年/月/日',
  fieldLabelText: '日期',
  initialDatePickerMode: DatePickerMode.day, // day | year
  builder: (context, child) => Theme(data: Theme.of(context), child: child!),
);
final time = await showTimePicker(context: context, initialTime: TimeOfDay.now());
// 日期范围：showDateRangePicker(context:..., firstDate:..., lastDate:...)
```

---

## 12. 对话框、提示与浮层

### 12.1 AlertDialog / SimpleDialog / Dialog

```dart
// 通用警告框
showDialog(
  context: context,
  barrierDismissible: true,          // 点遮罩关闭
  barrierColor: Colors.black54,      // 遮罩色
  barrierLabel: '关闭',               // 无障碍
  useSafeArea: true,
  useRootNavigator: true,            // 挂在根 Navigator（避开局部路由）
  routeSettings: const RouteSettings(name: 'confirm'),
  builder: (_) => AlertDialog(
    title: const Text('确认删除'),
    content: const Text('删除后不可恢复，确定要删除这篇文章吗？'),
    contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
    contentTextStyle: Theme.of(context).textTheme.bodyMedium,
    icon: const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 36), // 顶部图标
    iconColor: Colors.orange,
    iconPadding: const EdgeInsets.only(top: 20),
    actions: [                       // 底部按钮组
      TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('取消')),
      TextButton(
        onPressed: () => Navigator.pop(context, true),
        style: TextButton.styleFrom(foregroundColor: Colors.red),
        child: const Text('删除'),
      ),
    ],
    actionsPadding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
    actionsAlignment: MainAxisAlignment.end,   // 按钮组对齐
    actionsOverflowDirection: VerticalDirection.down, // 放不下时的排列
    actionsOverflowButtonSpacing: 4,
    buttonPadding: null,
    backgroundColor: Colors.white,
    surfaceTintColor: null,           // null 恢复纯色
    elevation: 6,
    shadowColor: Colors.black45,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    insetPadding: const EdgeInsets.symmetric(horizontal: 40, vertical: 24), // 与屏幕边距
    scrollable: false,                // 内容超高时自动可滚
    semanticLabel: '删除确认',
    alignment: Alignment.center,
    clipBehavior: Clip.antiAlias,
    // 完全自定义内容
    // content: SingleChildScrollView(child: ...),
  ),
)

// 列表选择框
showDialog(
  context: context,
  builder: (_) => SimpleDialog(
    title: const Text('选择分享方式'),
    children: [
      SimpleDialogOption(onPressed: () => Navigator.pop(context, '微信'), child: const ListTile(leading: Icon(Icons.wechat), title: Text('微信'))),
      SimpleDialogOption(onPressed: () => Navigator.pop(context, '朋友圈'), child: const ListTile(leading: Icon(Icons.group), title: Text('朋友圈'))),
      const Divider(),
      SimpleDialogOption(onPressed: () => Navigator.pop(context), child: const ListTile(leading: Icon(Icons.cancel), title: Text('取消'))),
    ],
    contentPadding: const EdgeInsets.fromLTRB(0, 12, 0, 12),
    insetPadding: const EdgeInsets.symmetric(horizontal: 60),
    backgroundColor: Colors.white,
    elevation: 4,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    alignment: Alignment.center,
  ),
)

// 自定义对话框
showDialog(
  context: context,
  builder: (_) => Dialog(
    backgroundColor: Colors.transparent, // 自定义背景
    elevation: 0,
    insetPadding: const EdgeInsets.all(20),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    clipBehavior: Clip.antiAlias,
    child: Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(colors: [Color(0xFF6A11CB), Color(0xFF2575FC)]),
      ),
      child: const Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.celebration, color: Colors.white, size: 48),
        SizedBox(height: 12),
        Text('自定义对话框', style: TextStyle(color: Colors.white, fontSize: 20)),
      ]),
    ),
  ),
)
```

### 12.2 BottomSheet —— 底部面板

```dart
// 模态底部面板（最常用）
showModalBottomSheet(
  context: context,
  backgroundColor: Colors.white,
  surfaceTintColor: null,
  elevation: 8,
  barrierColor: Colors.black54,
  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
  clipBehavior: Clip.antiAlias,
  constraints: const BoxConstraints(maxHeight: 600),  // 最大高度
  isScrollControlled: true,        // true：高度可超屏一半 + 键盘不遮挡
  useSafeArea: true,
  isDismissible: true,             // 下拉关闭
  enableDrag: true,                // 可拖拽
  showDragHandle: true,            // 顶部小横条
  dragStartBehavior: DragStartBehavior.start,
  animationDuration: const Duration(milliseconds: 250),
  transitionAnimationController: null, // 自定义动画曲线
  routeSettings: const RouteSettings(name: 'picker'),
  useRootNavigator: false,
  builder: (_) => Padding(
    padding: const EdgeInsets.all(20),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      ListTile(leading: const Icon(Icons.camera), title: const Text('拍照'), onTap: () => Navigator.pop(context, 'camera')),
      ListTile(leading: const Icon(Icons.photo), title: const Text('从相册选择'), onTap: () => Navigator.pop(context, 'album')),
      const SizedBox(height: 12), // 键盘避让：MediaQuery.viewInsetsOf(context).bottom
    ]),
  ),
)

// 可拖拽高度面板（地图筛选、评论区）
DraggableScrollableSheet(
  initialChildSize: 0.4,           // 初始高度占比 40%
  minChildSize: 0.2,               // 最小 20%
  maxChildSize: 0.9,               // 最大 90%
  expand: true,                    // 是否占满父级
  snap: true,                      // 吸附初始尺寸
  snapSizes: const [0.4, 0.9],     // 吸附点
  controller: _sheetCtrl,          // DraggableScrollableController
  builder: (_, controller) => ListView(
    controller: controller,        // ⚠️ 滚动控制器必须来自 builder
    children: List.generate(30, (i) => ListTile(title: Text('评论 $i'))),
  ),
)

// 常驻底部面板（Scaffold.bottomSheet）
// Scaffold(bottomSheet: BottomSheet(onClosing: () {}, builder: (_) => Container(height: 100)))
```

### 12.3 SnackBar / MaterialBanner / Tooltip

```dart
// 全局 SnackBar（ScaffoldMessenger，避开多个 Scaffold 互相覆盖）
ScaffoldMessenger.of(context)
  ..hideCurrentSnackBar()          // 先隐藏旧的，避免排队
  ..showSnackBar(SnackBar(
    content: const Text('已保存到草稿箱'),
    backgroundColor: Colors.black87,
    duration: const Duration(seconds: 3),
    behavior: SnackBarBehavior.floating,       // fixed | floating（圆角悬浮）
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    margin: const EdgeInsets.all(12),           // floating 时与屏幕边距
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    width: 400,                                 // 固定宽度（floating 才生效）
    elevation: 6,
    dismissDirection: DismissDirection.horizontal, // 滑动关闭方向
    showCloseIcon: false,                       // 右侧关闭按钮
    closeIconColor: Colors.white,
    onVisible: () {},                           // 出现回调
    action: SnackBarAction(
      label: '撤销',
      textColor: Colors.blue.shade200,
      disabledTextColor: Colors.grey,
      onPressed: () => debugPrint('撤销'),
    ),
    animation: null,                            // 自定义曲线
  ));

// 顶部横幅提示（比 SnackBar 更醒目）
ScaffoldMessenger.of(context).showMaterialBanner(
  MaterialBanner(
    content: const Text('网络已断开，展示的是缓存内容'),
    leading: const Icon(Icons.wifi_off, color: Colors.orange),
    backgroundColor: Colors.orange.shade50,
    surfaceTintColor: null,
    shadowColor: Colors.black26,
    elevation: 2,
    forceActionsBelow: false,        // 按钮换行到内容下方
    dividerColor: Colors.orange.shade100,
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    leadingPadding: const EdgeInsets.only(right: 12),
    actions: [
      TextButton(onPressed: () => ScaffoldMessenger.of(context).hideCurrentMaterialBanner(), child: const Text('知道了')),
      TextButton(onPressed: () {}, child: const Text('重试')),
    ],
    contentTextStyle: const TextStyle(fontSize: 14),
    onVisible: () {},
  ),
)

// 文字提示（长按/悬停）
Tooltip(
  message: '点击收藏',               // 提示文案（必填）
  child: const Icon(Icons.star_border),
  height: 32,                        // 提示高度
  verticalOffset: 24,                // 与子元素垂直间距
  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
  margin: const EdgeInsets.symmetric(horizontal: 16),
  preferBelow: false,                // 优先显示在下方
  excludeFromSemantics: false,
  showDuration: const Duration(seconds: 2), // 悬停显示时长
  waitDuration: const Duration(milliseconds: 500), // 长按多久才显示
  triggerMode: TooltipTriggerMode.longPress, // longPress | tap
  enableFeedback: true,
  textStyle: const TextStyle(color: Colors.white, fontSize: 12),
  decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(6)),
  constraints: const BoxConstraints(maxWidth: 200),
  richMessage: null,                 // 富文本提示（替代 message）
)
```

---

## 13. 数据展示 Widget

### 13.1 Card / ListTile / CircleAvatar

```dart
Card(
  color: Colors.white,
  shadowColor: Colors.black26,
  surfaceTintColor: null,        // M3 默认淡染色，null 恢复纯白
  elevation: 2,
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  borderOnForeground: true,      // true：边框画在内容之上
  margin: const EdgeInsets.all(8),
  clipBehavior: Clip.antiAlias,  // 内容溢出裁剪（配 semanticContainer）
  semanticContainer: true,       // 作为语义容器（朗读时整卡念）
  child: const ListTile(
    leading: CircleAvatar(backgroundImage: NetworkImage('https://i.pravatar.cc/100')),
    title: Text('卡片标题'),
    subtitle: Text('副标题'),
    trailing: Icon(Icons.more_horiz),
  ),
)

// ListTile 全字段（列表项标配）
ListTile(
  leading: const Icon(Icons.folder),          // 前置
  title: const Text('主文案'),                 // 主文案
  subtitle: const Text('次文案'),              // 次文案
  trailing: const Icon(Icons.chevron_right),  // 后置
  isThreeLine: false,                         // 三行布局
  dense: false,                               // 紧凑
  visualDensity: VisualDensity.standard,
  shape: const Border(bottom: BorderSide(color: Colors.black12)), // 自身形状/边框
  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
  enabled: true,                              // false 置灰
  selected: false,                            // 选中态（selectedColor）
  focusColor: Colors.blue.withOpacity(0.1),
  hoverColor: Colors.blue.withOpacity(0.05),
  splashColor: Colors.blue.withOpacity(0.2),
  autofocus: false,
  selectedColor: Colors.blue,                 // selected 时文字图标色
  textColor: null,
  iconColor: null,
  titleTextStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
  subtitleTextStyle: const TextStyle(fontSize: 12),
  leadingAndTrailingTextStyle: const TextStyle(fontSize: 14),
  titleAlignment: ListTileTitleAlignment.threeLine, // title 垂直位置
  horizontalTitleGap: 16,                     // leading 与 title 间距
  minVerticalPadding: 4,
  minLeadingWidth: 40,                        // leading 最小宽度
  enableFeedback: true,
  mouseCursor: SystemMouseCursors.click,
  onTap: () {}, onLongPress: () {}, onFocusChange: (_) {},
  focusNode: null,
  // 圆形头像（可带文字/边框/进度）
  // leading: CircleAvatar(radius: 24, backgroundColor: Colors.blue, foregroundImage: ..., backgroundImage: ..., onForegroundImageError: _, child: Text('头'), radius: 24, minRadius: 20, maxRadius: 28,),
)

// 圆形头像独立用法
CircleAvatar(
  radius: 28,
  backgroundColor: Colors.blue.shade100,
  foregroundImage: const NetworkImage('https://i.pravatar.cc/120'), // 前景图（盖住背景色）
  backgroundImage: const NetworkImage('https://i.pravatar.cc/120'),
  onForegroundImageError: (e, s) => debugPrint('图片错误 $e'),     // 加载失败
  child: const Text('备选'),        // 图未加载时的文字兜底
  minRadius: 24, maxRadius: 32,
  // 头像组叠放：Row(children: [CircleAvatar(radius: 14), Transform.translate(offset: Offset(-8, 0), child: CircleAvatar(radius: 14))])
)
```

### 13.2 Chip —— 四种芯片

```dart
// 输入芯片（标签输入，如"输入标签回车确认"）
InputChip(
  label: const Text('Flutter'),
  avatar: const CircleAvatar(child: Text('F')),
  onPressed: () {},
  onDeleted: () {},                       // 删除按钮
  deleteIcon: const Icon(Icons.close, size: 16),
  deleteIconColor: Colors.grey,
  deleteButtonTooltipMessage: '删除标签',
  onDeleted: () {},
  isEnabled: true,
  selected: false,
  selectedColor: Colors.blue.withOpacity(0.2),
  checkmarkColor: Colors.blue,
  disabledColor: Colors.grey.shade200,
  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
  labelPadding: const EdgeInsets.only(left: 4),
  side: BorderSide(color: Colors.grey.shade300), // 边框
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
  backgroundColor: Colors.white,
  surfaceTintColor: null,
  shadowColor: Colors.black26,
  elevation: 1,
  pressElevation: 4,                      // 按下阴影
  showCheckmark: true,                    // 选中显示 ✓
  autofocus: false,
  focusNode: null,
  clipBehavior: Clip.antiAlias,
  focusElevation: 2,
  hoverElevation: 2,
  highlightElevation: 4,
  visualDensity: VisualDensity.compact,
  materialTapTargetSize: MaterialTapTargetSize.padded,
  avatarBorder: CircleBorder(side: BorderSide(color: Colors.grey.shade300)), // 头像描边
  useDeleteButtonTooltip: true,
  chipAnimationStyle: null,
)

// 操作芯片（带图标动作，如筛选）
ActionChip(onPressed: () {}, avatar: const Icon(Icons.filter_list, size: 18), label: const Text('筛选'), backgroundColor: Colors.grey.shade100)

// 过滤芯片（多选）
FilterChip(
  label: const Text('已发布'),
  selected: _filterSelected,
  onSelected: (v) => setState(() => _filterSelected = v),
  avatar: null,
  checkmark: const Icon(Icons.check, size: 16), // 选中图标（null 用默认 ✓）
  showCheckmark: true,
  selectedColor: Colors.green.withOpacity(0.2),
  selectedShadowColor: Colors.green,
  backgroundColor: Colors.white,
  side: BorderSide(color: Colors.grey.shade300),
  shape: const StadiumBorder(),
  elevation: 0,
  pressElevation: 2,
)

// 选择芯片（单选，常配 ChoiceChip + Wrap 做标签组）
ChoiceChip(
  label: const Text('热门'),
  selected: _choice == 'hot',
  onSelected: (v) => setState(() => _choice = v ? 'hot' : _choice),
  selectedColor: Colors.blue.withOpacity(0.2),
  backgroundColor: Colors.white,
  avatar: const Icon(Icons.local_fire_department, size: 16),
  labelPadding: const EdgeInsets.symmetric(horizontal: 6),
  side: BorderSide(color: _choice == 'hot' ? Colors.blue : Colors.grey.shade300),
  shape: const StadiumBorder(),
)
```

### 13.3 Divider / DataTable / ExpansionTile

```dart
// 分割线（Column/ListView 里用）
Divider(
  height: 1,                    // 占位高度（含线）
  thickness: 1,                 // 线粗细
  indent: 16,                   // 左缩进
  endIndent: 16,                // 右缩进
  color: Colors.grey.shade300,
  radius: const Radius.circular(1),
  child: null,                  // 可嵌子元素（如中间放文字）
)
VerticalDivider(width: 1, thickness: 1, indent: 8, endIndent: 8, color: Colors.grey.shade300)

// 数据表
DataTable(
  columns: const [
    DataColumn(label: Text('姓名'), tooltip: '学生姓名'),
    DataColumn(label: Text('分数'), numeric: true),   // numeric 右对齐
  ],
  rows: [
    for (final s in students)
      DataRow(
        key: ValueKey(s.id),
        selected: s.id == _selectedId,               // 选中行高亮
        onSelectChanged: (v) => setState(() => _selectedId = v == true ? s.id : null),
        color: WidgetStateProperty.resolveWith((st) => st.contains(WidgetState.selected) ? Colors.blue.withOpacity(0.1) : null),
        // cells 与 columns 一一对应
        cells: [DataCell(Text(s.name)), DataCell(Text('${s.score}'))],
      ),
  ],
  sortColumnIndex: 1,             // 当前排序列
  sortAscending: true,            // 升/降序
  onSelectAll: (v) {},            // 全选回调（配 showCheckboxColumn）
  showCheckboxColumn: true,       // 左侧复选框列
  showBottomBorder: true,         // 行底边框
  dividerThickness: 1,
  dataRowMinHeight: 48,
  dataRowMaxHeight: 56,           // double.infinity 自适应
  headingRowHeight: 56,
  headingRowColor: WidgetStateProperty.all(Colors.grey.shade100),
  dataRowColor: WidgetStateProperty.all(Colors.white),
  horizontalMargin: 24,
  columnSpacing: 56,              // 列间距
  checkboxHorizontalMargin: 12,
  border: TableBorder.all(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(8)),
  clipBehavior: Clip.antiAlias,
)

// 展开/折叠面板（FAQ 手风琴）
ExpansionTile(
  title: const Text('什么是 Widget？'),
  subtitle: const Text('点击展开'),
  leading: const Icon(Icons.help_outline),
  trailing: const Icon(Icons.expand_more), // 展开时自动旋转 180°
  backgroundColor: Colors.white,           // 展开后背景
  collapsedBackgroundColor: Colors.grey.shade50,
  collapsedTextColor: Colors.black87,
  textColor: Colors.blue,                  // 展开后文字色
  iconColor: Colors.blue,
  collapsedIconColor: Colors.grey,
  tilePadding: const EdgeInsets.symmetric(horizontal: 16),
  childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
  expandedAlignment: Alignment.centerLeft, // 子内容对齐
  expandedCrossAxisAlignment: CrossAxisAlignment.start,
  initiallyExpanded: false,
  maintainState: false,                    // true：收起后保留状态（保活）
  tileShape: const Border(bottom: BorderSide(color: Colors.black12)),
  collapsedShape: null,
  controlAffinity: ListTileControlAffinity.trailing, // 箭头位置
  onExpansionChanged: (v) => setState(() => _expanded = v),
  children: const [Text('Widget 是 Flutter 界面构建的最小单元……')],
)
```

### 13.4 进度指示器 / Stepper / Placeholder

```dart
// 线性进度条
LinearProgressIndicator(
  value: 0.6,                    // null = 不确定循环动画
  backgroundColor: Colors.grey.shade200,
  color: Colors.blue,
  valueColor: AlwaysStoppedAnimation(Colors.blue), // 也可动画渐变
  minHeight: 6,                  // 线粗细（3.18+）
  semanticsLabel: '加载进度',
  semanticsValue: '60%',
  borderRadius: BorderRadius.circular(3),
  stopIndicatorColor: Colors.red, // 遇到错误时的红色端点
  stopIndicatorRadius: 6,
  trackGap: 4,                   // 轨道与进度间隙（3.18+）
  animationDuration: Duration.zero,
)

// 圆形进度
CircularProgressIndicator(
  value: 0.7,
  backgroundColor: Colors.grey.shade200,
  color: Colors.teal,
  strokeWidth: 4,
  strokeAlign: -1,               // 线对齐位置
  strokeCap: StrokeCap.round,    // butt | round | square
  semanticsLabel: '70%',
  semanticsValue: '70%',
  constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
  trackGap: 4,
)

// 不确定态（加载中）
const CircularProgressIndicator()  // value 省略
const LinearProgressIndicator()

// 步骤条
Stepper(
  currentStep: _step,
  onStepContinue: () => setState(() => _step = (_step + 1).clamp(0, 2)),
  onStepCancel: () => setState(() => _step = (_step - 1).clamp(0, 2)),
  onStepTapped: (i) => setState(() => _step = i),
  controlsBuilder: (context, details) {   // 自定义底部按钮
    return Row(children: [
      if (details.currentStep > 0) TextButton(onPressed: details.onStepCancel, child: const Text('上一步')),
      ElevatedButton(onPressed: details.onStepContinue, child: Text(details.currentStep == 2 ? '提交' : '下一步')),
    ]);
  },
  elevation: 2,
  type: StepperType.vertical,            // vertical | horizontal
  physics: const ClampingScrollPhysics(),
  margin: const EdgeInsets.all(16),
  stepIconWidth: 24,
  stepIconHeight: 24,
  connectorColor: Colors.blue,           // 步骤间连线
  connectorThickness: 2,
  steps: const [
    Step(title: Text('填写信息'), content: TextField()),
    Step(title: Text('验证手机'), content: TextField()),
    Step(title: Text('完成'), content: Icon(Icons.check)),
  ],
)

// 占位符（原型期/骨架屏）
Placeholder(
  color: Colors.grey.shade300,
  strokeWidth: 2,
  fallbackWidth: 400,             // 无父约束时宽
  fallbackHeight: 400,
  child: null,
)
```

### 13.5 ReorderableListView 与 AnimatedSize

```dart
// 长按拖拽排序
ReorderableListView(
  children: [
    for (int i = 0; i < _items.length; i++)
      ListTile(
        key: ValueKey(_items[i]),      // ⚠️ 必填
        leading: const Icon(Icons.drag_handle),
        title: Text(_items[i]),
      ),
  ],
  onReorder: (oldIndex, newIndex) {     // 数据重排
    setState(() {
      if (newIndex > oldIndex) newIndex -= 1;
      final item = _items.removeAt(oldIndex);
      _items.insert(newIndex, item);
    });
  },
  onReorderStart: (i) => debugPrint('开始 $i'),
  onReorderEnd: (i) => debugPrint('结束 $i'),
  scrollController: _ctrl,
  header: const ListTile(title: Text('拖拽排序')),
  shrinkWrap: false,
  primary: false,
  padding: const EdgeInsets.all(8),
  scrollDirection: Axis.vertical,
  reverse: false,
  physics: const ClampingScrollPhysics(),
  cacheExtent: 250,
  dragStartBehavior: DragStartBehavior.down, // 排序建议 down：按住即可拖
  buildDefaultDragHandles: true,        // 3.20+ 长按任意处拖动
  proxyDecorator: (child, index, animation) => Material( // 拖起时的投影样式
    elevation: 6,
    color: Colors.transparent,
    child: child,
  ),
)

// 尺寸变化动画（内容增删时平滑过渡，如展开更多文字）
AnimatedSize(
  duration: const Duration(milliseconds: 250),
  curve: Curves.easeOut,
  vsync: this,                  // ⚠️ 需要 State with SingleTickerProviderStateMixin/TickerProviderStateMixin
  alignment: Alignment.topCenter, // 尺寸变化时锚点
  clipBehavior: Clip.antiAlias,
  child: Text(_expanded ? _longText : _shortText),
)
```

---

## 14. 导航与页面骨架

### 14.1 Scaffold —— 页面骨架

```dart
Scaffold(
  appBar: AppBar(title: const Text('首页')),           // 顶栏
  body: const Center(child: Text('内容')),              // 主体
  floatingActionButton: FloatingActionButton(onPressed: () {}, child: const Icon(Icons.add)),
  floatingActionButtonLocation: FloatingActionButtonLocation.endFloat, // FAB 位置
  persistentFooterButtons: [                           // 底部固定按钮组（FAB 之上）
    TextButton(onPressed: () {}, child: const Text('帮助')),
  ],
  persistentFooterAlignment: AlignmentDirectional.centerEnd,
  bottomNavigationBar: BottomNavigationBar(...),        // 底部导航
  bottomSheet: Container(height: 60, color: Colors.grey.shade100), // 常驻底部面板
  drawer: Drawer(...),                                  // 左抽屉
  endDrawer: Drawer(...),                               // 右抽屉
  drawerEnableOpenDragGesture: true,                    // 边缘滑动拉开抽屉
  drawerEdgeDragWidth: 20,                              // 触发边缘宽度
  drawerScrimColor: Colors.black54,                     // 抽屉打开时遮罩
  onDrawerChanged: (opened) {},                         // 抽屉开合回调
  backgroundColor: Colors.grey.shade50,                 // 背景色
  resizeToAvoidBottomInset: true,                       // 键盘弹出时是否压缩 body
  primary: true,                                        // 是否占满整个屏幕（含状态栏后）
  extendBody: false,                                    // true：body 延伸到底部导航后
  extendBodyBehindAppBar: false,                        // true：body 延伸到 AppBar 后（沉浸式）
  restorationId: 'home_scaffold',                       // 状态恢复
  drawerDragStartBehavior: DragStartBehavior.start,
  endDrawerEnableOpenDragGesture: true,
)
```

### 14.2 AppBar / SliverAppBar

```dart
AppBar(
  title: const Text('标题'),
  leading: IconButton(icon: const Icon(Icons.menu), onPressed: () {}),  // 左侧（自动加返回箭头可设 leading: BackButton()）
  automaticallyImplyLeading: true,   // 自动推断 leading（有上级路由显示返回键）
  actions: [                          // 右侧动作组
    IconButton(icon: const Icon(Icons.search), onPressed: () {}),
    IconButton(icon: const Icon(Icons.more_vert), onPressed: () {}),
  ],
  actionsIconTheme: const IconThemeData(color: Colors.white, size: 24),
  bottom: PreferredSize(              // 标题栏下方（TabBar 常用）
    preferredSize: const Size.fromHeight(48),
    child: TabBar(...),
  ),
  flexibleSpace: Container(color: Colors.blue), // 背景（可做渐变折叠）
  elevation: 4,                        // 阴影
  scrolledUnderElevation: 3,           // 内容滚到标题栏下方时的阴影
  shadowColor: Colors.black45,
  surfaceTintColor: null,              // M3 滚动染色，null 关闭
  backgroundColor: Colors.blue,
  foregroundColor: Colors.white,       // 文字图标色
  iconTheme: const IconThemeData(color: Colors.white),
  titleTextStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
  centerTitle: true,                   // 标题居中
  titleSpacing: 0,                     // 标题横向间距
  toolbarHeight: 56,                   // 高度
  toolbarOpacity: 1.0,
  bottomOpacity: 1.0,
  leadingWidth: 56,
  excludeHeaderSemantics: false,
  primary: true,
  automaticallyImplyLeading: true,
  clipBehavior: Clip.antiAlias,
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(bottom: Radius.circular(16))),
  systemOverlayStyle: SystemUiOverlayStyle.light, // 状态栏图标深浅
  forceMaterialTransparency: false,
  useDefaultSemanticsOrder: true,
  titleSpacing: 0,
  onStretch: true,                    // 3.31+ 拉伸效果
  stretch: true,
)

// 折叠 AppBar（配 CustomScrollView）
SliverAppBar(
  title: const Text('折叠标题'),
  leading: const BackButton(),
  actions: [IconButton(icon: const Icon(Icons.share), onPressed: () {})],
  bottom: PreferredSize(preferredSize: const Size.fromHeight(40), child: TabBar(tabs: [...]),),
  elevation: 4,
  scrolledUnderElevation: 4,
  shadowColor: Colors.black54,
  surfaceTintColor: null,
  backgroundColor: Colors.white,
  foregroundColor: Colors.black,
  iconTheme: const IconThemeData(color: Colors.black),
  actionsIconTheme: null,
  primary: true,
  centerTitle: true,
  titleSpacing: NavigationToolbar.kMiddleSpacing,
  toolbarHeight: 56,
  leadingWidth: 56,
  collapsedHeight: 56,                // 折叠后高度
  expandedHeight: 240,                // 展开高度
  floating: false,                    // true：下拉立即展开（不暂停在中间）
  pinned: true,                       // true：折叠后保留工具栏
  snap: false,                        // true：松手吸附到展开/收起
  stretch: false,                     // 下拉过冲拉伸
  stretchTriggerOffset: 100,          // 过冲多少开始拉伸
  onStretchTrigger: () async {},      // 拉伸到阈值回调（可做刷新）
  forceElevated: false,               // 强制阴影（NestedScrollView 联动）
  automaticallyImplyLeading: true,
  excludeHeaderSemantics: false,
  flexibleSpace: FlexibleSpaceBar(
    title: const Text('个人中心'),
    centerTitle: true,
    titlePadding: const EdgeInsets.only(left: 16, bottom: 16),
    expandedTitleScale: 1.5,          // 展开标题缩放
    collapseMode: CollapseMode.parallax, // parallax（视差）| pin（固定）| hero
    background: Stack(fit: StackFit.expand, children: [
      Image.network('https://picsum.photos/800/400', fit: BoxFit.cover),
      const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Colors.black45]))),
    ]),
    stretchModes: const [StretchMode.zoomBackground, StretchMode.blurBackground, StretchMode.fadeTitle], // 过冲效果
  ),
  shape: null,
  clipBehavior: Clip.antiAlias,
  systemOverlayStyle: null,
)
```

### 14.3 底部导航 / 侧边导航 / Tab

```dart
// 经典 BottomNavigationBar
BottomNavigationBar(
  currentIndex: _index,
  onTap: (i) => setState(() => _index = i),
  items: const [
    BottomNavigationBarItem(icon: Icon(Icons.home), activeIcon: Icon(Icons.home, size: 28), label: '首页', tooltip: '首页'),
    BottomNavigationBarItem(icon: Icon(Icons.explore), label: '发现'),
    BottomNavigationBarItem(icon: Icon(Icons.person), label: '我的'),
  ],
  backgroundColor: Colors.white,
  selectedIconTheme: const IconThemeData(size: 26, color: Colors.blue),
  unselectedIconTheme: const IconThemeData(size: 22, color: Colors.grey),
  selectedItemColor: Colors.blue,
  unselectedItemColor: Colors.grey,
  selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
  unselectedLabelStyle: const TextStyle(fontSize: 11),
  showSelectedLabels: true,           // 是否显示选中文字
  showUnselectedLabels: true,         // 是否显示未选中文字
  type: BottomNavigationBarType.fixed, // fixed：均分不滑动 | shifting：选中放大居中
  elevation: 8,
  iconSize: 24,
  landscapeLayout: BottomNavigationBarLandscapeLayout.centered, // 横屏布局
  mouseCursor: SystemMouseCursors.click,
  enableFeedback: true,
  useLegacyColorScheme: false,        // false：按 M3 规则混合颜色
)

// M3 NavigationBar（替代上面）
NavigationBar(
  selectedIndex: _index,
  onDestinationSelected: (i) => setState(() => _index = i),
  destinations: const [
    NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: '首页'),
    NavigationDestination(icon: Icon(Icons.search_outlined), selectedIcon: Icon(Icons.search), label: '搜索'),
    NavigationDestination(icon: Badge(child: Icon(Icons.chat_bubble_outline)), selectedIcon: Icon(Icons.chat_bubble), label: '消息'), // 角标
    NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: '我的'),
  ],
  animationDuration: const Duration(milliseconds: 500),
  backgroundColor: Colors.white,
  surfaceTintColor: null,
  elevation: 3,
  height: 80,
  labelBehavior: NavigationDestinationLabelBehavior.alwaysShow, // alwaysShow | onlyShowSelected | hide
  indicatorColor: Colors.blue.withOpacity(0.15),  // 选中胶囊底色
  indicatorShape: StadiumBorder(),                // 胶囊形状
  overlayColor: WidgetStateProperty.all(Colors.blue.withOpacity(0.1)),
  shadowColor: Colors.black26,
  labelPadding: const EdgeInsets.only(top: 4),
  labelTextStyle: WidgetStateProperty.all(const TextStyle(fontSize: 12)),
  selectedIconTheme: null,
  unselectedIconTheme: null,
)

// 侧边导航（平板/桌面/宽屏）
NavigationRail(
  selectedIndex: _index,
  onDestinationSelected: (i) => setState(() => _index = i),
  extended: false,                      // true：展开显示文字+标签
  leading: FloatingActionButton(onPressed: () {}, child: const Icon(Icons.add)), // 顶部 FAB
  trailing: const Padding(padding: EdgeInsets.only(bottom: 8), child: Icon(Icons.settings)),
  destinations: const [
    NavigationRailDestination(icon: Icon(Icons.inbox), selectedIcon: Icon(Icons.inbox, color: Colors.blue), label: Text('收件箱'), padding: EdgeInsets.symmetric(vertical: 4)),
    NavigationRailDestination(icon: Badge(label: Text('3'), child: Icon(Icons.notifications)), label: Text('通知')),
    NavigationRailDestination(icon: Icon(Icons.bookmark), label: Text('收藏')),
  ],
  backgroundColor: Colors.white,
  elevation: 3,
  labelType: NavigationRailLabelType.all,  // none | selected | all | none
  unselectedLabelTextStyle: const TextStyle(color: Colors.grey),
  selectedLabelTextStyle: const TextStyle(color: Colors.blue),
  selectedIconTheme: const IconThemeData(size: 26),
  unselectedIconTheme: const IconThemeData(size: 24),
  indicatorColor: Colors.blue.withOpacity(0.15),
  indicatorShape: StadiumBorder(),
  groupAlignment: -1,                  // 目标组垂直对齐（-1 顶 / 0 中 / 1 底）
  minWidth: 72,
  minExtendedWidth: 180,
  useIndicator: true,
  clipBehavior: Clip.antiAlias,
  selectedLabel: null,
  unselectedIconColor: null,
  selectedIconColor: null,
)

// Tab 导航
DefaultTabController(                     // 最简方式：包住 TabBar + TabBarView
  length: 3,
  initialIndex: 0,
  animationDuration: const Duration(milliseconds: 300),
  child: Column(children: const [
    TabBar(
      tabs: [Tab(text: '关注', icon: Icon(Icons.group)), Tab(text: '推荐', icon: Icon(Icons.star)), Tab(text: '热榜', icon: Icon(Icons.whatshot))],
    ),
    Expanded(child: TabBarView(children: [PageOne(), PageTwo(), PageThree()])),
  ]),
)

// 手动 TabController（更多控制）
TabController _tabCtrl = TabController(length: 3, vsync: this, initialIndex: 0);
TabBar(
  controller: _tabCtrl,
  tabs: const [Tab(text: '一'), Tab(text: '二'), Tab(text: '三')],
  isScrollable: true,                 // true：不平分，可横滑（多 Tab）
  indicatorColor: Colors.blue,
  indicatorWeight: 3,
  indicatorSize: TabBarIndicatorSize.tab, // tab（等宽）| label（跟随文字宽）
  indicatorPadding: const EdgeInsets.symmetric(horizontal: 8),
  indicator: BoxDecoration(color: Colors.blue.withOpacity(0.15), borderRadius: BorderRadius.circular(20)), // 完全自定义指示器
  labelColor: Colors.blue,
  unselectedLabelColor: Colors.grey,
  labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
  unselectedLabelStyle: const TextStyle(fontSize: 13),
  labelPadding: const EdgeInsets.symmetric(horizontal: 12),
  padding: null,
  indicatorAnimation: TabIndicatorAnimation.linear, // linear | elastic
  dividerColor: Colors.grey.shade300,   // 底部分割线
  dividerHeight: 1,
  automaticIndicatorColorAdjustment: true,
  splashFactory: InkSparkle.splashFactory,
  overlayColor: WidgetStateProperty.all(Colors.blue.withOpacity(0.1)),
  mouseCursor: SystemMouseCursors.click,
  onTap: (i) => debugPrint('tab $i'),
  enableFeedback: true,
  physics: null,                      // isScrollable 时的滚动物理
  tabAlignment: TabAlignment.fill,    // fill | start | startOffset | fillOffset
  dragStartBehavior: DragStartBehavior.start,
  splashBorderRadius: BorderRadius.circular(20),
)
```

### 14.4 Drawer / NavigationDrawer

```dart
// 抽屉（ Scaffold.drawer / endDrawer ）
Drawer(
  backgroundColor: Colors.white,
  elevation: 8,
  shadowColor: Colors.black54,
  surfaceTintColor: null,
  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.horizontal(right: Radius.circular(16))),
  width: 280,                         // null 时约屏宽 80%
  semanticLabel: '菜单',
  clipBehavior: Clip.antiAlias,
  child: ListView(
    padding: EdgeInsets.zero,
    children: [
      DrawerHeader(                   // 抽屉头部
        decoration: const BoxDecoration(color: Colors.blue),
        margin: const EdgeInsets.all(0),
        padding: const EdgeInsets.all(16),
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
          CircleAvatar(radius: 30, child: Icon(Icons.person)),
          SizedBox(height: 8),
          Text('行云流水', style: TextStyle(color: Colors.white, fontSize: 18)),
        ]),
      ),
      ListTile(leading: const Icon(Icons.home), title: const Text('首页'), onTap: () => Navigator.pop(context)),
      ListTile(leading: const Icon(Icons.settings), title: const Text('设置'), onTap: () => Navigator.pop(context)),
      const AboutListTile(           // 关于（自动带图标/版本）
        icon: Icon(Icons.info),
        applicationName: 'Abert Blog',
        applicationVersion: '1.0.0',
        applicationLegalese: '© 2026',
      ),
    ],
  ),
)

// M3 NavigationDrawer
NavigationDrawer(
  selectedIndex: _index,
  onDestinationSelected: (i) => setState(() => _index = i),
  tilePadding: const EdgeInsets.symmetric(horizontal: 16),
  indicatorColor: Colors.blue.withOpacity(0.15),
  indicatorShape: const StadiumBorder(),
  elevation: 3,
  backgroundColor: Colors.white,
  shadowColor: Colors.black26,
  surfaceTintColor: null,
  indicatorBorderRadius: BorderRadius.circular(20),
  children: [
    Padding(padding: const EdgeInsets.fromLTRB(16, 24, 16, 8), child: Text('Abert Blog', style: Theme.of(context).textTheme.titleLarge)),
    const NavigationDrawerDestination(label: Text('首页'), icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home)),
    const NavigationDrawerDestination(label: Text('文章'), icon: Icon(Icons.article_outlined), selectedIcon: Icon(Icons.article)),
    const Divider(),
    const Padding(padding: EdgeInsets.fromLTRB(28, 12, 28, 8), child: Text('其他', style: TextStyle(color: Colors.grey, fontSize: 12))),
    const NavigationDrawerDestination(label: Text('设置'), icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings)),
  ],
)
```

### 14.5 Navigator 与路由

```dart
// ① 命令式导航（Navigator 1.0，小项目够用）
Navigator.of(context).push(MaterialPageRoute(builder: (_) => const DetailPage(id: 1)));
Navigator.of(context).pushNamed('/detail', arguments: {'id': 1}); // 需在 onGenerateRoute 里注册
final result = await Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PickerPage())); // 返回结果
Navigator.of(context).pop(result);            // 返回并带结果
Navigator.of(context).popUntil((route) => route.isFirst); // 回到根
Navigator.of(context).pushReplacement(...);   // 替换当前页（登录页 → 首页）
Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const HomePage()), (route) => false); // 清栈再入栈
Navigator.of(context).maybePop(result);       // 能返回才返回

// ② 自定义转场动画
Navigator.of(context).push(PageRouteBuilder(
  pageBuilder: (_, animation, secondaryAnimation) => const DetailPage(),
  transitionsBuilder: (_, animation, secondaryAnimation, child) {
    // 淡入 + 缩放
    return FadeTransition(
      opacity: animation,
      child: ScaleTransition(scale: Tween(begin: 0.9, end: 1.0).animate(CurvedAnimation(parent: animation, curve: Curves.easeOut)), child: child),
    );
    // 共享 X 轴：SlideTransition(secondaryAnimation: secondaryAnimation, ...)
    // 旋转：RotationTransition(...)
  },
  transitionDuration: const Duration(milliseconds: 350),
  reverseTransitionDuration: const Duration(milliseconds: 250),
  opaque: true,
  barrierDismissible: false,
  barrierColor: Colors.black54,
  barrierLabel: '关闭',
  maintainState: true,
  fullscreenDialog: false,       // iOS 风格竖滑关闭
  settings: const RouteSettings(name: 'detail'),
));

// ③ 路由观察器（埋点/统一切换逻辑）
class MyObserver extends NavigatorObserver {
  @override
  void didPush(Route route, Route? previousRoute) => debugPrint('push ${route.settings.name}');
  @override
  void didPop(Route route, Route? previousRoute) => debugPrint('pop ${route.settings.name}');
  @override
  void didReplace({Route? newRoute, Route? oldRoute}) {}
  @override
  void didRemove(Route route, Route? previousRoute) {}
  @override
  void didStartUserGesture(Route route, Route? previousRoute) {} // 用户手势返回
  @override
  void didStopUserGesture() {}
}

// MaterialApp(navigatorObservers: [MyObserver()], ...)

// ④ 返回拦截（PopScope 取代废弃的 WillPopScope）
PopScope(
  canPop: false,               // false：禁止直接返回
  onPopInvoked: (didPop) async { // 用户点返回键时回调（didPop：系统是否已处理）
    if (didPop) return;
    final ok = await _confirmExit();
    if (ok) Navigator.of(context).pop(); // 手动返回
  },
  child: const Scaffold(body: Form(...)),
)

// ⑤ 命名路由表（MaterialApp.onGenerateRoute）
Route<dynamic>? _onGenerateRoute(RouteSettings settings) {
  switch (settings.name) {
    case '/':
      return MaterialPageRoute(builder: (_) => const HomePage(), settings: settings);
    case '/detail':
      final args = settings.arguments as Map<String, dynamic>;
      return MaterialPageRoute(builder: (_) => DetailPage(id: args['id']), settings: settings);
    default:
      return MaterialPageRoute(builder: (_) => const NotFoundPage(), settings: settings);
  }
}

// ⑥ 路由异常（404）
MaterialApp(onUnknownRoute: (settings) => MaterialPageRoute(builder: (_) => const NotFoundPage()))
```

---

## 15. 动画 Widget

### 15.1 AnimationController 基础（显式动画）

```dart
class _FadeDemoState extends State<FadeDemo> with SingleTickerProviderStateMixin { // ⚠️ vsync 防内存泄漏
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 600),
    reverseDuration: const Duration(milliseconds: 300), // 反向时长
    lowerBound: 0.0,
    upperBound: 1.0,
    value: 0.0,               // 初始值
    debugLabel: 'fade',
  );

  late final Animation<double> _anim = Tween(begin: 0.0, end: 1.0).animate( // 数值补间
    CurvedAnimation(parent: _ctrl, curve: Curves.easeOut, reverseCurve: Curves.easeIn), // 曲线
  );

  @override
  void initState() {
    super.initState();
    _ctrl.forward();              // 正向播放
    // _ctrl.reverse();          // 反向播放
    // _ctrl.repeat(reverse: true, period: ..., min: 0.2, max: 0.8); // 循环
    // _ctrl.fling(velocity: 2.0);  // 惯性模拟
    // _ctrl.stop();
    _ctrl.addListener(() {
      if (_ctrl.isCompleted) debugPrint('完成');
      if (_ctrl.isDismissed) debugPrint('回到初始');
    });
    _ctrl.addStatusListener((status) {
      // dismissed | forward | reverse | completed
      if (status == AnimationStatus.completed) _ctrl.reverse();
    });
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); } // ⚠️ 必须 dispose

  @override
  Widget build(BuildContext context) {
    return FadeTransition(opacity: _anim, child: const FlutterLogo(size: 100));
  }
}
```

**Curves 常用曲线**：`linear` / `decelerate` / `ease` / `easeIn` / `easeOut` / `easeInOut` / `easeOutBack`（回弹）/ `easeOutCirc` / `easeOutCubic` / `elasticOut` / `bounceOut` / `fastOutSlowIn` / `slowMiddle` / `anticipate`。自定义：`CurvedAnimation(parent: ctrl, curve: Cubic(0.2, 0.8, 0.2, 1))`。

### 15.2 隐式动画家族（一行代码让 Widget 动起来）

```dart
// AnimatedContainer：尺寸/颜色/圆角/边距变化自动补间
AnimatedContainer(
  duration: const Duration(milliseconds: 400),
  curve: Curves.easeOutBack,
  width: _big ? 200 : 100,
  height: _big ? 200 : 100,
  decoration: BoxDecoration(
    color: _big ? Colors.blue : Colors.red,
    borderRadius: BorderRadius.circular(_big ? 24 : 8),
    boxShadow: [BoxShadow(color: Colors.black26, blurRadius: _big ? 16 : 4, offset: Offset(0, _big ? 8 : 2))],
  ),
  margin: const EdgeInsets.all(8),
  padding: const EdgeInsets.all(16),
  alignment: _big ? Alignment.center : Alignment.topLeft,
  onEnd: () => debugPrint('动画结束'),  // 完成回调
  child: const Text('点我变形'),
)

AnimatedOpacity(opacity: _visible ? 1 : 0, duration: const Duration(milliseconds: 300), curve: Curves.ease, child: const Text('淡入淡出'), onEnd: () {})
AnimatedAlign(alignment: _big ? Alignment.topRight : Alignment.bottomLeft, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut, child: const FlutterLogo(size: 50))
AnimatedPadding(padding: EdgeInsets.all(_big ? 32 : 8), duration: const Duration(milliseconds: 300), child: const ColoredBox(color: Colors.teal))
AnimatedDefaultTextStyle(style: TextStyle(fontSize: _big ? 32 : 14, color: _big ? Colors.red : Colors.black), duration: const Duration(milliseconds: 300), child: const Text('文字变形'))
AnimatedPhysicalModel(shape: _big ? BoxShape.circle : BoxShape.rectangle, borderRadius: BorderRadius.circular(16), elevation: _big ? 12 : 2, color: Colors.blue, duration: const Duration(milliseconds: 300), child: const SizedBox(width: 100, height: 100))
AnimatedAlign(alignment: Alignment.center, duration: Duration.zero, child: null)

// 子元素切换交叉淡入
AnimatedSwitcher(
  duration: const Duration(milliseconds: 400),
  reverseDuration: const Duration(milliseconds: 200),
  switchInCurve: Curves.easeOut,
  switchOutCurve: Curves.easeIn,
  transitionBuilder: (child, animation) => FadeTransition(opacity: animation, child: child),
  layoutBuilder: (currentChild, previousChildren) => Stack(children: [...previousChildren, currentChild!]),
  child: Text(_big ? '大状态' : '小状态', key: ValueKey(_big)), // ⚠️ 换 child 必须换 key 才有效果
)

// 两个子元素按进度交叉
AnimatedCrossFade(
  firstChild: const ColoredBox(color: Colors.red, child: SizedBox(width: 100, height: 100)),
  secondChild: const ColoredBox(color: Colors.blue, child: SizedBox(width: 200, height: 200)),
  crossFadeState: _big ? CrossFadeState.showSecond : CrossFadeState.showFirst,
  duration: const Duration(milliseconds: 400),
  firstCurve: Curves.easeOut,
  secondCurve: Curves.easeIn,
  sizeCurve: Curves.easeOut,
  alignment: Alignment.center,
  layoutBuilder: (topChild, topChildKey, bottomChild, bottomChildKey) => Stack(clipBehavior: Clip.none, children: [bottomChild!, Positioned.fill(key: bottomChildKey, child: bottomChild)], [topChild!].isEmpty ? [] : [Positioned.fill(key: topChildKey, child: topChild)]),
)

// 任意值补间（计数器、进度）
TweenAnimationBuilder<double>(
  tween: Tween(begin: 0, end: _progress),
  duration: const Duration(milliseconds: 500),
  curve: Curves.easeOut,
  onEnd: () {},
  builder: (_, value, __) => CircularProgressIndicator(value: value),
)
```

### 15.3 过渡动画组件（配 AnimationController）

```dart
FadeTransition(opacity: _anim, child: child)                    // 淡入
ScaleTransition(scale: _anim, alignment: Alignment.center, child: child) // 缩放
SlideTransition(position: Tween(begin: Offset(0, 1), end: Offset.zero).animate(_anim), transformHitTests: true, child: child) // 滑动
RotationTransition(turns: _anim, alignment: Alignment.center, child: child) // 旋转
SizeTransition(sizeFactor: _anim, axis: Axis.vertical, axisAlignment: -1, child: child) // 高度展开
AlignTransition(alignment: Tween(begin: Alignment.topLeft, end: Alignment.bottomRight).animate(_anim), child: child) // 位置
PositionedTransition(rect: RelativeRectTween(begin: RelativeRect.fromLTRB(0, 0, 0, 0), end: RelativeRect.fromLTRB(50, 50, 0, 0)).animate(_anim), child: child) // Stack 里位移
DecoratedBoxTransition(decoration: BoxDecorationTween(begin: BoxDecoration(color: Colors.red), end: BoxDecoration(color: Colors.blue)).animate(_anim), child: child)
RelativePositionedTransition(rect: ..., size: ..., child: child)
DefaultTextStyleTransition(style: TextStyleTween(begin: ..., end: ...).animate(_anim), child: ...)
AnimatedBuilder(animation: _anim, child: const FlutterLogo(), builder: (_, child) => Transform.rotate(angle: _anim.value * 6.28, child: child)) // 最灵活：只重建 builder
```

### 15.4 Hero 共享元素转场

```dart
// 列表页
Hero(
  tag: 'article-${item.id}',     // ⚠️ 两个页面 tag 必须一致
  child: Image.network(item.cover, fit: BoxFit.cover),
  transitionOnUserGestures: true,
  flightShuttleBuilder: (context, animation, direction, fromContext, toContext) { // 飞行过程自定义
    return ScaleTransition(scale: animation, child: toContext.widget);
  },
  placeholderBuilder: (context, size, child) => child, // 目标未就绪时的占位
  createRectTween: (begin, end) => MaterialRectArcTween(begin: begin), // 弧线轨迹
)

// 详情页
Hero(tag: 'article-${item.id}', child: Image.network(item.cover, fit: BoxFit.cover))
```

### 15.5 AnimatedList / AnimatedIcon

```dart
final _listKey = GlobalKey<AnimatedListState>();

// 插入（带动画）
_listKey.currentState!.insertItem(_items.length, duration: const Duration(milliseconds: 300));
// 删除
_listKey.currentState!.removeItem(index, (context, animation) => SizeTransition(sizeFactor: animation, child: _buildItem(_items[index])), duration: const Duration(milliseconds: 300));

AnimatedList(
  key: _listKey,
  initialItemCount: _items.length,
  itemBuilder: (_, i, animation) => SizeTransition(sizeFactor: animation, child: _buildItem(_items[i])),
  scrollDirection: Axis.vertical,
  reverse: false,
  controller: _ctrl,
  physics: const ClampingScrollPhysics(),
  shrinkWrap: false,
  primary: false,
  padding: const EdgeInsets.all(8),
  addAutomaticKeepAlives: true,
  addRepaintBoundaries: true,
  addSemanticIndexes: true,
)

// 图标动画（Icons.add ↔ Icons.close 平滑变形）
AnimatedIcon(icon: AnimatedIcons.menu_close, progress: _anim, size: 32, color: Colors.black)
// AnimatedIcons: menu_arrow / menu_close / list_view / play_pause / view_list / ellipsis_search / event_add / home_menu / close_menu / add_event / arrow_menu / pause_play
```

---

## 16. 主题、响应式与 InheritedWidget

### 16.1 ThemeData 与 Material 3

```dart
MaterialApp(
  theme: ThemeData(
    useMaterial3: true,                       // M3 设计语言（3.x 默认 true）
    brightness: Brightness.light,             // light | dark
    colorScheme: ColorScheme.fromSeed(        // 由一个种子色生成整套 M3 配色
      seedColor: Colors.blue,
      brightness: Brightness.light,
      // primary/onPrimary/secondary/onSecondary/error/onError/surface/onSurface/surfaceContainer/outline… 自动派生
      contrastLevel: 0,                       // 对比度 0~1（无障碍）
      dynamicSchemeVariant: DynamicSchemeVariant.tonalSpot, // tonalSpot | fidelity | vibrant | expressive | rainbow | fruit…（Android 12+ 取色）
    ),
    // 不用 fromSeed 时手工指定
    // colorScheme: const ColorScheme.light(primary: Colors.blue, onPrimary: Colors.white, secondary: Colors.teal, surface: Colors.white),
    scaffoldBackgroundColor: Colors.grey.shade50,
    canvasColor: Colors.white,
    cardColor: Colors.white,
    dividerColor: Colors.grey.shade300,
    splashFactory: InkSparkle.splashFactory,  // 全局水波纹
    // —— 各组件主题 ——
    appBarTheme: const AppBarTheme(backgroundColor: Colors.blue, foregroundColor: Colors.white, centerTitle: true, elevation: 2),
    elevatedButtonTheme: ElevatedButtonThemeData(style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white, shape: const StadiumBorder())),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: Colors.blue)),
    outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.blue))),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(shape: const StadiumBorder())),
    iconButtonTheme: IconButtonThemeData(style: IconButton.styleFrom(foregroundColor: Colors.black87)),
    fabTheme: const FloatingActionButtonThemeData(backgroundColor: Colors.blue, foregroundColor: Colors.white, shape: CircleBorder()),
    cardTheme: CardTheme(color: Colors.white, elevation: 2, margin: const EdgeInsets.all(8), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
    chipTheme: ChipThemeData(backgroundColor: Colors.grey.shade100, selectedColor: Colors.blue.withOpacity(0.2), side: BorderSide(color: Colors.grey.shade300), shape: const StadiumBorder()),
    inputDecorationTheme: InputDecorationTheme(filled: true, fillColor: Colors.grey.shade100, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none), focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.blue, width: 2))),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(backgroundColor: Colors.white, selectedItemColor: Colors.blue, unselectedItemColor: Colors.grey, type: BottomNavigationBarType.fixed),
    navigationBarTheme: NavigationBarThemeData(backgroundColor: Colors.white, indicatorColor: Colors.blue.withOpacity(0.15), labelBehavior: NavigationDestinationLabelBehavior.alwaysShow),
    tabBarTheme: const TabBarTheme(labelColor: Colors.blue, unselectedLabelColor: Colors.grey, indicatorColor: Colors.blue),
    dialogTheme: DialogTheme(backgroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), elevation: 6),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating, backgroundColor: Colors.black87, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
    bottomSheetTheme: const BottomSheetThemeData(backgroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))), elevation: 8),
    dividerTheme: DividerThemeData(color: Colors.grey.shade300, thickness: 1, space: 1, indent: 16, endIndent: 16),
    listTileTheme: const ListTileThemeData(iconColor: Colors.grey, selectedColor: Colors.blue, selectedTileColor: Colors.blue),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: Colors.blue, linearMinHeight: 6, circularTrackColor: Colors.grey),
    sliderTheme: const SliderThemeData(activeTrackColor: Colors.blue, inactiveTrackColor: Colors.blue, thumbColor: Colors.blue, overlayColor: Colors.blue),
    switchTheme: SwitchThemeData(thumbColor: WidgetStateProperty.all(Colors.white), trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? Colors.blue : Colors.grey), trackOutlineColor: WidgetStateProperty.all(Colors.transparent)),
    checkboxTheme: CheckboxThemeData(fillColor: WidgetStateProperty.all(Colors.blue), checkColor: WidgetStateProperty.all(Colors.white)),
    radioTheme: RadioThemeData(fillColor: WidgetStateProperty.all(Colors.blue)),
    tooltipTheme: const TooltipThemeData(decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.all(Radius.circular(6))), textStyle: TextStyle(color: Colors.white, fontSize: 12)),
    // —— 文字主题（M3 全套排版）——
    textTheme: const TextTheme(
      displayLarge: TextStyle(fontSize: 57, fontWeight: FontWeight.w400),   // 展示级
      displayMedium: TextStyle(fontSize: 45),
      displaySmall: TextStyle(fontSize: 36),
      headlineLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.w600),  // 头条
      headlineMedium: TextStyle(fontSize: 28),
      headlineSmall: TextStyle(fontSize: 24),
      titleLarge: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),     // 标题
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
      titleSmall: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
      bodyLarge: TextStyle(fontSize: 16),                                    // 正文
      bodyMedium: TextStyle(fontSize: 14),
      bodySmall: TextStyle(fontSize: 12),
      labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),      // 标签
      labelMedium: TextStyle(fontSize: 12),
      labelSmall: TextStyle(fontSize: 11),
    ),
    fontFamily: 'Roboto',
    visualDensity: VisualDensity.adaptivePlatformDensity, // 平台自适应密度
    // 暗色模式另一套
  ),
  darkTheme: ThemeData(brightness: Brightness.dark, useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue, brightness: Brightness.dark)),
  themeMode: ThemeMode.system,             // system | light | dark
  // 高对比度：MediaQuery.withClampedTextScaling(minScaleFactor: 1.0, maxScaleFactor: 2.0, child: ...)
)

// 使用
final cs = Theme.of(context).colorScheme;
final tt = Theme.of(context).textTheme;
Text('标题', style: tt.titleLarge)
Container(color: cs.primaryContainer)
```

### 16.2 MediaQuery / LayoutBuilder / OrientationBuilder

```dart
// 屏幕信息
final mq = MediaQuery.of(context);
mq.size.width              // 宽
mq.size.height             // 高
mq.orientation             // portrait | landscape
mq.padding                 // 安全区（top 刘海 / bottom 手势条）
mq.viewInsets.bottom       // 键盘高度
mq.viewPadding             // 被遮挡后的 padding
mq.devicePixelRatio        // 像素比
mq.textScaler.scale(14)    // 系统字号缩放后的尺寸
mq.platformBrightness     // light | dark
mq.alwaysUse24HourFormat
mq.navigationMode         // 传统/手势
mq.disableAnimations      // 系统关动画时请尊重

// 底部键盘避让
Padding(padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom), child: ...)
// 安全区（刘海/手势条）
SafeArea(top: true, bottom: true, left: false, right: false, minimum: const EdgeInsets.all(8), maintainBottomViewPadding: true, child: ...)

// 响应式布局：按约束宽度分支（比 MediaQuery.size 更精确，跟随父容器）
LayoutBuilder(
  builder: (context, constraints) {
    if (constraints.maxWidth < 600) return _buildMobile();
    if (constraints.maxWidth < 1024) return _buildTablet();
    return _buildDesktop(); // constraints.maxHeight / minWidth / maxHeight / hasBoundedWidth…
  },
)

// 横竖屏分支
OrientationBuilder(
  builder: (context, orientation) => orientation == Orientation.portrait
      ? const Column(children: [...])
      : const Row(children: [...]),
)

// 响应式断位工具（项目里可封装）
bool isCompact(BuildContext c) => MediaQuery.sizeOf(c).width < 600;
bool isMedium(BuildContext c) { final w = MediaQuery.sizeOf(c).width; return w >= 600 && w < 1024; }
bool isExpanded(BuildContext c) => MediaQuery.sizeOf(c).width >= 1024;
```

### 16.3 InheritedWidget —— 跨层传值

```dart
// 定义（只读共享数据）
class CounterProvider extends InheritedWidget {
  const CounterProvider({super.key, required this.count, required super.child});
  final int count;

  // 订阅入口：依赖变化时才重建
  static CounterProvider? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<CounterProvider>();

  @override
  bool updateShouldNotify(covariant CounterProvider old) => old.count != count;
}

// 顶层注入
CounterProvider(count: _count, child: const HomePage())

// 任意深处消费（不依赖 context 树位置）
final count = CounterProvider.of(context)?.count ?? 0;
Text('$count');

// ⚠️ 优化：不想重建用 read 语义（3.10+ 风格）
// 第三方方案 Provider/Riverpod/GetX 等本质都是 InheritedWidget 的封装

// InheritedModel：按"方面（aspect）"精准通知，避免整树重建
class ThemeModel extends InheritedModel<String> {
  const ThemeModel({super.key, required this.themeData, required super.child});
  final ThemeData themeData;

  static ThemeData of(BuildContext context, String aspect) =>
      InheritedModel.inheritFrom<ThemeModel>(context, aspect: aspect)!.themeData;

  @override
  bool updateShouldNotify(ThemeModel old) => old.themeData != themeData;

  @override
  bool updateShouldNotifyDependent(ThemeModel old, Set<String> aspects) {
    // 只通知关心这个 aspect 的依赖
    return aspects.contains('primary') && old.themeData.primaryColor != themeData.primaryColor;
  }
}

// 局部主题覆盖（子树内换主题）
Theme(data: ThemeData.dark(), child: const DarkSection())
IconTheme(data: const IconThemeData(color: Colors.red), child: const Icon(Icons.star))
```

---

## 17. 生命周期与异步 Widget

### 17.1 StatefulWidget 生命周期全流程

```
createState() → initState() → didChangeDependencies() → build() → … → didUpdateWidget() → build() → …
                                              ↓（页面销毁）
                                          deactivate() → dispose()
```

```dart
class _LifecyclePageState extends State<LifecyclePage> with RouteAware {
  @override
  void initState() {
    super.initState();
    // 初始化数据、注册监听、启动动画
    // ⚠️ 不能在此调用 context 找 InheritedWidget（依赖未注入）
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // 依赖变化时调用：initState 后必调一次； InheritedWidget 更新/MediaQuery 变化/语言切换
    // 适合：读 Theme.of(context)、加载依赖 MediaQuery 的资源
  }

  @override
  Widget build(BuildContext context) {
    // 返回 Widget 树；setState 会触发
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }

  @override
  void didUpdateWidget(covariant LifecyclePage old) {
    super.didUpdateWidget(old);
    // 父组件重建且 configuration 相同（canUpdate 为 true）时调用
    // 适合：初始化依赖 widget.xxx 的控制器（widget 配置变了要重建）
  }

  @override
  void deactivate() {
    super.deactivate();
    // 从树上移除（可能再插入，如路由 pop 过程中的中间态）
  }

  @override
  void dispose() {
    // 彻底销毁：释放 Controller/Animation/Stream 订阅
    super.dispose();
  }
}
```

**生命周期时机表**：

| 方法 | 调用时机 | 典型用途 |
| --- | --- | --- |
| `initState` | 插入树一次 | 初始化 Controller、启动动画、注册监听 |
| `didChangeDependencies` | `initState` 后 + 依赖变化时 | 读 InheritedWidget/MediaQuery |
| `build` | `initState` 后 + 每次 `setState` + 父重建（`canUpdate` 为 true） | 返回 Widget 树 |
| `didUpdateWidget` | 父组件配置变化 | 更新依赖 `widget.xxx` 的资源 |
| `deactivate` | 暂时离树 | 暂停动画/定时器（可能回来） |
| `dispose` | 永久销毁 | 释放所有资源 |

> ⚠️ **`setState` 之后不能立刻读新值再 build 之外的逻辑**；`dispose` 之后再 `setState` 会抛异常，异步回调里先判 `mounted`。

### 17.2 mounted 检查（异步安全）

```dart
void _load() async {
  final data = await fetchData();       // 等待期间用户可能已退出
  if (!mounted) return;                  // ⚠️ 页面已销毁，直接返回
  setState(() => _data = data);          // 安全
}

// context 版本（Widget 层）
Future.delayed(const Duration(seconds: 1), () {
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('完成')));
  }
});
```

### 17.3 FutureBuilder —— 异步快照

```dart
FutureBuilder<List<Article>>(
  future: _future,                      // ⚠️ 不要在 build 里直接 new Future，放 initState 或缓存字段
  builder: (context, snapshot) {
    // snapshot 全字段
    // snapshot.connectionState: none | waiting | active | done
    // snapshot.data: 成功数据
    // snapshot.error: 错误对象
    // snapshot.hasError / hasData / requireData / requireError
    switch (snapshot.connectionState) {
      case ConnectionState.none:
      case ConnectionState.waiting:
        return const Center(child: CircularProgressIndicator());
      case ConnectionState.active:
      case ConnectionState.done:
        if (snapshot.hasError) {
          return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.error_outline, color: Colors.red),
            const SizedBox(height: 8),
            Text('加载失败: ${snapshot.error}'),
            ElevatedButton(onPressed: () => setState(() => _future = _fetch()), child: const Text('重试')),
          ]));
        }
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('暂无数据'));
        }
        return ListView.builder(itemCount: snapshot.data!.length, itemBuilder: (_, i) => ListTile(title: Text(snapshot.data![i].title)));
    }
  },
  initialData: const [],               // 初始数据（有则 build 不进入 waiting）
)

// 多 Future 等待
FutureBuilder.wait  // 不内置，用 Future.wait 组合一个
// future: Future.wait([_fetchUser(), _fetchArticles()])
```

### 17.4 StreamBuilder —— 流

```dart
StreamBuilder<int>(
  stream: _stream,                    // BroadcastStream 或普通 Stream
  initialData: 0,                     // 初始数据
  builder: (context, snapshot) {
    if (snapshot.hasError) return Text('错误: ${snapshot.error}');
    if (!snapshot.hasData) return const Text('等待数据');
    return Text('当前值: ${snapshot.data}');
  },
)

// 常见流源
// Firebase: .snapshots()
// Isar/SQLite 监听：.watch()
// WebSocket: .stream
// 自定义：StreamController<int>().stream
// 组合：RxDart（三方）、StreamBuilder + asyncExpand
```

### 17.5 ValueNotifier + ValueListenableBuilder（轻量状态）

```dart
final _count = ValueNotifier<int>(0);   // 不需要 setState 的状态

ValueListenableBuilder<int>(
  valueListenable: _count,
  child: const Text('被复用的子组件'),     // 不依赖值，避免重复构建
  builder: (context, value, child) => Column(children: [
    Text('值: $value'),
    child!,                               // 复用
    ElevatedButton(onPressed: () => _count.value++, child: const Text('+1')),
  ]),
)

// AnimatedBuilder 同理，监听 Animation
// 何时用：跨组件共享一个可变值 → ValueNotifier；局部一个值 → setState
// 复杂业务 → Riverpod/Bloc/Provider（底层都是 InheritedWidget）
```

### 17.6 Builder 与 context 作用域

```dart
// Builder：拿到"当前层级"的 context（Navigator.of(context) 常见陷阱）
Scaffold(
  appBar: AppBar(title: Text('标题')),
  floatingActionButton: Builder(           // ⚠️ 直接用外层的 context 可能找不到 ScaffoldMessenger
    builder: (context) => FloatingActionButton(
      onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('点击'))),
      child: const Icon(Icons.add),
    ),
  ),
)

// 常见坑：在 build 最外层（StatelessWidget.build 的 context）里
// 调 Navigator.of(context).push 可能拿到的是 MaterialApp 的 context，
// 用 Builder 或 StatefulWidget 的 State.context 更稳
```

---

## 18. 速查表与常见问题

### 18.1 按功能索引常用 Widget

| 功能 | Widget |
| --- | --- |
| 文本 | `Text` / `Text.rich` / `SelectableText` / `DefaultTextStyle` |
| 图片 | `Image`（network/asset/file/memory）/ `FadeInImage` / `CircleAvatar` |
| 容器 | `Container` / `SizedBox` / `DecoratedBox` / `ColoredBox` |
| 内边距 | `Padding` / `SafeArea` / `SliverPadding` |
| 布局 | `Row` / `Column` / `Wrap` / `Stack` / `IndexedStack` / `Flow` / `Table` |
| 滚动 | `ListView` / `GridView` / `PageView` / `CustomScrollView` / `SingleChildScrollView` / `NestedScrollView` |
| 按钮 | `ElevatedButton` / `FilledButton` / `TextButton` / `OutlinedButton` / `IconButton` / `FloatingActionButton` |
| 输入 | `TextField` / `TextFormField` / `Form` / `Autocomplete` |
| 选择 | `Checkbox` / `Radio` / `Switch` / `Slider` / `DropdownButton` / `SegmentedButton` |
| 列表项 | `ListTile` / `Card` / `Chip` / `DataTable` |
| 浮层 | `AlertDialog` / `SimpleDialog` / `Dialog` / `BottomSheet` / `SnackBar` / `MaterialBanner` / `Tooltip` |
| 骨架 | `Scaffold` / `AppBar` / `SliverAppBar` / `BottomNavigationBar` / `NavigationBar` / `NavigationRail` / `Drawer` / `TabBar` |
| 动画 | `AnimatedContainer` / `AnimatedOpacity` / `AnimatedSwitcher` / `Hero` / `TweenAnimationBuilder` / `AnimatedList` |
| 异步 | `FutureBuilder` / `StreamBuilder` / `ValueListenableBuilder` |
| 响应式 | `MediaQuery` / `LayoutBuilder` / `OrientationBuilder` / `FittedBox` / `AspectRatio` |
| 裁剪 | `ClipRRect` / `ClipOval` / `ClipPath` / `BackdropFilter` / `ShaderMask` |
| 手势 | `GestureDetector` / `InkWell` / `Dismissible` / `Draggable` / `InteractiveViewer` |
| 主题 | `Theme` / `IconTheme` / `DefaultTextStyle` / `InheritedWidget` |

### 18.2 布局约束黄金法则

```
Constraints go down（父 → 子：给出 min/max 宽高）
Sizes go up（子 → 父：回报自身尺寸）
Parent sets position（父决定子的绘制位置）
```

记忆要点：

1. **Column/Row 的主轴无限、交叉轴有限**：交叉轴里放不定高内容容易溢出（`RenderFlex overflowed`）。
2. **ListView 的滚动方向无限**：在滚动方向放不定尺寸内容会报 `unbounded`。
3. **`Expanded`/`Flexible` 只能放 Flex（Row/Column）里**。
4. **`IntrinsicHeight`/`IntrinsicWidth` 开销大**，嵌套很深时慎用（先算子内容再定自身）。
5. **`shrinkWrap: true`** 让 ListView 高度包裹内容，代价是全量构建 + O(n) 布局，仅用于嵌套/矮列表。

### 18.3 const 与性能清单

```dart
// ✅ 能 const 就 const：跳过该子树重建
const Text('不变')                       // Widget 构造加 const
const SizedBox(height: 8)
final list = const [Text('a'), Text('b')];

// ✅ 列表 key：增删/排序时保证复用正确
ListView.builder(itemBuilder: (_, i) => ListTile(key: ValueKey(items[i].id), ...))

// ✅ 长列表用 builder + itemExtent/prototypeItem
// ✅ 动画用 AnimatedBuilder 把 child 提到 builder 外，减少重建范围
// ✅ ValueListenableBuilder / StreamBuilder 精准重建，替代整页 setState
// ✅ 页面级缓存：IndexedStack 保 Tab 状态、AutomaticKeepAliveClientMixin 保列表项
// ✅ 图片：cacheWidth 降采样 + CachedNetworkImage（三方）磁盘缓存
// ✅ RepaintBoundary 隔离频繁重绘区域（长列表默认自带）
// ✅ 避免在 build 里创建 Future/Stream/随机数
```

### 18.4 FAQ

**Q1：黄色黑纹 "A RenderFlex overflowed by XX pixels" 怎么排查？**
A：先看报错指向 Row 还是 Column，找到溢出方向的子元素：长文本加 `maxLines + overflow: ellipsis`；要压缩的包 `Expanded/Flexible`；内容不确定高度换 `Wrap`；或整体改 `SingleChildScrollView`。根因是 Flex 不给子元素超出主轴的空间。

**Q2：TextField 键盘弹出来把输入框挡住了？**
A：① `Scaffold.resizeToAvoidBottomInset: true`（默认）；② 外层包 `SingleChildScrollView`；③ 让输入框 `focusNode.requestFocus()` 后 `Scrollable.ensureVisible(context)`；④ 底部弹窗用 `showModalBottomSheet(isScrollControlled: true)` + `padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom)`。

**Q3：`setState() called during build` / `markNeedsBuild called during build`？**
A：在 build 里直接 `setState`/`showDialog`/`Navigator.push` 了。把这些挪到 `onPressed`/`addPostFrameCallback` 里：`WidgetsBinding.instance.addPostFrameCallback((_) => Navigator.push(...))`。

**Q4：InkWell 水波纹不显示？**
A：祖先链里没有 `Material`。用 `Material(color: ..., child: InkWell(...))` 包一层；或确认没有 `Opacity`/`ColorFiltered` 中途把 Ink 层挡住了。

**Q5：ListView 里再放 ListView（横向）就报高度 unbounded？**
A：内层 ListView 加 `shrinkWrap: true` + `physics: NeverScrollableScrollPhysics()`，外层加 `SizedBox` 或让外层 Column 用 `Expanded`；嵌套滚动优先 `CustomScrollView + Sliver`。

**Q6：图片加载慢/内存爆？**
A：网络图加 `cacheWidth`（按显示尺寸解码）、`CachedNetworkImage`；大图列表用 `ListView.builder` 懒加载；`Image.file` 场景注意及时清理缓存；内存吃紧用 `ResizeImage`/`filterQuality: low`。

**Q7：暗黑模式局部不生效？**
A：硬编码 `Colors.white` 不随主题切换，改用 `Theme.of(context).colorScheme.surface/onSurface` 或 `ColorScheme` 语义色；局部换主题用 `Theme(data: ..., child: ...)`。

**Q8：`dispose() called on null` / 找不到 controller？**
A：`late final _ctrl` 在 initState 之前被访问；确保所有 `Controller/AnimationController/FocusNode/StreamSubscription` 都在 `dispose` 里释放，且不重复 dispose。

**Q9：`Navigator.of(context)` 拿到错误的 context？**
A：用 `Builder` 包一层拿子树 context；或在 `State` 里直接用 `context`；或指定 `Navigator.of(context, rootNavigator: true)`。

**Q10：页面切换后列表位置丢失/滚动状态重置？**
A：Controller 提到页面级（State 里创建，别放 build）；Tab 保活用 `IndexedStack` 或 `AutomaticKeepAliveClientMixin`；也可以用 `PageStorageKey` 让框架自动存滚动位置。

### 18.5 版本迁移小贴士

- **Flutter 3.27+**：`Color.withOpacity()` 逐步被 `withValues(alpha:)` 取代（语义更清晰，避免 0~1 与 0~255 混淆）。
- **Flutter 3.29+**：`WidgetStateProperty` 取代 `MaterialStateProperty`；`Checkbox` 的 `fillColor` 取代 `activeColor`。
- **Flutter 3.31+**：`WillPopScope` 被 `PopScope` 取代（`canPop` + `onPopInvoked`）。
- **Material 3**：`useMaterial3: true` 已是默认，`TextButton`/`ElevatedButton` 默认样式变化大，配色优先 `ColorScheme.fromSeed`。
- **Dart 3**：所有类默认 `sealed` 需显式打开；`switch` 语句可写表达式模式；record/patterns 大量用于 `WidgetStateProperty.resolveWith` 等新 API。

---

> 📌 本文接口基于 Flutter 3.x / Dart 3.x 整理。各 Widget 的全部构造参数与最新变更以官方 API 文档为准（api.flutter.dev）。示例代码均可直接粘贴运行，建议配合 DevTools 的 Widget Inspector 观察 Element/RenderObject 树加深理解。
