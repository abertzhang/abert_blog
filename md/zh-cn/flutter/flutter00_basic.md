---
title: Flutter 基础与 Dart 语法学习文档
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-17.jpg
tags:[flutter,dart,basic,syntax,function,widget,widget-tree,state,navigation,beginner]
summary:Flutter 基础学习文档，前半部分系统讲解 Dart 语言（变量、类型、运算符、流程控制、函数、类与 OOP、泛型、空安全、异步、集合、库），后半部分讲解 Flutter 核心概念与常用 Widget、布局、导航、状态管理入门，每节均含可直接运行的示例
keywords:[flutter,dart,basic,syntax,function,class,async,widget,navigation,state]
top:1
copyright:true
---

# Flutter 基础与 Dart 语法学习文档

> 本文档基于 **Flutter 3.47.7（stable）** + **Dart 3.13.5**（2026-10 最新稳定版）。Dart 3.x 已全面启用**空安全（Null Safety）**，所有示例默认以空安全语法编写。文档从 Dart 语言基础讲起，再过渡到 Flutter 框架核心概念，适合从零入门的开发者。

## 目录

- [1. 环境准备与版本](#1-环境准备与版本)
- [2. Dart 程序结构与 main()](#2-dart-程序结构与-main)
- [3. 变量与声明（var / final / const / late）](#3-变量与声明)
- [4. 基础数据类型](#4-基础数据类型)
- [5. 字符串与模板插值](#5-字符串与模板插值)
- [6. 集合类型（List / Set / Map）](#6-集合类型)
- [7. 运算符与空安全操作符](#7-运算符与空安全操作符)
- [8. 流程控制](#8-流程控制)
- [9. 函数（基础到高阶）](#9-函数基础到高阶)
- [10. 类与对象](#10-类与对象)
- [11. 继承、mixin、抽象类、extension](#11-继承mixin抽象类extension)
- [12. 泛型](#12-泛型)
- [13. 空安全深入](#13-空安全深入)
- [14. 异步编程（Future / async / Stream）](#14-异步编程)
- [15. 异常与错误处理](#15-异常与错误处理)
- [16. 库与导入](#16-库与导入)
- [17. 注解与元数据](#17-注解与元数据)
- [18. Isolate 并发基础](#18-isolate-并发基础)
- [19. Flutter 核心概念](#19-flutter-核心概念)
- [20. StatelessWidget 与 StatefulWidget](#20-statelesswidget-与-statefulwidget)
- [21. 基础布局 Widget](#21-基础布局-widget)
- [22. 常用 Material 组件](#22-常用-material-组件)
- [23. 列表与滚动组件](#23-列表与滚动组件)
- [24. 手势与交互](#24-手势与交互)
- [25. 路由与导航](#25-路由与导航)
- [26. 状态管理入门](#26-状态管理入门)
- [27. 主题与样式](#27-主题与样式)
- [28. pubspec.yaml 与资源管理](#28-pubspecyaml-与资源管理)
- [29. 调试与热重载](#29-调试与热重载)
- [30. 常见坑与最佳实践](#30-常见坑与最佳实践)
- [31. 参考文档](#31-参考文档)

---

## 1. 环境准备与版本

```bash
# 检查 Flutter 与 Dart 版本
flutter --version
# Flutter 3.47.7 • Dart 3.13.5 • DevTools 2.47.x

# 创建新项目
flutter create my_app
cd my_app
flutter run
```

> Flutter 3.47 起 **Impeller 成为桌面端默认渲染引擎**（macOS/Windows/Linux），Material 与 Cupertino 变为可独立在 pub.dev 发布的包（`material_ui` / `cupertino_ui`），iOS 最低支持版本提升到 15，macOS 提升到 12。

---

## 2. Dart 程序结构与 main()

Dart 程序从顶层 `main()` 函数开始执行。每个应用必须有且仅有一个 `main` 入口。

```dart
// 最简程序
void main() {
  print('Hello, Flutter');
}

// 带命令行参数的 main
void main(List<String> args) {
  print('参数个数: ${args.length}');
}
```

> `print()` 向控制台输出并自动换行；生产代码中更推荐 `dart:developer` 的 `log()` 或日志库，避免泄露敏感信息。

---

## 3. 变量与声明

Dart 提供四种变量声明关键字，空安全下需注意可空性。

```dart
var name = 'Flutter';      // 类型推断为 String，可变
final version = '3.47';    // 运行时常量，只能赋值一次
const pi = 3.14159;        // 编译时常量
late String token;         // 延迟初始化（在首次访问前必须赋值）

name = 'Dart';             // ✅ var 可重新赋值
// version = '4.0';        // ❌ final 不可重新赋值

// 显式声明类型
int count = 0;
String? nullableName;      // 可空类型，允许为 null
```

| 关键字 | 含义 | 可重新赋值 | 初始化时机 |
|--------|------|-----------|------------|
| `var` | 类型推断、可变 | ✅ | 声明时 |
| `final` | 单次赋值 | ❌ | 运行时 |
| `const` | 编译期常量 | ❌ | 编译期 |
| `late` | 延迟初始化 | 视声明类型 | 首次访问前 |

---

## 4. 基础数据类型

Dart 是**强类型、静态类型**语言，所有类型都是 `Object` 的子类。

```dart
// 数值
int a = 10;
double b = 3.14;
num c = 42;          // int 或 double 的父类型
c = 3.14;            // ✅ 可赋 double

// 布尔
bool isActive = true;
bool? isLoggedIn;    // 可空 bool，初始为 null

// 字符串
String s = 'Dart';

// Null 类型（空安全下需显式用 ? 表示可空）
int? maybeNull;
print(maybeNull);    // null

// dynamic 与 Object
dynamic x = 'text';
x = 100;             // ✅ 绕过静态检查，运行时决定
Object y = 'text';   // 只能调用 Object 上的成员
```

> 尽量避免 `dynamic`：它会关闭类型检查，且无法被编译器的 tree-shaking 优化，还可能触发运行时 `NoSuchMethodError`。

---

## 5. 字符串与模板插值

```dart
String name = 'Flutter';
int year = 2026;

// 单引号/双引号等价，推荐单引号
String s1 = 'Hello $name';
String s2 = 'Year: $year';
String s3 = 'Length: ${name.length}';   // 表达式需加 ${}

// 多行字符串
String multi = '''
第一行
第二行
''';

// 原始字符串（不转义）
String raw = r'C:\path\to\file';

// 常用方法
print(name.toUpperCase());        // FLUTTER
print('flutter'.capitalize());    // Flutter（3.13 新增 String 扩展）
print('a,b,c'.split(','));        // [a, b, c]
print('  trim  '.trim());         // trim
print(name.contains('ut'));       // true
```

---

## 6. 集合类型

Dart 提供三种核心集合：`List`、`Set`、`Map`，均支持泛型与丰富的操作符。

```dart
// List
List<int> nums = [1, 2, 3];
nums.add(4);
nums[0] = 10;
final first = nums.first;
final last = nums.last;
final sub = nums.sublist(1, 3);          // [2, 3]
final mapped = nums.map((e) => e * 2);   // (2,4,6,8) 惰性
final filtered = nums.where((e) => e > 2).toList();
final sum = nums.reduce((a, b) => a + b);

// Set（去重）
Set<String> tags = {'dart', 'flutter', 'dart'};  // {'dart', 'flutter'}

// Map
Map<String, int> scores = {'tom': 90, 'jane': 85};
scores['kai'] = 88;
final tom = scores['tom'];             // 90
final keys = scores.keys;
final entries = scores.entries;

// 集合的扩展操作符（空安全友好）
final merged = [...nums, ...[5, 6]];   // 展开
```

> `List`/`Set`/`Map` 从 Dart 2.3 起支持 **collection-if / collection-for / spread**，非常适合在 UI 中按条件拼装子组件。

---

## 7. 运算符与空安全操作符

```dart
int a = 10, b = 3;
print(a + b);     // 13
print(a ~/ b);    // 3（整除）
print(a % b);     // 1（取余）
print(a == b);    // false

// 级联操作符 ..：对同一对象连续调用
final buffer = StringBuffer()
  ..write('Hello')
  ..write(' ')
  ..write('World');

// 空安全三件套
String? name;
print(name?.length);     // null（若为 null 则不调用）
print(name ?? 'default');// 'default'（若为 null 取默认值）
String sure = name!;     // 断言非空，若 null 抛异常

// 空赋值
name ??= 'Flutter';      // 仅当 name 为 null 时赋值

// 条件成员访问
user?.profile?.email;
```

> `!` 是"我保证非空"的强制断言，**只在 100% 确定非 null 时使用**，否则会抛出 `NullThrownError`/`TypeError`。

---

## 8. 流程控制

```dart
// if / else
int score = 85;
if (score >= 90) {
  print('A');
} else if (score >= 60) {
  print('pass');
} else {
  print('fail');
}

// switch（Dart 3 起支持模式匹配与守卫）
String grade = 'A';
switch (grade) {
  case 'A':
    print('excellent');
  case 'B' || 'C':
    print('good');
  default:
    print('other');
}

// 模式匹配解构
var (x, y) = ('left', 'right');
switch (pair) {
  case (int a, int b) when a > b:
    print('a 更大');
}

// 循环
for (int i = 0; i < 3; i++) print(i);
for (final e in [1, 2, 3]) print(e);
[1, 2, 3].forEach(print);
while (count > 0) { count--; }
do { retry(); } while (failed);
```

> Dart 3 的 `switch` 支持 **模式匹配（patterns）**，可用 `when` 守卫、`var`/`List` 解构，替代繁琐的 `if-else` 链。

---

## 9. 函数（基础到高阶）

函数是 Dart 的一等公民，可赋值给变量、作为参数传递、作为返回值。

```dart
// 基础函数
int add(int a, int b) {
  return a + b;
}

// 箭头函数（单行表达式）
int mul(int a, int b) => a * b;

// 必填位置参数
String greet(String name) => 'Hello $name';

// 可选位置参数（用 [] 包裹，可设默认值）
String join(String a, String b, [String sep = '-']) => '$a$sep$b';

// 命名参数（用 {} 包裹，默认可空；required 标记必填）
void config({required String host, int port = 8080}) {
  print('$host:$port');
}
config(host: 'localhost', port: 3000);

// 匿名函数 / Lambda
final square = (int n) => n * n;
nums.map((e) => e * e);

// 高阶函数：接收函数作为参数
void operate(int a, int b, int Function(int, int) fn) {
  print(fn(a, b));
}
operate(2, 3, add);

// 闭包：捕获外部变量
Function counter() {
  int n = 0;
  return () => ++n;
}
final c = counter();
c(); // 1

// typedef 给函数类型起别名
typedef IntOp = int Function(int, int);
IntOp op = add;

// 可选类型为 void / never
void log(String msg) => print(msg);
Never fail(String msg) => throw Exception(msg);
```

> Future 中常用 `async*` 生成器返回 `Stream`，`sync*` 返回 `Iterable`；用 `yield` 产出元素。

---

## 10. 类与对象

```dart
class Point {
  final int x;
  final int y;

  // 普通构造函数（初始化列表）
  Point(this.x, this.y);

  // 命名构造函数
  Point.origin() : x = 0, y = 0;

  // 重定向构造函数
  Point.alongX(int x) : this(x, 0);

  // 工厂构造函数
  factory Point.fromJson(Map<String, int> json) {
    return Point(json['x']!, json['y']!);
  }

  // getter / setter
  int get sum => x + y;
  set doubleX(int v) => x * 2;

  // 方法
  Point operator +(Point other) => Point(x + other.x, y + other.y);

  @override
  String toString() => 'Point($x, $y)';
}

// 使用
final p = Point(1, 2);
print(p.sum);                 // 3
print(Point.origin());        // Point(0,0)
print(p + Point(3, 4));       // Point(4,6)
```

> 构造函数常用 `this.x` 语法糖直接绑定参数；不可变对象优先用 `final` + 常量构造函数 `const Point(...)` 提升性能。

---

## 11. 继承、mixin、抽象类、extension

```dart
// 抽象类
abstract class Animal {
  void speak();               // 抽象方法，无实现
  void breathe() => print('breathing');
}

class Dog extends Animal {
  @override
  void speak() => print('汪汪');
}

// mixin：复用一组实现，不要求继承关系
mixin Flyable {
  void fly() => print('flying');
}
mixin Swimmable {
  void swim() => print('swimming');
}
class Duck extends Animal with Flyable, Swimmable {
  @override
  void speak() => print('嘎嘎');
}

// 接口实现（Dart 用 implements 实现隐式接口）
class JsonSerializable {
  Map<String, dynamic> toJson() => {};
}
class User implements JsonSerializable {
  @override
  Map<String, dynamic> toJson() => {'name': 'tom'};
}

// extension 扩展已有类型（无需继承）
extension on int {
  int get double => this * 2;
}
print(5.double);              // 10
```

> `mixin` 是 Dart 实现多重"能力复用"的方式，优于深继承；3.x 起支持 `mixin class` 兼具类与 mixin 特性。

---

## 12. 泛型

```dart
// 泛型类
class Box<T> {
  final T value;
  Box(this.value);
  T get() => value;
}
final intBox = Box<int>(42);

// 泛型方法
T first<T>(List<T> list) => list.first;

// 泛型约束（where）
T maxOf<T extends Comparable<T>>(T a, T b) =>
    a.compareTo(b) > 0 ? a : b;

// 常用泛型集合
List<String> names = ['a', 'b'];
Map<int, List<String>> matrix = {};
```

> 泛型让集合与工具类保持类型安全，避免 `List<dynamic>` 引发运行时错误。

---

## 13. 空安全深入

```dart
// 可空类型用 ? 声明
String? maybeName;

// late 变量：声明时不为 null，但延迟到首次访问才初始化
late final String config;
void init() => config = loadConfig();

// 类型提升：在 null 检查后自动提升为非空
String describe(String? name) {
  if (name == null) return 'unknown';
  return 'Hi ${name.toUpperCase()}';  // 此处 name 已提升为 String
}

// ?? 与 ?. 组合
final len = maybeName?.length ?? 0;

// 断言非空
String force(String? s) => s!;        // 仅确定非空时用

// 可空集合
List<int>? nullableList;
final safe = nullableList ?? [];      // 避免 null 解引用
```

> 空安全下，**未初始化的非空变量无法通过编译**。优先用 `?.`/`??` 链式兜底，少用 `!`。

---

## 14. 异步编程

Dart 是单线程 + 事件循环模型，`Future`/`Stream` 基于 `dart:async`。

```dart
// Future：表示将来某时刻的单个结果
Future<String> fetchData() async {
  await Future.delayed(Duration(seconds: 1));
  return 'data';
}

void main() async {
  final result = await fetchData();   // 等待完成
  print(result);
}

// then 链式（非阻塞）
fetchData()
    .then((v) => print(v))
    .catchError((e) => print(e))
    .whenComplete(() => print('done'));

// Future 工具
await Future.wait([task1(), task2()]);        // 并发等待全部
await Future.any([task1(), task2()]);         // 取最快完成
final v = await Future.value(42);

// Stream：多个异步事件的序列
Stream<int> countStream(int n) async* {
  for (int i = 0; i < n; i++) {
    yield i;
  }
}
await for (final v in countStream(3)) {
  print(v);                                  // 0 1 2
}

// StreamController 手动发射
final ctrl = StreamController<int>();
ctrl.stream.listen(print);
ctrl.add(1);
await ctrl.close();
```

> UI 中耗时操作务必 `async/await`，否则阻塞 UI 线程造成掉帧；`async*`/`yield` 可生成 `Stream`。

---

## 15. 异常与错误处理

```dart
// 抛出与捕获
try {
  final f = int.parse('abc');     // 抛 FormatException
} on FormatException catch (e) {
  print('格式错误: $e');
} catch (e, st) {
  print('其他错误: $e\n$st');
} finally {
  print('清理资源');
}

// 重新抛出
void process() {
  try {
    risky();
  } catch (e) {
    logError(e);
    rethrow;                       // 保留原堆栈后向上抛
  }
}

// 自定义异常
class AuthException implements Exception {
  final String message;
  AuthException(this.message);
  @override
  String toString() => 'AuthException: $message';
}
```

> Dart 中**任何对象都能被 `throw`**（不限于 `Exception`），但生产代码应抛 `Exception`/`Error` 子类以便捕获。

---

## 16. 库与导入

```dart
// 导入核心/第三方库
import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

// 起别名避免冲突
import 'package:flutter/material.dart' as m;

// 只导入/隐藏部分
import 'package:collection/collection.dart' show GroupBy;
import 'package:meta/meta.dart' hide protected;

// 导出组合库
export 'src/model.dart';
export 'src/api.dart' show UserApi;

// 部分文件（part / part of，谨慎使用）
part 'user.g.dart';       // 通常由 json_serializable 生成
```

> `dart:*` 是 SDK 内置库；`package:*` 来自 pub 依赖。项目内文件用相对路径或 `package:` 形式导入。

---

## 17. 注解与元数据

```dart
// 内置注解
@deprecated
void oldApi() {}

@override
void build(BuildContext context) {}

// 自定义注解（本质是 const 构造函数）
class Route {
  final String path;
  const Route(this.path);
}
@Route('/home')
class HomePage {}

// 常用来自 package:meta
@protected
void internal() {}

@visibleForTesting
void testOnly() {}
```

---

## 18. Isolate 并发基础

Dart 默认单线程，CPU 密集任务需 `Isolate`（独立内存、独立事件循环）。

```dart
import 'dart:isolate';
import 'dart:async';

// 通过 ReceivePort 通信
void worker(SendPort sendPort) {
  sendPort.send('来自 isolate 的消息');
}

void main() async {
  final receive = ReceivePort();
  await Isolate.spawn(worker, receive.sendPort);
  final msg = await receive.first;
  print(msg);
  receive.close();
}

// Flutter 推荐 compute() 简化
import 'package:flutter/foundation.dart';
int heavyTask(int n) => List.generate(n, (i) => i).fold(0, (a, b) => a + b);
final result = await compute(heavyTask, 1000000);
```

> UI 线程不能做重计算，否则掉帧；用 `compute()`（基于 Isolate）把耗时任务搬到后台线程。

---

## 19. Flutter 核心概念

Flutter 采用**声明式 UI**：你描述"界面应该是什么样"，框架负责在状态变化时重建 Widget 树。

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Demo',
      home: Scaffold(
        appBar: AppBar(title: const Text('首页')),
        body: const Center(child: Text('Hello Flutter')),
      ),
    );
  }
}
```

> 核心铁律：**Widget 是不可变的（immutable）**，UI 更新通过重建新的 Widget 实例实现，而非修改旧实例。`build()` 应当"纯函数"——相同输入返回相同输出，不在此触发副作用。

---

## 20. StatelessWidget 与 StatefulWidget

```dart
// 无状态：UI 不随内部状态变化
class Greeting extends StatelessWidget {
  final String name;
  const Greeting(this.name, {super.key});

  @override
  Widget build(BuildContext context) => Text('Hi $name');
}

// 有状态：随 State 变化重建
class Counter extends StatefulWidget {
  const Counter({super.key});

  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int count = 0;

  void _increment() {
    setState(() {            // 通知框架重建
      count++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('count: $count'),
        ElevatedButton(onPressed: _increment, child: const Text('+1')),
      ],
    );
  }
}
```

> `setState()` 是 Flutter 状态更新的核心：只有调用它，框架才会对比新旧 Widget 树并刷新受影响的节点。

---

## 21. 基础布局 Widget

```dart
// Container：带装饰/边距/尺寸的单子容器
Container(
  width: 100,
  height: 100,
  padding: const EdgeInsets.all(8),
  margin: const EdgeInsets.symmetric(vertical: 4),
  decoration: BoxDecoration(
    color: Colors.blue,
    borderRadius: BorderRadius.circular(8),
  ),
  child: const Text('box'),
)

// Row / Column：主轴方向排列
Row(
  mainAxisAlignment: MainAxisAlignment.spaceBetween,
  crossAxisAlignment: CrossAxisAlignment.center,
  children: [Icon(Icons.star), Text('标题'), Spacer()],
)

// Expanded：按比例占据剩余空间
Row(children: [
  Expanded(flex: 2, child: Container(color: Colors.red)),
  Expanded(flex: 1, child: Container(color: Colors.blue)),
])

// Stack：层叠定位
Stack(
  children: [
    Container(width: 200, height: 200, color: Colors.grey),
    const Positioned(top: 10, left: 10, child: Text('角标')),
  ],
)

// Padding / Align / Center
Padding(padding: const EdgeInsets.all(16), child: Text('padded'))
Align(alignment: Alignment.bottomRight, child: Icon(Icons.add))
const Center(child: CircularProgressIndicator())
```

> 布局遵循"自上而下约束传递、自下而上尺寸上报"的协议。父组件对子组件施加约束，子组件在约束内决定自身大小。

---

## 22. 常用 Material 组件

```dart
Scaffold(                          // 标准页面骨架
  appBar: AppBar(title: const Text('标题')),
  body: const Body(),
  floatingActionButton: FloatingActionButton(
    onPressed: () {}, child: const Icon(Icons.add),
  ),
  drawer: const Drawer(child: Text('侧边栏')),
  bottomNavigationBar: BottomNavigationBar(items: const [
    BottomNavigationBarItem(icon: Icon(Icons.home), label: '首页'),
    BottomNavigationBarItem(icon: Icon(Icons.person), label: '我的'),
  ]),
)

// 文本、图片、图标
const Text('Hello', style: TextStyle(fontSize: 18, color: Colors.black87))
Image.network('https://example.com/a.png', width: 80, height: 80)
const Icon(Icons.favorite, color: Colors.red)

// 按钮家族
ElevatedButton(onPressed: () {}, child: const Text('凸起按钮'))
OutlinedButton(onPressed: () {}, child: const Text('描边按钮'))
TextButton(onPressed: () {}, child: const Text('文字按钮'))
IconButton(onPressed: () {}, icon: const Icon(Icons.delete))

// 输入框
TextField(
  decoration: const InputDecoration(
    labelText: '用户名',
    border: OutlineInputBorder(),
    prefixIcon: Icon(Icons.person),
  ),
  onChanged: (v) => print(v),
)

// 卡片
Card(
  elevation: 4,
  child: const ListTile(title: Text('卡片标题'), subtitle: Text('副标题')),
)
```

---

## 23. 列表与滚动组件

```dart
// 定长列表
ListView(
  children: const [
    ListTile(leading: Icon(Icons.star), title: Text('项目一')),
    ListTile(title: Text('项目二')),
  ],
)

// 动态列表（推荐 Builder 懒加载，性能更好）
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ListTile(
    title: Text(items[index]),
  ),
)

// 分隔线列表
ListView.separated(
  itemCount: items.length,
  separatorBuilder: (_, __) => const Divider(),
  itemBuilder: (_, i) => Text(items[i]),
)

// 网格
GridView.count(
  crossAxisCount: 2,
  children: List.generate(6, (i) => Container(
    color: Colors.primaries[i % Colors.primaries.length],
  )),
)

// 下拉刷新 + 上拉加载
RefreshIndicator(
  onRefresh: () async => loadMore(),
  child: ListView.builder(itemBuilder: (_, i) => Text('$i')),
)
```

---

## 24. 手势与交互

```dart
// GestureDetector：监听任意手势
GestureDetector(
  onTap: () => print('点击'),
  onDoubleTap: () => print('双击'),
  onLongPress: () => print('长按'),
  onPanUpdate: (d) => print(d.delta),
  child: Container(width: 100, height: 100, color: Colors.orange),
)

// InkWell：带 Material 水波纹反馈
InkWell(
  onTap: () {},
  child: const Padding(
    padding: EdgeInsets.all(12),
    child: Text('可点击文字'),
  ),
)
```

> 需要"可见点击反馈"时优先 `InkWell`/`ElevatedButton`；仅需捕获手势事件时用 `GestureDetector`。

---

## 25. 路由与导航

```dart
// 普通跳转（压栈）
Navigator.push(
  context,
  MaterialPageRoute(builder: (_) => const DetailPage()),
);

// 返回
Navigator.pop(context);

// 带返回值
final result = await Navigator.push<String>(
  context,
  MaterialPageRoute(builder: (_) => const PickPage()),
);
print(result);

// 替换当前页（登录后跳转主页常用）
Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomePage()));

// 清空栈跳到根
Navigator.pushAndRemoveUntil(
  context,
  MaterialPageRoute(builder: (_) => const HomePage()),
  (route) => false,
);

// 命名路由（在 MaterialApp 注册）
MaterialApp(
  routes: {
    '/': (_) => const HomePage(),
    '/detail': (_) => const DetailPage(),
  },
  onGenerateRoute: (settings) {
    if (settings.name == '/detail') {
      final id = (settings.arguments as Map)['id'];
      return MaterialPageRoute(builder: (_) => DetailPage(id: id));
    }
    return null;
  },
);
Navigator.pushNamed(context, '/detail', arguments: {'id': 1});
```

---

## 26. 状态管理入门

```dart
// 方式一：setState（组件内局部状态，见 §20）

// 方式二：ValueNotifier + ValueBuilder（轻量跨组件）
final counter = ValueNotifier<int>(0);

ValueListenableBuilder<int>(
  valueListenable: counter,
  builder: (_, value, __) => Text('$value'),
);

// 某处修改
counter.value++;

// 方式三：InheritedWidget（跨层级共享，Provider 底层原理）
class CounterProvider extends InheritedWidget {
  final int count;
  const CounterProvider({required this.count, required super.child});

  static CounterProvider? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<CounterProvider>();

  @override
  bool updateShouldNotify(covariant CounterProvider old) => old.count != count;
}

// 方式四：Provider（官方推荐，需 pub 依赖）
// 见 §28 在 pubspec.yaml 添加 provider 后：
// ChangeNotifierProvider(create: (_) => CartModel(), child: App())
```

> 状态管理选型：**局部状态**用 `setState`；**跨组件共享**用 `ValueNotifier` 或 `Provider`；大型应用可进阶 `Riverpod`/`Bloc`。切忌所有状态都塞进顶层。

---

## 27. 主题与样式

```dart
MaterialApp(
  theme: ThemeData(
    useMaterial3: true,
    primarySwatch: Colors.blue,
    colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
    textTheme: const TextTheme(
      titleLarge: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
    ),
    appBarTheme: const AppBarTheme(backgroundColor: Colors.blue),
  ),
  darkTheme: ThemeData.dark(),
  themeMode: ThemeMode.system,
  home: const HomePage(),
)

// 在组件中读取主题
@override
Widget build(BuildContext context) {
  final theme = Theme.of(context);
  return Text('标题', style: theme.textTheme.titleLarge);
}

// 常用颜色与样式
Colors.red
Colors.blue.shade300
const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, letterSpacing: 0.5)
```

---

## 28. pubspec.yaml 与资源管理

```yaml
# pubspec.yaml 关键字段
name: my_app
description: A Flutter demo.
publish_to: 'none'          # 私有项目
version: 1.0.0+1            # 版本号+构建号

environment:
  sdk: ^3.13.5             # 对应 Dart 3.13
  flutter: ">=3.47.0"

dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.0         # 状态管理
  http: ^1.2.0             # 网络请求
  cupertino_icons: ^1.0.8

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
  assets:                  # 静态资源
    - assets/images/
    - assets/icons/logo.png
  fonts:                   # 自定义字体
    - family: MyFont
      fonts:
        - asset: assets/fonts/MyFont-Regular.ttf
```

```bash
# 安装依赖
flutter pub get
```

> 修改 `pubspec.yaml` 后必须 `flutter pub get`；资源路径需以仓库根为基准，目录末尾加 `/` 表示包含整个目录。

---

## 29. 调试与热重载

```bash
flutter run                 # 启动并开启热重载/热重启
# 在终端按 r = 热重载（Hot Reload，保留状态）
# 按 R = 热重启（Hot Restart，重置状态）
flutter analyze             # 静态分析，提交前必跑
flutter test                # 运行单元测试
flutter doctor              # 检查环境完整性
```

```dart
// 调试输出
import 'dart:developer';
log('调试信息: $value', name: 'MyApp');

// 断言（仅在 debug 模式生效）
assert(count >= 0, 'count 不能为负');
```

> 热重载基于 Widget 树增量更新，几乎瞬时；但若改动涉及全局变量初始化、枚举、`main()`，则需要热重启才能生效。

---

## 30. 常见坑与最佳实践

1. **`const` 与 `final` 混用**：能 `const` 的（编译期常量）尽量 `const`，减少运行时重建、提升性能；只在运行时才知道值才用 `final`。
2. **滥用 `dynamic`**：关闭类型检查，易触发运行时错误，优先用具体类型或泛型。
3. **`!` 非空断言滥用**：仅在确认非空处使用，否则抛异常；优先 `?.`/`??` 兜底。
4. **`setState` 在 `build` 中调用**：会导致无限重建，副作用应放在 `initState`/`didChangeDependencies`/`async` 回调里。
5. **在 `build` 里创建 Controller**：每次重建都新建对象，应在 `initState` 创建、`dispose` 释放（如 `TextEditingController`、`AnimationController`、`ScrollController`）。
6. **长列表用 `ListView` 而非 `Column`**：`Column` 一次性渲染所有子项，数据多会卡顿甚至溢出；动态数据用 `ListView.builder`。
7. **`Expanded`/`Flexible` 必须处于 `Row`/`Column`/`Flex` 内**：否则抛约束异常。
8. **忘记 `flutter pub get`**：改动 `pubspec.yaml` 后不拉依赖会导致编译失败。
9. **网络请求不处理异常**：未 `try/catch` 或 `.catchError`，弱网下崩溃；务必兜底。
10. **`context` 跨 `async` 使用**：`await` 后 `context` 可能已失效，使用 `mounted` 判断（仅在 `State` 中可用）。
11. **颜色硬编码**：应通过 `Theme`/`ColorScheme` 取色，便于统一换肤与适配暗色模式。
12. **重计算阻塞 UI**：耗时任务用 `compute()`/`Isolate`，避免掉帧。

---

## 31. 参考文档

- [Flutter 官方文档（中文）](https://docs.flutter.cn/)
- [Flutter 官方文档（英文）](https://docs.flutter.dev/)
- [Dart 语言官方文档](https://dart.dev/guides/language/language-tour)
- [Dart 3 新特性概览](https://dart.dev/guides/language/evolution)
- [Flutter 3.47 发布说明](https://flutter.dev/docs/development/tools/sdk/release-notes/release-notes-3.47.0)
- [Flutter SDK 版本归档](https://docs.flutter.cn/install/archive)
- [Flutter Widget 目录](https://docs.flutter.dev/ui/widgets)
- [Material 组件库](https://docs.flutter.dev/ui/material)
- [Cupertino（iOS 风格）组件库](https://docs.flutter.dev/ui/ios)
- [StatelessWidget 类参考](https://api.flutter.dev/flutter/widgets/StatelessWidget-class.html)
- [StatefulWidget 类参考](https://api.flutter.dev/flutter/widgets/StatefulWidget-class.html)
- [setState 方法说明](https://api.flutter.dev/flutter/widgets/State/setState.html)
- [布局与约束机制](https://docs.flutter.dev/ui/layout/constraints)
- [Row / Column 布局](https://docs.flutter.dev/ui/layout/row-columns)
- [Container 类参考](https://api.flutter.dev/flutter/widgets/Container-class.html)
- [ListView 类参考](https://api.flutter.dev/flutter/widgets/ListView-class.html)
- [GridView 类参考](https://api.flutter.dev/flutter/widgets/GridView-class.html)
- [Navigator 类参考](https://api.flutter.dev/flutter/widgets/Navigator-class.html)
- [MaterialPageRoute 类参考](https://api.flutter.dev/flutter/material/MaterialPageRoute-class.html)
- [Scaffold 类参考](https://api.flutter.dev/flutter/material/Scaffold-class.html)
- [TextField 类参考](https://api.flutter.dev/flutter/material/TextField-class.html)
- [GestureDetector 类参考](https://api.flutter.dev/flutter/widgets/GestureDetector-class.html)
- [ValueNotifier 类参考](https://api.flutter.dev/flutter/foundation/ValueNotifier-class.html)
- [InheritedWidget 类参考](https://api.flutter.dev/flutter/widgets/InheritedWidget-class.html)
- [Provider 包（pub.dev）](https://pub.dev/packages/provider)
- [ThemeData 类参考](https://api.flutter.dev/flutter/material/ThemeData-class.html)
- [pubspec.yaml 配置说明](https://docs.flutter.dev/packages-and-plugins/using-packages)
- [Dart 空安全向导](https://dart.dev/null-safety)
- [Dart 异步编程（Futures/async-await）](https://dart.dev/codelabs/async-await)
- [Dart Stream 文档](https://dart.dev/tutorials/language/streams)
- [Dart Isolate 与并发](https://dart.dev/language/concurrency)
- [Flutter 调试与热重载](https://docs.flutter.dev/tools/hot-reload)
- [Flutter 性能优化最佳实践](https://docs.flutter.dev/perf/best-practices)
- [Dart 编码风格指南（linter）](https://dart.dev/guides/language/effective-dart)
- [Flutter 中文社区](https://flutter.cn/)
