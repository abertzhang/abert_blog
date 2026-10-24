---
title: Flutter 状态管理 Riverpod 完全指南
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-17.jpg
tags:[flutter,riverpod,state-management,provider,notifier,codegen,async,state,advanced]
summary:Flutter 三方状态管理库 Riverpod 完全学习文档，系统讲解 Riverpod 的核心概念（Provider、ref、WidgetRef、ProviderContainer、ProviderScope）、全部 Provider 类型（Provider / StateProvider / StateNotifierProvider / NotifierProvider / AsyncNotifierProvider / FutureProvider / StreamProvider）、family 参数化、autoDispose 自动释放、ref.watch/read/listen/select、AsyncValue 完整 API、组合依赖、修饰符、ProviderObserver 与生命周期回调、override 覆盖、单元测试、riverpod_annotation 代码生成（@riverpod / build_runner），并给出计数器、异步数据加载、购物车、多 Provider 组合等综合实战与常见坑排查
keywords:[flutter,riverpod,state-management,notifier,codegen,asyncvalue,provider,family,autodispose]
top:1
copyright:true
---

# Flutter 状态管理 Riverpod 完全指南

> 本文档基于 **Flutter 3.47.7（stable）** + **Dart 3.13.5** + **Riverpod 3.0**（2026-10 最新稳定版）。Riverpod 由 `Provider` 的原作者 Remi Rousselet 重新设计，解决了 `provider` 包的诸多痛点（编译安全、无 `BuildContext` 依赖、可组合、可测试、支持多实例）。本文档同时覆盖**手写 Provider** 与**代码生成（`riverpod_annotation`）** 两种写法，并尽可能完整地列出每个接口的参数与示例。

## 目录

- [1. Riverpod 是什么 / 为什么](#1-riverpod-是什么--为什么)
- [2. 安装与最小可运行骨架](#2-安装与最小可运行骨架)
- [3. 核心概念](#3-核心概念)
- [4. 消费状态：Consumer 家族](#4-消费状态consumer-家族)
- [5. ref 三件套：watch / read / listen](#5-ref-三件套watch--read--listen)
- [6. 基础 Provider：只读状态](#6-基础-provider只读状态)
- [7. StateProvider：可变基础状态](#7-stateprovider可变基础状态)
- [8. StateNotifierProvider（旧写法）](#8-statenotifierprovider旧写法)
- [9. NotifierProvider：新标准写法](#9-notifierprovider新标准写法)
- [10. AsyncNotifierProvider：异步状态](#10-asyncnotifierprovider异步状态)
- [11. FutureProvider / StreamProvider](#11-futureprovider--streamprovider)
- [12. AsyncValue 完整 API](#12-asyncvalue-完整-api)
- [13. 组合与依赖注入](#13-组合与依赖注入)
- [14. .select 选择性重建](#14-select-选择性重建)
- [15. family：参数化 Provider](#15-family参数化-provider)
- [16. autoDispose 与 keepAlive](#16-autodispose-与-keepalive)
- [17. 生命周期回调：onDispose / onCancel / onResume](#17-生命周期回调ondispose--oncancel--onresume)
- [18. 主动失效与刷新：invalidate / refresh](#18-主动失效与刷新invalidate--refresh)
- [19. override 覆盖：测试与多环境](#19-override-覆盖测试与多环境)
- [20. ProviderObserver：全局监听](#20-providerobserver全局监听)
- [21. 代码生成（riverpod_annotation）](#21-代码生成riverpod_annotation)
- [22. 综合实战](#22-综合实战)
- [23. 性能优化与最佳实践](#23-性能优化与最佳实践)
- [24. 常见坑与排查](#24-常见坑与排查)
- [25. 参考文档](#25-参考文档)

---

## 1. Riverpod 是什么 / 为什么

Riverpod 是一个**编译安全的响应式状态管理库**。它在 `provider` 包的基础上重新设计，彻底告别 `BuildContext` 依赖与运行时 `ProviderNotFoundException`。

| 能力 | provider 包 | Riverpod |
|---|---|---|
| 是否依赖 `BuildContext` 读取 | 是（必须 widget 树内） | 否（`ref` 独立持有） |
| 编译期检查 provider 是否存在 | ❌ 运行时报错 | ✅ 编译期即发现 |
| 同一类型多个不同 provider | 易冲突 | ✅ 每个都是唯一对象 |
| 组合 / 依赖其他 provider | 有限 | ✅ `ref.watch` 任意组合 |
| 自动释放不再使用的状态 | ❌ | ✅ `autoDispose` |
| 单元测试 / 多环境替换 | 麻烦 | ✅ `override` 一等公民 |

> 一句话：**Provider 是「生产状态的函数」，ref 是「读取/订阅其它 Provider 的句柄」，Widget 通过 `Consumer` 把 Provider 的值「订阅」进 UI。**

Riverpod 有多个发行包，按需选择：

| 包名 | 用途 |
|---|---|
| `flutter_riverpod` | Flutter 项目标准选择（含 `ConsumerWidget` 等 UI 集成） |
| `riverpod` | 纯 Dart（无 Flutter 依赖，可用于 CLI / 后端） |
| `flutter_riverpod_hooks` | 配合 `flutter_hooks` 用 `useProvider` 风格（本文略） |
| `riverpod_annotation` | 代码生成注解（`@riverpod`），搭配 `build_runner` |
| `riverpod_lint` | 官方 lint 规则（强制 `.notifier`、`keepAlive` 等最佳实践） |

---

## 2. 安装与最小可运行骨架

### 2.1 pubspec.yaml

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^3.0.0          # Flutter 集成
  # riverpod_annotation: ^3.0.0     # 代码生成时用
  # dev_dependencies:
  #   build_runner: ^2.4.0
  #   riverpod_generator: ^3.0.0
  #   riverpod_lint: ^3.0.0
```

> 安装：`flutter pub add flutter_riverpod`。若用代码生成，再 `flutter pub add dev:build_runner dev:riverpod_generator dev:riverpod_lint`，并 `flutter pub add riverpod_annotation`。

### 2.2 最小骨架：ProviderScope

所有 Riverpod 状态必须包在 **`ProviderScope`** 下，它是整个应用的状态根容器。

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// 1) 定义一个最简单的 Provider
final helloProvider = Provider<String>((ref) {
  return 'Hello Riverpod';
});

void main() {
  // 2) 用 ProviderScope 包裹根 MaterialApp
  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: Center(
          // 3) 用 Consumer 读取 provider
          child: Consumer(
            builder: (context, ref, child) {
              final msg = ref.watch(helloProvider);
              return Text(msg);
            },
          ),
        ),
      ),
    );
  }
}
```

`ProviderScope` 关键参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `child` | `Widget` | 子树根（一般放 `MaterialApp`） |
| `overrides` | `List<Override>` | 覆盖部分 Provider（测试/多环境用） |
| `observers` | `List<ProviderObserver>` | 全局监听 Provider 生命周期事件 |

---

## 3. 核心概念

| 概念 | 说明 |
|---|---|
| **Provider** | 一个「生产某个值的函数」对象。本身不可变，是状态身份的锚点。 |
| **ref** (`Ref` / `WidgetRef`) | 在 Provider 内部用 `Ref` 读依赖、注册生命周期；在 Widget 内用 `WidgetRef` 读/监听/订阅。 |
| **ProviderContainer** | 状态的运行时容器（持有缓存、订阅关系）。`ProviderScope` 内部自动创建一个；纯 Dart 测试需手动 `ProviderContainer()`。 |
| **WidgetRef** | `ConsumerWidget` 的 `build` 第二参数，等价于 widget 视角的 `ref`。 |
| **Consumer / ConsumerWidget / ConsumerStatefulWidget** | 把 Provider 的值「接进」UI 的桥梁组件。 |
| **AsyncValue<T>** | 异步 Provider（`FutureProvider`/`AsyncNotifier`）的统一包装：`data` / `loading` / `error` 三态。 |

> Riverpod 的「响应式」本质：`ref.watch(provider)` 建立订阅，provider 的值变化 → 仅重建**依赖它的那部分** widget。`ref.read` 不订阅（一次性读取），`ref.listen` 不重建、只在变化时执行回调。

---

## 4. 消费状态：Consumer 家族

| 组件 | 适用场景 |
|---|---|
| `Consumer(builder: (ctx, ref, child) {...})` | 在已有 `StatelessWidget` 内局部订阅 |
| `ConsumerWidget` | 整个 widget 都是 Consumer（用 `ref` 代替 `context` 读状态） |
| `ConsumerStatefulWidget` + `ConsumerState` | 需要 `initState` / `dispose` / 动画控制器等生命周期 |
| `HookConsumerWidget` | 配合 `flutter_hooks`（本文不展开） |

```dart
// 方式 A：ConsumerWidget（最常用）
class CounterText extends ConsumerWidget {
  const CounterText({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider); // 订阅
    return Text('$count');
  }
}

// 方式 B：在普通 StatelessWidget 内用 Consumer 局部订阅
class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer(
        builder: (context, ref, _) {
          final count = ref.watch(counterProvider);
          return Center(child: Text('$count'));
        },
      ),
      floatingActionButton: Consumer(
        builder: (context, ref, _) {
          return FloatingActionButton(
            onPressed: () => ref.read(counterProvider.notifier).increment(),
            child: const Icon(Icons.add),
          );
        },
      ),
    );
  }
}

// 方式 C：需要生命周期时
class TimerPage extends ConsumerStatefulWidget {
  const TimerPage({super.key});
  @override
  ConsumerState<TimerPage> createState() => _TimerPageState();
}

class _TimerPageState extends ConsumerState<TimerPage> {
  late final Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      ref.read(counterProvider.notifier).increment();
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final count = ref.watch(counterProvider);
    return Text('ticks: $count');
  }
}
```

---

## 5. ref 三件套：watch / read / listen

`WidgetRef`（widget 视角）与 `Ref`（provider 内部）都提供这三个方法。

| 方法 | 是否订阅 | 触发重建 | 典型用途 |
|---|---|---|---|
| `ref.watch(p)` | ✅ | 值变化重建 widget | 把状态显示到 UI |
| `ref.read(p)` | ❌ | 不重建 | 事件回调里取 notifier / 一次性取值 |
| `ref.listen(p, (prev, next) {...})` | ✅（不重建） | 仅在变化时执行回调 | 弹 Toast / 跳转 / 日志 |

```dart
// watch：UI 跟随变化
final name = ref.watch(userNameProvider);

// read：事件里调用，避免订阅导致按钮重建
ElevatedButton(
  onPressed: () => ref.read(submitProvider).submit(),
  child: const Text('提交'),
);

// listen：监听但不重建；返回 void，可在 initState/button 里用
ref.listen(authStateProvider, (previous, next) {
  if (next.hasError) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('登录失败：${next.error}')),
    );
  }
});

// widget 内用 listen 需在 build 期调用（或 ConsumerState 的 build）
// 若要在 initState 监听，用 ref.listenManual（3.0 提供，不自动在 widget 销毁时取消需要手动管理）
```

> **3.0 新增** `ref.listenManual(provider, callback, onError)`：可在 `initState` 等非 build 上下文监听，返回 `void` 且需自行在 `dispose` 取消（通过返回的 `ProviderSubscription.cancel()`）。普通 `ref.listen` 只能在 `build` 中调用，会随 widget 销毁自动移除。

---

## 6. 基础 Provider：只读状态

`Provider` 用于**不希望被修改**的派生值 / 配置 / 服务。

```dart
// 只读常量 / 配置
final appNameProvider = Provider<String>((ref) => '我的博客');

// 派生状态：依赖其它 Provider 计算
final cartProvider = Provider<List<Product>>((ref) {
  return ref.watch(rawCartProvider); // 组合其它 provider
});

// 暴露一个服务类（单例风格）
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(baseUrl: 'https://api.example.com');
});

// 使用
class Page extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final api = ref.watch(apiClientProvider); // 拿到 ApiClient 实例
    return Text(api.baseUrl);
  }
}
```

`Provider` 构造函数关键参数：

| 参数 | 说明 |
|---|---|
| `name` | 调试名（DevTools 显示）；代码生成自动生成 |
| `dependencies` | 显式声明依赖（一般自动推断，跨包时需手写） |

> `Provider` 没有 `.notifier`、没有 `.state`，因为**它产出的值不可变**。需要「可变状态」请用 `StateProvider` / `NotifierProvider`。

---

## 7. StateProvider：可变基础状态

`StateProvider` 适合**简单的可写值**（整型、枚举、布尔、字符串），等价于「一个能改的变量」。

```dart
// 定义
final counterProvider = StateProvider<int>((ref) => 0);
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

// 读取（watch）
final count = ref.watch(counterProvider); // int

// 写入：通过 .notifier.state
ref.read(counterProvider.notifier).state++;      // +1
ref.read(counterProvider.notifier).state = 10;   // 直接赋值
ref.watch(themeModeProvider.notifier).state = ThemeMode.dark;

// 便捷：StateProvider 本身也实现了 .state 语法糖（2.x 起）
ref.read(counterProvider).state++; // 等价上面

// 在 UI 中
class CounterButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);
    return Column(
      children: [
        Text('$count'),
        ElevatedButton(
          onPressed: () => ref.read(counterProvider.notifier).state++,
          child: const Text('+1'),
        ),
      ],
    );
  }
}
```

> ⚠️ **lint 提示**：`riverpod_lint` 建议复杂状态用 `NotifierProvider` 而非 `StateProvider`。`StateProvider` 仅适合「单一标量 + 直接赋值」的场景；需要封装业务逻辑（加减、校验、副作用）请走 `Notifier`。

---

## 8. StateNotifierProvider（旧写法）

> 这是 Riverpod 2.x 的「标准可变状态」写法，**Riverpod 3.0 已推荐改用 `NotifierProvider`**（见第 9 节）。此处保留以兼容既有代码。

```dart
// 1) 继承 StateNotifier
class Counter extends StateNotifier<int> {
  Counter() : super(0);

  void increment() => state++;
  void decrement() => state--;
  void setTo(int v) => state = v;
}

// 2) 声明 provider（需写明状态类型 <int> 与 Notifier 类型 <Counter>）
final counterProvider = StateNotifierProvider<Counter, int>((ref) {
  return Counter();
});

// 使用
ref.watch(counterProvider);                          // 读 int
ref.read(counterProvider.notifier).increment();      // 调方法
```

`StateNotifier` 关键成员：

| 成员 | 说明 |
|---|---|
| `state` | 当前状态，赋值即通知监听者 |
| `mounted` | provider 是否被释放 |
| `onDispose(cb)` | 释放时回调 |
| `update(cb)` | `state = cb(state)` 的便捷写法 |

---

## 9. NotifierProvider：新标准写法

Riverpod 3.0 的**推荐可变状态方案**。`Notifier` / `AsyncNotifier` 直接持有 `ref`，无需 `StateNotifier` 那套继承壳。

### 9.1 同步 Notifier

```dart
// 1) 继承 Notifier<T>，实现 build() 返回初始状态
class CounterNotifier extends Notifier<int> {
  @override
  int build() => 0;                 // 初始值

  void increment() => state++;
  void decrement() => state--;
  void reset() => state = 0;
  void add(int n) => state += n;
}

// 2) 声明：NotifierProvider<Notifier类, 状态类型>
final counterProvider = NotifierProvider<CounterNotifier, int>(CounterNotifier.new);

// 使用
class CounterView extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);                 // 读 int
    final notifier = ref.watch(counterProvider.notifier);     // 读 notifier 本身（不订阅值）
    return Column(
      children: [
        Text('$count'),
        Row(
          children: [
            IconButton(onPressed: notifier.decrement, icon: const Icon(Icons.remove)),
            IconButton(onPressed: notifier.increment, icon: const Icon(Icons.add)),
          ],
        ),
      ],
    );
  }
}
```

### 9.2 Notifier 完整 API

| 成员 | 说明 |
|---|---|
| `build()` | 必须重写，返回初始状态 |
| `state` | 当前状态；赋值即通知 |
| `ref` | 内置 `Ref`，用于 `ref.watch` 依赖、`ref.onDispose` 等 |
| `ref.watch/ read/ listen` | 组合依赖 / 订阅 |

### 9.3 复杂业务 Notifier（购物车示例）

```dart
class CartNotifier extends Notifier<List<CartItem>> {
  @override
  List<CartItem> build() => [];

  void add(Product p) {
    final existing = state.where((e) => e.id == p.id).firstOrNull;
    if (existing != null) {
      state = [
        for (final e in state)
          if (e.id == p.id) e.copyWith(qty: e.qty + 1) else e,
      ];
    } else {
      state = [...state, CartItem(id: p.id, name: p.name, qty: 1)];
    }
  }

  void remove(String id) => state = state.where((e) => e.id != id).toList();

  void clear() => state = [];

  int get totalQty => state.fold(0, (s, e) => s + e.qty);
}

final cartProvider = NotifierProvider<CartNotifier, List<CartItem>>(CartNotifier.new);
```

---

## 10. AsyncNotifierProvider：异步状态

当初始状态来自异步操作（网络 / 数据库）时使用。

```dart
class UserNotifier extends AsyncNotifier<User> {
  @override
  Future<User> build() async {
    // 初始加载：相当于 FutureProvider 的异步函数
    return ref.watch(apiClientProvider).fetchCurrentUser();
  }

  // 重新加载
  Future<void> reload() async {
    state = const AsyncLoading();            // 手动置为加载中
    state = await AsyncValue.guard(() => ref.read(apiClientProvider).fetchCurrentUser());
  }

  Future<void> updateName(String name) async {
    // 基于当前值做乐观更新 / 再拉取
    final updated = await ref.read(apiClientProvider).updateName(name);
    state = AsyncData(updated);
  }
}

final userProvider = AsyncNotifierProvider<UserNotifier, User>(UserNotifier.new);

// 消费：用 AsyncValue 的 when
class ProfilePage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProvider);
    return user.when(
      loading: () => const CircularProgressIndicator(),
      error: (e, st) => Text('出错：$e'),
      data: (u) => Text(u.name),
    );
  }
}
```

`AsyncNotifier` 额外成员：

| 成员 | 说明 |
|---|---|
| `state` | `AsyncValue<T>`（可能是 loading/data/error） |
| `build()` | 返回 `Future<T>` / `Stream<T>` |
| `AsyncValue.guard(fn)` | 把可能抛错的异步函数包装成 `AsyncValue`（自动处理 error） |
| `update(fn)` | 基于当前 data 派生新值（3.0 提供） |

---

## 11. FutureProvider / StreamProvider

用于「一次性异步值」或「持续流」，无需写 Notifier。

```dart
// FutureProvider：一次性的异步结果
final configProvider = FutureProvider<AppConfig>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.fetchConfig();
});

// StreamProvider：持续的事件流（如实时位置、WebSocket）
final ticksProvider = StreamProvider<int>((ref) async* {
  for (var i = 0; i < 100; i++) {
    await Future.delayed(const Duration(seconds: 1));
    yield i;
  }
});

// 消费（两者都产出 AsyncValue）
class ConfigView extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(configProvider);
    return config.when(
      loading: () => const Text('加载配置中…'),
      error: (e, _) => Text('失败：$e'),
      data: (c) => Text('版本：${c.version}'),
    );
  }
}
```

> `FutureProvider` / `StreamProvider` 的返回值类型固定为 `AsyncValue<T>`。它们同样支持 `.family` / `.autoDispose` 修饰（见后文）。

---

## 12. AsyncValue 完整 API

`AsyncValue<T>` 是异步 Provider 的统一包装，三态：`AsyncData` / `AsyncLoading` / `AsyncError`。

### 12.1 常用构造与判断

```dart
final av = ref.watch(futureProvider);

// 类型判断
av.hasValue;        // bool
av.hasError;        // bool
av.isLoading;       // bool（= 当前是 AsyncLoading）
av.value;           // T?（data 时非 null，否则 null）
av.valueOrNull;     // 同 value
av.requireValue;    // T（非 data 时抛 StateError）
av.error;           // Object?
av.stackTrace;      // StackTrace?
```

### 12.2 when（最常用，必须处理三态）

```dart
av.when(
  data: (value) => Text('$value'),
  loading: () => const CircularProgressIndicator(),
  error: (err, stack) => Text('错误：$err'),
);
```

### 12.3 其它模式匹配方法

| 方法 | 说明 |
|---|---|
| `whenData((T) => Widget)` | 仅处理 data，loading/error 时返回 null（常用于子组件） |
| `maybeWhen({data, loading, error, orElse})` | 按需匹配，其余走 `orElse` |
| `map(...)` / `mapOrNull(...)` | 内部用 `AsyncData`/`AsyncLoading`/`AsyncError` 做穷尽匹配 |
| `whenOrNull(...)` | 没匹配上返回 null |

```dart
// whenData：只在有值时渲染，否则不占空间
final body = av.whenData((value) => Text(value.name)).value;

// maybeWhen：只对 error 特殊处理
av.maybeWhen(
  error: (e, _) => Text('加载失败，点此重试', style: TextStyle(color: Colors.red)),
  orElse: () => const SizedBox.shrink(),
);
```

---

## 13. 组合与依赖注入

Riverpod 的强项是**在 Provider 内部用 `ref.watch` 组合其它 Provider**，形成依赖图，自动级联更新。

```dart
// 底层配置
final baseUrlProvider = Provider<String>((ref) => 'https://api.example.com');

// 中间服务（依赖 baseUrl）
final apiClientProvider = Provider<ApiClient>((ref) {
  final baseUrl = ref.watch(baseUrlProvider);   // 组合
  return ApiClient(baseUrl: baseUrl);
});

// 派生数据（依赖服务 + 其它 provider）
final articlesProvider = FutureProvider<List<Article>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final cat = ref.watch(selectedCategoryProvider); // 分类变化 → 自动重算
  return api.fetchArticles(category: cat);
});

// 组合多个值做计算
final cartTotalProvider = Provider<double>((ref) {
  final items = ref.watch(cartProvider);
  final prices = ref.watch(priceTableProvider);
  return items.fold(0.0, (sum, it) => sum + (prices[it.id] ?? 0) * it.qty);
});
```

> 关键点：当 `selectedCategoryProvider` 变化，`articlesProvider` **自动失效并重算**（Riverpod 管理依赖图），UI 自动刷新。这是 Riverpod 响应式组合的核心。

---

## 14. .select 选择性重建

默认 `ref.watch(provider)` 在 provider 的**任何**值变化时都重建。若只想在「某个字段」变化时重建，用 `.select`。

```dart
// 只在 user.name 变化时重建 Text，user.age 变化不会触发
final name = ref.watch(userProvider.select((u) => u.name));
Text(name);

// 多字段组合（返回不可变元组 / 计算值）
final label = ref.watch(userProvider.select((u) => '${u.name}#${u.id}'));

// 旧写法 state.select（StateNotifier）现已统一为 provider.select
```

> **性能优化要点**：列表项、`ValueListenableBuilder` 类场景优先用 `.select`，避免无关字段变更引发的整列表重建。`.select` 内部用 `==` 比较结果；若返回对象请保证其 `==` 正确（或返回基本类型）。

---

## 15. family：参数化 Provider

`family` 让一个 Provider 接收参数，按参数生成**独立缓存实例**。典型场景：按 id 取详情、按关键词搜索。

```dart
// 定义：泛型追加参数类型 <int>
final articleProvider = FutureProvider.family<Article, int>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  return api.fetchArticle(id);
});

// 使用：把参数传入 ()
final article = ref.watch(articleProvider(123));

// 多个参数：用自定义类 / 记录（record）打包
typedef SearchArgs = ({String q, int page});
final searchProvider = FutureProvider.family<List<Item>, SearchArgs>(
  (ref, args) => ref.watch(apiClientProvider).search(args.q, args.page),
);
ref.watch(searchProvider((q: 'riverpod', page: 1)));

// 也可传对象，但需正确实现 == / hashCode（推荐用 Freezed / 记录）
class UserId {
  const UserId(this.id);
  final String id;
  @override
  bool operator ==(Object o) => o is UserId && o.id == id;
  @override
  int get hashCode => id.hashCode;
}
```

> family 的每个 `(参数)` 组合都是一个独立 Provider 实例，拥有独立缓存与生命周期（配合 `.autoDispose` 可在不再使用时释放）。

---

## 16. autoDispose 与 keepAlive

默认 Provider 在**不再被任何 widget 监听**时会被释放并清空缓存（Riverpod 2.x 起 `autoDispose` 已是多数 Provider 的默认行为，旧版需手动加 `.autoDispose`）。

```dart
// 显式声明自动释放（3.0 多数场景默认即此行为，可省略）
final detailProvider = FutureProvider.autoDispose<Article>((ref) async {
  return ref.watch(apiClientProvider).fetchArticle(ref.id); // ref.id 见下方 keepAlive 说明
});

// 永不释放（保持缓存，如全局用户态、配置）
final userProvider = AsyncNotifierProvider<UserNotifier, User>.keepAlive(
  UserNotifier.new,
);
// 旧写法：在 build() 内 ref.keepAlive()
```

### keepAlive 与 ref.keepAlive()

| 方式 | 说明 |
|---|---|
| `Provider.keepAlive(...)` / 修饰符 | 声明该 Provider 永不自动释放 |
| `ref.keepAlive()` | 在 `build()` 内**条件性**保持存活（如「已加载过就缓存」） |
| `ref.maintainState`（旧） | 已被 `keepAlive` 取代 |

```dart
final detailProvider = FutureProvider.autoDispose<Article>((ref) async {
  final data = await ref.watch(apiClientProvider).fetchArticle(1);
  // 加载成功后不再释放（避免切走再回来重新请求）
  ref.keepAlive();
  return data;
});
```

---

## 17. 生命周期回调：onDispose / onCancel / onResume

`Ref` 提供生命周期钩子，用于释放资源、取消订阅、清理。

```dart
final timerProvider = StreamProvider.autoDispose<int>((ref) async* {
  // 释放时清理
  ref.onDispose(() {
    debugPrint('timerProvider 被释放，取消计时器');
  });

  // 没有监听者时（注意 autoDispose 会直接 dispose；此回调用于非自动释放场景）
  ref.onCancel(() {
    debugPrint('暂时无监听者');
  });

  // 重新有监听者
  ref.onResume(() {
    debugPrint('恢复监听');
  });

  for (var i = 0;; i++) {
    await Future.delayed(const Duration(seconds: 1));
    yield i;
  }
});
```

| 方法 | 触发时机 |
|---|---|
| `ref.onDispose(cb)` | Provider 被销毁（失效/自动释放）时 |
| `ref.onCancel(cb)` | 最后一个监听者移除（**非** autoDispose 场景） |
| `ref.onResume(cb)` | 重新出现监听者 |

> 典型用途：`TextEditingController`、`AnimationController`、`StreamSubscription`、`Timer` 的 cancel；在 `onDispose` 里统一清理。

---

## 18. 主动失效与刷新：invalidate / refresh

| 方法 | 行为 |
|---|---|
| `ref.invalidate(provider)` | 立即使 provider 失效；下次读取时重新执行 `build()`（保留 autoDispose 行为） |
| `ref.refresh(provider)` | 立即失效并**同步返回新值**（旧版语义；3.0 推荐用 `invalidate` + 重新 `watch`） |
| `ref.invalidateSelf()` | 在 Provider 内部让**自己**重新计算（避免递归时直接用自身 watch 的陷阱） |
| `notifier.invalidateSelf()` / `notifier.update(...)` | Notifier 内部触发重新 build |

```dart
// 下拉刷新：让列表重新拉取
RefreshIndicator(
  onRefresh: () async {
    ref.invalidate(articlesProvider);   // 下次 watch 会重算
    await ref.read(articlesProvider.future); // 等完成
  },
  child: ListView(...),
);

// Provider 内部根据依赖变化自动重建自己
final nowProvider = StreamProvider<DateTime>((ref) {
  ref.onDispose(() {});
  return Stream.periodic(const Duration(seconds: 1), (_) => DateTime.now());
});

// AsyncNotifier 里重新加载
Future<void> reload() async {
  ref.invalidateSelf();                   // 触发 build() 重新执行
  await future;                            // 等待新的 build 完成
}
```

---

## 19. override 覆盖：测试与多环境

`override` 是 Riverpod 的「依赖替换」机制，可用于**单元测试、预览、多后端环境**。

```dart
// 测试：用假数据替换真实 API
final container = ProviderContainer(
  overrides: [
    apiClientProvider.overrideWithValue(ApiClient.fake()),
    counterProvider.overrideWith((ref) => 42),  // 直接给值
  ],
);

// 读取测试态
final v = container.read(counterProvider); // 42

// 监听变化
container.listen(counterProvider, (prev, next) => print(next));

// 在 ProviderScope 顶层覆盖（多环境）
ProviderScope(
  overrides: [
    baseUrlProvider.overrideWithValue('https://staging.example.com'),
  ],
  child: MyApp(),
);
```

override 形式：

| 写法 | 用途 |
|---|---|
| `provider.overrideWithValue(value)` | 替换为常量值 |
| `provider.overrideWith((ref) => ...)` | 替换为由函数产生的值（2.x：`overrideWithProvider`） |
| `notifierProvider.overrideWith(Notifier.new)` | 替换 Notifier 实现（可用于测试 subclass） |

### 单元测试模板

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod/riverpod.dart';

void main() {
  test('counter increments', () {
    final container = ProviderContainer();
    expect(container.read(counterProvider), 0);
    container.read(counterProvider.notifier).increment();
    expect(container.read(counterProvider), 1);
    addTearDown(container.dispose); // 必须释放
  });
}
```

---

## 20. ProviderObserver：全局监听

监听所有 Provider 的创建、更新、销毁，用于日志、埋点、调试。

```dart
class LoggerObserver extends ProviderObserver {
  @override
  void didAddProvider(ProviderBase provider, Object? value, ProviderContainer container) {
    debugPrint('➕ ${provider.name ?? provider.runtimeType} = $value');
  }

  @override
  void didUpdateProvider(
    ProviderBase provider,
    Object? previousValue,
    Object? newValue,
    ProviderContainer container,
  ) {
    debugPrint('🔁 ${provider.name}: $previousValue → $newValue');
  }

  @override
  void didDisposeProvider(ProviderBase provider, ProviderContainer container) {
    debugPrint('➖ ${provider.name}');
  }
}

// 使用
void main() => runApp(
      ProviderScope(
        observers: [LoggerObserver()],
        child: const MyApp(),
      ),
    );
```

`ProviderObserver` 可重写的方法：`didAddProvider` / `didUpdateProvider` / `didDisposeProvider` / `didFailToCreateProvider`（创建抛错时）。

---

## 21. 代码生成（riverpod_annotation）

Riverpod 官方**推荐使用代码生成**（`@riverpod`），避免手写 `Provider` 包装、自动处理 `family`/`keepAlive`/命名，并兼容 `riverpod_lint`。

### 21.1 配置

```yaml
dependencies:
  flutter_riverpod: ^3.0.0
  riverpod_annotation: ^3.0.0
dev_dependencies:
  build_runner: ^2.4.0
  riverpod_generator: ^3.0.0
  riverpod_lint: ^3.0.0
```

```bash
flutter pub run build_runner build --delete-conflicting-outputs
# 或监听模式：flutter pub run build_runner watch
```

### 21.2 基础用法

```dart
// counter.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'counter.g.dart';

@riverpod
int counter(Ref ref) {        // 函数名 counter → 自动生成 counterProvider
  return 0;
}

@riverpod
class Counter extends _$Counter {   // 类写法 → CounterProvider（首字母大写）
  @override
  int build() => 0;

  void increment() => state++;
}
```

```dart
// 使用（与手写一致）
ref.watch(counterProvider);
ref.read(counterProvider.notifier).increment();
```

### 21.3 family / keepAlive / 依赖

```dart
@riverpod
Future<Article> article(Ref ref, int id) async {   // 参数 = family
  return ref.watch(apiClientProvider).fetchArticle(id);
}
// → articleProvider(123)

@Riverpod(keepAlive: true)            // 等价于 .keepAlive 修饰
User currentUser(Ref ref) { ... }
// → currentUserProvider

@riverpod
String greeting(Ref ref) {
  final name = ref.watch(userNameProvider);   // 自动依赖
  return 'Hello $name';
}
```

### 21.4 Async 代码生成

```dart
@riverpod
class UserController extends _$UserController {
  @override
  Future<User> build() async {
    return ref.watch(apiClientProvider).fetchCurrentUser();
  }

  Future<void> reload() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.watch(apiClientProvider).fetchCurrentUser(),
    );
  }
}
// → userControllerProvider（AsyncNotifierProvider）
```

> 代码生成的命名规则：函数 `foo` → `fooProvider`；类 `Foo` → `FooProvider`（类名首字母大写，后缀 `Provider`）。配合 `riverpod_lint`，规则会**强制**你用 `.notifier` 取方法、用 `keepAlive` 而非旧 `autoDispose` 写法，是团队最佳实践。

---

## 22. 综合实战

### 22.1 计数器（最最小闭环）

```dart
final counterProvider = NotifierProvider<CounterNotifier, int>(CounterNotifier.new);

class CounterNotifier extends Notifier<int> {
  @override
  int build() => 0;
  void increment() => state++;
}
```

### 22.2 异步文章列表 + 下拉刷新 + 分类筛选

```dart
// 选中分类
final selectedCategoryProvider = StateProvider<String>((ref) => 'all');

// 文章列表：依赖分类，分类变化自动重算
final articlesProvider = FutureProvider.autoDispose<List<Article>>((ref) async {
  final cat = ref.watch(selectedCategoryProvider);
  final api = ref.watch(apiClientProvider);
  return api.fetchArticles(category: cat);
});

class ArticleListPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final articles = ref.watch(articlesProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(articlesProvider);
        await ref.read(articlesProvider.future);
      },
      child: articles.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('加载失败：$e')),
        data: (list) => ListView.builder(
          itemCount: list.length,
          itemBuilder: (_, i) => ListTile(title: Text(list[i].title)),
        ),
      ),
    );
  }
}
```

### 22.3 购物车（Notifier + 派生总价）

```dart
final cartProvider = NotifierProvider<CartNotifier, List<CartItem>>(CartNotifier.new);
final priceTableProvider = Provider<Map<String, double>>((ref) => {...});

final cartTotalProvider = Provider<double>((ref) {
  final items = ref.watch(cartProvider);
  final prices = ref.watch(priceTableProvider);
  return items.fold(0.0, (s, it) => s + (prices[it.id] ?? 0) * it.qty);
});

class CartPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cartProvider);
    final total = ref.watch(cartTotalProvider);
    return Column(
      children: [
        ...items.map((e) => Text('${e.name} x${e.qty}')),
        Text('合计：¥$total'),
      ],
    );
  }
}
```

### 22.4 多 Provider 组合 + select 优化

```dart
final userProvider = AsyncNotifierProvider<UserNotifier, User>(UserNotifier.new);

class UserNameText extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 只关心 name，user.age 变化不会重建本组件
    final name = ref.watch(userProvider.select((u) => u.value?.name ?? '加载中'));
    return Text(name);
  }
}
```

---

## 23. 性能优化与最佳实践

1. **`.select` 精细化订阅**：列表项、详情子组件用 `select` 避免整树重建。
2. **`autoDispose` 默认开启**：瞬时数据（详情页、搜索结果）让其自动释放，避免内存堆积；全局态（用户、配置）用 `keepAlive`。
3. **派生状态用 `Provider` 而非存副本**：`cartTotalProvider` 这类计算值不要单独存，用 `ref.watch` 组合，保证单一数据源。
4. **不在 `build` 里做副作用**：`ref.read(provider.notifier).xxx()` 放在事件回调；订阅用 `watch`。
5. **`ref.read` 不订阅**：按钮、定时器、生命周期里取值用 `read`，避免无谓重建。
6. **代码生成优先**：`@riverpod` + `riverpod_lint` 自动规避 `autoDispose`/`notifier` 误用。
7. **Provider 命名**：手写时给 `name` 便于 DevTools 调试；代码生成自动带名。
8. **测试用 `ProviderContainer`**：覆盖依赖、断言状态、记得 `dispose`。
9. **大列表用 `ListView.builder` + `Consumer` 包裹项**：只在项级别订阅，而非整列表。
10. **异步统一 `AsyncValue`**：用 `.when` 处理三态，避免手动 `if (loading)` 分支散落。

---

## 24. 常见坑与排查

| 症状 | 原因 | 解决 |
|---|---|---|
| `Bad state: No ProviderScope found` | 忘记包 `ProviderScope` | 根 `MaterialApp` 外包 `ProviderScope` |
| `ProviderNotFoundException` | 用了 `provider` 包的 `context.read` | Riverpod 用 `ref.watch/read`，不是 `context.read` |
| 值变化 UI 不刷新 | 在 `build` 外用 `ref.read` 订阅 | 改为 `ref.watch`；或事件里 `read` 后 `setState` |
| `StateProvider` 被 lint 警告 | 业务逻辑应放 Notifier | 改用 `NotifierProvider` |
| 内存泄漏 / 状态不释放 | 未用 `autoDispose` | 瞬时数据加 `.autoDispose` |
| `ref.watch(provider.notifier)` 重建 | `notifier` 本身不变，不应 watch 它取值 | 取值用 `ref.watch(provider)`；拿 notifier 用 `ref.read(provider.notifier)` |
| `build()` 里递归 `ref.watch(自身)` | 导致无限循环 | 用 `ref.invalidateSelf()` + `await future` |
| 代码生成不生效 | 没跑 `build_runner` 或 `part` 缺失 | 跑 `build_runner build`；确认 `part 'x.g.dart'` |
| `AsyncValue.when` 没覆盖三态 | 编译报错 | 必须提供 `data/loading/error` 三者 |
| 测试里状态串味 | 没 `dispose` container | `addTearDown(container.dispose)` |

---

## 25. 参考文档

- Riverpod 官方文档：<https://riverpod.dev/>
- Riverpod 中文文档：<https://riverpod.dev/zh-Hans/>
- riverpod_annotation（代码生成）：<https://pub.dev/packages/riverpod_annotation>
- riverpod_lint（最佳实践 lint）：<https://pub.dev/packages/riverpod_lint>
- Flutter 官方状态管理概览：<https://docs.flutter.dev/data-and-backend/state-mgmt>
- 本文配套示例仓库（手写 + 代码生成对照）：见项目 `knot_phone` / `tool_box` 中 Riverpod 用法

> 本文档示例基于 Riverpod 3.0 语法（Notifier 为标准写法、autoDispose 默认开启、riverpod_lint 强制最佳实践）。若你仍在使用 Riverpod 2.x，主要差异在 `StateNotifierProvider` 仍可作标准、`overrideWith` 旧版用 `overrideWithProvider`，其余 API 基本兼容。
