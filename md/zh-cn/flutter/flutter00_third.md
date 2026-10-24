---
title: Flutter 常用第三方库学习文档
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-08.jpg
tags:[flutter,dart,third-party,dio,provider,riverpod,bloc,get_it,shared_preferences,hive,sqflite,go_router,state-management,network,storage]
summary:Flutter 常用第三方库学习文档，覆盖网络（dio/retrofit）、状态管理（provider/riverpod/flutter_bloc）、依赖注入（get_it）、本地存储（shared_preferences/hive/sqflite）、路由（go_router）、图片缓存（cached_network_image）、国际化与格式化（intl）、权限（permission_handler）、媒体与文件（image_picker/path_provider）、设备工具（url_launcher/package_info_plus/connectivity_plus）、通知（flutter_local_notifications）、响应式布局（flutter_screenutil）、下拉刷新（easy_refresh）、图表（fl_chart）、JSON 序列化（json_serializable），每库均含核心 API 速查表与可运行示例
keywords:[flutter,dart,third-party,dio,provider,riverpod,bloc,get_it,shared_preferences,hive,sqflite,go_router]
top:1
copyright:true
---

# Flutter 常用第三方库学习文档

> 本文档基于 **Flutter 3.47.7（stable）** + **Dart 3.13.5**（2026-10 最新稳定版），适配空安全语法。文中各库版本号给出「截至本文编写时的稳定版本」，实际请以 [pub.dev](https://pub.dev) 最新为准（包更新很快）。文档聚焦**工程中最常用、最需要掌握接口完整度**的第三方库，每个库给出「核心 API 速查表 + 完整示例 + 进阶注意」，便于速查与上手。

---

## 目录

- [1. 包管理与版本约束](#1-包管理与版本约束)
- [2. 网络请求 Dio](#2-网络请求-dio)
- [3. 类型安全 HTTP：Retrofit](#3-类型安全-httpretrofit)
- [4. 状态管理 Provider](#4-状态管理-provider)
- [5. 状态管理 Riverpod](#5-状态管理-riverpod)
- [6. 状态管理 flutter_bloc（Bloc / Cubit）](#6-状态管理-flutter_blocbloc--cubit)
- [7. 依赖注入 get_it](#7-依赖注入-get_it)
- [8. 本地键值存储 shared_preferences](#8-本地键值存储-shared_preferences)
- [9. 本地 NoSQL 存储 Hive](#9-本地-nosql-存储-hive)
- [10. 关系型数据库 sqflite](#10-关系型数据库-sqflite)
- [11. 声明式路由 go_router](#11-声明式路由-go_router)
- [12. 图片缓存 cached_network_image](#12-图片缓存-cached_network_image)
- [13. 国际化与格式化 intl](#13-国际化与格式化-intl)
- [14. 权限申请 permission_handler](#14-权限申请-permission_handler)
- [15. 图片/文件选择 image_picker + path_provider](#15-图片文件选择-image_picker--path_provider)
- [16. 链接/包信息/网络状态](#16-链接包信息网络状态)
- [17. 本地通知 flutter_local_notifications](#17-本地通知-flutter_local_notifications)
- [18. 响应式布局 flutter_screenutil](#18-响应式布局-flutter_screenutil)
- [19. 下拉刷新/上拉加载 easy_refresh](#19-下拉刷新上拉加载-easy_refresh)
- [20. 图表 fl_chart](#20-图表-fl_chart)
- [21. JSON 序列化 json_serializable](#21-json-序列化-json_serializable)
- [22. 常见坑与最佳实践](#22-常见坑与最佳实践)
- [23. 参考文档](#23-参考文档)

---

## 1. 包管理与版本约束

所有三方库都通过 `pubspec.yaml` 的 `dependencies` 声明，再用 `flutter pub get` 拉取。

```yaml
dependencies:
  flutter:
    sdk: flutter
  #  caret 语法：^5.11.0 表示 >=5.11.0 <6.0.0（允许向后兼容的小版本/补丁）
  dio: ^5.11.0
  provider: ^6.1.0
  flutter_riverpod: ^3.4.0
  shared_preferences: ^2.5.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.0        # 代码生成（json_serializable / hive / retrofit 需要）
  json_serializable: ^6.9.0
```

常用命令：

```bash
flutter pub add dio              # 自动追加依赖并 pub get
flutter pub get                 # 拉取依赖
flutter pub upgrade              # 升级到兼容范围内的最新版
dart pub add -d build_runner     # 加 dev 依赖
flutter pub run build_runner build --delete-conflicting-outputs  # 生成 *.g.dart
```

> **版本约束速记**：`^1.2.3` = `>=1.2.3 <2.0.0`；`^0.2.3` = `>=0.2.3 <0.3.0`（0.x 的 minor 视作破坏级）；固定版本用 `1.2.3`（无 `^`）禁止自动升级。

---

## 2. 网络请求 Dio

Dio 是 Dart/Flutter 最主流的 HTTP 客户端，由 flutter.cn 维护（5.11.x），内置**拦截器、取消、超时、FormData、下载进度、自定义适配器**。

### 2.1 引入与基础 GET/POST

```yaml
dependencies:
  dio: ^5.11.0
```

```dart
import 'package:dio/dio.dart';

final dio = Dio(BaseOptions(
  baseUrl: 'https://jsonplaceholder.typicode.com',
  connectTimeout: const Duration(seconds: 5),   // Dio 5.x 用 Duration（不再是 int 毫秒）
  receiveTimeout: const Duration(seconds: 3),
  headers: {'Accept': 'application/json'},
  responseType: ResponseType.json,
));

// GET
Future<List<dynamic>> getTodos() async {
  final res = await dio.get('/todos', queryParameters: {'userId': 1});
  return res.data as List<dynamic>;
}

// POST（自动 JSON 序列化）
Future<void> createPost() async {
  final res = await dio.post('/posts', data: {
    'title': 'hello',
    'body': 'world',
    'userId': 1,
  });
  print(res.statusCode);   // 201
  print(res.data);         // 服务端回传的 Map
}
```

### 2.2 核心 API 速查

| 对象 / 方法 | 说明 |
|------|------|
| `Dio([BaseOptions?])` | 构造客户端 |
| `BaseOptions(baseUrl, connectTimeout, sendTimeout, receiveTimeout, receiveDataWhenStatusError, headers, queryParameters, contentType, responseType, validateStatus, extra)` | 全局默认配置 |
| `dio.get/post/put/patch/delete/head(url, {data, queryParameters, options, cancelToken, onSendProgress, onReceiveProgress})` | 发起请求，返回 `Future<Response>` |
| `dio.request(url, options: Options(method: 'GET'))` | 通用请求 |
| `Response.data / statusCode / statusMessage / headers / requestOptions / extra` | 响应字段 |
| `Options(method, headers, queryParameters, contentType, responseType, sendTimeout, receiveTimeout, extra, validateStatus, receiveDataWhenStatusError)` | 单次请求配置（覆盖 BaseOptions） |
| `Headers.jsonContentType` / `Headers.formUrlEncodedContentType` | 常用 Content-Type 常量 |
| `CancelToken` + `token.cancel([reason])` | 取消请求 |
| `dio.download(url, savePath, onReceiveProgress, cancelToken, options, deleteOnError)` | 下载并回调进度 |
| `FormData.fromMap({...})` / `MultipartFile.fromFile(path)` | 表单/文件上传 |
| `dio.interceptors.add(...)` | 添加拦截器 |

### 2.3 拦截器（鉴权 / 日志 / 错误处理）

```dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    options.headers['Authorization'] = 'Bearer <token>';
    handler.next(options);          // 继续
  },
  onResponse: (response, handler) => handler.next(response),
  onError: (DioException e, handler) {
    // 统一错误处理
    handler.next(e);
  },
));

// 内置日志拦截器
dio.interceptors.add(LogInterceptor(responseBody: true));

// 队列拦截器（串行，避免并发竞态）：QueuedInterceptor
```

### 2.4 错误处理（DioException）

```dart
try {
  await dio.get('/notfound');
} on DioException catch (e) {
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      print('超时: ${e.message}');
    case DioExceptionType.badResponse:
      print('服务端错误: ${e.response?.statusCode}');
    case DioExceptionType.cancel:
      print('已取消');
    case DioExceptionType.badCertificate:
    case DioExceptionType.connectionError:
    case DioExceptionType.unknown:
      print('网络/未知错误: ${e.message}');
  }
}
```

> Dio 默认对 **2xx 之外**的状态码抛 `DioExceptionType.badResponse`；`validateStatus: (s) => s! < 500` 可自定义「哪些算成功」。

### 2.5 文件上传与下载

```dart
// 多文件上传
final formData = FormData.fromMap({
  'name': 'avatar',
  'file': await MultipartFile.fromFile('/path/a.jpg', filename: 'a.jpg'),
});
await dio.post('/upload', data: formData);

// 下载带进度
await dio.download(
  'https://example.com/big.zip',
  '/tmp/big.zip',
  onReceiveProgress: (received, total) {
    if (total != -1) print('${(received / total * 100).toStringAsFixed(0)}%');
  },
  cancelToken: cancelToken,
);
```

---

## 3. 类型安全 HTTP：Retrofit

[retrofit](https://pub.dev/packages/retrofit) 基于 Dio，用注解生成类型安全的 API 层（类似 Java 的 Retrofit / TypeScript 的 axios 封装），避免手写 Dio 调用散落各处。

```yaml
dependencies:
  dio: ^5.11.0
  retrofit: ^4.2.0
  retrofit_generator: ^9.0.0   # 注意：retrofit 4.x 的生成器单独拆包
dev_dependencies:
  build_runner: ^2.4.0
  json_serializable: ^6.9.0
```

```dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import 'dart:async';

part 'api_client.g.dart';

@RestApi(baseUrl: 'https://jsonplaceholder.typicode.com')
abstract class ApiClient {
  factory ApiClient(Dio dio, {String baseUrl}) = _ApiClient;

  @GET('/todos/{id}')
  Future<Todo> getTodo(@Path('id') int id);

  @GET('/todos')
  Future<List<Todo>> listTodos(@Query('userId') int userId);

  @POST('/posts')
  Future<Post> createPost(@Body() Map<String, dynamic> body);

  @FormUrlEncoded()
  @POST('/auth/login')
  Future<Token> login(@Field() String username, @Field() String password);

  @MultiPart()
  @POST('/upload')
  Future<void> upload(@Part() File file);   // File 来自 dart:io
}

@JsonSerializable()
class Todo {
  final int id;
  final String title;
  Todo({required this.id, required this.title});
  factory Todo.fromJson(Map<String, dynamic> json) => _$TodoFromJson(json);
  Map<String, dynamic> toJson() => _$TodoToJson(this);
}
```

常用注解：`@GET/@POST/@PUT/@DELETE/@PATCH`、`@Path/@Query/@QueryMap`、`@Body`、`@Field`(配 `@FormUrlEncoded`)、`@Header`、`@MultiPart`+`@Part`(文件)。生成：`flutter pub run build_runner build --delete-conflicting-outputs`。

---

## 4. 状态管理 Provider

[provider](https://pub.dev/packages/provider) 是 Flutter 官方推荐入门的状态管理库（6.1.x），基于 `InheritedWidget` 封装，API 直观。

### 4.1 核心 API 速查

| API | 说明 |
|------|------|
| `ChangeNotifier` + `notifyListeners()` | 可观察模型基类 |
| `ChangeNotifierProvider(create)` / `.value(value)` | 提供并监听 ChangeNotifier |
| `Provider(create)` | 提供不可变对象 |
| `FutureProvider(create)` / `StreamProvider(create)` | 提供 Future/Stream 结果 |
| `MultiProvider(providers: [...])` | 组合多个 Provider |
| `Consumer<T>(builder: (ctx, value, child) => ...)` | 局部重建 |
| `context.watch<T>()` | 监听并重建 |
| `context.read<T>()` | 读取一次（不监听，常用于事件回调） |
| `context.select<T, R>(selector)` | 仅当选中片段变化才重建 |
| `Selector<A,B>(selector, builder)` | 精细化重建，避免不必要的刷新 |
| `ProxyProvider` / `ProxyProvider2..6` | 依赖其它 Provider 派生新值 |

### 4.2 示例

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class Counter with ChangeNotifier {
  int _count = 0;
  int get count => _count;
  void increment() { _count++; notifyListeners(); }
}

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => Counter()),
      ],
      child: const MyApp(),
    ),
  );
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          children: [
            // 方式1：Consumer
            Consumer<Counter>(
              builder: (_, c, __) => Text('${c.count}'),
            ),
            // 方式2：context.watch（更简洁）
            Text('${context.watch<Counter>().count}'),
            ElevatedButton(
              onPressed: () => context.read<Counter>().increment(),
              child: const Text('+1'),
            ),
          ],
        ),
      ),
    );
  }
}
```

> `context.read<T>()` 仅在回调里用（不建立监听）；UI 展示用 `watch`/`Consumer`/`select`，避免用错导致不刷新或过度刷新。

---

## 5. 状态管理 Riverpod

[flutter_riverpod](https://pub.dev/packages/flutter_riverpod) 3.x（2026-10 稳定线，当前约 3.4.x）是 Provider 的「下一代」：编译安全、无 `BuildContext` 依赖、易测试、支持 `family`/`autoDispose` 与作用域。

> **3.0 重要变更**：`StateProvider` / `StateNotifierProvider` / `ChangeNotifierProvider` 被标记为 **legacy**，需改 import 为 `package:flutter_riverpod/legacy.dart`；新代码推荐用 `Notifier`/`AsyncNotifier`。下文同时给出两种写法。

### 5.1 核心 API 速查

| API | 说明 |
|------|------|
| `ProviderScope` | 根节点（包在 `runApp` 外层） |
| `Provider((ref) => value)` | 提供不可变/派生值 |
| `StateProvider<T>((ref) => init)`（legacy） | 可变简单状态，读写 `ref.watch(p).state`/`ref.read(p).state` |
| `NotifierProvider<MyNotifier, T>(MyNotifier.new)`（现代） | 有方法的复杂状态 |
| `AsyncNotifierProvider<MyAsync, T>(MyAsync.new)`（现代） | 异步初始化状态 |
| `FutureProvider((ref) async => ...)` | 提供 Future（返回 `AsyncValue`） |
| `StreamProvider((ref) => ...)` | 提供 Stream |
| `ConsumerWidget` + `WidgetRef ref` | 可监听 Provider 的 Widget |
| `ConsumerStatefulWidget` + `ConsumerState`（含 `ref`） | 有生命周期的监听 Widget |
| `ref.watch(p)` / `ref.read(p)` / `ref.listen(p, (prev,next){})` | 读取/监听 |
| `.family` 修饰符 | 带参数生成 Provider，如 `userProvider(id)` |
| `.autoDispose` 修饰符 | 无人监听时自动释放 |
| `ref.invalidate(p)` / `ref.refresh(p)` | 失效/刷新 |
| `AsyncValue` `.when(data,loading,error)` / `.value` | 安全处理异步三态 |
| `Consumer(builder: (ctx, ref, child) => ...)` | 局部 Consumer |

### 5.2 现代写法（Notifier）

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

// 简单计数器：现代 Notifier 写法
class CounterNotifier extends Notifier<int> {
  @override
  int build() => 0;                 // 初始值
  void increment() => state++;       // 直接改 state 即通知监听者
  void decrement() => state--;
}
final counterProvider = NotifierProvider<CounterNotifier, int>(CounterNotifier.new);

// 异步数据
class UserAsync extends AsyncNotifier<User> {
  @override
  Future<User> build() async => fetchUser();
  Future<void> refresh() async => ref.invalidate(userProvider);  // 重新执行 build
}
final userProvider = AsyncNotifierProvider<UserAsync, User>(UserAsync.new);

// 带参数的 family
final userFamilyProvider =
    FutureProvider.family<User, String>((ref, id) => fetchUserById(id));

class MyHome extends ConsumerWidget {
  const MyHome({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);
    final user = ref.watch(userFamilyProvider('1'));
    return Scaffold(
      body: Column(
        children: [
          Text('count=$count'),
          ElevatedButton(
            onPressed: () => ref.read(counterProvider.notifier).increment(),
            child: const Text('+1'),
          ),
          // AsyncValue 三态处理
          user.when(
            data: (u) => Text(u.name),
            loading: () => const CircularProgressIndicator(),
            error: (e, _) => Text('出错: $e'),
          ),
        ],
      ),
    );
  }
}

void main() => runApp(ProviderScope(child: MyHome()));
```

### 5.3 legacy 写法（仍常见，需 legacy import）

```dart
import 'package:flutter_riverpod/legacy.dart';   // 3.0 起 StateProvider 在此

final countProvider = StateProvider<int>((ref) => 0);

// 使用
final n = ref.watch(countProvider);          // n 是 StateController
n.state++;                                    // 修改
// 或简洁写法：ref.watch(countProvider.notifier).state++
```

---

## 6. 状态管理 flutter_bloc（Bloc / Cubit）

[flutter_bloc](https://pub.dev/packages/flutter_bloc) 8.x 实现 BLoC 模式：用**事件驱动状态流**，适合中大型项目与需要可预测状态流的场景。`Cubit` 是简化版（无显式事件）。

### 6.1 核心 API 速查

| API | 说明 |
|------|------|
| `Cubit<State>` + `emit(state)` | 最简状态管理，直接调方法 emit |
| `Bloc<Event, State>` + `on<Event>((e, emit) async {})` | 事件→状态映射（8.x 用 `on<>` 注册） |
| `BlocBuilder<B,S>(bloc, builder)` | 根据状态重建 UI |
| `BlocProvider<B>(create)` / `.value` | 提供 Bloc/Cubit |
| `BlocListener<B,S>(listener)` | 状态变化时执行副作用（导航/弹窗） |
| `BlocConsumer<B,S>(listener, builder)` | 同时监听 + 重建 |
| `MultiBlocProvider` | 组合多个 |
| `context.read<B>()` / `context.watch<B>()` / `context.select` | 读取 |
| `BlocObserver`（`onCreate/onChange/onEvent/onTransition/onError`） | 全局监听状态变化 |
| `Equatable` | 状态/事件继承它，自动按字段判等，避免无意义刷新 |

### 6.2 Cubit 示例（推荐入门）

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/material.dart';

class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
  void decrement() => emit(state - 1);
}

class CounterPage extends StatelessWidget {
  const CounterPage({super.key});
  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => CounterCubit(),
      child: BlocBuilder<CounterCubit, int>(
        builder: (context, count) => Scaffold(
          body: Center(child: Text('$count')),
          floatingActionButton: FloatingActionButton(
            onPressed: () => context.read<CounterCubit>().increment(),
            child: const Icon(Icons.add),
          ),
        ),
      ),
    );
  }
}
```

### 6.3 Bloc 示例（事件驱动）

```dart
// 事件与状态建议用 Equatable 控制判等
class Increment extends Equatable {
  const Increment();
  @override List<Object> get props => [];
}
class CounterState extends Equatable {
  final int value;
  const CounterState(this.value);
  @override List<Object> get props => [value];
}

class CounterBloc extends Bloc<Increment, CounterState> {
  CounterBloc() : super(const CounterState(0)) {
    on<Increment>((event, emit) => emit(CounterState(state.value + 1)));
  }
}

// 使用
BlocBuilder<CounterBloc, CounterState>(
  builder: (context, state) => Text('${state.value}'),
)
```

---

## 7. 依赖注入 get_it

[get_it](https://pub.dev/packages/get_it) 是轻量 Service Locator（8.x），用于解耦对象的创建与获取，常配合 `injectable` 做代码生成。

### 7.1 核心 API 速查

| API | 说明 |
|------|------|
| `final sl = GetIt.instance;` / `GetIt.I` | 全局实例 |
| `sl.registerSingleton<T>(obj)` | 注册已存在的单例 |
| `sl.registerLazySingleton<T>(() => T())` | 首次获取时才创建 |
| `sl.registerFactory<T>(() => T())` | 每次获取都新建 |
| `sl.registerFactoryParam<T,P1,P2>((p1,p2)=>T(p1,p2))` | 带构造参数 |
| `sl.registerSingletonAsync<T>(() async => ...)` | 异步单例（需 `sl.allReady()` 等待） |
| `sl<T>()` / `sl.get<T>()` | 取出对象 |
| `sl.isRegistered<T>()` | 是否已注册 |
| `sl.unregister<T>()` | 注销 |
| `sl.reset()` | 清空所有注册 |
| `sl.pushNewScope()/popScope()` | 作用域隔离 |

### 7.2 示例

```dart
import 'package:get_it/get_it.dart';

abstract class Api { Future<String> ping(); }
class ApiImpl implements Api { @override Future<String> ping() async => 'pong'; }

final sl = GetIt.instance;

void setup() {
  sl.registerLazySingleton<Api>(() => ApiImpl());
  sl.registerFactory<Counter>(() => Counter());
}

void main() {
  setup();
  final api = sl<Api>();          // 或 sl.get<Api>()
  print(sl.isRegistered<Api>());   // true
}
```

配合 `injectable`（dev 依赖 `injectable_generator` + `build_runner`）可用 `@injectable` / `@singleton` / `@lazySingleton` / `@factoryMethod` 注解自动生成 `setup` 代码。

---

## 8. 本地键值存储 shared_preferences

[shared_preferences](https://pub.dev/packages/shared_preferences) 2.5.x 是官方封装的**轻量键值存储**（Android 用 SharedPreferences、iOS/macOS 用 NSUserDefaults、Web 用 localStorage）。适合小配置、登录态、用户偏好，**不适合大量/结构化数据**（那种用 Hive/sqflite）。

### 8.1 核心 API 速查

| 方法 | 说明 |
|------|------|
| `await SharedPreferences.getInstance()` | 获取实例（单例） |
| `setInt/setBool/setDouble/setString/setStringList(key, value)` | 写入，返回 `Future<bool>` |
| `getInt/getBool/getDouble/getString/getStringList(key)` | 读取（无则返回 null） |
| `containsKey(key)` / `getKeys()` | 是否存在 / 所有键 |
| `remove(key)` / `clear()` | 删除单键 / 清空 |
| `reload()` | 重新从磁盘加载（多进程场景） |
| `setMockInitialValues({...})` | 测试用，预设初始值 |

### 8.2 示例

```dart
import 'package:shared_preferences/shared_preferences.dart';

Future<void> saveToken(String token) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('token', token);
}

Future<String?> readToken() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString('token');
}

Future<void> logout() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('token');
  // 或 await prefs.clear();
}
```

---

## 9. 本地 NoSQL 存储 Hive

[Hive](https://pub.dev/packages/hive) 2.2.x 是纯 Dart 实现的**极快 NoSQL 数据库**（无原生依赖、跨平台），适合结构化本地数据。需 `hive_flutter` 配合 Flutter 生命周期。

### 9.1 核心 API 速查

| 方法 | 说明 |
|------|------|
| `await Hive.initFlutter()` / `Hive.init(path)` | 初始化（Flutter 用 initFlutter） |
| `Hive.openBox('name')` / `openBox<T>('name')` | 打开/创建盒子（类似表） |
| `box.put(key, value)` / `box.get(key, defaultValue)` | 写入/读取 |
| `box.putAll({...})` / `box.add(value)`（自增键） | 批量 / 追加 |
| `box.getAt(index)` / `box.deleteAt(index)` | 按下标读写 |
| `box.delete(key)` / `box.deleteAll(keys)` / `box.clear()` | 删除 |
| `box.keys` / `box.values` / `box.length` / `box.isEmpty` | 遍历与计数 |
| `box.watch()` | 监听变化（返回 `BoxEvent` 流） |
| `Hive.box('name')` | 取已打开的盒子 |
| `Hive.registerAdapter(Adapter())` | 注册自定义类型适配器 |
| `@HiveType` / `@HiveField(n)` + `HiveObject` | 类型化模型（`save()/delete()`） |

### 9.2 类型化模型 + 示例

```dart
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';

part 'person.g.dart';

@HiveType(typeId: 0)
class Person extends HiveObject {
  @HiveField(0) String name;
  @HiveField(1) int age;
  Person({required this.name, required this.age});
}

Future<void> main() async {
  await Hive.initFlutter();
  Hive.registerAdapter(PersonAdapter());          // 由 build_runner 生成
  final box = await Hive.openBox<Person>('people');

  final p = Person(name: '张三', age: 18);
  await box.add(p);          // 自动获得 key，p.save() 亦可
  p.age = 19; await p.save();  // HiveObject 可直接保存

  for (var person in box.values) {
    print('${person.name} - ${person.age}');
  }
}
```

生成适配器：`flutter pub run build_runner build --delete-conflicting-outputs`（`dev_dependencies` 加 `hive_generator`）。

---

## 10. 关系型数据库 sqflite

[sqflite](https://pub.dev/packages/sqflite) 2.4.x 是 SQLite 的 Flutter 封装，适合**结构化、需查询/事务**的本地数据。

### 10.1 核心 API 速查

| API | 说明 |
|------|------|
| `getDatabasesPath()` | 获取数据库目录 |
| `openDatabase(path, version, onCreate, onUpgrade, onDowngrade, onOpen)` | 打开/创建 |
| `db.insert(table, values, conflictAlgorithm)` | 插入（返回 row id） |
| `db.query(table, columns, where, whereArgs, groupBy, having, orderBy, limit, offset)` | 查询（安全占位 `?`） |
| `db.rawQuery('SELECT * FROM t WHERE id = ?', [id])` | 原生 SQL 查询 |
| `db.update(table, values, where, whereArgs, conflictAlgorithm)` | 更新 |
| `db.delete(table, where, whereArgs)` | 删除 |
| `db.rawInsert/rawUpdate/rawDelete` | 原生 SQL 写 |
| `db.transaction((txn) async { ... })` | 事务 |
| `db.batch()` → `Batch`（`insert/update/delete/query`，`commit(noResult:true)`） | 批量 |
| `ConflictAlgorithm.abort/fail/ignore/replace/rollback` | 冲突策略 |
| `db.close()` | 关闭 |

### 10.2 示例

```dart
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

Future<Database> openDb() async {
  final path = join(await getDatabasesPath(), 'app.db');
  return openDatabase(
    path,
    version: 1,
    onCreate: (db, version) async {
      await db.execute(
        'CREATE TABLE todos(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, done INTEGER)',
      );
    },
  );
}

Future<void> insertTodo(Database db, String title) async {
  await db.insert(
    'todos',
    {'title': title, 'done': 0},
    conflictAlgorithm: ConflictAlgorithm.replace,
  );
}

Future<List<Map<String, dynamic>>> pending(Database db) async {
  return db.query('todos', where: 'done = ?', whereArgs: [0]);
}

Future<void> markDone(Database db, int id) async {
  await db.update('todos', {'done': 1}, where: 'id = ?', whereArgs: [id]);
}
```

> 务必用 **`whereArgs` 占位**而非字符串拼接，防止 SQL 注入与类型错误。

---

## 11. 声明式路由 go_router

[go_router](https://pub.dev/packages/go_router) 18.x（由 flutter.dev 维护）基于 Navigator 2.0，提供**声明式、URL 驱动、支持深层链接**的路由方案。

### 11.1 核心 API 速查

| API | 说明 |
|------|------|
| `GoRouter(routes, initialLocation, redirect, errorBuilder, refreshListenable)` | 路由器 |
| `GoRoute(path, name, builder/pageBuilder, redirect, routes)` | 单一路由（支持子路由） |
| `ShellRoute(builder, routes)` / `StatefulShellRoute.indexedStack` | 带持久 UI（如底部导航） |
| `GoRouterState`（`path/fullPath/name/pathParameters/queryParameters/extra/error/uri`） | 路由上下文 |
| `context.go('/path')` / `context.push('/path')` | 跳转 / 入栈 |
| `context.pushNamed('name', pathParameters, queryParameters, extra)` | 按命名路由跳转 |
| `context.replace('/path')` / `context.pop()` / `context.canPop()` | 替换 / 返回 |
| `MaterialApp.router(routerConfig: router)` | 接入路由 |
| `GoRouter.of(context)` / `router.go()/push()` | 命令式导航 |

### 11.2 示例

```dart
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';

final router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (ctx, state) => const HomePage()),
    GoRoute(
      path: '/detail/:id',
      name: 'detail',
      builder: (ctx, state) {
        final id = state.pathParameters['id']!;            // 路径参数
        final q = state.uri.queryParameters['ref'];          // 查询参数
        return DetailPage(id: id, ref: q);
      },
    ),
  ],
  redirect: (ctx, state) {
    // 登录态守卫：未登录跳 /login
    final loggedIn = false; // 实际来自你的状态
    if (!loggedIn && state.matchedLocation != '/login') return '/login';
    return null; // 返回 null 表示不重定向
  },
  errorBuilder: (ctx, state) => ErrorPage(state.error),
);

void main() => runApp(MaterialApp.router(routerConfig: router));
```

在任意页面的 `build` 中跳转（`extra` 可携带任意附加对象）：

```dart
Widget build(BuildContext context) {
  return ElevatedButton(
    onPressed: () => context.goNamed(
      'detail',
      pathParameters: {'id': '42'},
      queryParameters: {'ref': 'home'},
      extra: someObject,
    ),
    child: const Text('去详情'),
  );
}
```

> `refreshListenable` 接 `ValueNotifier`/`ChangeNotifier`，当其变化时触发 `redirect` 重新评估（用于登录态变化后刷新路由）。

---

## 12. 图片缓存 cached_network_image

[cached_network_image](https://pub.dev/packages/cached_network_image) 3.5.x 提供**带磁盘/内存缓存的网络图片**，避免重复下载、支持占位与错误图。

### 12.1 核心 API 速查

| 属性 | 说明 |
|------|------|
| `imageUrl` | 图片地址 |
| `placeholder` / `progressIndicatorBuilder` | 加载占位（含进度） |
| `errorWidget` | 加载失败占位 |
| `fadeInDuration` / `fadeOutDuration` | 渐显/渐隐 |
| `width` / `height` / `fit` | 尺寸与缩放 |
| `memCacheWidth` / `memCacheHeight` | 内存缓存尺寸（省内存，强烈建议设） |
| `httpHeaders` | 自定义请求头（鉴权图） |
| `cacheManager` | 自定义缓存策略（CacheManager） |
| `imageBuilder` | 拿到 ImageProvider 后自定义渲染 |

### 12.2 示例

```dart
import 'package:cached_network_image/cached_network_image.dart';

Widget cachedAvatar() => CachedNetworkImage(
  imageUrl: 'https://example.com/a.jpg',
  memCacheWidth: 400,                 // 按显示尺寸缓存，省内存
  placeholder: (ctx, url) => const CircularProgressIndicator(),
  errorWidget: (ctx, url, err) => const Icon(Icons.error),
  imageBuilder: (ctx, imageProvider) => Container(
    decoration: BoxDecoration(image: DecorationImage(image: imageProvider, fit: BoxFit.cover)),
  ),
);
```

---

## 13. 国际化与格式化 intl

[intl](https://pub.dev/packages/intl) 0.20.x 提供日期、数字、货币格式化与 `Intl.message` 国际化基础（配合 `flutter_localizations` + `.arb` 文件做多语言）。

### 13.1 核心 API 速查

| API | 说明 |
|------|------|
| `DateFormat('yyyy-MM-dd HH:mm:ss').format(date)` | 日期格式化 |
| `DateFormat.yMd() / .Hms()` 等预定义 | 本地化日期格式 |
| `DateFormat('yyyy-MM-dd').parse('2026-01-01')` | 字符串解析为 DateTime |
| `NumberFormat('#,##0.00')` | 千分位/小数 |
| `NumberFormat.currency(locale:'zh_CN', symbol:'¥')` | 货币 |
| `NumberFormat.percentPattern()` / `.compact()` | 百分比 / 紧凑计数 |
| `Intl.defaultLocale = 'zh_CN'` | 设置默认 locale |
| `Intl.message(text, name, args, desc)` | 可提取的国际化消息 |

### 13.2 示例

```dart
import 'package:intl/intl.dart';

void demo() {
  final now = DateTime.now();
  print(DateFormat('yyyy-MM-dd HH:mm').format(now));   // 2026-10-23 14:30
  print(DateFormat.yMMMd('zh_CN').format(now));        // 2026年10月23日

  final n = NumberFormat.currency(locale: 'zh_CN', symbol: '¥');
  print(n.format(1234567.5));                          // ¥1,234,567.50
  print(NumberFormat.compact('zh_CN').format(1234567)); // 123万
}
```

Flutter 多语言接入：

```yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: ^0.20.0
```

```dart
return MaterialApp(
  localizationsDelegates: const [
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ],
  supportedLocales: const [Locale('zh'), Locale('en')],
);
```

---

## 14. 权限申请 permission_handler

[permission_handler](https://pub.dev/packages/permission_handler) 13.0.2（2026-10）由 Baseflow 维护，提供**跨平台（Android/iOS/Web/Windows）统一权限 API**。

### 14.1 核心 API 速查

| API | 说明 |
|------|------|
| `Permission.camera / .location / .locationWhenInUse / .photos / .microphone / .contacts / .notification / .storage / .calendar` 等 | 各类权限 |
| `await permission.status` | 当前状态：`PermissionStatus` |
| `await permission.request()` | 发起申请，返回 `PermissionStatus` |
| `status.isGranted / .isDenied / .isLimited / .isRestricted / .isPermanentlyDenied / .isProvisional` | 状态判定 |
| `await permission.onGranted` | 流，授权时触发（配合 listen） |
| `openAppSettings()` | 跳系统设置页（永久拒绝后引导） |
| `permission.serviceStatus` → `ServiceStatus` | 服务是否开启（定位常用） |

### 14.2 示例与重要变更

```dart
import 'package:permission_handler/permission_handler.dart';

Future<bool> ensureCamera() async {
  var status = await Permission.camera.status;
  if (status.isGranted) return true;
  status = await Permission.camera.request();
  if (status.isGranted) return true;
  if (status.isPermanentlyDenied) {
    await openAppSettings();     // 引导去设置开启
    return false;
  }
  return false;                  // 仅本次拒绝，可稍后再试
}
```

> **⚠️ 13.x 重要变更（Android）**：`status` 不再返回 `permanentlyDenied`——所有被拒的运行期权限都返回 `denied`；**只有 `request()` 的结果才可能是 `permanentlyDenied`**。iOS 行为不变（`status` 仍可返回 `permanentlyDenied`）。因此正确流程是：先看 `status`，被拒就 `request()`，再根据请求结果判断是否永久拒绝并引导设置。
>
> **平台配置**：Android 需在 `AndroidManifest.xml` 声明权限（且 `compileSdk` 需满足插件要求，13.x 配套 `permission_handler_android 14.x` 要求 `compileSdk = 37`）；iOS 需 `Info.plist` 的 usage description（或在 Podfile 的 `GCC_PREPROCESSOR_DEFINITIONS` 开启对应 `PERMISSION_*` 宏）。

---

## 15. 图片/文件选择 image_picker + path_provider

- [image_picker](https://pub.dev/packages/image_picker) 1.2.x：调起系统相机/相册。
- [path_provider](https://pub.dev/packages/path_provider) 2.2.x：获取各平台标准目录。

### 15.1 核心 API 速查

| API | 说明 |
|------|------|
| `ImagePicker()` + `pickImage(source, maxWidth, maxHeight, imageQuality, preferredCameraDevice)` | 选/拍单张图，返回 `XFile?` |
| `pickVideo(source, maxDuration)` / `pickMultiImage()` / `pickMedia()` | 视频 / 多图 / 混合 |
| `XFile.path / .name / .readAsBytes() / .readAsString()` | 文件信息 |
| `getTemporaryDirectory()` / `getApplicationDocumentsDirectory()` | 临时目录 / 文档目录 |
| `getApplicationSupportDirectory()` / `getDownloadsDirectory()` | 支持目录 / 下载目录 |
| `getExternalStorageDirectory()`（仅 Android） | 外部存储根 |

### 15.2 示例

```dart
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

Future<String?> pickAndSave() async {
  final picker = ImagePicker();
  final XFile? img = await picker.pickImage(
    source: ImageSource.gallery,
    maxWidth: 1080,
    imageQuality: 85,
  );
  if (img == null) return null;
  final dir = await getApplicationDocumentsDirectory();
  final newPath = '${dir.path}/${img.name}';
  await File(img.path).copy(newPath);   // 复制到应用私有目录
  return newPath;
}
```

---

## 16. 链接/包信息/网络状态

三个小工具库常被一起使用：

### 16.1 url_launcher（6.3.x）

```dart
import 'package:url_launcher/url_launcher.dart';

Future<void> openUrl() async {
  final uri = Uri.parse('https://flutter.dev');
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
// LaunchMode：platformDefault / externalApplication / inAppWebView / externalNonBrowserApplication
```

### 16.2 package_info_plus（8.x）

```dart
import 'package:package_info_plus/package_info_plus.dart';
final info = await PackageInfo.fromPlatform();
print('${info.appName} ${info.version}(${info.buildNumber})'); // 包名/版本/构建号
```

### 16.3 connectivity_plus（6.x）

```dart
import 'package:connectivity_plus/connectivity_plus.dart';
final c = Connectivity();
final result = await c.checkConnectivity();          // ConnectivityResult
if (result == ConnectivityResult.none) { /* 离线 */ }
// 监听变化：c.onConnectivityChanged（Stream<ConnectivityResult>）
```

> `connectivity_plus` 只告诉你「接入了哪种网络」，不保证「真的能上网」；需要真实连通性请额外发一个轻量请求。

---

## 17. 本地通知 flutter_local_notifications

[flutter_local_notifications](https://pub.dev/packages/flutter_local_notifications) 18.x 提供跨平台本地通知（含定时/周期通知，定时需用 `timezone` 包处理时区）。

### 17.1 核心 API 速查

| API | 说明 |
|------|------|
| `FlutterLocalNotificationsPlugin()` | 实例 |
| `initialize(InitializationSettings, onDidReceiveNotificationResponse)` | 初始化 |
| `AndroidInitializationSettings('@mipmap/ic_launcher')` / `DarwinInitializationSettings()` | 平台初始化配置 |
| `NotificationDetails(android, iOS)` | 通知详情 |
| `AndroidNotificationDetails(channelId, channelName, channelDescription, importance, priority)` | Android 通道（必须） |
| `DarwinNotificationDetails()` | iOS 详情 |
| `show(id, title, body, details, payload)` | 立即显示 |
| `zonedSchedule(id, ...)` | 定时（需 `timezone` + `initializeTimeZones()`） |
| `cancel(id)` / `cancelAll()` / `pendingNotificationRequests()` | 取消 / 查询 |

### 17.2 示例

```dart
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final plugin = FlutterLocalNotificationsPlugin();

Future<void> initNotify() async {
  const android = AndroidInitializationSettings('@mipmap/ic_launcher');
  const ios = DarwinInitializationSettings();
  await plugin.initialize(
    const InitializationSettings(android: android, iOS: ios),
    onDidReceiveNotificationResponse: (resp) {
      // 点击通知回调（resp.payload）
    },
  );
}

Future<void> showNotify() async {
  const android = AndroidNotificationDetails(
    'default', '默认', channelDescription: '通用通知',
    importance: Importance.max, priority: Priority.high,
  );
  const ios = DarwinNotificationDetails();
  await plugin.show(1, '标题', '内容', const NotificationDetails(android: android, iOS: ios));
}
```

---

## 18. 响应式布局 flutter_screenutil

[flutter_screenutil](https://pub.dev/packages/flutter_screenutil) 5.9.x 按设计稿尺寸做**屏幕自适应**（px → 实际屏幕比例），避免不同设备 UI 错位。

### 18.1 核心 API 速查

| API | 说明 |
|------|------|
| `ScreenUtilInit(designSize: Size(375,812), minTextAdapt, splitScreenMode, builder)` | 根节点包裹 |
| `100.w` / `200.h` | 按宽度 / 高度适配 |
| `16.sp` | 字体自适应（sp） |
| `.r` / `.radius` | 圆角/尺寸统一适配 |
| `ScreenUtil().screenWidth / screenHeight / pixelRatio / statusBarHeight` | 屏幕尺寸信息 |
| `ScreenUtil().setWidth(n) / setHeight(n) / setSp(n)` | 等价 `.w/.h/.sp` 的函数式写法 |

### 18.2 示例

```dart
import 'package:flutter_screenutil/flutter_screenutil.dart';

Widget app() => ScreenUtilInit(
  designSize: const Size(375, 812),
  minTextAdapt: true,
  splitScreenMode: true,
  builder: (context, child) => MaterialApp(home: child),
  child: Builder(
    builder: (ctx) => Scaffold(
      body: Container(
        width: 200.w, height: 80.h,
        margin: EdgeInsets.all(12.r),
        child: Text('Hello', style: TextStyle(fontSize: 16.sp)),
      ),
    ),
  ),
);
```

---

## 19. 下拉刷新/上拉加载 easy_refresh

[easy_refresh](https://pub.dev/packages/easy_refresh) 3.4.x 提供**下拉刷新 + 上拉加载**能力，内置经典/材质/球型等多种 Header/Footer。

```dart
import 'package:easy_refresh/easy_refresh.dart';
import 'package:flutter/material.dart';

class ListPage extends StatefulWidget {
  const ListPage({super.key});
  @override
  State<ListPage> createState() => _ListPageState();
}
class _ListPageState extends State<ListPage> {
  final _controller = EasyRefreshController();
  int _page = 0;
  final _items = <int>[];

  @override
  Widget build(BuildContext context) {
    return EasyRefresh(
      controller: _controller,
      header: const ClassicHeader(),
      footer: const ClassicFooter(),
      onRefresh: () async {
        _page = 0; _items.clear();
        await Future.delayed(const Duration(seconds: 1));
        _items.addAll([1, 2, 3]);
        setState(() {});
      },
      onLoad: () async {
        _page++;
        await Future.delayed(const Duration(seconds: 1));
        _items.addAll([4, 5, 6]);
        setState(() {});
        if (_page >= 3) _controller.finishLoad(IndicatorResult.noMore);
      },
      child: ListView.builder(
        itemCount: _items.length,
        itemBuilder: (_, i) => ListTile(title: Text('Item ${_items[i]}')),
      ),
    );
  }
}
```

> `EasyRefreshController` 还可命令式调用：`_controller.callRefresh()` / `callLoad()` / `finishRefresh()` / `finishLoad()`。

---

## 20. 图表 fl_chart

[fl_chart](https://pub.dev/packages/fl_chart) 0.70.x 是纯 Dart 实现的图表库，支持折线/柱状/饼图等。

```dart
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

// 折线图
Widget lineChart() => LineChart(
  LineChartData(
    lineBarsData: [
      LineChartBarData(
        spots: const [FlSpot(0, 1), FlSpot(1, 3), FlSpot(2, 2), FlSpot(3, 5)],
        isCurved: true,
        dotData: const FlDotData(show: false),
      ),
    ],
  ),
);

// 柱状图
Widget barChart() => BarChart(
  BarChartData(
    barGroups: [
      BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 8, color: Colors.blue)]),
      BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 12, color: Colors.green)]),
    ],
  ),
);

// 饼图
Widget pieChart() => PieChart(
  PieChartData(
    sections: [
      PieChartSectionData(value: 40, title: 'A', color: Colors.blue),
      PieChartSectionData(value: 60, title: 'B', color: Colors.orange),
    ],
  ),
);
```

---

## 21. JSON 序列化 json_serializable

[json_serializable](https://pub.dev/packages/json_serializable) 6.9.x + `build_runner` 用注解生成 `fromJson/toJson`，是 Flutter 模型层事实标准（替代手写 JSON 解析）。

```yaml
dependencies:
  json_annotation: ^4.9.0
dev_dependencies:
  build_runner: ^2.4.0
  json_serializable: ^6.9.0
```

```dart
import 'package:json_annotation/json_annotation.dart';
part 'user.g.dart';

@JsonSerializable()
class User {
  final String name;
  @JsonKey(name: 'created_at') final DateTime createdAt;   // 字段重命名
  User({required this.name, required this.createdAt});

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);
}
```

生成命令：`flutter pub run build_runner build --delete-conflicting-outputs`。常用选项：`@JsonSerializable(explicitToJson: true)`（嵌套对象需开启）、`@JsonKey(includeIfNull: false)`、`ignore: true`、`defaultValue`。

---

## 22. 常见坑与最佳实践

1. **状态管理选型**：简单页面用 `Provider`/`Riverpod`；事件流/可预测状态用 `flutter_bloc`；小工具/Demo 别上重型框架。团队统一一种，避免混用。
2. **`context.read` vs `context.watch`**：`read` 只在回调里用，UI 展示用 `watch`/`Consumer`/`select`，混用会导致「点了不刷新」。
3. **Riverpod 3.0 legacy**：新代码用 `Notifier`/`AsyncNotifier`，旧 `StateProvider` 需 `import 'package:flutter_riverpod/legacy.dart'`。
4. **Dio 超时是 Duration**：Dio 5.x 的 `connectTimeout/sendTimeout/receiveTimeout` 是 `Duration`（4.x 是 int 毫秒），传错类型会编译失败。
5. **Dio 默认对非 2xx 抛异常**：`try/on DioException` 处理；自定义成功区间用 `validateStatus`。
6. **存储选型**：小配置用 `shared_preferences`；结构化/大量用 `Hive` 或 `sqflite`；**绝不用 SharedPreferences 存大数据或列表**。
7. **sqflite 防注入**：一律用 `whereArgs` 占位，不要字符串拼接 SQL。
8. **权限 13.x 变更**：Android 上 `status` 不再返回 `permanentlyDenied`，只有 `request()` 结果才会；流程按「先 status → 再 request → 再判断」写。
9. **网络图片内存**：`cached_network_image` 务必设 `memCacheWidth/memCacheHeight`，否则大图撑爆内存。
10. **go_router 登录守卫**：用 `redirect` + `refreshListenable`，而不是在页面里手动跳转（避免闪烁与循环）。
11. **代码生成类（hive/retrofit/json_serializable）**：改模型后记得 `build_runner` 重新生成，否则运行时报 `MissingGeneratedFromJson` 之类错误。
12. **不要在主 isolate 做重 CPU 活**：JSON 解析大对象、图片处理用 `compute` 或 `Isolate`，避免掉帧。

---

## 23. 参考文档

- [Dart packages 总入口（pub.dev）](https://pub.dev)
- [Dio 官方文档](https://pub.dev/packages/dio)
- [Retrofit for Dart](https://pub.dev/packages/retrofit)
- [Provider](https://pub.dev/packages/provider)
- [Riverpod（含 3.0 迁移指南）](https://riverpod.dev/docs/3.0_migration)
- [flutter_bloc](https://pub.dev/packages/flutter_bloc) / [Bloc 官方文档](https://bloclibrary.dev)
- [get_it](https://pub.dev/packages/get_it) / [injectable](https://pub.dev/packages/injectable)
- [shared_preferences](https://pub.dev/packages/shared_preferences)
- [Hive](https://pub.dev/packages/hive) / [hive_flutter](https://pub.dev/packages/hive_flutter)
- [sqflite](https://pub.dev/packages/sqflite)
- [go_router](https://pub.dev/packages/go_router)
- [cached_network_image](https://pub.dev/packages/cached_network_image)
- [intl](https://pub.dev/packages/intl)
- [permission_handler](https://pub.dev/packages/permission_handler)
- [image_picker](https://pub.dev/packages/image_picker) / [path_provider](https://pub.dev/packages/path_provider)
- [url_launcher](https://pub.dev/packages/url_launcher) / [package_info_plus](https://pub.dev/packages/package_info_plus) / [connectivity_plus](https://pub.dev/packages/connectivity_plus)
- [flutter_local_notifications](https://pub.dev/packages/flutter_local_notifications)
- [flutter_screenutil](https://pub.dev/packages/flutter_screenutil)
- [easy_refresh](https://pub.dev/packages/easy_refresh)
- [fl_chart](https://pub.dev/packages/fl_chart)
- [json_serializable](https://pub.dev/packages/json_serializable)
- [Flutter 官方包发现站 Flutter Gems](https://fluttergems.dev)

> 说明：本文基于 Flutter **3.47.7** + Dart **3.13.5**（2026-10 稳定版）编写；各第三方库版本号给出编写时稳定线，实际请以 pub.dev 最新发布为准。Riverpod、permission_handler、go_router 等在大版本间存在 API 差异（如 Riverpod 3.0 的 legacy 迁移、permission_handler 13.x 的 Android `status` 行为、go_router 18.x 的 `StatefulShellRoute`），迁移时务必对照官方 Changelog。
