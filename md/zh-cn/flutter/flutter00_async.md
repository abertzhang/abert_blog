---
title: Flutter 异步编程学习文档（Future / Stream / Isolate / async-await）
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-23.jpg
tags:[flutter,dart,async,future,stream,isolate,await,spawn,concurrency,event-loop]
summary:Flutter 异步编程全解，覆盖 Dart 事件循环模型、Future（创建/链式/工具方法/Completer）、Stream（控制器/订阅/操作符/广播/转换/聚合）、async/await、Isolate（spawn/spawnUri/run/exit/IsolateNameServer/TransferableTypedData）、compute、Timer、Zone、Flutter 的 FutureBuilder/StreamBuilder/帧回调，以及 package:async 工具库，每节均含可直接运行的示例
keywords:[flutter,dart,async,future,stream,isolate,await,spawn,concurrency,event-loop,completer]
top:1
copyright:true
---

# Flutter 异步编程学习文档

> 基于 **Flutter 3.47.7（stable）** + **Dart 3.13.5**（2026-10 最新稳定版）。Dart 的异步模型建立在**单线程 + 事件循环（Event Loop）**之上，所有异步能力由 `dart:async` 库（`Future`/`Stream`/`Completer`/`StreamController` 等）与 `dart:isolate` 库（`Isolate`/`ReceivePort`/`SendPort`）提供。本文从事件循环讲起，再到 Future、Stream、Isolate 三大支柱，以及 Flutter 框架层的异步组件，力求接口齐全、示例可直接运行。

## 目录

- [1. Dart 异步模型：单线程与事件循环](#1-dart-异步模型单线程与事件循环)
- [2. 事件循环执行顺序（宏任务 vs 微任务）](#2-事件循环执行顺序宏任务-vs-微任务)
- [3. Future 基础：六种创建方式](#3-future-基础六种创建方式)
- [4. Future 链式：then / catchError / whenComplete](#4-future-链式then--catcherror--whencomplete)
- [5. async / await 语法与本质](#5-async--await-语法与本质)
- [6. Future 工具方法：wait / any / doWhile / forEach / timeout](#6-future-工具方法wait--any--dowhile--foreach--timeout)
- [7. Completer 与 Future 扩展](#7-completer-与-future-扩展)
- [8. Timer 定时器](#8-timer-定时器)
- [9. Stream 是什么：与 Future 的区别](#9-stream-是什么与-future-的区别)
- [10. 创建 Stream：控制器 / 生成器 / 工厂](#10-创建-stream控制器--生成器--工厂)
- [11. 订阅 Stream：listen 与 StreamSubscription](#11-订阅-streamlisten-与-streamsubscription)
- [12. Stream 操作符（map / where / expand / take / skip / transform）](#12-stream-操作符map--where--expand--take--skip--transform)
- [13. Stream 聚合（toList / fold / reduce / first / join）](#13-stream-聚合tolist--fold--reduce--first--join)
- [14. 广播流（Broadcast Stream）](#14-广播流broadcast-stream)
- [15. StreamTransformer 自定义转换](#15-streamtransformer-自定义转换)
- [16. await for 与异步生成器（async* / sync*）](#16-await-for-与异步生成器async--sync)
- [17. 并发控制：Future.wait 与限制并发数](#17-并发控制futurewait-与限制并发数)
- [18. Isolate 通信模型：ReceivePort / SendPort](#18-isolate-通信模型receiveport--sendport)
- [19. Isolate.spawn / spawnUri / run](#19-isolatespawn--spawnuri--run)
- [20. Isolate 生命周期：exit / pause / kill](#20-isolate-生命周期exit--pause--kill)
- [21. IsolateNameServer 命名端口](#21-isolatenameserver-命名端口)
- [22. TransferableTypedData 高效传输](#22-transferabletypeddata-高效传输)
- [23. compute()：Flutter 的 Isolate 封装](#23-computeflutter-的-isolate-封装)
- [24. Flutter 异步组件：FutureBuilder / StreamBuilder](#24-flutter-异步组件futurebuilder--streambuilder)
- [25. Flutter 调度与帧回调](#25-flutter-调度与帧回调)
- [26. Zone 与错误隔离（runZonedGuarded）](#26-zone-与错误隔离runzonedguarded)
- [27. package:async 工具库](#27-packageasync-工具库)
- [28. SynchronousFuture 与自定义异步封装](#28-synchronousfuture-与自定义异步封装)
- [29. 取消与超时管理最佳实践](#29-取消与超时管理最佳实践)
- [30. 常见坑与最佳实践](#30-常见坑与最佳实践)
- [31. 参考文档](#31-参考文档)

---

## 1. Dart 异步模型：单线程与事件循环

Dart 默认运行在**单个线程（UI 线程 / main isolate）**上。所谓"异步"并不是多线程并发执行，而是**把耗时任务挂起、注册回调、等结果就绪后再回到事件循环执行回调**，从而不阻塞当前线程。

```dart
// 同步阻塞写法（会卡住 UI，绝对不要这么做）
// int sum = heavyCompute();  // 假设耗时 2 秒

// 异步非阻塞写法
Future<int> sum = heavyComputeAsync();   // 立即返回一个"将来的值"
sum.then((v) => print('结果: $v'));        // 注册回调，主线程继续往下走
print('我先执行了');                        // 这句会先打印
```

> 核心心智模型：**`Future`/`Stream` 只是"值的占位符 + 完成时的通知机制"**，真正的并发（多核并行）要靠 `Isolate`（见 §18 起）。

---

## 2. 事件循环执行顺序（宏任务 vs 微任务）

Dart 事件循环每轮处理一个**微任务队列（microtask queue）**全部任务，再处理一个**宏任务队列（event queue，又称 timer/IO 事件）**。优先级：**微任务 > 宏任务**。

```dart
void main() {
  print('A');                       // 1. 同步代码最先执行

  Future(() => print('B'));         // 宏任务（event queue）
  Future.delayed(Duration.zero, () => print('C')); // 同样是宏任务

  Future.microtask(() => print('D')); // 微任务（microtask queue）

  print('E');                       // 2. 同步收尾
}

// 输出顺序：A → E → D → B → C
```

> 规则记忆：**同步代码 > `microtask` > `Future`/定时器/Timer（event）**。理解这一点能避免"为什么我的回调顺序不对"的困惑。

---

## 3. Future 基础：六种创建方式

```dart
import 'dart:async';

// 1. Future()：把同步计算包装成异步（立即入 event 队列）
Future<int> f1 = Future(() => 42);

// 2. Future.delayed：延迟执行
Future<String> f2 = Future.delayed(Duration(seconds: 1), () => 'done');

// 3. Future.value：已完成的成功值
Future<int> f3 = Future<int>.value(100);

// 4. Future.error：已完成的失败值
Future<int> f4 = Future<int>.error(Exception('boom'));

// 5. Future.sync：同步执行 body，结果包成 Future（异常也会捕获）
Future<int> f5 = Future.sync(() => 1 + 1);

// 6. Future.microtask：把任务放进微任务队列
Future<void> f6 = Future.microtask(() => print('microtask'));

// 工厂：从单个 Future 生成单元素流
Stream<int> s = f3.asStream();
```

> 调试提示：`Future.value`/`Future.error` 适合测试与缓存命中；`Future.sync` 会在创建点**同步执行** body，仅把结果异步化，别在里面放耗时逻辑。

---

## 4. Future 链式：then / catchError / whenComplete

`Future` 是不可变的最终结果占位符，通过 `.then` 注册成功回调、`.catchError` 捕获异常、`.whenComplete` 做清理。

```dart
fetchToken()
    .then((token) => fetchUser(token))        // 链式：上一步结果喂给下一步
    .then((user) => print('用户: ${user.name}'))
    .catchError((e) {                          // 捕获链上任意一步的异常
      print('出错: $e');
      return fallbackUser();                   // 返回备用值，链继续
    }, test: (e) => e is NetworkException)     // 仅捕获指定类型
    .whenComplete(() => print('无论成败都执行'));
```

> 链式 `then` 会自动"展平"嵌套 `Future`（`then` 返回 `Future<U>` 时，链得到的是 `U` 而非 `Future<U>`），避免回调地狱。

---

## 5. async / await 语法与本质

`async` 标记函数为异步，`await` 暂停函数执行直到 `Future` 完成，但**不阻塞线程**。它只是 `then` 链的语法糖，让异步代码读起来像同步。

```dart
// 等价写法：async/await 是 then 的语法糖
Future<String> load() async {
  final token = await fetchToken();     // 在此暂停，UI 不卡
  final user = await fetchUser(token);
  return user.name;
}

void main() async {
  try {
    final name = await load();
    print(name);
  } catch (e) {
    print('异常: $e');
  } finally {
    print('清理');
  }
}

// async* 生成 Stream（配合 yield）
Stream<int> count() async* {
  for (var i = 0; i < 3; i++) {
    await Future.delayed(Duration(milliseconds: 100));
    yield i;                            // 逐个发射
  }
}
```

> `await` 只能用在 `async` 函数内；`async` 函数**始终返回 `Future`**，即使你写的是 `return 1` 也会被包成 `Future<int>`。

---

## 6. Future 工具方法：wait / any / doWhile / forEach / timeout

```dart
// Future.wait：并发等待所有完成的 Future，返回结果列表
final results = await Future.wait([
  fetchUser(1),
  fetchUser(2),
  fetchUser(3),
]);
// eagerError: true 时任一失败立即抛错；否则等全部结束
await Future.wait(tasks, eagerError: true);

// Future.any：取"最早完成"（成功或失败都算）的那个
final winner = await Future.any([fastTask(), slowTask()]);

// Future.doWhile：条件为真时反复执行异步任务
var i = 0;
await Future.doWhile(() async {
  await step(i);
  return ++i < 10;                     // 返回 false 停止
});

// Future.forEach：对集合逐项执行异步回调（串行）
await Future.forEach([1, 2, 3], (n) async => print(await square(n)));

// timeout：超时抛 TimeoutException（可指定 fallback）
final data = await fetchData().timeout(
  Duration(seconds: 5),
  onTimeout: () => 'fallback',
);
```

> `Future.any` 自 Dart 3.3 引入；`Future.wait` 非常适合"并行发多个独立请求再汇总"，比串行 `await` 快得多。

---

## 7. Completer 与 Future 扩展

`Completer` 让你在"非 Future 上下文"里手动控制一个 `Future` 的完成时机——常用于把回调式 API 改写成 `Future`。

```dart
import 'dart:async';

Future<String> wrapCallback() {
  final c = Completer<String>();
  legacyApi(onSuccess: (v) => c.complete(v),   // 成功时补全
            onError: (e) => c.completeError(e)); // 失败时补全错误
  return c.future;                              // 返回受控的 Future
}

// Dart 3.0+ 的 Future 扩展方法
fetchData()
    .onError<Object>((e, st) {                  // 替代 catchError 的链式写法
      print('恢复: $e');
      return '默认值';
    });

Future<int>? cached;
```

> `Completer` 的 `future` 只能被补全一次，重复 `complete` 会抛 `StateError`。不要在 `async` 函数里滥用 `Completer`——直接 `return` 更简单。

---

## 8. Timer 定时器

```dart
import 'dart:async';

// 一次性定时器
final t = Timer(Duration(seconds: 2), () => print('2 秒后'));
t.cancel();                              // 取消尚未触发的定时器

// 周期定时器
final p = Timer.periodic(Duration(seconds: 1), (timer) {
  print('tick ${timer.tick}');
  if (timer.tick >= 5) timer.cancel();  // 第 5 次后停止
});

// Timer.run：下一个事件循环迭代执行（等价于 Future(() => ...)）
Timer.run(() => print('下一轮事件'));

// 包装为 Future（便于 await）
final after = await Future.delayed(Duration(seconds: 1));
```

> 周期任务务必在 `dispose` 中 `cancel()`，否则会导致内存泄漏与重复执行（Flutter 组件中尤其常见）。

---

## 9. Stream 是什么：与 Future 的区别

| 维度 | Future | Stream |
|------|--------|--------|
| 结果数量 | 0 或 1 个 | 0 到多个（序列） |
| 类比 | 一次 HTTP 响应 | 下载进度、用户输入事件、WebSocket 消息 |
| 消费方式 | `await` / `then` | `listen` / `await for` |
| 典型场景 | 单次取数 | 持续推送的数据流 |

```dart
// Future：拿一个值
final user = await fetchUser();

// Stream：拿一串值
final clicks = clickStream;             // Stream<PointerDownEvent>
clicks.listen((e) => print('点击坐标: ${e.position}'));
```

---

## 10. 创建 Stream：控制器 / 生成器 / 工厂

```dart
import 'dart:async';

// 方式一：StreamController 手动发射（最灵活）
final ctrl = StreamController<int>();
ctrl.stream.listen(print);
ctrl.add(1);
ctrl.addError(Exception('err'));
ctrl.add(2);
await ctrl.close();                     // 关闭后流结束

// 方式二：async* 异步生成器 + yield（推荐写法）
Stream<int> countStream(int n) async* {
  for (var i = 0; i < n; i++) {
    await Future.delayed(Duration(milliseconds: 100));
    yield i;                           // 发射一个元素
  }
}
await for (final v in countStream(3)) print(v);

// 方式三：工厂构造函数
Stream<int> s1 = Stream.fromIterable([1, 2, 3]);
Stream<int> s2 = Stream.periodic(Duration(seconds: 1), (i) => i); // 每隔 1 秒发 i
Stream<String> s3 = Stream.value('one');
Stream<int> s4 = Stream.empty();
Stream<int> s5 = Stream.error(Exception('x'));
Stream<int> s6 = Stream.fromFuture(Future.value(7));
Stream<int> s7 = Stream.fromFutures([f1, f2]);  // 多个 Future 合并成流
```

> `StreamController` 默认**单订阅（single-subscription）**，只能被 `listen` 一次；需要多个监听者用 `StreamController.broadcast()`（见 §14）。

---

## 11. 订阅 Stream：listen 与 StreamSubscription

```dart
final sub = stream.listen(
  (data) => print('数据: $data'),
  onError: (e) => print('错误: $e'),
  onDone: () => print('流结束'),
  cancelOnError: false,                // 出错后是否自动取消
);

// 控制订阅生命周期
sub.pause();                           // 暂停接收（缓冲后续数据）
sub.resume();                          // 恢复
await sub.cancel();                    // 取消订阅，释放资源

// 一次性取值
final first = await stream.first;      // 取第一个并自动取消
final last = await stream.last;        // 取最后一个
final single = await stream.single;    // 恰好一个，否则抛异常
```

> `listen` 返回的 `StreamSubscription` 是唯一能 `pause/resume/cancel` 的句柄。**不再需要的流一定要 `cancel`**，否则会泄漏与重复处理。

---

## 12. Stream 操作符（map / where / expand / take / skip / transform）

`Stream` 提供大量惰性转换操作符，链式处理后仍是一个 `Stream`。

```dart
stream
    .where((n) => n.isEven)            // 过滤
    .map((n) => n * 2)                 // 转换
    .expand((n) => [n, n + 1])         // 一个元素展开成多个
    .take(5)                           // 只取前 5 个
    .skip(1)                           // 跳过前 1 个
    .takeWhile((n) => n < 100)         // 条件满足时取
    .skipWhile((n) => n < 10)
    .distinct()                        // 去重（相邻相同过滤）
    .handleError((e) => print(e))      // 捕获流内错误
    .transform(const LineSplitter())   // 用 StreamTransformer 处理
    .listen(print);

// 转成广播流的转换：使用 asBroadcastStream
final bcast = stream.asBroadcastStream();
```

---

## 13. Stream 聚合（toList / fold / reduce / first / join）

```dart
final numbers = Stream.fromIterable([1, 2, 3, 4]);

final list = await numbers.toList();          // [1, 2, 3, 4]
final set = await numbers.toSet();            // {1,2,3,4}
final sum = await numbers.fold(0, (a, b) => a + b);   // 10
final product = await numbers.reduce((a, b) => a * b); // 24
final text = await numbers.join(', ');        // "1, 2, 3, 4"
final hasBig = await numbers.any((n) => n > 3);       // true
final allBig = await numbers.every((n) => n > 0);     // true
final length = await numbers.length;                 // 4
```

> 这些聚合方法都会**消费整个流**（直到 `done`），如需多次读取请先 `toList()` 或转成广播流。

---

## 14. 广播流（Broadcast Stream）

普通单订阅流只能被 `listen` 一次；需要多个独立监听者时用**广播流**。

```dart
// 方式一：用 broadcast 控制器
final ctrl = StreamController<int>.broadcast();
ctrl.stream.listen(print);          // 监听者 A
ctrl.stream.listen((v) => print('B: $v')); // 监听者 B（允许）
ctrl.add(1);

// 方式二：把单订阅流转换
final bcast = singleStream.asBroadcastStream();

// 注意：广播流"错过即弃"——后加入的监听者收不到之前已发射的数据
final lateListener = bcast.listen(print);   // 只能收到订阅之后发射的
```

> 广播流的陷阱：**`asBroadcastStream()` 会缓存，第一个监听者订阅时才真正连接源流**；新监听者只会收到订阅后的事件。重复性的 UI 状态流（如位置更新）适合广播流。

---

## 15. StreamTransformer 自定义转换

```dart
import 'dart:async';

// 自定义转换器：把整数流按窗口聚合成和
class SumWindow extends StreamTransformerBase<int, int> {
  final int size;
  SumWindow(this.size);

  @override
  Stream<int> bind(Stream<int> stream) async* {
    var acc = 0, count = 0;
    await for (final v in stream) {
      acc += v;
      if (++count == size) {
        yield acc;
        acc = 0;
        count = 0;
      }
    }
  }
}

// 使用
Stream.fromIterable([1, 2, 3, 4, 5, 6])
    .transform(SumWindow(3))
    .listen(print);                 // 输出 6、15
```

> Dart 3 起 `StreamTransformerBase` 提供泛型友好的基类；旧式 `StreamTransformer.fromHandlers` 已不推荐，优先用 `bind` 实现。

---

## 16. await for 与异步生成器（async* / sync*）

`await for` 是 `listen` 的语法糖，让消费流像遍历同步集合一样直观。

```dart
// await for：逐元素消费（必须放在 async 函数内）
Future<int> sum(Stream<int> stream) async {
  var total = 0;
  await for (final v in stream) {
    total += v;
  }
  return total;
}

// sync*：同步生成器，返回 Iterable（阻塞生成，但可惰性）
Iterable<int> syncGen(int n) sync* {
  for (var i = 0; i < n; i++) yield i;
}

// async*：异步生成器，返回 Stream（每个 yield 之间可 await）
Stream<int> asyncGen(int n) async* {
  for (var i = 0; i < n; i++) {
    await Future.delayed(Duration(milliseconds: 50));
    yield i;
  }
}
```

> `yield*` 还能"委托"到另一个生成器：`yield* otherStream;` 把子流的所有元素透传出来。

---

## 17. 并发控制：Future.wait 与限制并发数

```dart
// 简单并发：所有任务一起发起
final res = await Future.wait(urls.map((u) => fetch(u)));

// 限制最大并发数（避免瞬间压垮服务器）的池化实现
Future<List<T>> limited<T>(
  List<Future<T> Function()> tasks,
  int maxConcurrent,
) async {
  final results = List<T>.filled(tasks.length, _placeholder());
  var index = 0;
  final workers = List.generate(maxConcurrent, (_) async {
    while (index < tasks.length) {
      final i = index++;
      results[i] = await tasks[i]();
    }
  });
  await Future.wait(workers);
  return results;
}
```

> 真实项目推荐用成熟库（如 `pool` / `async` 的 `StreamQueue`）做并发限流，手写易错。

---

## 18. Isolate 通信模型：ReceivePort / SendPort

`Isolate` 是 Dart 真正的**并行执行单元**：独立的堆内存、独立事件循环、不共享状态。Isolate 间通过**消息传递（SendPort/ReceivePort）**通信，无法直接访问对方变量。

```dart
import 'dart:async';
import 'dart:isolate';

void main() async {
  final receivePort = ReceivePort();      // 父隔离的接收端口
  await Isolate.spawn(worker, receivePort.sendPort);

  // 监听来自子隔离的消息
  receivePort.listen((message) {
    print('收到: $message');
    if (message == 'done') receivePort.close();
  });
}

void worker(SendPort sendPort) {
  sendPort.send('hello from isolate');    // 子隔离通过 SendPort 回传
  sendPort.send('done');
}
```

> 关键约束：**Isolate 间不能共享对象**，传递的要么是基础类型/可克隆对象，要么是 `SendPort`/`TransferableTypedData` 等可转移对象。`ReceivePort`/`SendPort` 本身不可克隆，只能传 `SendPort` 过去。

---

## 19. Isolate.spawn / spawnUri / run

```dart
import 'dart:isolate';

// 1. Isolate.spawn：在当前进程派生新 Isolate，执行顶层/静态函数
final rp = ReceivePort();
await Isolate.spawn(longTask, rp.sendPort);

void longTask(SendPort port) {
  final result = heavyCompute();
  port.send(result);
}

// 2. Isolate.spawnUri：从独立 URI（另一个 Dart 文件/包）启动
await Isolate.spawnUri(
  Uri.parse('package:myapp/worker.dart'),
  ['arg1', 'arg2'],
  rp.sendPort,
);

// 3. Isolate.run（Dart 2.19+ 极简 API）：自动管理生命周期，返回结果
final result = await Isolate.run(() {
  return List.generate(1000000, (i) => i * i)
      .fold(0, (a, b) => a + b);
});                                      // 自动 spawn + 取结果 + 回收
print(result);
```

> `Isolate.run` 是 2026 年的首选入口：**自动创建隔离、传参、取回结果、释放资源**，无需手动 `ReceivePort`。被调用的函数必须满足"可克隆参数 + 可克隆返回值"。

---

## 20. Isolate 生命周期：exit / pause / kill

```dart
import 'dart:isolate';

// 在子隔离内用 Isolate.exit 直接把结果送回父隔离的默认端口
void worker(SendPort parentPort) {
  final result = compute();
  Isolate.exit(parentPort, result);      // 发送结果并立即终止自身
}

// 控制隔离：pause / resume / kill
final isolate = await Isolate.spawn(loop, rp.sendPort);
isolate.pause();                         // 暂停（冻结事件循环）
isolate.resume();                        // 恢复
await Future.delayed(Duration(seconds: 1));
isolate.kill(priority: Isolate.immediate); // 立即终止（immediate 不等当前任务）
```

> `Isolate.exit(port, value)` 比手动 `port.send + 父侧 close` 更简洁，且能传任意可克隆值。后台常驻隔离记得在组件 `dispose` 时 `kill`，否则进程泄漏。

---

## 21. IsolateNameServer 命名端口

跨隔离（尤其是插件/原生桥）通信时，可用 `IsolateNameServer` 把 `SendPort` 注册到全局命名表，供任意隔离按名字查找。

```dart
import 'dart:isolate';

// 注册一个命名端口
final port = ReceivePort();
IsolateNameServer.registerPortWithName(port.sendPort, 'background');

// 另一个隔离按名字查找并发送
final target = IsolateNameServer.lookupPortByName('background');
target?.send('ping');

// 不再使用时注销
IsolateNameServer.removePortNameMapping('background');
```

> 命名端口是"末日逃生舱"式机制，常用于 Flutter 插件从原生层向 Dart 回传事件（如定位、蓝牙）。用完务必 `removePortNameMapping` 释放。

---

## 22. TransferableTypedData 高效传输

传递大块二进制（如图片、音频）时，用 `TransferableTypedData` 做**所有权转移**，避免深拷贝开销。

```dart
import 'dart:isolate';
import 'dart:typed_data';

void sendLarge(SendPort port) {
  final bytes = Uint8List(1024 * 1024);   // 1MB 数据
  final transferable = TransferableTypedData.fromList([bytes]);
  port.send(transferable);                // 转移所有权，零拷贝
}

// 接收端取回
final received = message as TransferableTypedData;
final data = received.materialize().buffer.asUint8List();
```

> 普通对象在隔离间传递是**深拷贝**；`TransferableTypedData` 转移后**原隔离不能再访问**该缓冲区，换来近乎零成本的大数据搬运。

---

## 23. compute()：Flutter 的 Isolate 封装

Flutter 在 `flutter/foundation.dart` 提供 `compute()`，把函数丢到后台 Isolate 执行，自动管理通信，返回 `Future`。

```dart
import 'package:flutter/foundation.dart';

// 纯函数：参数与返回值都必须可序列化（基础类型/简单对象）
int sumHeavy(List<int> nums) =>
    nums.fold(0, (a, b) => a + b);

void main() async {
  final big = List.generate(5000000, (i) => i);
  // compute 会在后台 Isolate 执行，不卡 UI
  final total = await compute(sumHeavy, big);
  print(total);
}

// 注意：compute 的回调必须是顶层函数或静态方法，不能是闭包/实例方法
```

> `compute` 适合**一次性 CPU 密集任务**（解析 JSON、图像压缩、加解密）。频繁调用会有 Isolate 启停开销；高频场景改用常驻 `Isolate` + `ReceivePort` 或 `Isolate.run`。

---

## 24. Flutter 异步组件：FutureBuilder / StreamBuilder

Flutter 提供声明式异步 Widget，自动根据 `Future`/`Stream` 状态重建 UI。

```dart
// FutureBuilder：根据 Future 状态渲染
FutureBuilder<User>(
  future: _userFuture,                   // 建议缓存，避免重复发起
  builder: (context, snap) {
    if (snap.connectionState == ConnectionState.waiting) {
      return const CircularProgressIndicator();
    }
    if (snap.hasError) return Text('错误: ${snap.error}');
    if (!snap.hasData) return const Text('无数据');
    return Text('你好, ${snap.data!.name}');
  },
)

// StreamBuilder：根据流事件渲染
StreamBuilder<int>(
  stream: _counterStream,
  initialData: 0,
  builder: (context, snap) => Text('计数: ${snap.data}'),
)
```

> 常见坑：`future:` 直接写 `fetchUser()` 会在每次 rebuild 时**重复调用**。正确做法是在 `initState` 中赋值给字段并复用。

---

## 25. Flutter 调度与帧回调

```dart
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

void scheduled() {
  // 当前帧绘制完成后回调（适合"绘制后再做一件事"）
  WidgetsBinding.instance.addPostFrameCallback((_) {
    print('本帧绘制完成');
  });

  // 每一帧都回调（动画/测量循环用，记得移除）
  final id = SchedulerBinding.instance.addPersistentFrameCallback((_) {});
  SchedulerBinding.instance.removePersistentFrameCallback(id);

  // 下一次重绘前调度任务
  SchedulerBinding.instance.scheduleFrameCallback((_) {});
}

// 立即安排微任务/下一帧
WidgetsBinding.instance.addTimingsCallback((timings) {});
```

> 不要在 `build` 里直接做耗时逻辑或调度帧回调；用 `addPostFrameCallback` 在首帧后初始化，避免打断布局。

---

## 26. Zone 与错误隔离（runZonedGuarded）

`Zone` 是 Dart 的"执行上下文沙箱"，可拦截异常、计时器、微任务，常用于统一错误上报。

```dart
import 'dart:async';

void main() {
  runZonedGuarded(() {
    runApp(const MyApp());               // 该 Zone 内的未捕获异常
  }, (error, stack) {
    reportToCrashlytics(error, stack);   // 集中上报
  });
}

// 自定义 Zone 规范（拦截所有 timer/future 创建）
final spec = ZoneSpecification(
  createTimer: (self, parent, zone, d, f) {
    print('创建了定时器');
    return parent.createTimer(zone, d, f);
  },
);
Zone.current.fork(specification: spec).run(() => doWork());
```

> `runZonedGuarded` 是全局兜底未捕获异步异常的首选方式；但同步 `try/catch` 仍然最直接可靠，Zone 不替代它。

---

## 27. package:async 工具库

`package:async` 提供一组成熟的异步工具类型，弥补标准库的不足。

```yaml
# pubspec.yaml
dependencies:
  async: ^2.11.0
```

```dart
import 'package:async/async.dart';

// FutureGroup：动态收集多个 Future 的结果
final group = FutureGroup<int>();
group.add(fetchA());
group.add(fetchB());
group.close();                          // 不再添加
final all = await group.future;        // 全部完成后的列表

// StreamGroup：把多个流合并成一个
final merged = StreamGroup.merge([streamA, streamB]);
final broadcast = StreamGroup.broadcast([s1, s2]);

// StreamQueue：像"队列"一样逐个消费流（可 peek/peek）
final queue = StreamQueue(someStream);
final first = await queue.next;        // 取下一个
final look = await queue.peek;         // 看一眼不取出

// CancelableOperation：可中途取消的异步操作
final op = CancelableOperation.fromFuture(fetchData());
op.value.then(print);
await op.cancel();                     // 取消（回调不再触发）

// AsyncMemoizer：确保某异步初始化只执行一次
final memo = AsyncMemoizer<Config>();
Future<Config> getConfig() => memo.runOnce(() => loadConfig());

// Result：显式区分成功与失败，不抛异常
final r = Result.capture(() async => await risk());
r.isValue ? print(r.asValue!.value) : print(r.asError!.error);

// RetryOptions：带退避的重试
final retry = RetryOptions(maxAttempts: 3, delay: Duration(seconds: 1));
final data = await retry.retry(() => fetchWithPossibleFail());
```

---

## 28. SynchronousFuture 与自定义异步封装

```dart
import 'package:flutter/foundation.dart';

// SynchronousFuture：值在"同步时刻"已就绪，但接口仍是 Future
// 常用于缓存命中、默认值、测试桩，避免无谓的异步调度
Future<String> loadName() {
  if (_cache != null) return SynchronousFuture(_cache!);
  return fetchFromNetwork().then((v) { _cache = v; return v; });
}

// 自定义异步封装：把回调 API 包成 cancelable Future
class CancellableLoader {
  Completer<String>? _completer;
  Timer? _timer;

  Future<String> load() {
    _completer = Completer<String>();
    _timer = Timer(Duration(seconds: 3), () {
      if (!_completer!.isCompleted) _completer!.complete('ok');
    });
    return _completer!.future;
  }

  void cancel() {
    _timer?.cancel();
    if (_completer != null && !_completer!.isCompleted) {
      _completer!.completeError(CanceledException());
    }
  }
}
```

> `SynchronousFuture` 在 Flutter 路由/资源加载内部大量使用，让"同步结果"与"异步接口"无缝衔接。

---

## 29. 取消与超时管理最佳实践

```dart
// 1. Stream 订阅必须可取消
StreamSubscription<int>? _sub;
@override
void initState() {
  super.initState();
  _sub = dataStream.listen(print);
}
@override
void dispose() {
  _sub?.cancel();                      // 防止内存泄漏
  super.dispose();
}

// 2. Future 超时兜底
final data = await fetch()
    .timeout(Duration(seconds: 5), onTimeout: () => cached);

// 3. 用 CancelableOperation 统一取消
final op = CancelableOperation.fromFuture(longTask());
// 用户离开页面时：
op.cancel();

// 4. 不要在 build 中发起新异步（应缓存到 state 字段）
```

> 黄金法则：**任何 `listen`/`Timer`/`Isolate`/`compute` 都要有对应的"取消/释放"路径**，否则就是泄漏。Flutter 组件的 `dispose` 是统一清理点。

---

## 30. 常见坑与最佳实践

1. **在 `build` 中创建 `Future`/`Stream`**：每次 rebuild 都重新发起，导致无限循环或重复请求；应在 `initState`/`State` 字段里缓存。
2. **忘记 `await`**：`fetchData(); print(result)` 会在数据就绪前执行，得到 `null`/`Instance of Future`；要么 `await`，要么用 `then`。
3. **`async` 函数里用 `Completer` 却忘了 `complete`**：调用方永久挂起；优先直接 `return`。
4. **在 UI 线程做重计算**：解析大 JSON、排序万级数组会掉帧；用 `compute`/`Isolate.run`。
5. **`Future.forEach` 与 `await for` 串行而非并行**：需要并行请用 `Future.wait`。
6. **Stream 不 `cancel`**：泄漏与重复处理；`dispose` 中务必 `cancel`。
7. **单订阅流转多监听者报错**：需要多监听用 `broadcast()` 或 `asBroadcastStream()`。
8. **`Isolate.spawn` 传不可克隆对象**：闭包、实例方法、含非可克隆字段的对象都不可传；用顶层/静态函数 + 基础类型参数。
9. **`compute` 传闭包或实例方法**：`compute` 要求回调为顶层/静态函数，否则运行时崩溃。
10. **滥用 `!` 解 Future**：`Future<int>` 不能直接 `!`，要先 `await` 再判断非空。
11. **`runZonedGuarded` 当成 `try/catch` 平替**：Zone 只兜底未捕获异常，同步逻辑仍要显式 `try/catch`。
12. **Timer 不 `cancel`**：周期任务持续运行，组件销毁后仍触发，引发 `setState` after dispose 崩溃。

---

## 31. 参考文档

- [Dart 异步编程官方教程（async-await）](https://dart.dev/codelabs/async-await)
- [Dart Stream 文档](https://dart.dev/tutorials/language/streams)
- [Dart 并发：Isolate 与事件循环](https://dart.dev/language/concurrency)
- [dart:async 库 API 参考](https://api.dart.dev/stable/dart-async/dart-async-library.html)
- [dart:isolate 库 API 参考](https://api.dart.dev/stable/dart-isolate/dart-isolate-library.html)
- [Future 类参考](https://api.dart.dev/stable/dart-async/Future-class.html)
- [Future.wait 方法](https://api.dart.dev/stable/dart-async/Future/wait.html)
- [Future.any 方法](https://api.dart.dev/stable/dart-async/Future/any.html)
- [Completer 类参考](https://api.dart.dev/stable/dart-async/Completer-class.html)
- [Stream 类参考](https://api.dart.dev/stable/dart-async/Stream-class.html)
- [StreamController 类参考](https://api.dart.dev/stable/dart-async/StreamController-class.html)
- [StreamSubscription 类参考](https://api.dart.dev/stable/dart-async/StreamSubscription-class.html)
- [StreamTransformer 类参考](https://api.dart.dev/stable/dart-async/StreamTransformer-class.html)
- [Timer 类参考](https://api.dart.dev/stable/dart-async/Timer-class.html)
- [Zone 类参考](https://api.dart.dev/stable/dart-async/Zone-class.html)
- [Isolate 类参考](https://api.dart.dev/stable/dart-isolate/Isolate-class.html)
- [Isolate.run 方法](https://api.dart.dev/stable/dart-isolate/Isolate/run.html)
- [Isolate.exit 方法](https://api.dart.dev/stable/dart-isolate/Isolate/exit.html)
- [IsolateNameServer 类参考](https://api.dart.dev/stable/dart-isolate/IsolateNameServer-class.html)
- [ReceivePort / SendPort 类参考](https://api.dart.dev/stable/dart-isolate/ReceivePort-class.html)
- [TransferableTypedData 类参考](https://api.dart.dev/stable/dart-isolate/TransferableTypedData-class.html)
- [compute 函数（Flutter）](https://api.flutter.dev/flutter/foundation/compute.html)
- [FutureBuilder 类参考](https://api.flutter.dev/flutter/widgets/FutureBuilder-class.html)
- [StreamBuilder 类参考](https://api.flutter.dev/flutter/widgets/StreamBuilder-class.html)
- [WidgetsBinding / addPostFrameCallback](https://api.flutter.dev/flutter/widgets/WidgetsBinding/addPostFrameCallback.html)
- [SchedulerBinding 类参考](https://api.flutter.dev/flutter/scheduler/SchedulerBinding-class.html)
- [SynchronousFuture 类参考](https://api.flutter.dev/flutter/foundation/SynchronousFuture-class.html)
- [package:async（pub.dev）](https://pub.dev/packages/async)
- [Flutter 性能最佳实践（异步相关）](https://docs.flutter.dev/perf/best-practices)
- [Flutter 中文文档：异步 UI](https://docs.flutter.cn/cookbook/networking/fetch-data)
