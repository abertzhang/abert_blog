---
title: Flutter 手势系统与交互式动画学习文档
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-12.jpg
tags:[flutter,dart,gesture,gesturedetector,gesturerecognizer,arena,pointer,inkwell,dismissible,draggable,reorderable,sliding-up-panel,pull-to-refresh,card-swiper,smooth-page-indicator,swipe,scrollbar,animated-text-kit,marquee]
summary:Flutter 手势系统与交互式动画全解，覆盖原始指针事件（Listener/PointerEvent）、GestureDetector 全回调（点击/双击/长按/拖动/缩放）、手势竞技场与冲突解决、内置 GestureRecognizer 体系、RawGestureDetector 自定义识别器、InkWell 水波纹、Dismissible 滑动删除、Draggable/DragTarget 拖放、ReorderableListView 拖拽排序、命中测试与 AbsorbPointer/IgnorePointer、手势驱动动画与自定义绘制（签名板）、多点触控；第三方交互/文字动画库（sliding_up_panel、pull_to_refresh、card_swiper、smooth_page_indicator、flutter_swipe_detector、draggable_scrollbar、animated_text_kit、marquee、flutter_animate 手势联动），并附综合实战与常见坑，每节均含可直接运行的示例
keywords:[flutter,dart,gesture,gesturedetector,gesturerecognizer,arena,pointer,inkwell,dismissible,draggable,reorderable,sliding-up-panel,pull-to-refresh,card-swiper,smooth-page-indicator,swipe,scrollbar,animated-text-kit,marquee,interactive]
top:1
copyright:true
---

# Flutter 手势系统与交互式动画学习文档

> 基于 **Flutter 3.47.7（stable）** + **Dart 3.13.5**（2026-10 最新稳定版）。手势是 Flutter 交互的基石：底层是**指针事件（Pointer Event）**，中层是**手势识别器（GestureRecognizer）**，再经**手势竞技场（Gesture Arena）** 裁决出唯一胜者并回调到业务层。本文从指针层讲起，逐层覆盖 `GestureDetector`、`GestureRecognizer`、自定义识别器、拖拽/排序/删除等交互组件，再延伸到手势驱动动画与一组手势/文字类三方库，力求接口齐全、示例可直接运行。

## 目录

- [1. 手势体系总览：四层架构](#1-手势体系总览四层架构)
- [2. 原始指针事件：Listener 与 PointerEvent](#2-原始指针事件listener-与-pointerevent)
- [3. GestureDetector 全回调总览](#3-gesturedetector-全回调总览)
- [4. 点击手势：onTap / onDoubleTap / TapDown](#4-点击手势ontap--ondoubletap--tapdown)
- [5. 长按手势：LongPress 与拖动长按](#5-长按手势longpress-与拖动长按)
- [6. 拖动手势：Pan / HorizontalDrag / VerticalDrag](#6-拖动手势pan--horizontaldrag--verticaldrag)
- [7. 缩放手势：onScale（双指缩放与旋转）](#7-缩放手势onscale双指缩放与旋转)
- [8. 手势竞技场与冲突解决](#8-手势竞技场与冲突解决)
- [9. GestureRecognizer 内置识别器体系](#9-gesturerecognizer-内置识别器体系)
- [10. RawGestureDetector 与自定义手势识别器](#10-rawgesturedetector-与自定义手势识别器)
- [11. InkWell / InkResponse：Material 水波纹反馈](#11-inkwell--inkresponsematerial-水波纹反馈)
- [12. Dismissible：滑动删除](#12-dismissible滑动删除)
- [13. Draggable / DragTarget：拖拽与放置](#13-draggable--dragtarget拖拽与放置)
- [14. ReorderableListView：拖拽排序](#14-reorderablelistview拖拽排序)
- [15. 命中测试与 HitTestBehavior / AbsorbPointer / IgnorePointer](#15-命中测试与-hittestbehavior--absorbpointer--ignorepointer)
- [16. 手势驱动动画：拖拽联动 AnimationController](#16-手势驱动动画拖拽联动-animationcontroller)
- [17. 自定义绘制手势：签名板 / 画板](#17-自定义绘制手势签名板--画板)
- [18. 多点触控与并发手势](#18-多点触控与并发手势)
- [19. 第三方手势 / 交互库选型总览](#19-第三方手势--交互库选型总览)
- [20. sliding_up_panel：可拖拽底部抽屉](#20-sliding_up_panel可拖拽底部抽屉)
- [21. pull_to_refresh：下拉刷新 / 上拉加载](#21-pull_to_refresh下拉刷新--上拉加载)
- [22. card_swiper / flutter_swiper_view：卡片滑动切换](#22-card_swiper--flutter_swiper_view卡片滑动切换)
- [23. smooth_page_indicator：页面指示器](#23-smooth_page_indicator页面指示器)
- [24. flutter_swipe_detector：方向滑动检测](#24-flutter_swipe_detector方向滑动检测)
- [25. draggable_scrollbar：可拖拽滚动条](#25-draggable_scrollbar可拖拽滚动条)
- [26. 文字类三方动画：animated_text_kit 与 marquee](#26-文字类三方动画animated_text_kit-与-marquee)
- [27. flutter_animate 在手势回调中的联动](#27-flutter_animate-在手势回调中的联动)
- [28. 综合实战：可拖拽排序 + 滑动删除 + 下拉刷新的列表页](#28-综合实战可拖拽排序--滑动删除--下拉刷新的列表页)
- [29. 常见坑与排错清单](#29-常见坑与排错清单)
- [30. 参考文档](#30-参考文档)

---

## 1. 手势体系总览：四层架构

| 层 | 作用 | 代表类 |
| --- | --- | --- |
| 指针层 | 原始触摸数据（down/move/up/cancel） | `PointerDownEvent`、`Listener` |
| 手势识别层 | 把指针流解析成语义手势 | `GestureRecognizer`（各子类） |
| 竞技场层 | 多识别器冲突时裁决唯一胜者 | `GestureArenaManager` |
| 业务层 | 胜出手势触发你的回调 | `GestureDetector` 的 `onTap` 等 |

> 绝大多数场景直接用 `GestureDetector` 即可；需要自定义手势（画圆、手势密码）才用 `RawGestureDetector` + 自定义 `GestureRecognizer`。

---

## 2. 原始指针事件：Listener 与 PointerEvent

`Listener` 直接拿到最原始指针事件，不做任何手势语义判断。

```dart
Listener(
  onPointerDown: (PointerDownEvent e) {
    print('按下：位置=${e.position} 指针ID=${e.pointer} 设备=${e.kind}');
  },
  onPointerMove: (PointerMoveEvent e) {
    print('移动：delta=${e.delta} 压力=${e.pressure}');
  },
  onPointerUp: (PointerUpEvent e) => print('抬起'),
  onPointerCancel: (PointerCancelEvent e) => print('取消'),
  behavior: HitTestBehavior.opaque,
  child: const FlutterLogo(size: 100),
)
```

`PointerEvent` 关键字段：`pointer`（唯一指针 ID）、`kind`（`PointerDeviceKind.touch/mouse/stylus`）、`position`/`localPosition`、`delta`（仅 move）、`pressure`、`buttons`、`down`（是否按下中）。

`Listener` 的 `behavior` 见第 15 节。

---

## 3. GestureDetector 全回调总览

`GestureDetector` 是包裹式手势识别器，内部按你声明的回调自动创建对应 `GestureRecognizer` 并送入竞技场。

| 类别 | 回调（部分） | 触发时机 |
| --- | --- | --- |
| 点击 | `onTapDown` / `onTapUp` / `onTap` / `onTapCancel` | 按下 / 抬起 / 完整点击 / 点击取消 |
| 双击 | `onDoubleTap` / `onDoubleTapDown` | 快速两次点击 |
| 长按 | `onLongPress` / `onLongPressStart` / `onLongPressMoveUpdate` / `onLongPressEnd` / `onLongPressUp` | 长按及拖动 |
| 水平拖 | `onHorizontalDragStart/Update/End/Down` | 横向拖动 |
| 垂直拖 | `onVerticalDragStart/Update/End/Down` | 纵向拖动 |
| 任意拖 | `onPanStart/Update/End/Down` | 任意方向拖动（与方向拖互斥） |
| 缩放 | `onScaleStart/Update/End` | 单/双指缩放旋转 |
| 力按 | `onForcePressStart/Update/End/Peak` | 3D Touch（仅支持设备） |

```dart
GestureDetector(
  behavior: HitTestBehavior.opaque,           // 命中行为
  dragStartBehavior: DragStartBehavior.start, // start=按下去即刻跟手；down=系统判定后
  excludeFromSemantics: false,
  onTapDown: (d) => print('down: ${d.localPosition}'),
  onTapUp: (d) => print('up: ${d.localPosition}'),
  onTap: () => print('tap'),
  onTapCancel: () => print('cancel'),
  onDoubleTap: () => print('double tap'),
  child: const Card(child: Text('点我')),
)
```

> `onPan*` 与 `onHorizontalDrag*`/`onVerticalDrag*` **不要同时设置**，否则行为冲突。

---

## 4. 点击手势：onTap / onDoubleTap / TapDown

回调参数 `GestureTapDownDetails` 含 `globalPosition` / `localPosition` / `kind` / `buttons`；`GestureTapUpDetails` 含 `globalPosition` / `localPosition`。

```dart
GestureDetector(
  onTapDown: (d) => print('按下坐标: ${d.localPosition}'),
  onTap: () {
    // 业务逻辑：导航、提交、状态切换
  },
  onTapCancel: () => print('按下后未形成点击（被滑动抢走）'),
  onDoubleTap: () => print('双击'),
  onDoubleTapDown: (d) => print('双击第二下按下'),
  child: Container(width: 120, height: 60, color: Colors.blue, child: const Center(child: Text('按钮'))),
)
```

---

## 5. 长按手势：LongPress 与拖动长按

```dart
GestureDetector(
  onLongPress: () => print('长按触发（~500ms）'),
  onLongPressStart: (d) => print('长按开始: ${d.globalPosition}'),
  onLongPressMoveUpdate: (d) => print('长按拖动: ${d.localPosition}'),
  onLongPressEnd: (d) => print('长按结束: ${d.velocity}'),
  onLongPressUp: () => print('长按抬起（未移动）'),
  child: const Icon(Icons.touch_app, size: 48),
)
```

> 长按拖动（如朋友圈拖动手势）用 `onLongPressStart/MoveUpdate/End` 这套组合最顺手。

---

## 6. 拖动手势：Pan / HorizontalDrag / VerticalDrag

`*DragStartDetails`：`globalPosition` / `localPosition` / `sourceTimeStamp`。
`*DragUpdateDetails`：`delta`（相对上一次位移）、`globalPosition`、`localPosition`、`primaryDelta`（主轴位移）、`sourceTimeStamp`。
`*DragEndDetails`：`velocity`（`Velocity`）、`primaryVelocity`。

```dart
// 任意方向拖动
Offset _pos = Offset.zero;
GestureDetector(
  onPanStart: (d) => print('拖拽开始 ${d.localPosition}'),
  onPanUpdate: (d) {
    _pos += d.delta; // 跟随手指
    // setState(() => ...);
  },
  onPanEnd: (d) => print('拖拽结束 速度=${d.velocity.pixelsPerSecond}'),
  child: Transform.translate(offset: _pos, child: const FlutterLogo(size: 80)),
);

// 仅水平拖（垂直拖会自动让给纵向滚动）
GestureDetector(
  onHorizontalDragUpdate: (d) => print('水平位移 ${d.primaryDelta}'),
  child: const Card(child: Text('横滑卡片')),
);
```

> 与 `ListView` 共存时优先用 `onHorizontalDrag*`（纵向留给列表滚动）；用 `onPan*` 会吞掉滚动。

---

## 7. 缩放手势：onScale（双指缩放与旋转）

```dart
double _scale = 1.0;
double _rotation = 0.0;
GestureDetector(
  onScaleStart: (d) => print('缩放开始 触点=${d.pointerCount}'),
  onScaleUpdate: (d) {
    _scale = d.scale;       // 相对初始的缩放倍率
    _rotation = d.rotation; // 旋转弧度
    // setState(() {});
  },
  onScaleEnd: (d) => print('缩放结束 速度=${d.velocity}'),
  child: Transform(
    alignment: Alignment.center,
    transform: Matrix4.identity()
      ..scale(_scale)
      ..rotateZ(_rotation),
    child: const FlutterLogo(size: 120),
  ),
)
```

`GestureScaleUpdateDetails`：`scale`、`rotation`、`focalPoint` / `localFocalPoint`、`horizontalScale` / `verticalScale`、`pointerCount`。

---

## 8. 手势竞技场与冲突解决

当多个 `GestureRecognizer` 同时命中同一区域（如 `onTap` 与 `onHorizontalDrag` 同时存在），它们进入**手势竞技场**：每个候选者观察后续指针事件，**先达到自身识别条件者获胜**，其余被淘汰。`onTapCancel` 正是「tap 识别器输给 drag」时的回调。

解决冲突的常用手段：

```dart
// 1) 用 behavior 控制命中范围
GestureDetector(behavior: HitTestBehavior.translucent, onTap: () {});

// 2) 父子手势竞争：子用 RawGestureDetector 并提高优先级（自定义识别器可接受/拒绝）
// 3) 滚动 vs 拖拽：优先用方向拖，纵向留给 Scrollable
// 4) 嵌套手势：用 GestureDetector + Listener 组合，必要时 AbsorbPointer 拦截
```

原理要点：竞技场**不保证先到先得**，而是「谁先识别成功谁赢」。比如竖直 `ListView` 与横向 `onHorizontalDrag` 共存时，纵向滚动先被 `ListView` 认领，横向拖便不会误触发。

---

## 9. GestureRecognizer 内置识别器体系

| 识别器 | 对应手势 |
| --- | --- |
| `TapGestureRecognizer` | 点击 |
| `DoubleTapGestureRecognizer` | 双击 |
| `LongPressGestureRecognizer` | 长按 |
| `PanGestureRecognizer` | 任意方向拖动 |
| `HorizontalDragGestureRecognizer` | 水平拖动 |
| `VerticalDragGestureRecognizer` | 垂直拖动 |
| `ScaleGestureRecognizer` | 缩放/旋转 |
| `ForcePressGestureRecognizer` | 力按（特定设备） |
| `MultiDragGestureRecognizer` / `ImmediateMultiDragGestureRecognizer` / `DelayedMultiDragGestureRecognizer` | 多点独立拖拽 |
| `SecondaryPointerDeviceGestureRecognizer` | 鼠标右键 |
| `OneSequenceGestureRecognizer` | 自定义单序列识别器基类 |

手动使用识别器（需 `dispose`）：

```dart
final _tap = TapGestureRecognizer()..onTap = () => print('tap');
// 在 RawGestureDetector 或手动 addPointer；用完务必 _tap.dispose();
```

---

## 10. RawGestureDetector 与自定义手势识别器

`GestureDetector` 只能识别内置手势。要识别「画圆/画 Z」等自定义手势，用 `RawGestureDetector` 注册自己的 `GestureRecognizer`：

```dart
class CircleGestureRecognizer extends OneSequenceGestureRecognizer {
  Offset? _start;
  final Function(double radius)? onCircle;

  @override
  void addPointer(PointerDownEvent event) {
    _start = event.localPosition;
    startTrackingPointer(event.pointer, event.transform); // 认领该指针
    resolve(GestureDisposition.accept); // 声明参与竞技场
  }

  @override
  void handleEvent(PointerEvent event) {
    if (event is PointerMoveEvent && _start != null) {
      final r = (event.localPosition - _start!).distance;
      onCircle?.call(r);
    }
    if (event is PointerUpEvent) {
      stopTrackingPointer(event.pointer); // 释放
    }
  }

  @override
  String get debugDescription => 'circle';
}

RawGestureDetector(
  gestures: {
    CircleGestureRecognizer:
        GestureRecognizerFactoryWithHandlers<CircleGestureRecognizer>(
      () => CircleGestureRecognizer(),
      (CircleGestureRecognizer instance) {
        instance.onCircle = (r) => print('半径=$r');
      },
    ),
  },
  child: const SizedBox(width: 200, height: 200, child: Center(child: Text('画圆'))),
)
```

> 自定义识别器必须管理指针生命周期（`startTrackingPointer` / `stopTrackingPointer`）与竞技场裁决（`resolve`）。签名、手势密码等场景才需要，业务优先级低时优先用现成组件。

---

## 11. InkWell / InkResponse：Material 水波纹反馈

`InkWell` 在 Material 上提供点击水波纹，比裸 `GestureDetector` 更适合按钮/列表项。

```dart
InkWell(
  onTap: () {},
  onLongPress: () {},
  splashColor: Colors.teal.withOpacity(0.3),
  highlightColor: Colors.teal.withOpacity(0.1),
  borderRadius: BorderRadius.circular(8),
  customBorder: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(8))),
  splashFactory: InkRipple.splashFactory, // 或 InkSplash.splashFactory
  child: const Padding(padding: EdgeInsets.all(12), child: Text('水波纹按钮')),
)
```

> 必须放在 `Material` 祖先内（如 `Scaffold`/`Card`）才显示水波纹；`InkResponse` 更底层，可定制更多状态。

---

## 12. Dismissible：滑动删除

```dart
Dismissible(
  key: Key(item.id),                       // 必须唯一 key
  direction: DismissDirection.endToStart,  // 右滑/左滑方向
  dismissThresholds: const {DismissDirection.endToStart: 0.4}, // 删除阈值
  confirmDismiss: (dir) async {
    return await showDialog<bool>(context: context, builder: (_) =>
      AlertDialog(title: const Text('确认删除？'), actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('取消')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('删除')),
      ]));
  },
  onDismissed: (dir) => setState(() => items.removeWhere((e) => e.id == item.id)),
  background: Container(color: Colors.red, child: const Align(alignment: Alignment.centerLeft, child: Icon(Icons.delete, color: Colors.white))),
  secondaryBackground: Container(color: Colors.green, child: const Icon(Icons.archive)),
  child: ListTile(title: Text(item.title)),
)
```

`Dismissible` 关键属性：`key`、`direction`、`background`/`secondaryBackground`、`confirmDismiss`、`onDismissed`、`dismissThresholds`、`movementDuration`、`resizeDuration`、`onResize`。

---

## 13. Draggable / DragTarget：拖拽与放置

```dart
// 可拖拽源
Draggable<int>(
  data: 42,
  feedback: const Material(child: Icon(Icons.cake, size: 48)), // 拖动时跟随的影子
  childWhenDragging: const Opacity(opacity: 0.3, child: Icon(Icons.cake)),
  onDragStarted: () => print('开始拖'),
  onDragEnd: (d) => print('结束 ${d.offset}'),
  onDraggableCanceled: (v, o) => print('取消'),
  child: const Icon(Icons.cake, size: 40),
);

// 放置目标
DragTarget<int>(
  builder: (ctx, candidate, rejected) => Container(
    width: 120, height: 120,
    color: candidate.isNotEmpty ? Colors.green : Colors.grey,
    child: const Center(child: Text('拖到这里')),
  ),
  onWillAccept: (data) => data == 42,  // 是否可接收
  onAccept: (data) => print('收到 $data'),
  onAcceptWithDetails: (details) => print('details=${details.data}'),
  onLeave: (_) => print('离开'),
)
```

> `LongPressDraggable` 是「长按后再拖」版本；`affinity` 可限制拖拽轴，`maxSimultaneousDrags` 控制多指。

---

## 14. ReorderableListView：拖拽排序

```dart
ReorderableListView(
  onReorder: (oldIndex, newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex -= 1;
      final item = items.removeAt(oldIndex);
      items.insert(newIndex, item);
    });
  },
  onReorderStart: (i) => print('开始排序 $i'),
  onReorderEnd: (i) => print('结束 $i'),
  proxyDecorator: (child, index, animation) => Material(
    elevation: 6, child: child), // 拖动浮层样式
  children: [
    for (final it in items)
      ListTile(key: Key(it.id), title: Text(it.title),
        trailing: const Icon(Icons.drag_handle)),
  ],
)
```

> 3.0 起默认 `buildDefaultDragHandles: true`（自动加拖拽手柄）；`scrollController` 可在长列表滚动时联动。

---

## 15. 命中测试与 HitTestBehavior / AbsorbPointer / IgnorePointer

`HitTestBehavior` 决定 `Listener`/`GestureDetector` 的命中范围：

| 值 | 语义 |
| --- | --- |
| `deferToChild` | 仅子可命中时自身才命中（默认） |
| `opaque` | 自身一定命中，阻止下层接收 |
| `translucent` | 自身命中，且事件继续向下冒泡（透传） |

```dart
// 拦截所有指针（子不可点）
AbsorbPointer(absorbing: true, child: const ButtonBar(children: [ElevatedButton(onPressed: null, child: Text('禁用'))]));

// 自身不接收指针但子可接收（用于「点击穿透」覆盖层）
IgnorePointer(ignoring: true, child: const Opacity(opacity: 0.5, child: Text('不可点')));
```

---

## 16. 手势驱动动画：拖拽联动 AnimationController

将手势位移映射到 `AnimationController` 的 value，实现「跟手进度」：

```dart
late final AnimationController _ctrl = AnimationController(vsync: this)
  ..addListener(() => setState(() {}));

// 用 drag 的 primaryDelta 更新进度
GestureDetector(
  onVerticalDragUpdate: (d) {
    _ctrl.value -= d.primaryDelta! / 300; // 向上滑 value 增大
    _ctrl.value = _ctrl.value.clamp(0.0, 1.0);
  },
  onVerticalDragEnd: (d) {
    // 根据速度决定归位还是完成
    if (_ctrl.value > 0.5 || d.velocity.pixelsPerSecond.dy < -200) {
      _ctrl.forward();
    } else {
      _ctrl.reverse();
    }
  },
  child: Container(height: 300, color: Colors.blue.withOpacity(_ctrl.value)),
)
```

> 这种「手势给进度、动画给插值」的模式是自定义抽屉/刷新/视差的基础。

---

## 17. 自定义绘制手势：签名板 / 画板

结合 `GestureDetector` + `CustomPainter` 记录笔迹：

```dart
class _BoardState extends State<Board> {
  final _points = <Offset>[];
  @override
  Widget build(BuildContext context) => GestureDetector(
    onPanStart: (d) => setState(() => _points.add(d.localPosition)),
    onPanUpdate: (d) => setState(() => _points.add(d.localPosition)),
    onPanEnd: (_) => setState(() => _points.add(Offset.infinite)), // 断笔
    child: CustomPaint(
      painter: _StrokePainter(_points),
      size: const Size(300, 300),
    ),
  );
}

class _StrokePainter extends CustomPainter {
  final List<Offset> points;
  _StrokePainter(this.points);
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.black..strokeWidth = 3..strokeCap = StrokeCap.round;
    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] == Offset.infinite || points[i + 1] == Offset.infinite) continue;
      canvas.drawLine(points[i], points[i + 1], paint);
    }
  }
  @override
  bool shouldRepaint(covariant _StrokePainter old) => old.points != points;
}
```

---

## 18. 多点触控与并发手势

用 `ImmediateMultiDragGestureRecognizer` 或自管理多指针实现多指独立拖拽；`GestureScaleUpdateDetails.pointerCount` 可判断双指/多指。复杂场景建议直接基于 `Listener` 的 `event.pointer` 维护 `Map<int, Offset>`。

```dart
final Map<int, Offset> _active = {};
Listener(
  onPointerDown: (e) => _active[e.pointer] = e.localPosition,
  onPointerMove: (e) => _active[e.pointer] = e.localPosition, // 每指独立记录
  onPointerUp: (e) => _active.remove(e.pointer),
  child: const SizedBox.expand(),
)
```

---

## 19. 第三方手势 / 交互库选型总览

| 库 | 版本（2026-10） | 用途 |
| --- | --- | --- |
| `sliding_up_panel` | ^2.0.0+1 | 可拖拽底部抽屉 |
| `pull_to_refresh` | ^2.0.0 | 下拉刷新 / 上拉加载 |
| `card_swiper` | ^3.0.1 | 卡片滑动切换（手势翻页） |
| `smooth_page_indicator` | ^3.0.0 | PageView 动画指示器 |
| `flutter_swipe_detector` | ^1.1.0 | 方向滑动检测 |
| `draggable_scrollbar` | ^0.1.0 | 可拖拽滚动条 |
| `animated_text_kit` | ^4.3.0 | 文字动画（打字机/波浪等） |
| `marquee` | ^4.0.0 | 文字无限滚动 |
| `flutter_animate` | ^4.5.2 | 链式动效（手势联动） |

---

## 20. sliding_up_panel：可拖拽底部抽屉

```dart
import 'package:sliding_up_panel/sliding_up_panel.dart';

final _pc = PanelController();
Scaffold(
  body: SlidingUpPanel(
    controller: _pc,
    minHeight: 80,                 // 收起高度
    maxHeight: MediaQuery.of(context).size.height * 0.8,
    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
    backdropEnabled: true,          // 展开时背景变暗，点击关闭
    isDraggable: true,
    onPanelSlide: (v) => print('进度 $v'), // 0~1
    onPanelOpened: () => print('打开'),
    onPanelClosed: () => print('关闭'),
    panel: const Center(child: Text('上滑面板内容')),
    collapsed: const Center(child: Text('上滑查看详情')),
    body: const Center(child: Text('底层页面')),
  ),
);
// _pc.open(); _pc.close(); _pc.hide(); _pc.show();
```

关键属性：`panel`/`body`/`collapsed`/`minHeight`/`maxHeight`/`borderRadius`/`backdropEnabled`/`isDraggable`/`slideDirection`/`defaultPanelState`/`renderPanelSheet`/`parallaxEnabled`/`snapPoint`；`PanelController` 控制开合。

---

## 21. pull_to_refresh：下拉刷新 / 上拉加载

```dart
import 'package:pull_to_refresh/pull_to_refresh.dart';

final _rc = RefreshController();
SmartRefresher(
  controller: _rc,
  enablePullDown: true,
  enablePullUp: true,
  header: const WaterDropHeader(),
  footer: const ClassicFooter(),
  onRefresh: () async {
    await Future.delayed(const Duration(seconds: 1));
    _rc.refreshCompleted();
    // _rc.refreshFailed(); // 失败
  },
  onLoading: () async {
    await Future.delayed(const Duration(seconds: 1));
    _rc.loadComplete();          // 或 loadFailed() / loadNoData()
  },
  child: ListView.builder(
    itemCount: list.length,
    itemBuilder: (_, i) => ListTile(title: Text(list[i])),
  ),
)
```

> 下拉刷新用 `refreshCompleted()`/`refreshFailed()`；上拉加载用 `loadComplete()`/`loadFailed()`/`loadNoData()`。

---

## 22. card_swiper / flutter_swiper_view：卡片滑动切换

```dart
import 'package:card_swiper/card_swiper.dart';

Swiper(
  itemCount: banners.length,
  itemBuilder: (ctx, i) => Image.network(banners[i], fit: BoxFit.cover),
  autoplay: true,
  autoplayDelay: 3000,
  duration: 500,
  pagination: const SwiperPagination(),   // 小圆点
  control: const SwiperControl(),         // 左右箭头
  scrollDirection: Axis.horizontal,
  onIndexChanged: (i) => print('当前 $i'),
  scale: 0.9,                            // 卡片缩放（堆叠效果）
  viewportFraction: 0.85,
)
```

> `card_swiper` 提供 `Swiper` + `SwiperPagination` + `SwiperControl`；`flutter_swiper_view` 是等价维护版（API 一致）。`indicatorLayout` 可选 `color`/`scale`/`worm` 等。

---

## 23. smooth_page_indicator：页面指示器

```dart
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

final _page = PageController(viewportFraction: 0.85, keepPage: true);
Column(
  children: [
    SizedBox(height: 220, child: PageView.builder(
      controller: _page,
      itemCount: pages.length,
      itemBuilder: (_, i) => pages[i],
    )),
    SmoothPageIndicator(
      controller: _page,
      count: pages.length,
      effect: const WormEffect(dotHeight: 10, dotWidth: 10, activeDotColor: Colors.teal),
      // 其它效果：JumpingDotEffect / ScrollingDotsEffect / ScaleEffect /
      //           SwapEffect / ExpandingDotsEffect / CustomizableEffect / SlideEffect
      onDotClicked: (i) => _page.animateToPage(i, duration: const Duration(milliseconds: 300), curve: Curves.ease),
    ),
  ],
)
```

---

## 24. flutter_swipe_detector：方向滑动检测

```dart
import 'package:flutter_swipe_detector/flutter_swipe_detector.dart';

SwipeDetector(
  onSwipe: (direction, details) {
    if (direction == SwipeDirection.left) print('左滑');
    if (direction == SwipeDirection.right) print('右滑');
    if (direction == SwipeDirection.up) print('上滑');
    if (direction == SwipeDirection.down) print('下滑');
  },
  threshold: const SwipeThreshold(distance: 50, velocity: 200), // 触发阈值
  child: const SizedBox(width: 200, height: 200, child: Center(child: Text('任意滑动'))),
)
```

> 比手写 `GestureDetector` 的 drag 更省心，直接拿到语义化方向（含轻扫/thresholds）。

---

## 25. draggable_scrollbar：可拖拽滚动条

```dart
import 'package:draggable_scrollbar/draggable_scrollbar.dart';

final _scroll = ScrollController();
DraggableScrollbar.semicircle(
  controller: _scroll,
  child: ListView.builder(
    controller: _scroll,
    itemCount: 1000,
    itemBuilder: (_, i) => ListTile(title: Text('Item $i')),
  ),
)
// 其它形状：DraggableScrollbar.rrect / .arrows(带标签) / 自定义 DraggableScrollbar(scrollThumbBuilder: ...)
```

---

## 26. 文字类三方动画：animated_text_kit 与 marquee

（文字类动画在「动画」专题已详述，这里给出手势场景最常用的两种。）

```dart
import 'package:animated_text_kit/animated_text_kit.dart';

AnimatedTextKit(
  animatedTexts: [
    TypewriterAnimatedText('正在加载...', textStyle: const TextStyle(fontSize: 24)),
    ColorizeAnimatedText('完成', colors: [Colors.red, Colors.blue, Colors.green]),
  ],
  isRepeatingAnimation: false,
)

import 'package:marquee/marquee.dart';
Marquee(text: '这是一条会滚动的通知栏文字', velocity: 50, blankSpace: 20,
  pauseAfterRound: const Duration(seconds: 1))
```

> 打字机/彩色流光用 `animated_text_kit`；超长标题跑马灯用 `marquee`。完整文字动画清单见 `flutter00_animate.md`。

---

## 27. flutter_animate 在手势回调中的联动

用手势触发 `flutter_animate` 的动效（无需手写 Controller）：

```dart
import 'package:flutter_animate/flutter_animate.dart';

// 点击放大+回弹
GestureDetector(
  onTap: () => print('tap'),
  child: const Icon(Icons.star, size: 48).animate()
      .fadeIn().scale(begin: 0.6).then().shake(),
);

// 拖拽时实时联动（手动控制器）
final _c = AnimationController(vsync: this);
GestureDetector(
  onVerticalDragUpdate: (d) => _c.value = (_c.value - d.primaryDelta! / 200).clamp(0.0, 1.0),
  child: Container(height: 200, color: Colors.amber)
      .animate(adapter: ValueAdapter(_c)) // 用外部值驱动
      .fadeIn().slide(),
);
```

> `flutter_animate` 的 `adapter` 可接受 `ValueAdapter`/`ScrollAdapter`，把手势产生的 `AnimationController` 直接作为动画进度源，实现「手势即动画」。

---

## 28. 综合实战：可拖拽排序 + 滑动删除 + 下拉刷新的列表页

```dart
class TodosPage extends StatefulWidget {
  @override
  State<TodosPage> createState() => _TodosPageState();
}
class _TodosPageState extends State<TodosPage> with SingleTickerProviderStateMixin {
  final _rc = RefreshController();
  var items = List.generate(6, (i) => '任务 ${i + 1}');

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('任务清单')),
    body: SmartRefresher(
      controller: _rc,
      enablePullDown: true,
      header: const WaterDropHeader(),
      onRefresh: () async {
        await Future.delayed(const Duration(seconds: 1));
        setState(() => items.insert(0, '新任务 ${items.length + 1}'));
        _rc.refreshCompleted();
      },
      child: ReorderableListView(
        onReorder: (oldI, newI) => setState(() {
          if (newI > oldI) newI--;
          final t = items.removeAt(oldI); items.insert(newI, t);
        }),
        children: [
          for (final it in items)
            Dismissible(
              key: Key(it),
              direction: DismissDirection.endToStart,
              background: Container(color: Colors.red, alignment: Alignment.centerLeft,
                padding: const EdgeInsets.only(left: 16), child: const Icon(Icons.delete, color: Colors.white)),
              onDismissed: (_) => setState(() => items.remove(it)),
              child: ListTile(key: Key(it), title: Text(it),
                trailing: const Icon(Icons.drag_handle)),
            ),
        ],
      ),
    ),
  );
}
```

> 该页同时用到 `ReorderableListView`（拖拽排序）、`Dismissible`（滑动删除）、`pull_to_refresh`（下拉刷新），覆盖了三类最核心的手势交互。

---

## 29. 常见坑与排错清单

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| `onTap` 不触发 | 父级 `AbsorbPointer`/`IgnorePointer` 或 `behavior` 不对 | 调整命中行为 / 移除拦截 |
| 列表里 `onPan` 吞掉滚动 | Pan 与滚动争抢 | 改用 `onHorizontalDrag*`（纵向留给滚动） |
| `onTapCancel` 频繁触发 | 按下后被 drag 识别器赢走 | 属正常，或放宽 drag 阈值 |
| `Dismissible` 不消失 | 没给唯一 `key` | 每项用 `Key(item.id)` |
| 自定义识别器不工作 | 没 `startTrackingPointer` / `resolve` | 按第 10 节实现生命周期 |
| 水波纹不显示 | `InkWell` 不在 `Material` 内 | 包进 `Material`/`Card`/`Scaffold` |
| 缩放跳动 | 用 `scale` 而非相对增量 | 以 `onScaleStart` 的基准值做差 |
| 滑动删除与排序冲突 | `Dismissible` 与 `Reorderable` 手势重叠 | 用 `buildDefaultDragHandles` + 限定 `direction` |
| 下拉刷新卡在 loading | 忘了 `refreshCompleted()` | 在异步后调用完成/失败 |
| 多指误触 | 未隔离 pointer | 用 `event.pointer` 区分或 `MaxSimultaneousDrag` |

---

## 30. 参考文档

- Flutter 官方手势文档（点击/拖动/缩放）：[https://docs.flutter.dev/ui/interactivity/gestures](https://docs.flutter.dev/ui/interactivity/gestures)
- Flutter 手势中文文档：[https://docs.flutter.cn/ui/interactivity/gestures](https://docs.flutter.cn/ui/interactivity/gestures)
- Flutter Gestures API 参考：[https://api.flutter.dev/flutter/gestures/gestures-library.html](https://api.flutter.dev/flutter/gestures/gestures-library.html)
- GestureDetector 类文档：[https://api.flutter.dev/flutter/widgets/GestureDetector-class.html](https://api.flutter.dev/flutter/widgets/GestureDetector-class.html)
- RawGestureDetector 类文档：[https://api.flutter.dev/flutter/widgets/RawGestureDetector-class.html](https://api.flutter.dev/flutter/widgets/RawGestureDetector-class.html)
- Dismissible 类文档：[https://api.flutter.dev/flutter/widgets/Dismissible-class.html](https://api.flutter.dev/flutter/widgets/Dismissible-class.html)
- Draggable 类文档：[https://api.flutter.dev/flutter/widgets/Draggable-class.html](https://api.flutter.dev/flutter/widgets/Draggable-class.html)
- ReorderableListView 类文档：[https://api.flutter.dev/flutter/material/ReorderableListView-class.html](https://api.flutter.dev/flutter/material/ReorderableListView-class.html)
- sliding_up_panel pub.dev：[https://pub.dev/packages/sliding_up_panel](https://pub.dev/packages/sliding_up_panel)
- pull_to_refresh pub.dev：[https://pub.dev/packages/pull_to_refresh](https://pub.dev/packages/pull_to_refresh)
- card_swiper pub.dev：[https://pub.dev/packages/card_swiper](https://pub.dev/packages/card_swiper)
- smooth_page_indicator pub.dev：[https://pub.dev/packages/smooth_page_indicator](https://pub.dev/packages/smooth_page_indicator)
- flutter_swipe_detector pub.dev：[https://pub.dev/packages/flutter_swipe_detector](https://pub.dev/packages/flutter_swipe_detector)
- draggable_scrollbar pub.dev：[https://pub.dev/packages/draggable_scrollbar](https://pub.dev/packages/draggable_scrollbar)
- animated_text_kit pub.dev：[https://pub.dev/packages/animated_text_kit](https://pub.dev/packages/animated_text_kit)
- marquee pub.dev：[https://pub.dev/packages/marquee](https://pub.dev/packages/marquee)
- flutter_animate pub.dev：[https://pub.dev/packages/flutter_animate](https://pub.dev/packages/flutter_animate)
- Flutter Gems 手势/手势检测专题：[https://fluttergems.dev/gesture-detection/](https://fluttergems.dev/gesture-detection/)
