---
title: Flutter BLoC 状态管理学习文档
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-17.jpg
tags:[flutter,dart,bloc,flutter_bloc,state-management,cubit,event,state,blocbuilder,bloclistener,blocconsumer,architecture]
summary:Flutter 官方推荐的企业级状态管理方案 BLoC（Business Logic Component）完全学习文档，覆盖 bloc / flutter_bloc 核心库与 bloc_concurrency、hydrated_bloc、bloc_test、equatable 等生态，从 Cubit 入门到 Bloc 事件流、生命周期回调、事件转换器、全部 Widget、Context 扩展、异步状态模式、实战与测试，接口尽量齐全并附可运行示例
keywords:[flutter,bloc,flutter_bloc,cubit,state management,blocbuilder,bloclistener,blocconsumer,event transformer,equatable]
top:1
copyright:true
---

# Flutter BLoC 状态管理学习文档

> 本文档基于 **Flutter 3.47.7（stable）** + **Dart 3.13.5**（2026-10 最新稳定版），核心库版本 **`bloc` 9.2.1** / **`flutter_bloc` 9.1.1**。`bloc` 9.x 要求 **Dart SDK ≥ 2.14**。文档遵循 Dart 3 空安全语法，事件（Event）统一使用 `sealed class` 写法，状态（State）借助 `equatable` 比较相等性。适合从入门到进阶、想系统掌握 BLoC 全部接口与最佳实践的开发者。

BLoC 的核心思想是：**UI 只通过「事件（Event）」向业务逻辑发送意图，业务逻辑再把「状态（State）」以流（Stream）的形式吐回给 UI；UI 是状态的纯函数（pure function of state）**。这种单向数据流让每一次状态变更都能追溯到具体事件，特别适合中大型团队与需要审计轨迹的复杂异步流程。

## 目录

- [1. 核心概念与架构](#1-核心概念与架构)
- [2. 安装与依赖](#2-安装与依赖)
- [3. 核心类型总览](#3-核心类型总览)
- [4. Cubit 入门](#4-cubit-入门)
- [5. Bloc 入门与事件流](#5-bloc-入门与事件流)
- [6. BlocBase 公共 API 详解](#6-blocbase-公共-api-详解)
- [7. 生命周期回调与 BlocObserver](#7-生命周期回调与-blocobserver)
- [8. 事件转换器 EventTransformer 与 bloc_concurrency](#8-事件转换器-eventtransformer-与-bloc_concurrency)
- [9. flutter_bloc 全部 Widget 详解](#9-flutter_bloc-全部-widget-详解)
- [10. BuildContext 扩展（read / watch / select / of）](#10-buildcontext-扩展read--watch--select--of)
- [11. 异步状态模式与样板消减（Equatable / Freezed）](#11-异步状态模式与样板消减equatable--freezed)
- [12. 实战综合示例](#12-实战综合示例)
- [13. 测试（bloc_test）](#13-测试bloc_test)
- [14. 生态库](#14-生态库)
- [15. 最佳实践与常见坑](#15-最佳实践与常见坑)
- [16. 参考文档](#16-参考文档)

---

## 1. 核心概念与架构

BLoC 模式把应用分成三层：

| 层 | 职责 | 是否依赖 Flutter |
| :-- | :-- | :-- |
| **Presentation（UI）** | 渲染状态、向 Bloc 发送事件 | 是（Widget） |
| **Business Logic（Bloc/Cubit）** | 接收事件 → 产出状态，纯 Dart | 否（可独立测试） |
| **Data（Repository/Service）** | 网络、数据库、设备能力 | 否（纯 Dart） |

```text
       add(event) / cubit.method()
   ┌──────────────────────────────────┐
   │             UI (Widget)          │
   │   BlocBuilder / BlocListener     │
   └──────────┬───────────────▲───────┘
              │               │
              ▼               │
   ┌──────────────────────────────────┐
   │      Bloc / Cubit (纯 Dart)      │  emit(state)
   │  事件 → 业务逻辑 → 新状态        │
   └──────────┬───────────────▲───────┘
              │               │
              ▼               │
   ┌──────────────────────────────────┐
   │   Repository / DataSource        │
   └──────────────────────────────────┘
```

> **Cubit 与 Bloc 怎么选？**
> - **Cubit**：没有 Event 层，UI 直接调用方法（如 `cubit.increment()`），方法内部 `emit` 新状态。适合**简单、同步、无审计需求**的状态（计数器、开关、Tab 索引）。
> - **Bloc**：保留 Event 层，UI 调用 `add(event)`，Bloc 把事件「翻译」成状态。适合**复杂异步、需要事件可追溯、合规审计**的流程（登录、下单、支付）。

> 9.0 之后 `BlocListener` / `BlocConsumer` 在回调前会自动检查 `context.mounted`，彻底消灭了「widget 已销毁仍更新 UI」导致的 `Tried to use a widget that doesn't exist anymore` 崩溃。

---

## 2. 安装与依赖

在 `pubspec.yaml` 中声明（版本以 [pub.dev](https://pub.dev) 最新为准）：

```yaml
environment:
  sdk: ">=2.14.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_bloc: ^9.1.1   # 自动依赖 bloc ^9.2.1
  bloc: ^9.2.1           # 纯 Dart 核心，可单独在后端/脚本里用
  equatable: ^2.0.7      # 可选：让 Event/State 自动实现 == 与 hashCode

dev_dependencies:
  bloc_test: ^10.0.0     # 可选：Bloc/Cubit 单元测试
  flutter_test:
    sdk: flutter
```

```bash
flutter pub get
```

> 只需在 UI 层（`flutter_bloc`）与逻辑层（若项目是纯 Dart 则只引 `bloc`）二选一引入；普通 Flutter 工程直接引 `flutter_bloc` 即可，它会把 `bloc` 一并拉进来。

---

## 3. 核心类型总览

| 类型 | 所在包 | 说明 |
| :-- | :-- | :-- |
| `BlocBase<State>` | `bloc` | 抽象基类，`Cubit` 与 `Bloc` 都继承它，提供 `state`、`emit`、`stream`、`close` 等公共 API |
| `Cubit<State>` | `bloc` | 通过**方法调用**改变状态，无 Event |
| `Bloc<Event, State>` | `bloc` | 通过**事件**改变状态，内部 `on<E>` 注册处理器 |
| `Change<State>` | `bloc` | `onChange` 回调收到的「当前态 → 下一态」 |
| `Transition<Event, State>` | `bloc` | `onTransition` 回调收到的「当前态 + 触发事件 + 下一态」 |
| `BlocObserver` | `bloc` | 全局观察所有 Bloc/Cubit 的生命周期 |
| `MultiBlocObserver` | `bloc` | 组合多个 `BlocObserver` |
| `Emitter<State>` | `bloc` | `void Function(State)`，事件处理器里用来发射状态 |
| `EventTransformer<Event>` | `bloc` | 事件流转换器类型 |
| `BlocProvider` / `BlocBuilder` / `BlocListener` / `BlocConsumer` / `BlocSelector` | `flutter_bloc` | 把 Bloc 注入、消费、监听、精选的 Widget |
| `RepositoryProvider` | `flutter_bloc` | 注入非 Bloc 的普通依赖（Repository/Service） |

### `BlocBase<State>` 公共成员（Cubit 与 Bloc 都有）

| 成员 | 类型 / 签名 | 说明 |
| :-- | :-- | :-- |
| `state` | `State`（getter） | 当前状态，读取不订阅 |
| `stream` | `Stream<State>` | 状态变更流，可手动 `listen` |
| `emit` | `void emit(State state)` | 发射新状态（见 §6 的「同状态」陷阱） |
| `addError` | `void addError(Object error, [StackTrace?])` | 向流添加一个错误 |
| `close` | `Future<void> close()` | 关闭并释放资源，之后 `isClosed == true` |
| `isClosed` | `bool`（getter） | 是否已关闭 |
| `forEach` | `Future<void> forEach<T>(Stream<T>, {required State Function(T) onData, State Function(Object, StackTrace)? onError})` | 把一个数据流逐项映射成状态并自动 emit |
| `onCreate` | `void onCreate()` | 生命周期：创建后 |
| `onChange` | `void onChange(Change<State>)` | 每次状态变化前调用 |
| `onError` | `void onError(Object, StackTrace)` | 捕获错误时调用 |
| `onClose` | `void onClose()` | 关闭前 |

---

## 4. Cubit 入门

### 4.1 定义一个 Cubit

```dart
import 'package:bloc/bloc.dart';

/// 管理一个 int 计数状态的 Cubit
class CounterCubit extends Cubit<int> {
  /// 初始状态为 0
  CounterCubit() : super(0);

  /// 直接调用方法改变状态
  void increment() => emit(state + 1);
  void decrement() => emit(state - 1);

  /// 重置
  void reset() => emit(0);
}
```

> `emit` 是 `BlocBase` 提供的方法，**只能在 Bloc/Cubit 内部调用**，不能在外部直接调。新状态通过 `state` 读取（在 Cubit 内部用 `state` getter）。

### 4.2 使用 Cubit（纯 Dart，不依赖 Flutter）

```dart
import 'package:bloc/bloc.dart';

class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
}

void main() {
  final cubit = CounterCubit();

  print(cubit.state); // 0

  cubit.increment();
  print(cubit.state); // 1

  // 不再需要时关闭，释放底层 StreamController
  cubit.close();
}
```

### 4.3 观察单个 Cubit：重写 `onChange` / `onError`

```dart
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);

  @override
  void onChange(Change<int> change) {
    super.onChange(change);
    print('onChange: ${change.currentState} -> ${change.nextState}');
  }

  @override
  void onError(Object error, StackTrace stackTrace) {
    print('onError: $error');
    super.onError(error, stackTrace);
  }
}
```

---

## 5. Bloc 入门与事件流

### 5.1 定义事件与 Bloc

```dart
import 'package:bloc/bloc.dart';

// 事件：用 sealed class 组织，Dart 3 下可用 switch 穷尽匹配
sealed class CounterEvent {}

final class CounterIncrementPressed extends CounterEvent {}

final class CounterDecrementPressed extends CounterEvent {}

final class CounterReset extends CounterEvent {}

class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    // 注册每种事件的处理器
    on<CounterIncrementPressed>((event, emit) => emit(state + 1));
    on<CounterDecrementPressed>((event, emit) => emit(state - 1));
    on<CounterReset>((event, emit) => emit(0));
  }
}
```

> **`on<E>` 的签名**：`void on<E extends Event>(EventHandler<E, State> handler, {EventTransformer<E>? transformer})`。
> `EventHandler` 是 `FutureOr<void> Function(E event, Emitter<State> emit)`；`Emitter<State>` 本质就是 `void Function(State)`。

### 5.2 使用 Bloc（纯 Dart）

```dart
Future<void> main() async {
  final bloc = CounterBloc();

  print(bloc.state); // 0

  bloc.add(CounterIncrementPressed());

  // 让事件循环跑一帧，确保事件已被处理
  await Future.delayed(Duration.zero);
  print(bloc.state); // 1

  await bloc.close();
}
```

### 5.3 观察 Bloc：重写 `onEvent` / `onTransition`

```dart
class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<CounterIncrementPressed>((event, emit) => emit(state + 1));
  }

  @override
  void onEvent(CounterEvent event) {
    super.onEvent(event);
    print('onEvent: $event');
  }

  @override
  void onTransition(Transition<CounterEvent, int> transition) {
    super.onTransition(transition);
    print('onTransition: ${transition.currentState} --${transition.event}--> ${transition.nextState}');
  }

  @override
  void onChange(Change<int> change) {
    super.onChange(change);
    print('onChange: $change');
  }
}
```

> Bloc 的处理顺序（一次 `add(event)`）：`onEvent` → 经 `EventTransformer` → 调 `handler` 里的 `emit` → `onChange`（Change）与 `onTransition`（含 event）几乎同时触发（`onTransition` 在 `onChange` 之前）→ 通知订阅者。

---

## 6. BlocBase 公共 API 详解

### 6.1 `emit` 与「相同状态不重复发射」陷阱

```dart
import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void setTo(int value) => emit(value);
}

void main() {
  final c = CounterCubit();
  c.stream.listen((s) => print('listen: $s')); // 只会在真正变化时触发

  c.setTo(1); // 触发监听
  c.setTo(1); // ⚠️ 与当前状态相等：BlocBase 直接忽略，不会通知订阅者、不会触发 onChange
  c.setTo(2); // 再次触发监听
}
```

> **重要陷阱**：`emit` 在「新状态 `==` 当前状态」时（首次 emit 之后）是**空操作**，不会触发 `onChange`、不会重建 UI。当你用 `equatable` 定义状态且两次 emit 出「字段相同」的对象时，UI 不会刷新。需要强制刷新可发射一个带时间戳/自增 id 的状态，或改用一个表示该「动作」的语义状态。

### 6.2 `stream` 与 `listen`

```dart
final StreamSubscription<int> sub = bloc.stream.listen((state) {
  print('state changed: $state');
});
// 不需要时取消
await sub.cancel();
```

### 6.3 `forEach` / `emitForEach`：把数据流映射成状态

```dart
class TimerBloc extends Bloc<TimerEvent, int> {
  TimerBloc() : super(0) {
    on<StartTicking>((event, emit) async {
      // 每 200ms 把 ticks 流的最新值映射成状态
      await emit.forEach<int>(
        Stream.periodic(const Duration(milliseconds: 200), (i) => i),
        onData: (tick) => tick,
        onError: (e, st) => state, // 出错时保持原状态
      );
    });
  }
}
```

### 6.4 `addError` 与 `close`

```dart
class SafeCubit extends Cubit<String> {
  SafeCubit() : super('init');

  Future<void> risky() async {
    try {
      throw Exception('boom');
    } catch (e, st) {
      addError(e, st);           // 向流推送错误（可被 BlocObserver.onError 捕获）
      emit('recovered');         // 也可自己切到错误状态
    }
  }
}
```

---

## 7. 生命周期回调与 BlocObserver

### 7.1 全局观察所有 Bloc/Cubit

```dart
class AppBlocObserver extends BlocObserver {
  @override
  void onCreate(BlocBase bloc) {
    super.onCreate(bloc);
    print('onCreate -- ${bloc.runtimeType}');
  }

  @override
  void onEvent(Bloc bloc, Object? event) {
    super.onEvent(bloc, event);
    print('onEvent -- ${bloc.runtimeType}, $event');
  }

  @override
  void onChange(BlocBase bloc, Change change) {
    super.onChange(bloc, change);
    print('onChange -- ${bloc.runtimeType}, $change');
  }

  @override
  void onTransition(Bloc bloc, Transition transition) {
    super.onTransition(bloc, transition);
    print('onTransition -- ${bloc.runtimeType}, $transition');
  }

  @override
  void onError(BlocBase bloc, Object error, StackTrace stackTrace) {
    print('onError -- ${bloc.runtimeType}, $error');
    super.onError(bloc, error, stackTrace);
  }

  @override
  void onClose(BlocBase bloc) {
    super.onClose(bloc);
    print('onClose -- ${bloc.runtimeType}');
  }
}

void main() {
  Bloc.observer = AppBlocObserver();
  // 之后创建的所有 Bloc/Cubit 都会被观察
}
```

### 7.2 组合多个观察者（MultiBlocObserver）

```dart
Bloc.observer = MultiBlocObserver(
  observers: [
    LoggingObserver(),
    ErrorReportingObserver(),
    PerformanceObserver(),
  ],
);
```

> `BlocObserver` 各回调对照：
> | 回调 | Bloc | Cubit | 触发时机 |
> | :-- | :-- | :-- | :-- |
> | `onCreate` | ✅ | ✅ | 创建后 |
> | `onEvent` | ✅ | ❌ | 收到事件 |
> | `onChange` | ✅ | ✅ | 状态变化前（含 current/next） |
> | `onTransition` | ✅ | ❌ | 状态变化前（额外含触发 event） |
> | `onError` | ✅ | ✅ | 捕获到错误 |
> | `onClose` | ✅ | ✅ | 关闭前 |
> | `onDone`（9.x 新增） | ✅ | ❌ | 某事件的处理器执行完成时，签名为 `void onDone(Event, [Object? error, StackTrace?])` |

---

## 8. 事件转换器 EventTransformer 与 bloc_concurrency

默认情况下，**同一个 `on<E>` 注册的多个事件会被并发处理**（每个事件独立开一个 Future）。在搜索、轮询等高频场景里，这通常不是你想要的——你需要「丢旧」「串行」「重启」或「防抖」。

### 8.1 四种内置转换器（`bloc_concurrency`）

```dart
import 'package:bloc/bloc.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';

class SearchBloc extends Bloc<SearchEvent, SearchState> {
  SearchBloc() : super(SearchInitial()) {
    // 防抖转换器在 8.3 自定义；这里先演示四种内置用法
    on<SearchQueryChanged>(_onQueryChanged, transformer: restartable());

    // 常见组合：
    on<LoadNextPage>(_onLoadNext, transformer: sequential()); // 串行，避免分页错乱
    on<Refresh>(_onRefresh, transformer: restartable());      // 新事件到来直接取消旧任务
    on<ButtonTapped>(_onTap, transformer: droppable());       // 处理中直接丢弃新点击
    // concurrent() 是默认行为，可不写
  }
}
```

`bloc_concurrency` 提供的四个转换器：

| 转换器 | 行为 | 适用 |
| :-- | :-- | :-- |
| `concurrent()` | 各事件并发执行（默认） | 互不相干的独立任务 |
| `sequential()` | 排成一队，逐一执行 | 分页、写库等需保序 |
| `droppable()` | 上一个未完成则丢弃新的 | 防连点按钮 |
| `restartable()` | 新的到来就取消旧的、重跑新的 | 搜索、实时输入 |

### 8.2 全局默认转换器

```dart
import 'package:bloc/bloc.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';

void main() {
  // 全局把所有 Bloc 的事件处理改成串行（谨慎使用）
  Bloc.transformer = sequential<dynamic>();
  runApp(const MyApp());
}
```

> 9.0 起旧的 `runZoned` 全局包裹方式被废弃，官方推荐用 `Bloc.transformer` 在 Bloc 层面统一处理事件流与错误，避免 Dart Zone 带来的隐式行为。

### 8.3 自定义转换器（防抖 Debounce，需 `rxdart`）

```dart
import 'package:bloc/bloc.dart';
import 'package:rxdart/rxdart.dart';

EventTransformer<E> debounce<E>(Duration duration) {
  return (events, mapper) =>
      events.debounceTime(duration).asyncExpand(mapper);
}

// 用法
on<SearchQueryChanged>(
  _onQueryChanged,
  transformer: debounce(const Duration(milliseconds: 300)),
);
```

> 异步事件处理里的 `emit` 必须在事件处理器**返回前**同步调用（在第一个 `await` 之前，或以 `await emit.forEach` 的形式返回流）。在 `async` 函数 `return` 之后再调用 `emit` 会抛 `Cannot emit new states after the event handler has completed`。

---

## 9. flutter_bloc 全部 Widget 详解

### 9.1 `BlocProvider`：注入 Bloc

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

// 常用：create 延迟创建（lazy 默认 true，首次访问才建）
BlocProvider(
  create: (context) => CounterBloc(),
  child: const CounterPage(),
);

// 已有实例用 value 注入（不要再用 create，否则会重复创建）
BlocProvider.value(
  value: counterBloc,
  child: const CounterPage(),
);

// 全局注入：放在 MaterialApp 之上，全 App 共享
MultiBlocProvider(
  providers: [
    BlocProvider(create: (_) => AuthBloc()),
    BlocProvider(create: (_) => ThemeCubit()),
  ],
  child: const MyApp(),
);
```

| 构造 / 字段 | 说明 |
| :-- | :-- |
| `create` | 工厂，返回 `T`；默认 `lazy: true`（首次 `read/watch` 才真正创建） |
| `value` | 已存在的实例（用 `BlocProvider.value` 命名构造） |
| `lazy` | 是否懒加载；设 `false` 则在树构建时立即创建 |
| `child` | 子树 |
| `BlocProvider.of<T>(context, {bool listen = false})` | 取 Bloc；`listen=true` 会订阅（等价于 `context.watch`） |

### 9.2 `BlocBuilder`：状态 → UI

```dart
BlocBuilder<CounterBloc, int>(
  builder: (context, count) {
    return Text('$count', style: Theme.of(context).textTheme.headlineMedium);
  },
);

// 仅当满足条件才重建（减少不必要的 rebuild）
BlocBuilder<CounterBloc, int>(
  buildWhen: (previous, current) => previous != current && current % 2 == 0,
  builder: (context, count) => Text('偶数: $count'),
);
```

| 字段 | 类型 | 说明 |
| :-- | :-- | :-- |
| `bloc` | `T?` | 显式传入；不传则自动向上找最近的 `BlocProvider<T>` |
| `builder` | `Widget Function(BuildContext, S)` | 必填，返回 UI |
| `buildWhen` | `bool Function(S previous, S current)?` | 返回 `false` 则本次状态变化**不重建** |

### 9.3 `BlocListener`：状态 → 副作用（导航 / Toast / 弹窗）

```dart
BlocListener<AuthBloc, AuthState>(
  listenWhen: (previous, current) =>
      previous.status != current.status, // 只在 status 变化时监听
  listener: (context, state) {
    if (state.status == AuthStatus.failure) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(state.error)));
    } else if (state.status == AuthStatus.success) {
      Navigator.of(context).pushReplacementNamed('/home');
    }
  },
  child: const LoginForm(), // listener 不返回 UI，UI 在 child 里
);
```

| 字段 | 说明 |
| :-- | :-- |
| `listener` | `void Function(BuildContext, S)`，必填，做副作用 |
| `listenWhen` | 同 `buildWhen` 语义，控制是否触发 listener |
| `child` | 真正的 UI 子树（listener 本身不渲染内容） |
| `bloc` | 可选显式指定 |

> **9.0 关键修复**：`BlocListener` 执行 `listener` 前会先检查 `context.mounted`，widget 已销毁时自动跳过，根除「unmounted widget」崩溃。

### 9.4 `BlocConsumer`：同时构建 + 监听

```dart
BlocConsumer<AuthBloc, AuthState>(
  buildWhen: (previous, current) => previous.status != current.status,
  listenWhen: (previous, current) => previous.status != current.status,
  builder: (context, state) {
    if (state.status == AuthStatus.loading) {
      return const CircularProgressIndicator();
    }
    return const LoginForm();
  },
  listener: (context, state) {
    if (state.status == AuthStatus.failure) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(state.error)));
    }
  },
  child: const SizedBox.shrink(), // 可选
);
```

> 当同一个页面既要「根据状态渲染」又要「根据状态做副作用」时，用 `BlocConsumer` 比嵌套 `BlocBuilder` + `BlocListener` 更清爽。

### 9.5 `BlocSelector`：最小化重建（精选切片）

```dart
// 只有 selectedCount 变化时才重建，避免整页 rebuild
BlocSelector<CounterBloc, int, int>(
  selector: (state) => state,            // 从总状态里挑出关心的切片
  buildWhen: (prev, next) => prev != next,
  builder: (context, count) => Text('$count'),
);
```

| 字段 | 说明 |
| :-- | :-- |
| `selector` | `R Function(S state)`：返回状态的一个切片 `R` |
| `buildWhen` | 对切片 `prev/next` 比较，决定是否重建 |
| `builder` | `Widget Function(BuildContext, R)` |

> 当状态很大、只想在某个字段变化时重建某小组件时，`BlocSelector` 比 `BlocBuilder` 高效得多。

### 9.6 `RepositoryProvider`：注入非 Bloc 依赖

```dart
RepositoryProvider(
  create: (context) => ApiClient(baseUrl: 'https://api.example.com'),
  child: const App(),
);

// 取值
final api = RepositoryProvider.of<ApiClient>(context);
```

> `RepositoryProvider` 与 `BlocProvider` 类似，但它注入的是普通对象（Repository、DataSource、Service），**不会**产生状态流；取值用 `RepositoryProvider.of<T>(context)`。

---

## 10. BuildContext 扩展（read / watch / select / of）

`flutter_bloc` 为 `BuildContext` 增加了几个极常用的扩展方法：

```dart
// 取 Bloc 但不订阅（不会因状态变化重建）：用于 add 事件、在回调里取值
final bloc = context.read<CounterBloc>();
bloc.add(CounterIncrementPressed());

// 取 Bloc 并订阅（状态变化会触发本 widget 重建）：等价于 BlocBuilder 的底层
final count = context.watch<CounterBloc>().state;

// 只订阅状态的一个切片（减少重建）：等价于 BlocSelector 底层
final name = context.select<ProfileBloc, String>((b) => b.state.name);

// 传统写法（等价）
final bloc2 = BlocProvider.of<CounterBloc>(context);
```

| 扩展 | 订阅？ | 要求 | 典型用途 |
| :-- | :-- | :-- | :-- |
| `read<T>()` | 否 | 任何被 `BlocProvider`/`RepositoryProvider` 提供过的 `T` | 取实例、`add` 事件、一次性取值 |
| `watch<T>()` | 是 | `T extends BlocBase<Object?>` | 直接读状态并随其重建 |
| `select<T, R>(fn)` | 是（仅切片） | `T extends BlocBase<Object?>` | 只看状态某字段 |
| `BlocProvider.of<T>(context)` | 否（`listen:false`） | 同 `read` | 传统取值 |

> **不要在 `build` 里用 `context.watch` 取得 Bloc 后又拿它去 `add` 频繁事件**——`watch` 会让 widget 随状态频繁重建；在 `onPressed` 等回调里用 `read` 更安全。

---

## 11. 异步状态模式与样板消减（Equatable / Freezed）

### 11.1 用 `equatable` 让状态可比、可相等比较

```dart
import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

// 状态：继承自 Equatable，props 内字段相等则两状态视为「相等」
class LoginState extends Equatable {
  const LoginState({this.status = LoginStatus.initial, this.error = ''});

  final LoginStatus status;
  final String error;

  @override
  List<Object> get props => [status, error];

  LoginState copyWith({LoginStatus? status, String? error}) =>
      LoginState(status: status ?? this.status, error: error ?? this.error);
}

enum LoginStatus { initial, loading, success, failure }
```

> 不继承 `Equatable` 时，`emit(sameObject)` 靠「对象同一性」判断是否变化；用了 `Equatable`，靠 `props` 判断相等——这通常才符合「字段相同就是同一状态」的直觉。**但注意 §6.1 的陷阱**：两个 `props` 相等的对象会被 `emit` 视为「无变化」而不刷新。

### 11.2 一个完整的异步 Bloc（加载 / 成功 / 失败）

```dart
import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

// ---- 状态 ----
class LoginState extends Equatable {
  const LoginState({this.status = LoginStatus.initial, this.error = ''});
  final LoginStatus status;
  final String error;
  @override
  List<Object> get props => [status, error];
}

enum LoginStatus { initial, loading, success, failure }

// ---- 事件 ----
sealed class LoginEvent {}
final class LoginSubmitted extends LoginEvent {
  const LoginSubmitted(this.username, this.password);
  final String username;
  final String password;
}

// ---- Bloc ----
class LoginBloc extends Bloc<LoginEvent, LoginState> {
  LoginBloc(this._authRepo) : super(const LoginState()) {
    on<LoginSubmitted>(_onSubmitted);
  }

  final AuthRepository _authRepo;

  Future<void> _onSubmitted(LoginSubmitted event, Emitter<LoginState> emit) async {
    emit(state.copyWith(status: LoginStatus.loading, error: ''));
    try {
      final user = await _authRepo.login(event.username, event.password);
      if (user != null) {
        emit(state.copyWith(status: LoginStatus.success));
      } else {
        emit(state.copyWith(status: LoginStatus.failure, error: '账号或密码错误'));
      }
    } catch (e) {
      emit(state.copyWith(status: LoginStatus.failure, error: e.toString()));
    }
  }
}

// ---- 假 Repository（仅示例） ----
abstract class AuthRepository {
  Future<Object?> login(String u, String p);
}
```

### 11.3 用 `freezed` 进一步消减样板（可选）

```dart
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:bloc/bloc.dart';

part 'login_state.freezed.dart';

@freezed
class LoginState with _$LoginState {
  const factory LoginState({
    @Default(LoginStatus.initial) LoginStatus status,
    @Default('') String error,
  }) = _LoginState;
}
```

> `freezed` 自动生成 `copyWith`、`==`、`hashCode`、联合类型（sealed union），非常适合大型状态机。代价是需要 `build_runner` 代码生成步骤。

---

## 12. 实战综合示例

### 12.1 计数器（Cubit + 全部 Widget）

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:bloc/bloc.dart';

class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
  void decrement() => emit(state - 1);
}

void main() => runApp(const CounterApp());

class CounterApp extends StatelessWidget {
  const CounterApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: BlocProvider(
        create: (_) => CounterCubit(),
        child: const CounterPage(),
      ),
    );
  }
}

class CounterPage extends StatelessWidget {
  const CounterPage({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cubit 计数器')),
      body: Center(
        child: BlocBuilder<CounterCubit, int>(
          builder: (context, count) => Text('$count',
              style: Theme.of(context).textTheme.headlineMedium),
        ),
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            onPressed: () => context.read<CounterCubit>().increment(),
            child: const Icon(Icons.add),
          ),
          const SizedBox(height: 8),
          FloatingActionButton(
            onPressed: () => context.read<CounterCubit>().decrement(),
            child: const Icon(Icons.remove),
          ),
        ],
      ),
    );
  }
}
```

### 12.2 带登录守卫的全局 Bloc + 导航

```dart
class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => AuthBloc()),
        BlocProvider(create: (_) => ThemeCubit()),
      ],
      child: MaterialApp(
        home: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, state) {
            if (state.status == AuthStatus.success) {
              return const HomePage();
            }
            return const LoginPage();
          },
        ),
      ),
    );
  }
}
```

### 12.3 搜索框（restartable 转换器 + 防抖）

```dart
import 'package:bloc/bloc.dart';
import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:rxdart/rxdart.dart';
import 'package:equatable/equatable.dart';

sealed class SearchEvent {}
final class SearchQueryChanged extends SearchEvent {
  const SearchQueryChanged(this.query);
  final String query;
}

class SearchState extends Equatable {
  const SearchState({this.results = const [], this.loading = false});
  final List<String> results;
  final bool loading;
  @override
  List<Object> get props => [results, loading];
}

class SearchBloc extends Bloc<SearchEvent, SearchState> {
  SearchBloc(this._repo) : super(const SearchState()) {
    on<SearchQueryChanged>(
      _onChanged,
      transformer: debounceRestartable(const Duration(milliseconds: 300)),
    );
  }
  final SearchRepository _repo;

  Future<void> _onChanged(SearchQueryChanged event, Emitter<SearchState> emit) async {
    if (event.query.isEmpty) {
      emit(const SearchState());
      return;
    }
    emit(state.copyWith(loading: true));
    final r = await _repo.search(event.query);
    emit(SearchState(results: r));
  }
}

// 自定义：先防抖、再 restartable（新输入到来取消旧请求）
EventTransformer<E> debounceRestartable<E>(Duration d) {
  return (events, mapper) =>
      events.debounceTime(d).switchMap(mapper); // switchMap = restartable 语义
}

abstract class SearchRepository {
  Future<List<String>> search(String q);
}
```

---

## 13. 测试（bloc_test）

`bloc_test` 提供 `blocTest` 断言「给定事件序列，应产出哪些状态」：

```dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CounterBloc', () {
    late CounterBloc bloc;
    setUp(() => bloc = CounterBloc());
    tearDown(() => bloc.close());

    test('初始状态是 0', () => expect(bloc.state, 0));

    blocTest<CounterBloc, int>(
      '收到 Increment 后状态 +1',
      build: () => CounterBloc(),
      act: (b) => b.add(CounterIncrementPressed()),
      expect: () => [1],
    );

    blocTest<CounterBloc, int>(
      '连续两次 Increment -> 1, 2',
      build: () => CounterBloc(),
      act: (b) {
        b.add(CounterIncrementPressed());
        b.add(CounterIncrementPressed());
      },
      skip: 0,
      expect: () => [1, 2],
    );

    blocTest<CounterBloc, int>(
      '用 seed 预设初始态',
      build: () => CounterBloc(),
      seed: () => 9,
      act: (b) => b.add(CounterIncrementPressed()),
      expect: () => [10],
    );
  });
}
```

Mock 依赖与 `whenListen`：

```dart
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';

class MockLoginBloc extends MockBloc<LoginEvent, LoginState> {}

void main() {
  testWidgets('登录失败时显示 SnackBar', (tester) async {
    final bloc = MockLoginBloc();
    whenListen(
      bloc,
      Stream.fromIterable([
        const LoginState(status: LoginStatus.failure, error: 'err'),
      ]),
      initialState: const LoginState(),
    );
    // ... pump Widget，断言 SnackBar 出现
  });
}
```

> `blocTest` 关键参数：`build` / `act` / `expect` / `seed` / `skip` / `verify` / `errors` / `wait`。`MockBloc` 来自 `bloc_test`，Mock 框架推荐 `mocktail`（无需代码生成）。

---

## 14. 生态库

| 库 | 作用 | 关键接口 |
| :-- | :-- | :-- |
| `bloc_concurrency` | 事件并发策略 | `concurrent()` / `sequential()` / `droppable()` / `restartable()` |
| `hydrated_bloc` | 状态持久化（自动写本地，重启恢复） | 让 Bloc 继承 `HydratedBloc`，实现 `fromJson` / `toJson`；`HydratedBloc.storage` 可换成自定义存储 |
| `replay_bloc` | 状态回放（撤销/重做） | 继承 `ReplayBloc`，`bloc.undo()` / `bloc.redo()` |
| `bloc_test` | 测试 | `blocTest` / `MockBloc` / `whenListen` |
| `equatable` | 相等性 | 重写 `props` |
| `freezed` | 不可变数据类 + union | `@freezed` 注解 + `copyWith` |
| `rxdart` | 强大 Stream 操作符（防抖/节流/合并） | `debounceTime` / `switchMap` / `throttleTime` |

`hydrated_bloc` 最小示例：

```dart
import 'package:hydrated_bloc/hydrated_bloc.dart';
import 'package:path_provider/path_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  HydratedBloc.storage = await HydratedStorage.build(
    storageDirectory: await getTemporaryDirectory(),
  );
  runApp(const App());
}

class ThemeCubit extends HydratedCubit<String> {
  ThemeCubit() : super('light');
  void toggle() => emit(state == 'light' ? 'dark' : 'light');

  @override
  String fromJson(Map<String, dynamic> json) => json['theme'] as String;
  @override
  Map<String, dynamic> toJson(String state) => {'theme': state};
}
```

---

## 15. 最佳实践与常见坑

1. **Bloc/Cubit 由 `BlocProvider` 管理生命周期**：不要在每个 `build` 里 `CounterBloc()` 新建，也不要手动 `close` 被 Provider 管理的实例——Provider 会在子树移除时自动关闭。
2. **`emit` 同状态不刷新（§6.1）**：用 `equatable` 时两次 `emit(props 相同)` 会被忽略；需要强制刷新就携带变化字段（时间戳、版本号、枚举动作）。
3. **`read` vs `watch`**：在回调里用 `read` 取实例并 `add` 事件；在 `build` 里想随状态重建才用 `watch` / `BlocBuilder`。混用会让页面无故高频重建。
4. **事件处理器里的异步 `emit`**：必须在处理器返回前（首个 `await` 之前，或 `await emit.forEach`）调用；返回后再 `emit` 会抛异常。
5. **避免在事件处理器里做无限循环**：`add` 触发 `emit`，`emit` 又 `add` 会造成事件风暴。
6. **`sealed class` 事件 + `switch` 穷尽匹配**：事件多时优先用 `sealed class`，编译器帮你检查是否漏处理。
7. **只在顶层/真正需要共享的地方放 `BlocProvider`**：范围越小越好，便于测试与回收。
8. **`BlocSelector` 优化大状态**：状态对象大、UI 只关心某字段时，用 `BlocSelector` 或 `context.select` 减少重建。
9. **监听器副作用用 `BlocListener`**：导航、Toast、弹窗等「一次性副作用」不要写进 `BlocBuilder` 的 `builder`（它会因重建多次执行）。
10. **测试优先**：Bloc/Cubit 是纯 Dart，用 `blocTest` 覆盖状态迁移，几乎不依赖 Flutter 测试环境，性价比最高。

---

## 16. 参考文档

- 官方文档：[bloclibrary.dev](https://bloclibrary.dev)（含 Counter、Timer、Infinite List、Login、Weather 等官方教程）
- `bloc` 包：<https://pub.dev/packages/bloc>
- `flutter_bloc` 包：<https://pub.dev/packages/flutter_bloc>
- `bloc_concurrency`：<https://pub.dev/packages/bloc_concurrency>
- `hydrated_bloc`：<https://pub.dev/packages/hydrated_bloc>
- `replay_bloc`：<https://pub.dev/packages/replay_bloc>
- `bloc_test`：<https://pub.dev/packages/bloc_test>
- `equatable`：<https://pub.dev/packages/equatable>
- `freezed`：<https://pub.dev/packages/freezed>
- `rxdart`：<https://pub.dev/packages/rxdart>
- GitHub 仓库：<https://github.com/felangel/bloc>
- 版本变更（9.0 取消 unmounted 崩溃、要求 bloc 9.0、Dart ≥ 2.14）：<https://pub.dev/packages/flutter_bloc/changelog>
