---
title: Flutter 动画与动画三方库学习文档
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-44.jpg
tags:[flutter,dart,animation,implicit-animation,explicit-animation,hero,tween,curve,flutter-animate,animated-text-kit,lottie,rive,shimmer,marquee,staggered,confetti]
summary:Flutter 动画全解，覆盖内置动画体系（Animation/AnimationController/Tween/Curve/Ticker、隐式动画 AnimatedContainer 等、显式动画 AnimatedBuilder/各类 Transition、Hero 共享元素、CustomPainter 绘制动画、物理动画）、第三方动画库（flutter_animate 全 Effect、animated_text_kit 文字动画、marquee 文字滚动、shimmer 骨架屏、Lottie、Rive、flutter_staggered_animations 交错动画、simple_animations 声明式动画、confetti 粒子、Material animations），并附性能优化、综合实战与常见坑，每节均含可直接运行的示例
keywords:[flutter,dart,animation,implicit,explicit,hero,tween,curve,flutter-animate,animated-text-kit,lottie,rive,shimmer,marquee,staggered,confetti,motion]
top:1
copyright:true
---

# Flutter 动画与动画三方库学习文档

> 基于 **Flutter 3.47.7（stable）** + **Dart 3.13.5**（2026-10 最新稳定版）。Flutter 的动画建立在 `Animation` + `AnimationController` + `Tween` + `Curve` 四件套之上，分**隐式动画（Implicit）**、**显式动画（Explicit）**、**物理动画**与 **Hero 共享元素**四大类；再叠加 `flutter_animate`、`animated_text_kit`、`Lottie`、`Rive` 等三方库，可覆盖文字、骨架屏、矢量、粒子等几乎所有动效需求。本文从核心类讲起，逐层覆盖完整接口与主流三方库，力求接口齐全、示例可直接运行。

## 目录

- [1. Flutter 动画体系总览](#1-flutter-动画体系总览)
- [2. 核心四件套：Animation / AnimationController / Tween / Curve](#2-核心四件套animation--animationcontroller--tween--curve)
- [3. Ticker 与 TickerProvider](#3-ticker-与-tickerprovider)
- [4. AnimationController 生命周期与驱动方法](#4-animationcontroller-生命周期与驱动方法)
- [5. 隐式动画总览（ImplicitlyAnimatedWidget）](#5-隐式动画总览implicitlyanimatedwidget)
- [6. 基础隐式动画：Container / Opacity / Padding / Align / DefaultTextStyle 等](#6-基础隐式动画container--opacity--padding--align--defaulttextstyle-等)
- [7. Stack 内隐式动画：AnimatedPositioned / AnimatedPositionedDirectional](#7-stack-内隐式动画animatedpositioned--animatedpositioneddirectional)
- [8. 切换类隐式动画：AnimatedCrossFade / AnimatedSize / AnimatedSwitcher](#8-切换类隐式动画animatedcrossfade--animatedsize--animatedswitcher)
- [9. 列表与图标隐式动画：AnimatedList / SliverAnimatedList / AnimatedGrid / AnimatedIcon](#9-列表与图标隐式动画animatedlist--sliveranimatedlist--animatedgrid--animatedicon)
- [10. Tween 补间体系全览](#10-tween-补间体系全览)
- [11. Curve 曲线体系全览](#11-curve-曲线体系全览)
- [12. 显式动画：AnimatedWidget 与 AnimatedBuilder](#12-显式动画animatedwidget-与-animatedbuilder)
- [13. Transition 过渡组件全览](#13-transition-过渡组件全览)
- [14. Hero 共享元素动画](#14-hero-共享元素动画)
- [15. CustomPainter 绘制动画](#15-custompainter-绘制动画)
- [16. 物理动画基础（Simulation）](#16-物理动画基础simulation)
- [17. 动画性能与最佳实践](#17-动画性能与最佳实践)
- [18. 第三方动画库总览与选型](#18-第三方动画库总览与选型)
- [19. flutter_animate 全 Effect 与链式 API](#19-flutter_animate-全-effect-与链式-api)
- [20. flutter_animate 实战：列表入场 / 滚动驱动 / 自定义 Effect / Shader](#20-flutter_animate-实战列表入场--滚动驱动--自定义-effect--shader)
- [21. animated_text_kit 文字动画](#21-animated_text_kit-文字动画)
- [22. 文字滚动：marquee 与 text_scroll](#22-文字滚动marquee-与-text_scroll)
- [23. shimmer 骨架屏微光](#23-shimmer-骨架屏微光)
- [24. Lottie 矢量动画](#24-lottie-矢量动画)
- [25. Rive 交互式动画](#25-rive-交互式动画)
- [26. flutter_staggered_animations 交错动画](#26-flutter_staggered_animations-交错动画)
- [27. simple_animations 声明式动画](#27-simple_animations-声明式动画)
- [28. confetti 粒子庆祝](#28-confetti-粒子庆祝)
- [29. Material animations 运动规范](#29-material-animations-运动规范)
- [30. 综合实战：登录页入场动画](#30-综合实战登录页入场动画)
- [31. 常见坑与排错清单](#31-常见坑与排错清单)
- [32. 参考文档](#32-参考文档)

---

## 1. Flutter 动画体系总览

| 类别 | 特点 | 代表 Widget / 类 |
| --- | --- | --- |
| 隐式动画 | 只给「目标值」，框架自动补间；无需 Controller | `AnimatedContainer` 等 `ImplicitlyAnimatedWidget` 子类 |
| 显式动画 | 自己持有 `AnimationController`，完全控制进度 | `AnimatedBuilder`、`*Transition`、`Hero` |
| 物理动画 | 基于物理 `Simulation`（弹簧/重力） | `SpringSimulation`、`AnimationController.animateWith` |
| 共享元素 | 跨页面无缝过渡 | `Hero` |
| 三方库 | 封装常用动效，开箱即用 | `flutter_animate`、`animated_text_kit`、`Lottie`、`Rive` 等 |

> 经验法则：**改一个值就动** → 隐式；**要精确编排/循环/联动** → 显式；**文字/骨架/矢量/粒子** → 三方库。

---

## 2. 核心四件套：Animation / AnimationController / Tween / Curve

```dart
// 1) Animation<T>：在某个区间输出插值结果的可监听对象
late Animation<double> animation;

// 2) AnimationController：驱动动画的「时钟」，发出 0.0~1.0 的进度
final controller = AnimationController(
  duration: const Duration(seconds: 1),
  vsync: this, // 需要 TickerProvider（见第 3 节）
  // lowerBound: 0.0, upperBound: 1.0, // 可改区间
  // value: 0.0, // 初始值
  // debugLabel: 'myAnim',
);

// 3) Tween：定义「从 A 到 B」的映射（可结合 Curve）
final tween = Tween<double>(begin: 0, end: 300);
// 4) Curve：把线性进度变成非线性（缓动）
final curve = CurvedAnimation(parent: controller, curve: Curves.easeInOut);

// 组合：tween.animate(curve) → Animation<double>
animation = tween.animate(curve);
animation.addListener(() => setState(() {})); // 每帧刷新 UI
animation.addStatusListener((status) {
  if (status == AnimationStatus.completed) controller.reverse();
});

controller.forward(); // 启动
```

`Animation<T>` 关键成员：`value`、`addListener`、`removeListener`、`addStatusListener`、`removeStatusListener`、`status`（`AnimationStatus`）、`drive<U>(Animatable<U>)`。

`AnimationStatus` 枚举：`dismissed`（在起点）、`forward`（正向播放中）、`reverse`（反向播放中）、`completed`（在终点）。

---

## 3. Ticker 与 TickerProvider

`AnimationController` 需要 `vsync` 来避免后台耗电（页面不可见时暂停重绘）。`TickerProvider` 由 mixin 提供：

```dart
// 单 Controller → 用 SingleTickerProviderStateMixin
class _DemoState extends State<Demo> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 1));
  }
  @override
  void dispose() {
    _ctrl.dispose(); // 必须释放
    super.dispose();
  }
}

// 多个 Controller → 用 TickerProviderStateMixin
class _MultiState extends State<Multi> with TickerProviderStateMixin {
  late final a = AnimationController(vsync: this, duration: const Duration(seconds: 1));
  late final b = AnimationController(vsync: this, duration: const Duration(seconds: 2));
}
```

> **忘记 `dispose()` 会内存泄漏**；`vsync` 必须为 State 提供的 `TickerProvider`。

---

## 4. AnimationController 生命周期与驱动方法

| 方法 | 说明 |
| --- | --- |
| `forward({double? from})` | 从当前值正向播放到 `upperBound` |
| `reverse({double? from})` | 反向播放到 `lowerBound` |
| `repeat({double? min, double? max, bool reverse = false, Duration? period})` | 循环播放 |
| `animateTo(double target, {Duration? duration, Curve curve = Curves.linear})` | 平滑过渡到目标值 |
| `animateBack(double target, {...})` | 反向平滑过渡到目标值 |
| `stop({bool canceled = true})` | 停止 |
| `reset()` | 回到 `lowerBound` 并停止 |
| `dispose()` | 释放资源（必须调用） |
| `fling({double velocity = 1.0, ...})` | 基于初速度的惯性播放 |
| `animateWith(Animation<double> parent)` | 用物理 `Simulation` 驱动 |

```dart
_controller
  ..addListener(() => setState(() {}))
  ..forward();

// 2 秒后反向、完成后再正向，循环
_controller.repeat(reverse: true, period: const Duration(seconds: 2));

// 惯性回弹
_controller.fling(velocity: 2.0);
```

---

## 5. 隐式动画总览（ImplicitlyAnimatedWidget）

所有 `ImplicitlyAnimatedWidget` 子类都遵循同一范式：**你只改 `child` 的目标属性，框架自动从「旧值」补间到「新值」**。它们内部自带 `AnimationController`，无需手动管理。

```dart
// 状态里只存一个目标值，setState 切换即可触发动画
double _size = 100;
bool _expanded = false;

void _toggle() => setState(() {
  _expanded = !_expanded;
  _size = _expanded ? 200 : 100;
});

// 下面的 AnimatedContainer 会在 _size 变化时自动补间
AnimatedContainer(
  duration: const Duration(milliseconds: 400),
  curve: Curves.easeInOut,
  width: _size,
  height: _size,
  decoration: BoxDecoration(
    color: _expanded ? Colors.blue : Colors.red,
    borderRadius: BorderRadius.circular(_expanded ? 24 : 0),
  ),
)
```

常用参数：`duration`（必填）、`curve`、`onEnd`（动画结束回调）、`child`。

---

## 6. 基础隐式动画：Container / Opacity / Padding / Align / DefaultTextStyle 等

| Widget | 动画属性 |
| --- | --- |
| `AnimatedContainer` | width/height/color/decoration/alignment/padding/margin/borderRadius 等 |
| `AnimatedOpacity` | opacity |
| `AnimatedPadding` | padding |
| `AnimatedAlign` | alignment |
| `AnimatedDefaultTextStyle` | TextStyle |
| `AnimatedPhysicalModel` | elevation/shadowColor/color/borderRadius |
| `AnimatedTheme` | ThemeData |
| `AnimatedScale` | scale |
| `AnimatedRotation` | turns |
| `AnimatedSlide` | offset |
| `AnimatedVisibility` / `AnimatedOpacity` | 可见性 |

```dart
AnimatedOpacity(
  duration: const Duration(seconds: 1),
  opacity: _visible ? 1.0 : 0.0,
  child: const Text('淡入淡出'),
);

AnimatedAlign(
  duration: const Duration(seconds: 1),
  alignment: _right ? Alignment.centerRight : Alignment.centerLeft,
  child: const FlutterLogo(),
);

AnimatedDefaultTextStyle(
  duration: const Duration(seconds: 1),
  style: TextStyle(fontSize: _big ? 32 : 16, color: Colors.teal),
  child: const Text('样式补间'),
);

AnimatedScale(scale: _big ? 1.5 : 1.0, duration: const Duration(seconds: 1),
  child: const Icon(Icons.star));
AnimatedRotation(turns: _spinning ? 1 : 0, duration: const Duration(seconds: 1),
  child: const Icon(Icons.refresh));
AnimatedSlide(offset: _moved ? const Offset(0, -0.5) : Offset.zero,
  duration: const Duration(seconds: 1), child: const Card(child: Text('滑移')));
```

---

## 7. Stack 内隐式动画：AnimatedPositioned / AnimatedPositionedDirectional

在 `Stack` 中根据 `left/top/right/bottom` 自动补间位置：

```dart
Stack(
  children: [
    AnimatedPositioned(
      duration: const Duration(seconds: 1),
      left: _right ? 200 : 0,
      top: _right ? 150 : 0,
      child: const FlutterLogo(size: 50),
    ),
    AnimatedPositionedDirectional(
      duration: const Duration(seconds: 1),
      start: _moved ? 150 : 0,
      child: const FlutterLogo(size: 50),
    ),
  ],
)
```

> `AnimatedPositioned` 要求所有定位属性要么都是具体值、要么都是 `null`（不能部分动画）。

---

## 8. 切换类隐式动画：AnimatedCrossFade / AnimatedSize / AnimatedSwitcher

### AnimatedCrossFade：两个子 Widget 淡入淡出交叉

```dart
AnimatedCrossFade(
  duration: const Duration(seconds: 1),
  crossFadeState: _showFirst ? CrossFadeState.showFirst : CrossFadeState.showSecond,
  firstChild: const Text('第一态'),
  secondChild: const Icon(Icons.check),
  firstCurve: Curves.easeIn,
  secondCurve: Curves.easeOut,
  layoutBuilder: (top, bottom) => Stack(children: [bottom, top]),
)
```

### AnimatedSize：子 Widget 尺寸变化时平滑过渡

```dart
AnimatedSize(
  duration: const Duration(seconds: 1),
  alignment: Alignment.center,
  child: Container(width: _w, height: _h, color: Colors.amber),
)
```

### AnimatedSwitcher：切换 key 不同的子 Widget 时执行转场

```dart
AnimatedSwitcher(
  duration: const Duration(milliseconds: 500),
  transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
  child: Text('$_count', key: ValueKey(_count)), // key 变化触发转场
)
```

> `AnimatedSwitcher` 靠子 Widget 的 `key` 判断是否「换了」，务必给每个状态不同的 `ValueKey`。

---

## 9. 列表与图标隐式动画：AnimatedList / SliverAnimatedList / AnimatedGrid / AnimatedIcon

### AnimatedList：增删项带动画

```dart
final _key = GlobalKey<AnimatedListState>();
final _items = <String>['a', 'b'];

AnimatedList(
  key: _key,
  initialItemCount: _items.length,
  itemBuilder: (ctx, i, anim) => SizeTransition(
    sizeFactor: anim,
    child: ListTile(title: Text(_items[i])),
  ),
);

// 插入 / 删除
_items.insert(0, 'new');
_key.currentState!.insertItem(0);
// _key.currentState!.removeItem(index, (ctx, anim) => SizeTransition(sizeFactor: anim, child: ...));
```

### SliverAnimatedList / AnimatedGrid / SliverAnimatedGrid

```dart
CustomScrollView(slivers: [
  SliverAnimatedList(key: _skey, itemBuilder: _build, initialItemCount: _items.length),
]);
AnimatedGrid( // 网格版
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2),
  itemBuilder: (ctx, i, anim) => FadeTransition(opacity: anim, child: Cell(_items[i])),
  initialItemCount: _items.length,
)
```

### AnimatedIcon：内置两态图标补间

```dart
AnimatedIcon(icon: AnimatedIcons.menu_arrow, progress: _ctrl, size: 36);
// progress 为 Animation<double>，用 controller 驱动
```

---

## 10. Tween 补间体系全览

`Tween<A>` 把 `[0,1]` 的进度映射到 `A` 区间；`Tween.animate(animation)` 得到 `Animation<A>`。

| Tween | 类型 | 用途 |
| --- | --- | --- |
| `Tween<T>` | 任意（需 lerp） | 通用 |
| `IntTween` | `int` | 整数进度 |
| `DoubleTween` | `double` | 小数 |
| `ColorTween` | `Color` | 颜色 |
| `SizeTween` | `Size` | 尺寸 |
| `RectTween` | `Rect` | 矩形 |
| `InsetsTween` / `EdgeInsetsTween` | `EdgeInsets` | 边距 |
| `BorderRadiusTween` | `BorderRadius` | 圆角 |
| `AlignmentTween` | `Alignment` | 对齐 |
| `AlignmentGeometryTween` | `AlignmentGeometry` | 对齐几何 |
| `DecorationTween` | `Decoration` | 装饰（背景/边框） |
| `TextStyleTween` | `TextStyle` | 文本样式 |
| `BoxConstraintsTween` | `BoxConstraints` | 约束 |
| `StepTween` | `int`（阶梯） | 步进（常用于计数动画） |
| `ConstantTween` | 常量 | 固定值 |

```dart
final color = ColorTween(begin: Colors.red, end: Colors.blue)
    .animate(_ctrl);
final radius = BorderRadiusTween(begin: BorderRadius.zero, end: BorderRadius.circular(20))
    .animate(_ctrl);
final step = StepTween(begin: 0, end: 100).animate(_ctrl); // 0,1,2...100
```

`Animatable` 还能链式：`tween.chain(CurveTween(curve: Curves.ease))` 或 `tween.animate(_ctrl).drive(...)`。

---

## 11. Curve 曲线体系全览

`Curve` 把线性时间映射成非线性进度。预置在 `Curves` 中：

| 曲线 | 效果 |
| --- | --- |
| `Curves.linear` | 匀速 |
| `Curves.ease` / `easeIn` / `easeOut` / `easeInOut` | 标准缓动 |
| `Curves.decelerate` | 减速 |
| `Curves.fastOutSlowIn` | Material 标准 |
| `Curves.bounceIn` / `bounceOut` / `bounceInOut` | 回弹 |
| `Curves.elasticIn` / `elasticOut` / `elasticInOut` | 弹性 |
| `Curves.sin` / `sin` | 正弦 |

自定义曲线：

```dart
// 1) 三次贝塞尔
final cubic = Cubic(0.4, 0.0, 0.2, 1.0); // Material 标准
// 2) 区间：只在 [0,0.5] 生效，其余保持，用于错峰
final interval = Interval(0.0, 0.5, curve: Curves.ease);
// 3) 阈值：到达 0.25 前为 0，之后为 1
final threshold = Threshold(0.25);
// 4) 自实现
class MyCurve extends Curve {
  @override
  double transform(double t) => t * t; // 平方加速
}
```

---

## 12. 显式动画：AnimatedWidget 与 AnimatedBuilder

### AnimatedWidget：把 Animation 作为 listenable，自动重建

```dart
class SpinBox extends AnimatedWidget {
  const SpinBox({super.key, required Animation<double> animation})
      : super(listenable: animation);
  @override
  Widget build(BuildContext context) {
    final a = listenable as Animation<double>;
    return Transform.rotate(angle: a.value * 6.28, child: const FlutterLogo());
  }
}
// 使用：SpinBox(animation: _ctrl)
```

### AnimatedBuilder：更灵活，把「会变的部分」和「不变 child」分离，性能更好

```dart
AnimatedBuilder(
  animation: _ctrl,
  child: const FlutterLogo(), // 不变部分，只构建一次
  builder: (ctx, child) => Transform.scale(
    scale: _ctrl.value,
    child: child, // 复用，避免重建
  ),
)
```

> 优先用 `AnimatedBuilder` + `child` 缓存静态子树，减少无意义重建。

---

## 13. Transition 过渡组件全览

每个 Transition 接收一个 `Animation` 并据此变换子树：

| Widget | 输入 Animation | 变换 |
| --- | --- | --- |
| `FadeTransition` | `opacity` | 透明度 |
| `ScaleTransition` | `scale` | 缩放 |
| `RotationTransition` | `turns` | 旋转（圈为单位） |
| `SlideTransition` | `position: Animation<Offset>` | 位移 |
| `SizeTransition` | `sizeFactor` | 尺寸（沿 axis） |
| `PositionedTransition` | `rect: Animation<RelativeRect>` | 绝对定位矩形 |
| `RelativePositionedTransition` | `rect: Animation<Rect>` + `size` | 相对定位 |
| `DecoratedBoxTransition` | `decoration` | 装饰 |
| `AlignTransition` | `alignment` | 对齐 |
| `DefaultTextStyleTransition` | `style` | 文本样式 |
| `MatrixTransition` | `transform: Animation<Matrix4>` | 任意矩阵变换 |
| `AnimatedBuilder` | 任意 | 自定义 |

```dart
// 组合多个 Transition 实现「放大+淡入+上滑」入场
FadeTransition(
  opacity: _ctrl,
  child: ScaleTransition(
    scale: Tween(begin: 0.8, end: 1.0).animate(_ctrl),
    child: SlideTransition(
      position: Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero)
          .animate(_ctrl),
      child: const Card(child: Text('入场')),
    ),
  ),
);
```

---

## 14. Hero 共享元素动画

跨路由把同一个 `tag` 的 Widget 无缝过渡：

```dart
// 列表页
Hero(tag: 'avatar-1', child: Image.asset('a.png', width: 80));
// 详情页
Hero(tag: 'avatar-1', child: Image.asset('a.png', width: 300));
// 用 Navigator.push 跳转时自动播放飞行转场
```

高级参数：

```dart
Hero(
  tag: 'x',
  createRectTween: (begin, end) => MaterialRectCenterArcTween(begin: begin, end: end),
  flightShuttleBuilder: (ctx, anim, dir, from, to) =>
      ScaleTransition(scale: anim, child: to.child), // 飞行途中的中间态
  placeholderBuilder: (ctx, heroSize, child) => const SizedBox(), // 源页占位
  transitionOnUserGestures: true, // 支持侧滑返回动画
  child: const FlutterLogo(),
)
```

---

## 15. CustomPainter 绘制动画

通过 `Animation` 驱动 `CustomPainter` 的 `paint` 参数，实现任意矢量动画：

```dart
class ArcPainter extends CustomPainter {
  final double progress;
  ArcPainter(this.progress);
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.blue..style = PaintingStyle.stroke..strokeWidth = 8;
    canvas.drawArc(
      Rect.fromCircle(center: size.center(Offset.zero), radius: 60),
      -1.57, // 起始角
      6.28 * progress, // 随进度增长
      false,
      paint,
    );
  }
  @override
  bool shouldRepaint(covariant ArcPainter old) => old.progress != progress;
}

// 使用：用 AnimatedBuilder 重建
AnimatedBuilder(
  animation: _ctrl,
  builder: (_, __) => CustomPaint(painter: ArcPainter(_ctrl.value)),
)
```

> `shouldRepaint` 只在真正变化时才返回 `true`，是性能关键。

---

## 16. 物理动画基础（Simulation）

用 `SpringSimulation` 让动画具备真实弹性：

```dart
import 'package:flutter/physics.dart';

final spring = SpringSimulation(
  const SpringDescription(mass: 1, stiffness: 100, damping: 10),
  0.0,  // 起点
  300.0, // 终点
  0.0,  // 初速度
);
_controller.animateWith(spring); // 用物理模拟驱动 Controller
```

常用 `Simulation`：`SpringSimulation`（弹簧）、`GravitySimulation`（重力）、`BouncingScrollSimulation`（边界回弹）、`ClampedSimulation`（限幅）。

---

## 17. 动画性能与最佳实践

- **缓存静态子树**：`AnimatedBuilder(child:)` 把不变内容提出来。
- **隔离重绘区域**：动画 Widget 外包 `RepaintBoundary`，避免整棵树重绘。
- **用 `const`**：动画容器内静态子节点尽量 `const`。
- **释放 Controller**：`dispose()` 中 `controller.dispose()`，避免泄漏与后台耗电。
- **避免 `setState` 驱动大子树**：优先 `AnimatedBuilder` / `AnimatedWidget`。
- **大列表入场用交错动画**而非一次性全部动画（见第 26 节）。
- **优先隐式动画**：简单状态切换用 `AnimatedContainer` 比手写 Controller 更省心。
- **`Animate.restartOnHotReload = true`**（开发期）方便调试 flutter_animate。
- **GPU/UI 线程**：卡顿优先用 DevTools 的 Performance 面板看是否有 `saveLayer` 重绘。

---

## 18. 第三方动画库总览与选型

| 库 | 版本（2026-10） | 用途 |
| --- | --- | --- |
| `flutter_animate` | ^4.5.2 | 链式声明式动效，替代手写 Controller |
| `animated_text_kit` | ^4.3.0 | 打字机/旋转/波浪等文字动画 |
| `marquee` | ^4.0.0 | 文字无限滚动 |
| `shimmer` | ^4.0.0 | 骨架屏微光 |
| `lottie` | ^3.2.0 | Airbnb Lottie JSON 矢量动画 |
| `rive` | ^0.13.0 | Rive 交互式矢量动画（状态机） |
| `flutter_staggered_animations` | ^1.1.1 | 列表/网格交错入场 |
| `simple_animations` | ^5.0.0 | 声明式多轨动画 |
| `confetti` | ^0.7.0 | 粒子庆祝 |
| `animations` | ^2.0.11 | Material Motion（OpenContainer 等） |

> **文字类**重点看 `animated_text_kit` + `marquee`；**骨架/加载**看 `shimmer`；**设计交付动效**看 `Lottie`/`Rive`；**通用编排**看 `flutter_animate`；**页面转场**看 `animations`。

---

## 19. flutter_animate 全 Effect 与链式 API

`flutter_animate` 给任意 `Widget` 加 `.animate()` 扩展，链式叠加 Effect，免写 Controller。

```dart
import 'package:flutter_animate/flutter_animate.dart';

Text('Hello')
    .animate()
    .fade(duration: 300.ms, curve: Curves.easeOut) // 淡入
    .scale(begin: 0.8, end: 1.0)                   // 放大
    .slide(begin: const Offset(0, 0.3), end: Offset.zero) // 上滑
    .move(dx: 20)                                 // 位移像素
    .rotate(begin: -0.1, end: 0)                  // 旋转（弧度）
    .blur(begin: const Blur(4), end: Blur.zero)   // 模糊
    .shimmer(duration: 1200.ms, color: Colors.white) // 微光扫过
    .tint(color: Colors.red)                      // 着色
    .saturate(begin: 0.0, end: 1.0);              // 饱和度
```

全部内置 Effect（4.5.2）：

| Effect | 作用 |
| --- | --- |
| `FadeEffect`（`fade`/`fadeIn`/`fadeOut`） | 透明度 |
| `ScaleEffect`（`scale`） | 缩放 |
| `SlideEffect`（`slide`） | 位移（Offset） |
| `MoveEffect`（`move`） | 位移（像素 dx/dy） |
| `RotateEffect`（`rotate`） | 旋转（弧度） |
| `BlurEffect`（`blur`） | 高斯模糊 |
| `ShimmerEffect`（`shimmer`） | 高光扫过 |
| `ColorEffect`（`color`） | 颜色过渡 |
| `SaturateEffect`（`saturate`） | 饱和度 |
| `TintEffect`（`tint`） | 着色叠加 |
| `CustomEffect`（`custom`） | 自定义（builder 拿 0~1 value） |
| `ShaderEffect`（`shader`） | GLSL 着色器 |
| `SwapEffect`（`swap`） | 在指定时刻整体替换子 Widget |
| `ToggleEffect`（`toggle`） | 在指定时刻切换布尔 |
| `CallbackEffect`（`callback`） | 在指定时刻触发回调 |
| `ListenEffect`（`listen`） | 持续回调当前 value |
| `ThenEffect`（`then`） | 顺序而非并行（默认并行） |

通用扩展方法（作用于 `Animate`）：
- `.delay(200.ms)`：延迟开始
- `.duration(300.ms)`：设置其后 Effect 时长
- `.curve(Curves.ease)`：设置其后 Effect 曲线
- `.interval(400.ms)`：列表项错峰（配合 `AnimateList`）
- `.then()`：让后续 Effect 在前一个结束后开始（顺序）
- `.addEffect(Effect)`：手动添加
- 回调：`onInit` / `onPlay` / `onComplete`（均拿到 `AnimationController`）

```dart
Text('Pulsing')
    .animate(onPlay: (c) => c.repeat(reverse: true))
    .fadeOut(curve: Curves.easeInOut);

Text('Hello')
    .animate()
    .fadeIn()
    .callback(duration: 300.ms, callback: (_) => print('halfway'))
    .listen(callback: (v) => print('value=$v'));
```

---

## 20. flutter_animate 实战：列表入场 / 滚动驱动 / 自定义 Effect / Shader

### 列表交错入场（AnimateList）

```dart
ListView.builder(
  itemCount: items.length,
  itemBuilder: (ctx, i) => ListTile(title: Text(items[i]))
      .animate()
      .fadeIn(duration: 300.ms, delay: (i * 50).ms) // 每项依次延迟
      .slide(begin: const Offset(0, 0.2)),
);
```

### 滚动驱动（ScrollAdapter）

```dart
final _scroll = ScrollController();
// 滚动到 100px 后开始，距底部 200px 前结束
Text('Release notes')
    .animate(adapter: ScrollAdapter(_scroll, begin: 100, end: -200))
    .fadeIn()
    .slide(begin: const Offset(0, 0.1));
```

其它 Adapter：`ValueAdapter`、`ValueNotifierAdapter`、`ChangeNotifierAdapter`。

### 自定义 Effect（CustomEffect）

```dart
Text('Rainbow')
    .animate()
    .custom(duration: 600.ms, builder: (ctx, value, child) => Container(
      color: Color.lerp(Colors.red, Colors.blue, value),
      padding: const EdgeInsets.all(8),
      child: child,
    ));
```

### ShaderEffect（GLSL 片元着色器）

```dart
final myShader = FragmentShader(...); // 由 flutter_shaders 加载
Widget().animate().shader(duration: 2.seconds, shader: myShader).fadeIn();
```

> 一个 `Animate` 内部只有一个 `AnimationController`；Effect 默认**并行叠加**，需要顺序时用 `.then()` 或 `.swap()` 重置链。

---

## 21. animated_text_kit 文字动画

`animated_text_kit` 4.x 用 `AnimatedTextKit` + `animatedTexts` 列表；`TextLiquidFill` 为独立 Widget。

```dart
import 'package:animated_text_kit/animated_text_kit.dart';

AnimatedTextKit(
  repeatForever: true,
  pause: const Duration(milliseconds: 500),
  displayFullTextOnTap: true,
  onTap: () => print('tap'),
  animatedTexts: [
    TypewriterAnimatedText('打字的文字效果',
        textStyle: const TextStyle(fontSize: 28), speed: const Duration(milliseconds: 80)),
    RotateAnimatedText('旋转', alignment: Alignment.centerLeft),
    FadeAnimatedText('淡入', textStyle: const TextStyle(fontSize: 32)),
    WavyAnimatedText('波浪摇晃的文字', textStyle: const TextStyle(fontSize: 28)),
    ScaleAnimatedText('缩放出现', textStyle: const TextStyle(fontSize: 40)),
    ColorizeAnimatedText('彩色流光',
        textStyle: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold),
        colors: [Colors.purple, Colors.blue, Colors.yellow, Colors.red]), // 至少 2 色
  ],
)
```

独立文字特效：

```dart
// 液态填充文字（独立 Widget，非 animatedTexts 成员）
SizedBox(
  width: 300,
  child: TextLiquidFill(
    text: 'LIQUID',
    waveColor: Colors.blueAccent,
    boxBackgroundColor: Colors.redAccent,
    textStyle: const TextStyle(fontSize: 70, fontWeight: FontWeight.bold),
    boxHeight: 200,
    loadUntil: 0.9,
    duration: const Duration(seconds: 4),
  ),
)
```

`AnimatedTextKit` 常用属性：`isRepeatingAnimation`、`totalRepeatCount`、`repeatForever`、`pause`、`speed`/`duration`、`displayFullTextOnTap`、`stopPauseOnTap`、`alignment`、`textAlign`、`onTap`、`onFinished`、`onNext`/`onNextBeforePause`。

---

## 22. 文字滚动：marquee 与 text_scroll

```dart
import 'package:marquee/marquee.dart';

Marquee(
  text: '这是一段很长的、会无限横向滚动的文字，用于展示跑马灯效果。',
  velocity: 50.0,                 // 像素/秒
  blankSpace: 20.0,              // 两轮之间的空白
  pauseAfterRound: const Duration(seconds: 1), // 每轮结束停顿
  startPadding: 10.0,
  accelerationDuration: const Duration(seconds: 1),
  decelerationDuration: const Duration(seconds: 1),
  direction: Axis.horizontal,
  scrollAxis: Axis.horizontal,
  style: const TextStyle(fontSize: 18),
)
```

> `marquee` 适合「文字过长放不下」的场景；滚动应足够慢以保证可读，到末尾停顿片刻（参考 fluttergems 最佳实践）。`text_scroll` 用法类似，可作为替代。

---

## 23. shimmer 骨架屏微光

```dart
import 'package:shimmer/shimmer.dart';

Shimmer.fromColors(
  baseColor: Colors.grey[300]!,
  highlightColor: Colors.grey[100]!,
  period: const Duration(milliseconds: 1500),
  direction: ShimmerDirection.ltr, // 左→右
  loop: 0, // 0 表示无限
  child: Column(
    children: [
      Container(width: 200, height: 16, color: Colors.white),
      const SizedBox(height: 8),
      Container(width: 140, height: 16, color: Colors.white),
    ],
  ),
)
```

> `baseColor` 为暗底、`highlightColor` 为亮光；把实际占位骨架包进去即可。加载完成后用真实数据替换。

---

## 24. Lottie 矢量动画

```dart
import 'package:lottie/lottie.dart';

// 资源
Lottie.asset('assets/loading.json', repeat: true, animate: true);
// 网络
Lottie.network('https://example.com/a.json');
// 内存字节
Lottie.memory(Uint8List.fromList(bytes));

// 受控播放
class _LottieState extends State<MyLottie> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this);
  }
  @override
  Widget build(BuildContext context) => Lottie.asset(
    'assets/loading.json',
    controller: _ctrl,
    onLoaded: (comp) => _ctrl.duration = comp.duration,
    repeat: true,
  );
  void _play() => _ctrl.forward(from: 0);
}
```

`Lottie` 关键参数：`repeat`、`reverse`、`animate`、`frameRate`、`width`/`height`、`fit`、`controller`、`onLoaded`、`compound`、`alignment`、`delegate`（改色）。

---

## 25. Rive 交互式动画

```dart
import 'package:rive/rive.dart';

RiveAnimation.asset(
  'assets/vehicles.riv',
  animations: const ['idle'],        // 播放的动画名
  stateMachines: const ['State Machine 1'], // 状态机
  fit: BoxFit.contain,
  onInit: (artboard) {
    // 取出状态机控制器以触发输入
    final ctrl = StateMachineController.fromArtboard(artboard, 'State Machine 1');
    if (ctrl != null) {
      artboard.add(ctrl);
      final trigger = ctrl.findInput<bool>('trigger') as SMITrigger?;
      trigger?.fire(); // 触发状态切换
    }
  },
)
```

通过 `StateMachineController` 可读取/驱动 `SMIBool`/`SMINumber`/`SMITrigger` 输入，实现点击切换、进度联动等交互。也支持 `RiveAnimation.network(...)`。

---

## 26. flutter_staggered_animations 交错动画

让列表/网格逐项错峰入场：

```dart
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';

AnimationLimiter(
  child: ListView.builder(
    itemCount: items.length,
    itemBuilder: (ctx, i) => AnimationConfiguration.staggeredList(
      position: i,           // 第几项
      duration: const Duration(milliseconds: 400),
      child: SlideAnimation(
        verticalOffset: 50.0,
        child: FadeInAnimation(
          child: ListTile(title: Text(items[i])),
        ),
      ),
    ),
  ),
)
```

网格用 `AnimationConfiguration.staggeredGrid(position: i, columnCount: 2, ...)`；其它封装：`FadeInAnimation`、`ScaleAnimation`、`FlipAnimation`、`SlideAnimation`。

---

## 27. simple_animations 声明式动画

```dart
import 'package:simple_animations/simple_animations.dart';

// 1) Mixin 方式（最省心）
class _Box extends StatelessWidget with AnimationMixin {
  late final Animation<double> size;
  @override
  void initState() {
    size = Tween(begin: 0.0, end: 100.0).animate(controller)..addListener(() {});
    controller.play(); // 自动 play
    super.initState();
  }
  @override
  Widget build(BuildContext context) => Container(width: size.value, height: size.value, color: Colors.blue);
}

// 2) PlayAnimation（无状态）
PlayAnimation<double>(
  tween: Tween(begin: 0.0, end: 1.0),
  duration: const Duration(seconds: 2),
  curve: Curves.easeIn,
  builder: (ctx, child, value) => Opacity(opacity: value, child: child),
  child: const Text('渐显'),
);

// 3) LoopAnimation / MirrorAnimation
LoopAnimation<double>(
  tween: Tween(begin: 0.0, end: 1.0),
  builder: (_, __, v) => Opacity(opacity: v, child: const Icon(Icons.favorite)),
);

// 4) 多轨动画 MovieTween（替代旧 TimelineTween）
final tween = MovieTween()
  ..tween('width', Tween(begin: 0.0, end: 100.0), duration: const Duration(seconds: 1))
  ..tween('color', ColorTween(begin: Colors.red, end: Colors.blue),
      duration: const Duration(seconds: 1), delay: const Duration(milliseconds: 500));
PlayAnimationBuilder<Movie>(
  tween: tween,
  builder: (ctx, value, _) => Container(
    width: value.get('width'), color: value.get('color'), height: 50,
  ),
)
```

---

## 28. confetti 粒子庆祝

```dart
import 'package:confetti/confetti.dart';

class _Party extends StatefulWidget {
  @override
  State<_Party> createState() => _PartyState();
}
class _PartyState extends State<_Party> {
  final _c = ConfettiController(duration: const Duration(seconds: 1));
  @override
  void dispose() { _c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Stack(
    children: [
      Center(child: ElevatedButton(onPressed: _c.play, child: const Text('庆祝'))),
      ConfettiWidget(
        confettiController: _c,
        blastDirectionality: BlastDirectionality.explosive, // 爆炸式
        emissionFrequency: 0.05,
        numberOfParticles: 20,
        gravity: 0.2,
        colors: const [Colors.red, Colors.blue, Colors.green],
        shouldLoop: false,
      ),
    ],
  );
}
```

---

## 29. Material animations 运动规范

```dart
import 'package:animations/animations.dart';

// 1) OpenContainer：点击卡片展开成新页面（容器转场）
OpenContainer(
  transitionType: ContainerTransitionType.fade,
  closedBuilder: (ctx, open) => const ListTile(title: Text('点我展开')),
  openBuilder: (ctx, close) => Scaffold(appBar: AppBar(), body: const Center(child: Text('详情'))),
  closedElevation: 2,
);

// 2) SharedAxisTransition：共享轴切换（横/纵/缩放）
AnimatedSwitcher(
  duration: const Duration(milliseconds: 300),
  child: SharedAxisTransition(
    transitionType: SharedAxisTransitionType.horizontal,
    animation: _ctrl,
    secondaryAnimation: _ctrl,
    child: _page,
  ),
);

// 3) FadeThroughTransition / FadeScaleTransition（导航栏切换/对话框）
```

---

## 30. 综合实战：登录页入场动画

组合隐式动画 + flutter_animate + 交错，做出专业登录页：

```dart
class LoginPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const FlutterLogo(size: 80)
                .animate()
                .fadeIn(duration: 400.ms)
                .scale(begin: 0.6),
            const SizedBox(height: 24),
            const Text('欢迎回来', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold))
                .animate(delay: 200.ms)
                .fadeIn()
                .slide(begin: const Offset(0, 0.2)),
            const SizedBox(height: 24),
            TextField(decoration: const InputDecoration(labelText: '用户名'))
                .animate(delay: 350.ms).fadeIn().moveX(begin: -30),
            const SizedBox(height: 12),
            TextField(decoration: const InputDecoration(labelText: '密码'), obscureText: true)
                .animate(delay: 500.ms).fadeIn().moveX(begin: -30),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: () {}, child: const Text('登录'))
                .animate(delay: 650.ms)
                .fadeIn()
                .scale(begin: 0.9)
                .shake(delay: 800.ms), // 可加自定义抖动 Effect
          ],
        ),
      ),
    );
  }
}
```

> 各元素用 `delay` 形成入场节奏；复杂抖动可用 `CustomEffect` 实现。

---

## 31. 常见坑与排错清单

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 动画不播放 | 忘记 `controller.forward()` | 在 `initState` 或事件中调用 |
| 页面返回后泄漏/耗电 | 未 `dispose` Controller | `dispose()` 中释放 |
| `vsync` 报错 | 未加 `Single/MultiTickerProviderStateMixin` | 给 State 加对应 mixin |
| `AnimatedSwitcher` 不切换 | 子 Widget `key` 没变 | 用 `ValueKey` 区分 |
| `AnimatedPositioned` 报错 | 定位属性部分 `null` | 全部给具体值或全 `null` |
| `setState` 全树重建卡顿 | 动画驱动了过大子树 | 改用 `AnimatedBuilder` + `child` 缓存 |
| flutter_animate 多个 effect 互相抵消 | 默认并行叠加 | 用 `.then()` 顺序或 `.swap()` 重置 |
| animated_text_kit 旧 API 报错 | 4.x 改用 `AnimatedTextKit(animatedTexts:)` | 弃用 `*AnimatedTextKit` 旧构造 |
| `TextLiquidFill` 放进 `animatedTexts` 报错 | 它是独立 Widget | 单独使用 |
| Lottie 不动 | 没设 `controller` 又 `animate:false` | 见 `onLoaded` 设 duration 并 `forward` |
| 真机动画掉帧 | 缺少 `RepaintBoundary` | 包一层隔离重绘 |
| 后台仍在跑动画 | 未 `stop` | `dispose` 里 `controller.stop()`/`dispose()` |

---

## 32. 参考文档

- Flutter 官方动画教程（隐式/显式/Hero）：[https://docs.flutter.dev/ui/animations](https://docs.flutter.dev/ui/animations)
- Flutter 动画概览 codelab：[https://docs.flutter.dev/codelabs/animation](https://docs.flutter.dev/codelabs/animation)
- Flutter 官方「Animations」文档索引：[https://docs.flutter.dev/ui/animations/overview](https://docs.flutter.dev/ui/animations/overview)
- flutter_animate pub.dev：[https://pub.dev/packages/flutter_animate](https://pub.dev/packages/flutter_animate)
- flutter_animate GitHub 示例：[https://github.com/gskinnerTeam/flutter_animate](https://github.com/gskinnerTeam/flutter_animate)
- animated_text_kit pub.dev：[https://pub.dev/packages/animated_text_kit](https://pub.dev/packages/animated_text_kit)
- marquee pub.dev：[https://pub.dev/packages/marquee](https://pub.dev/packages/marquee)
- shimmer pub.dev：[https://pub.dev/packages/shimmer](https://pub.dev/packages/shimmer)
- lottie pub.dev：[https://pub.dev/packages/lottie](https://pub.dev/packages/lottie)
- rive pub.dev：[https://pub.dev/packages/rive](https://pub.dev/packages/rive)
- flutter_staggered_animations pub.dev：[https://pub.dev/packages/flutter_staggered_animations](https://pub.dev/packages/flutter_staggered_animations)
- simple_animations pub.dev：[https://pub.dev/packages/simple_animations](https://pub.dev/packages/simple_animations)
- confetti pub.dev：[https://pub.dev/packages/confetti](https://pub.dev/packages/confetti)
- animations（Material Motion）pub.dev：[https://pub.dev/packages/animations](https://pub.dev/packages/animations)
- Flutter Gems 文字动画专题：[https://fluttergems.dev/text-decoration-effect-animation/](https://fluttergems.dev/text-decoration-effect-animation/)
- Lottie 官方（Airbnb）：[https://airbnb.io/lottie/](https://airbnb.io/lottie/)
- Rive 官方文档：[https://rive.app/docs/flutter/](https://rive.app/docs/flutter/)
