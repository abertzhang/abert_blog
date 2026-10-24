---
title: Flutter Dio 网络请求库学习文档
create:2026-10-23
update:2026-10-23
category:flutter
cover:https://img-common.aknot.uk/cover/land-29.jpg
tags:[flutter,dart,dio,http,network,interceptor,formdata,canceltoken,upload,download,retry,retrofit]
summary:Flutter 三方网络库 Dio 全解，覆盖 Dio 类核心 API、BaseOptions/Options/RequestOptions 三件套、超时配置、请求/响应对象、DioException 错误处理、拦截器链（onRequest/onResponse/onError、QueuedInterceptor、LogInterceptor、自定义 token 刷新与重试）、CancelToken 取消、FormData 文件上传、download 下载、MultipartFile、HttpClientAdapter 适配器（代理/证书校验/HTTP2/Native）、Transformer 响应转换、Retrofit 类型安全封装与最佳实践，每节均含可直接运行的示例
keywords:[flutter,dart,dio,http,interceptor,formdata,canceltoken,upload,download,retry,retrofit,network]
top:1
copyright:true
---

# Flutter Dio 网络请求库学习文档

> 基于 **Dio 5.11.1（stable，flutter.cn 维护，2026-10 最新稳定版）** + **Flutter 3.47.7** + **Dart 3.13.5**。Dio 是 Dart/Flutter 生态中最成熟的 HTTP 客户端，提供全局配置、拦截器（Interceptors）、FormData 表单、请求取消（CancelToken）、文件上传下载、超时控制、自定义适配器（Adapter）与转换器（Transformer）等能力，是构建生产级网络层的首选。本文从安装讲起，逐层覆盖 Dio 的完整接口与内部机制，力求接口齐全、示例可直接运行。

## 目录

- [1. Dio 简介与为何选择它](#1-dio-简介与为何选择它)
- [2. 安装与最小可运行示例](#2-安装与最小可运行示例)
- [3. Dio 类核心 API 总览](#3-dio-类核心-api-总览)
- [4. Options 三件套：BaseOptions / Options / RequestOptions](#4-options-三件套baseoptions--options--requestoptions)
- [5. 超时配置：connect / send / receive / transform](#5-超时配置connect--send--receive--transform)
- [6. 请求方法详解（get / post / put / delete / patch / head / request / fetch）](#6-请求方法详解)
- [7. 请求体 data 的数据类型](#7-请求体-data-的数据类型)
- [8. 查询参数与路径写法](#8-查询参数与路径写法)
- [9. 请求头 Headers 的注入方式](#9-请求头-headers-的注入方式)
- [10. Response 响应对象详解](#10-response-响应对象详解)
- [11. Headers 类与 dart:io 的差异](#11-headers-类与-dartio-的差异)
- [12. 错误处理：DioException 与 DioExceptionType](#12-错误处理dioexception-与-dioexceptiontype)
- [13. 拦截器 Interceptors 机制](#13-拦截器-interceptors-机制)
- [14. 内置拦截器：LogInterceptor 与 CookieManager](#14-内置拦截器loginterceptor-与-cookiemanager)
- [15. 自定义拦截器实战：token 注入、401 刷新重试、签名、缓存](#15-自定义拦截器实战token-注入401-刷新重试签名缓存)
- [16. QueuedInterceptor：解决 401 惊群](#16-queuedinterceptor解决-401-惊群)
- [17. CancelToken 请求取消](#17-canceltoken-请求取消)
- [18. FormData 表单与文件上传](#18-formdata-表单与文件上传)
- [19. MultipartFile 全构造工厂](#19-multipartfile-全构造工厂)
- [20. 文件下载 download 与 downloadUri](#20-文件下载-download-与-downloaduri)
- [21. HttpClientAdapter 适配器：代理 / 证书校验 / HTTP2 / Native](#21-httpclientadapter-适配器代理--证书校验--http2--native)
- [22. Transformer 与 BackgroundTransformer](#22-transformer-与-backgroundtransformer)
- [23. 请求/响应编解码：requestEncoder 与 responseDecoder](#23-请求响应编解码requestencoder-与-responsedecoder)
- [24. 代理与 SSL 证书校验](#24-代理与-ssl-证书校验)
- [25. HTTP/2 支持](#25-http2-支持)
- [26. 与 Retrofit 结合：类型安全的 REST 客户端](#26-与-retrofit-结合类型安全的-rest-客户端)
- [27. 与 json_serializable 模型序列化](#27-与-json_serializable-模型序列化)
- [28. 单例封装与最佳实践](#28-单例封装与最佳实践)
- [29. 常见坑与排错清单](#29-常见坑与排错清单)
- [30. 参考文档](#30-参考文档)

---

## 1. Dio 简介与为何选择它

Dio 官方定义为「a powerful HTTP networking package for Dart/Flutter」。相比 Dart 官方 `http` 包，它把生产环境真正需要的网络能力一次性打包：

| 能力 | http（官方） | Dio |
| --- | --- | --- |
| 全局 baseUrl / 公共请求头 | 需子类化 `BaseClient` | `BaseOptions` 一行配置 |
| 超时 | 无内置，需 `Future.timeout` | `connectTimeout`/`sendTimeout`/`receiveTimeout`/`transformTimeout` |
| 拦截器 | 无 | `InterceptorsWrapper`/`QueuedInterceptor`/`LogInterceptor` |
| 文件上传进度 | 手动流式 | `FormData` + `onSendProgress` |
| 文件下载进度 | 手动流式 | `download` + `onReceiveProgress` |
| 请求取消 | `AbortableRequest`（1.5+） | `CancelToken` |
| 自动抛错（4xx/5xx） | 需手动判 `statusCode` | 默认抛出 `DioException(type: badResponse)` |
| 类型安全封装 | 无 | 配合 Retrofit 代码生成 |

Dio 5.x 相比 4.x 的主要破坏性变更（务必注意）：

- `DioError` → 重命名为 **`DioException`**（并实现 `Exception` 而非 `Error`，可 `catch`）。
- `Response.headers` 类型由 `dart:io` 的 `HttpHeaders` 改为跨平台 **`Headers`**（`HttpHeaders` 在 Web 不可用）。
- `FormData.from(...)` 废弃，改用 **`FormData.fromMap(...)`**。
- `UploadFileInfo` 废弃，改用 **`MultipartFile`**。
- 拦截器回调返回类型由 `FutureOr` 改为 **`Future`**（可 `async`）。
- Web 上 `followRedirects`/`maxRedirects`/`redirects` 无意义（浏览器自动处理重定向）。

---

## 2. 安装与最小可运行示例

在 `pubspec.yaml` 添加依赖（Dart SDK 要求 ≥ 2.18）：

```yaml
dependencies:
  dio: ^5.11.1
```

执行 `flutter pub get`。最小示例：

```dart
import 'package:dio/dio.dart';

void main() async {
  final dio = Dio(); // 使用默认 BaseOptions
  try {
    final response = await dio.get('https://dart.dev');
    print(response.statusCode); // 200
    print(response.data.runtimeType); // 默认 responseType=json，data 已解码
  } on DioException catch (e) {
    print('请求失败: ${e.message}');
  }
}
```

> 真实项目中**不要**每次都 `Dio()` 新建实例，应封装单例（见第 28 节），以便复用连接池、共享拦截器与全局配置。

---

## 3. Dio 类核心 API 总览

`Dio` 是入口类，实现了 `DioMixin`，可 `import 'package:dio/dio.dart'` 直接使用。

### 构造方法

```dart
// 1) 使用默认配置
final dio = Dio();

// 2) 传入 BaseOptions（最常用）
final dio = Dio(BaseOptions(
  baseUrl: 'https://jsonplaceholder.typicode.com',
  connectTimeout: const Duration(seconds: 5),
  receiveTimeout: const Duration(seconds: 3),
  headers: {'Accept': 'application/json'},
));

// 3) 继承自 DioMixin 自定义子类（高级用法）
class MyDio with DioMixin implements Dio {
  @override
  BaseOptions options;
  MyDio(this.options);
}
```

### 实例属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `options` | `BaseOptions` | 全局基础配置（可读写） |
| `interceptors` | `Interceptors` | 拦截器链（`List`-like，支持 `add`/`insert`/`remove`/`clear`） |
| `transformer` | `Transformer` | 响应体转换（默认 `BackgroundTransformer`） |
| `httpClientAdapter` | `HttpClientAdapter` | 底层网络适配器（native 为 `IOHttpClientAdapter`，web 为 `BrowserHttpClientAdapter`） |

### 实例方法

| 方法 | 返回 | 说明 |
| --- | --- | --- |
| `get` / `post` / `put` / `delete` / `patch` / `head` | `Future<Response<T>>` | 各 HTTP 动词快捷方法 |
| `request(path, options)` | `Future<Response<T>>` | 通用请求，`options.method` 指定动词 |
| `fetch(RequestOptions)` | `Future<Response<T>>` | 最底层请求（拦截器链最终调用它） |
| `download(urlPath, savePath, ...)` | `Future<Response>` | 下载到本地文件 |
| `downloadUri(uri, savePath, ...)` | `Future<Response>` | 同上，参数为 `Uri` |
| `lock()` | `void` | 锁定拦截器链，后续请求排队 |
| `unlock()` | `void` | 解除锁定 |
| `clear()` | `void` | 清空拦截器并解除锁定 |
| `close({bool force = false})` | `void` | 关闭客户端，释放资源 |
| `resolve<dynamic>(data)` | `Response` | 工具方法，直接构造成功响应）

---

## 4. Options 三件套：BaseOptions / Options / RequestOptions

Dio 用三层级配置，优先级由低到高：**BaseOptions（全局） < RequestOptions（运行时计算） < Options（单次请求覆盖）**。

### BaseOptions（全局）

```dart
final options = BaseOptions(
  method: 'GET',
  baseUrl: 'https://api.example.com/v1',
  connectTimeout: const Duration(seconds: 10),
  sendTimeout: const Duration(seconds: 10),
  receiveTimeout: const Duration(seconds: 10),
  transformTimeout: const Duration(seconds: 10),
  queryParameters: {'api_key': 'demo'},
  headers: {'Accept': 'application/json'},
  responseType: ResponseType.json, // json | stream | plain | bytes
  contentType: Headers.jsonContentType, // 'application/json'
  validateStatus: (status) => status != null && status < 500,
  receiveDataWhenStatusError: true,
  followRedirects: true,
  maxRedirects: 5,
  persistentConnection: true,
  requestEncoder: null,
  responseDecoder: null,
  listFormat: ListFormat.multi,
  extra: {'retry': 3},
);
final dio = Dio(options);
```

`BaseOptions` 主要字段：

- `method`、`baseUrl`、`queryParameters`、`headers`、`extra`
- `connectTimeout` / `sendTimeout` / `receiveTimeout` / `transformTimeout`（均为 `Duration?`）
- `responseType`（`ResponseType` 枚举）
- `contentType`（字符串，如 `'application/json'`/`'multipart/form-data'`）
- `validateStatus`（`int? => bool`，返回 `false` 则 Dio 抛 `badResponse`）
- `receiveDataWhenStatusError`、`followRedirects`、`maxRedirects`、`persistentConnection`
- `requestEncoder` / `responseDecoder`
- `listFormat`（`ListFormat` 枚举，控制数组参数如何序列化）
- `setRequestContentTypeWhenNoPayload`、`preserveHeaderCase`

### Options（单次请求）

```dart
await dio.get('/tasks',
  options: Options(
    headers: {'X-Trace-Id': 'abc123'},
    responseType: ResponseType.json,
    sendTimeout: const Duration(seconds: 5),
    extra: {'cache': true},
  ),
);
```

`Options` 字段是 `BaseOptions` 的子集（不含 `baseUrl`/`method` 默认值，但可临时覆盖 `method`）。

### RequestOptions（运行时内部对象）

由 Dio 在发起请求时由 BaseOptions + 单次 Options 合并而成，拦截器里拿到的就是它。常用字段：

```dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (RequestOptions options, handler) {
    print(options.method);          // GET / POST ...
    print(options.baseUrl);         // https://api.example.com/v1
    print(options.path);            // /tasks
    print(options.uri);             // 完整 Uri
    print(options.fullPath);        // baseUrl + path 拼接结果
    print(options.queryParameters); // {api_key: demo}
    print(options.data);            // 请求体
    print(options.headers);         // 合并后的头
    print(options.contentType);
    print(options.responseType);
    print(options.extra);           // 透传自定义数据
    handler.next(options);
  },
));
```

> `RequestOptions` 同时暴露 `uri` 与 `fullPath`，前者是完整 `Uri`，后者是字符串，二者等价。

---

## 5. 超时配置：connect / send / receive / transform

Dio 提供四个独立的超时维度，均为 `Duration?`（传 `null` 表示不限制）：

| 字段 | 语义 |
| --- | --- |
| `connectTimeout` | 与服务器建立 TCP 连接的最长时间 |
| `sendTimeout` | 发送请求体（含上传）的最长时间 |
| `receiveTimeout` | **相邻两个字节之间**的最大间隔（非整体响应时间） |
| `transformTimeout` | 响应体解码（`Transformer`）允许的最长时间 |

```dart
final dio = Dio(BaseOptions(
  connectTimeout: const Duration(seconds: 5),
  sendTimeout: const Duration(seconds: 10),
  receiveTimeout: const Duration(seconds: 10),
  transformTimeout: const Duration(seconds: 10),
));

// 单次请求可覆盖
await dio.get('/slow',
  options: Options(receiveTimeout: const Duration(seconds: 3)));
```

> **坑**：`receiveTimeout` 衡量的是「收到字节之间的间隔」，若服务器持续缓慢吐数据但不会停顿超过该值，则不会触发超时。需要整体超时请用 `Future.timeout` 包裹：
> ```dart
> final resp = await dio.get('/slow')
>     .timeout(const Duration(seconds: 30));
> ```

---

## 6. 请求方法详解

所有动词快捷方法签名一致，返回 `Future<Response<T>>`（`T` 默认 `dynamic`）。

```dart
Future<Response<T>> get<T>(String path, {
  Object? data,
  Map<String, dynamic>? queryParameters,
  Options? options,
  CancelToken? cancelToken,
  ProgressCallback? onReceiveProgress,
});

Future<Response<T>> post<T>(String path, { ... onSendProgress, onReceiveProgress });
Future<Response<T>> put<T>(String path, { ... });
Future<Response<T>> delete<T>(String path, { ... });
Future<Response<T>> patch<T>(String path, { ... });
Future<Response<T>> head<T>(String path, { ... });

// 通用请求：用 options.method 指定动词，可发任意方法（含 WebDAV 等）
Future<Response<T>> request<T>(String path, {
  Object? data,
  Map<String, dynamic>? queryParameters,
  Options? options,
  CancelToken? cancelToken,
  ProgressCallback? onSendProgress,
  ProgressCallback? onReceiveProgress,
});

// 最底层：直接传 RequestOptions
Future<Response<T>> fetch<T>(RequestOptions requestOptions);
```

完整示例：

```dart
// GET
final list = await dio.get('/posts',
  queryParameters: {'userId': 1, '_limit': 10});

// POST（JSON 自动序列化，contentType 默认 json）
final created = await dio.post('/posts',
  data: {'title': 'hello', 'body': 'world', 'userId': 1});

// PUT
await dio.put('/posts/1', data: {'title': 'updated'});

// PATCH
await dio.patch('/posts/1', data: {'title': 'patched'});

// DELETE（Dio 5.x 支持带 body）
await dio.delete('/posts/1', data: {'reason': 'spam'});

// HEAD
await dio.head('/health');

// 任意方法（例如 WebDAV PROPFIND）
await dio.request('/dav',
  options: Options(method: 'PROPFIND'),
  data: '<xml/>');

// 带进度回调
await dio.post('/upload',
  data: formData,
  onSendProgress: (sent, total) {
    if (total != -1) print('上传 ${(sent / total * 100).toStringAsFixed(1)}%');
  },
  onReceiveProgress: (recv, total) {
    if (total != -1) print('下载 ${(recv / total * 100).toStringAsFixed(1)}%');
  },
);
```

`ProgressCallback` 签名：`void Function(int count, int total)`；当 `total == -1` 时表示服务器未返回 `Content-Length`，无法计算百分比。

---

## 7. 请求体 data 的数据类型

`data` 接受多种类型，Dio 按 `contentType` 自动选择序列化方式：

| data 类型 | 行为 |
| --- | --- |
| `Map` / `List` | 按 `contentType` 编码（`application/json` 默认序列化为 JSON 字符串） |
| `String` | 原样发送（适合 `text/plain`、`application/x-www-form-urlencoded` 手动拼） |
| `FormData` | 自动改为 `multipart/form-data`，用于文件上传 |
| `List<int>`（`Uint8List`） | 原始字节发送 |
| `Stream<List<int>>` | 流式发送（大文件） |
| `null` | 无请求体 |

```dart
// 1) JSON 对象（最常用，自动序列化）
await dio.post('/login', data: {'user': 'a', 'pass': 'b'});

// 2) 表单编码（注意 contentType 要设对）
await dio.post('/form',
  data: {'user': 'a', 'pass': 'b'},
  options: Options(contentType: Headers.formUrlEncodedContentType));

// 3) 原始字符串
await dio.post('/raw', data: 'plain text body',
  options: Options(contentType: 'text/plain'));

// 4) 二进制字节
final bytes = Uint8List.fromList([1, 2, 3]);
await dio.post('/bin', data: bytes,
  options: Options(contentType: 'application/octet-stream'));

// 5) 流式上传大文件（不一次性读入内存）
final stream = File('/big.iso').openRead();
await dio.post('/big',
  data: Stream<List<int>>.value(await stream.toList()),
  options: Options(contentType: 'application/octet-stream'));
```

---

## 8. 查询参数与路径写法

查询参数通过 `queryParameters`（自动 URL 编码）：

```dart
// 数组默认按 listFormat=multi 序列化为 ?tag=a&tag=b
await dio.get('/search',
  queryParameters: {'q': 'dio', 'tag': ['a', 'b'], 'page': 1});

// 自定义数组格式
await dio.get('/search',
  queryParameters: {'tag': ['a', 'b']},
  options: Options(listFormat: ListFormat.csv)); // ?tag=a,b
```

`ListFormat` 枚举值：`csv`（`,`）、`ssv`（空格）、`tsv`（`\t`）、`pipes`（`|`）、`multi`（`a=1&a=2`）、`multiCompatible`（兼容 PHP 的 `a[]=1&a[]=2`）。

路径参数需手动拼接（或使用 Retrofit 的 `@Path`，见第 26 节）：

```dart
final id = 42;
await dio.get('/posts/$id/comments'); // 推荐用字符串插值
// 注意：库本身不提供 {id} 占位符替换，需自己拼
```

---

## 9. 请求头 Headers 的注入方式

三种优先级由低到高：

```dart
final dio = Dio(BaseOptions(
  baseUrl: 'https://api.example.com',
  headers: {'Accept': 'application/json'}, // 1) 全局头
));

dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    options.headers['Authorization'] = 'Bearer $token'; // 2) 拦截器注入（最灵活）
    handler.next(options);
  },
));

await dio.get('/me',
  options: Options(headers: {'X-Request-Id': 'req-1'})); // 3) 单次请求覆盖
```

`Headers` 工具常量（便于引用标准头）：

```dart
Headers.contentTypeHeader;        // 'content-type'
Headers.contentLengthHeader;      // 'content-length'
Headers.acceptHeader;             // 'accept'
Headers.authorizationHeader;      // 'authorization'
Headers.jsonContentType;          // 'application/json'
Headers.formUrlEncodedContentType;// 'application/x-www-form-urlencoded'
Headers.wwwFormUrlEncodedContentType; // 同上别名
```

---

## 10. Response 响应对象详解

```dart
final response = await dio.get('/posts/1');

response.data;         // 解码后的响应体（默认 json 已转 Map/List）
response.statusCode;   // int? 例如 200
response.statusMessage;// String? 例如 'OK'
response.headers;      // Headers 实例（跨平台）
response.requestOptions; // 触发本次请求的 RequestOptions（回溯用）
response.redirects;    // List<RedirectRecord>（重定向历史）
response.isRedirect;   // bool
response.realUri;      // 最终实际访问的 Uri（经重定向后）
```

读取响应头：

```dart
final ct = response.headers.value('content-type'); // 便捷取单个值
final all = response.headers.map; // Map<String, List<String>>
print(all['set-cookie']); // 可能为 null 或 List
```

泛型响应（推荐配合模型层）：

```dart
final resp = await dio.get<Map<String, dynamic>>('/posts/1');
final title = resp.data?['title']; // 静态类型推断为 Map
```

---

## 11. Headers 类与 dart:io 的差异

Dio 5.x 把 `Response.headers` 改为自有的 **`Headers`** 类（而非 `dart:io` 的 `HttpHeaders`），因为后者在 Web 不可用。

```dart
// 从 Map 构造（值必须是 List<String>）
final h = Headers.fromMap({
  'content-type': ['application/json'],
});

print(h.map);                 // Map<String, List<String>>
print(h.value('content-type')); // 'application/json'（首个值，便捷方法）
print(h['content-type']);       // ['application/json']（按运算符取 List）
```

> 注意：Web 平台的 `options.followRedirects` / `maxRedirects` / `Response.redirects` 无效，重定向由浏览器自动处理。

---

## 12. 错误处理：DioException 与 DioExceptionType

Dio 默认对 2xx 之外状态码抛出 `DioException`（`validateStatus` 返回 `false` 时）。**务必用 `on DioException catch` 捕获**，而不要用笼统的 `catch`。

```dart
try {
  await dio.get('/not-exist');
} on DioException catch (e) {
  print(e.type);        // DioExceptionType
  print(e.message);     // 人类可读信息
  print(e.response);    // 非 null 时包含服务器返回
  print(e.requestOptions);
  print(e.error);       // 底层原始错误（如 SocketException）
  print(e.stackTrace);
}
```

`DioExceptionType` 完整枚举：

| 枚举值 | 触发场景 |
| --- | --- |
| `badResponse` | 状态码不在 `validateStatus` 范围内（默认非 2xx） |
| `connectionTimeout` | 建立连接超时 |
| `sendTimeout` | 发送数据超时 |
| `receiveTimeout` | 接收数据超时 |
| `cancel` | 请求被 `CancelToken.cancel` 取消 |
| `connectionError` | 无法连接（DNS / 无网络 / 被拒） |
| `badCertificate` | SSL 证书校验失败 |
| `unknown` | 其他未知错误 |

实战：区分错误类型给出不同 UI 提示：

```dart
String userMessage(DioException e) {
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return '网络超时，请稍后重试';
    case DioExceptionType.connectionError:
      return '网络连接失败，请检查网络';
    case DioExceptionType.badResponse:
      final code = e.response?.statusCode;
      if (code == 401) return '登录已过期';
      if (code == 404) return '资源不存在';
      if (code != null && code >= 500) return '服务器开小差了';
      return '请求出错（$code）';
    case DioExceptionType.cancel:
      return '请求已取消';
    case DioExceptionType.badCertificate:
      return '证书校验失败';
    case DioExceptionType.unknown:
      return '未知错误：${e.message}';
  }
}
```

`DioException` 工厂构造：`DioException.request(error, stackTrace, options)`、`DioException.connectionTimeout(options)`、`DioException.receiveTimeout(options)`、`DioException.sendTimeout(options)`、`DioException.badResponse(statusCode, requestOptions)`、`DioException.cancel(options, reason)`、`DioException.connectionError(error, stackTrace, options)`、`DioException.badCertificate(cert, options)`、`DioException.unknown(error, stackTrace, options)`。

---

## 13. 拦截器 Interceptors 机制

拦截器是 Dio 的灵魂，可在请求发出前、响应返回后、错误发生时统一插入逻辑（鉴权、日志、重试、缓存等）。

```dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (RequestOptions options, RequestInterceptorHandler handler) {
    // 修改 options（加头、改 baseUrl 等）
    options.headers['X-Client'] = 'flutter';
    handler.next(options);          // 继续（必须调用 next/resolve/reject 之一）
    // handler.resolve(response);   // 短路：直接返回假响应，不再发网络
    // handler.reject(DioException(...), true); // 中断并抛错
  },
  onResponse: (Response response, ResponseInterceptorHandler handler) {
    // 可改写 response（如统一拆包 data['result']）
    handler.next(response);
  },
  onError: (DioException err, ErrorInterceptorHandler handler) async {
    // 可重试、可改写错误
    handler.next(err);              // 继续抛错
    // handler.resolve(retriedResponse); // 重试成功则返回新响应
    // handler.reject(err, true);        // 静默重抛（silent=true 不被 retry 拦截器再捕获）
  },
));
```

`handler` 三方法语义：

- `next(...)`：放行到下一环（拦截器链 / 网络 / 响应）。
- `resolve(Response)`：短路成功，直接以该 Response 作为结果（常用于 Mock / 缓存命中）。
- `reject(DioException, [bool silent])`：短路失败并抛错；`silent=true` 时避免被其它错误拦截器再次捕获。

拦截器链顺序：

```dart
dio.interceptors.add(loggerFirst);   // 先加的先执行（请求方向）
dio.interceptors.add(authInjector);
// 请求方向：loggerFirst → authInjector → 网络
// 响应方向（反向）：网络 → authInjector → loggerFirst
// 建议 LogInterceptor 最后加，以记录最终真实请求/响应
```

`Interceptors` 列表操作：

```dart
dio.interceptors.add(x);                 // 追加
dio.interceptors.insert(0, y);           // 插到队首
dio.interceptors.remove(x);              // 按对象移除
dio.interceptors.clear();                // 清空
```

`dio.lock()` / `dio.unlock()` / `dio.clear()` 用于批量控制（如 token 刷新期间临时挂起所有请求）。

---

## 14. 内置拦截器：LogInterceptor 与 CookieManager

### LogInterceptor（调试日志）

```dart
dio.interceptors.add(LogInterceptor(
  request: true,
  requestHeader: true,
  requestBody: true,     // 打印请求体
  responseHeader: true,
  responseBody: true,    // 打印响应体
  error: true,
  compact: false,        // false 时格式化 JSON
  logPrint: (o) => debugPrint(o.toString()), // Flutter 下用 debugPrint 防止被截断
));
```

### CookieManager（需额外依赖）

```yaml
dependencies:
  dio_cookie_manager: ^3.1.1
  cookie_jar: ^4.0.8
```

```dart
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';

final cookieJar = CookieJar(); // 内存；持久化用 PersistCookieJar()
dio.interceptors.add(CookieManager(cookieJar));
```

---

## 15. 自定义拦截器实战：token 注入、401 刷新重试、签名、缓存

### ① 请求头注入 token

```dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    final token = AuthStore().token;
    if (token != null) {
      options.headers[Headers.authorizationHeader] = 'Bearer $token';
    }
    handler.next(options);
  },
));
```

### ② 401 自动刷新并重试（核心生产模式）

```dart
dio.interceptors.add(InterceptorsWrapper(
  onError: (err, handler) async {
    if (err.response?.statusCode == 401 &&
        err.requestOptions.extra['retry'] != true) {
      try {
        final newToken = await AuthStore().refreshToken();
        // 用新 token 重发原请求
        final opts = err.requestOptions;
        opts.extra['retry'] = true;          // 防止死循环
        opts.headers[Headers.authorizationHeader] = 'Bearer $newToken';
        final retry = await dio.fetch(opts);  // 用 fetch 重发（复用原 options）
        return handler.resolve(retry);        // 短路成功
      } on DioException catch (e) {
        return handler.next(e);              // 刷新也失败，继续抛错
      }
    }
    handler.next(err);
  },
));
```

> 用 `dio.fetch(opts)` 而非 `dio.request(opts.path, ...)`，可完整保留原 `RequestOptions`（含 method/data/headers），避免丢失。

### ③ 请求签名（防篡改）

```dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    final body = options.data;
    final sign = SignUtil.sign(body, options.queryParameters);
    options.headers['X-Sign'] = sign;
    options.headers['X-Timestamp'] = '${DateTime.now().millisecondsSinceEpoch}';
    handler.next(options);
  },
));
```

### ④ 只读 GET 缓存（命中则短路）

```dart
final cache = <String, Response>{};
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    if (options.method == 'GET' &&
        options.extra['forceRefresh'] != true) {
      final key = options.uri.toString();
      final cached = cache[key];
      if (cached != null) return handler.resolve(cached); // 命中缓存
    }
    handler.next(options);
  },
  onResponse: (response, handler) {
    if (response.requestOptions.method == 'GET') {
      cache[response.requestOptions.uri.toString()] = response;
    }
    handler.next(response);
  },
));
```

---

## 16. QueuedInterceptor：解决 401 惊群

当多个请求同时返回 401，普通 `InterceptorsWrapper` 会让每个都触发一次 token 刷新（惊群）。`QueuedInterceptor` 会**串行化**所有拦截器逻辑，确保刷新只发生一次：

```dart
dio.interceptors.add(QueuedInterceptor(
  onRequest: (options, handler) async {
    // 同一时刻只有一个拦截器在运行
    if (AuthStore().isExpired) {
      await AuthStore().refreshToken(); // 第一个请求刷新，后续复用
    }
    options.headers[Headers.authorizationHeader] = 'Bearer ${AuthStore().token}';
    handler.next(options);
  },
  onResponse: (r, h) => h.next(r),
  onError: (e, h) => h.next(e),
));
```

> `QueuedInterceptor` 适用于「每次请求都需检查 token 有效性」的场景；若只在 401 后刷新，用第 15 节②的模式 + 一个共享 `refreshing` Future 也能避免惊群。

---

## 17. CancelToken 请求取消

用于页面销毁时取消在途请求，避免内存泄漏与 `setState` 崩溃。

```dart
class _PageState extends State<MyPage> {
  final CancelToken _token = CancelToken();

  void load() async {
    try {
      await dio.get('/big-list', cancelToken: _token);
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) {
        print('请求被取消：${e.message}');
      }
    }
  }

  @override
  void dispose() {
    _token.cancel('页面已销毁'); // 取消在途请求
    super.dispose();
  }
}
```

`CancelToken` API：

| 成员 | 说明 |
| --- | --- |
| `CancelToken()` | 构造 |
| `cancel([dynamic reason])` | 取消关联请求，`reason` 作为 `DioException.message` |
| `isCancelled` | 是否已取消（`bool`） |
| `whenCancel` | `Future`，取消完成时 resolve |
| `static bool isCancel(DioException e)` | 判断异常是否由取消引起 |

批量取消多个请求：

```dart
final t1 = CancelToken(), t2 = CancelToken();
dio.get('/a', cancelToken: t1);
dio.get('/b', cancelToken: t2);
t1.cancel('user leave');
t2.cancel('user leave');
```

---

## 18. FormData 表单与文件上传

`FormData` 用于 `multipart/form-data` 上传，自动把 `contentType` 设为 `multipart/form-data`。

```dart
// 方式一：fromMap（最常用，自动处理字段与文件）
final formData = FormData.fromMap({
  'name': 'report',
  'file': await MultipartFile.fromFile('/tmp/report.pdf',
      filename: 'report.pdf'),
  'images': [
    await MultipartFile.fromFile('/tmp/a.jpg'),
    await MultipartFile.fromFile('/tmp/b.jpg'),
  ],
});
await dio.post('/upload', data: formData,
  onSendProgress: (sent, total) {
    print('进度 ${(sent / total * 100).toStringAsFixed(0)}%');
  });

// 方式二：手动构建
final fd = FormData();
fd.fields.add(const MapEntry('name', 'report'));      // 普通字段（值为字符串）
fd.files.add(MapEntry('file',
    await MultipartFile.fromFile('/tmp/report.pdf'))); // 文件
fd.append('tag', 'dart');                              // 便捷添加字段
fd.appendFile('file2', '/tmp/extra.zip');             // 便捷添加文件（sync）
```

`FormData` 主要成员：

- `FormData.fromMap(Map<String, dynamic> map, [ListFormat? listFormat])`
- `FormData()` 空构造
- `fields`：可读写 `List<MapEntry<String, String>>`
- `files`：可读写 `List<MapEntry<String, MultipartFile>>`
- `append(String field, dynamic value)` / `appendFile(String field, String filePath)`
- `readAsBytes()`：返回 `Future<Uint8List>`（已替代废弃的 `asBytes`/`asBytesAsync`）
- `length`（`int?`，`Content-Length`）、`boundary`（`String`）、`isNotEmpty`（`bool`）

> **严禁复用**同一个 `FormData`/`MultipartFile` 跨多个请求，否则会报 `Cannot finalize` 之类错误，每次都要新建。

---

## 19. MultipartFile 全构造工厂

```dart
// 1) 从文件（异步，推荐）
final f1 = await MultipartFile.fromFile('/tmp/a.jpg',
    filename: 'a.jpg',
    contentType: MediaType('image', 'jpeg'));

// 2) 从文件（同步）
final f2 = MultipartFile.fromFileSync('/tmp/a.jpg',
    filename: 'a.jpg');

// 3) 从内存字节
final f3 = MultipartFile.fromBytes(
    Uint8List.fromList([0x89, 0x50, 0x4E, 0x47]),
    filename: 'raw.bin',
    contentType: MediaType('application', 'octet-stream'));

// 4) 从流（适合超大文件）
final f4 = MultipartFile.fromStream(
    () => File('/tmp/big.iso').openRead(),
    File('/tmp/big.iso').lengthSync(), // 必须提供长度
    filename: 'big.iso');
```

`MultipartFile` 字段/方法：`filename`（`String`）、`contentType`（`MediaType?`）、`length`（`int`）、`finalize()`（返回 `Stream<List<int>>`，内部使用）。

---

## 20. 文件下载 download 与 downloadUri

```dart
await dio.download(
  'https://example.com/app.zip',          // urlPath（字符串）
  '/sdcard/Download/app.zip',             // savePath（本地路径）
  data: {'token': 'x'},                   // 可选请求体（GET 通常不需要）
  queryParameters: {'v': '1'},            // 可选查询参数
  options: Options(headers: {'Range': 'bytes=0-'}),
  cancelToken: _token,
  deleteOnError: true,                    // 失败/取消时删除已下载的半成品（默认 true）
  lengthHeader: Headers.contentLengthHeader,
  onReceiveProgress: (received, total) {
    if (total != -1) {
      print('下载 ${(received / total * 100).toStringAsFixed(1)}%');
    }
  },
);

// 用 Uri 版本
await dio.downloadUri(
  Uri.parse('https://example.com/app.zip'),
  '/sdcard/Download/app.zip',
);
```

`download` 返回 `Response`，其 `headers` 含服务器信息；`savePath` 也支持传入一个返回 `String` 的回调（运行时动态决定路径）。下载完成后文件已落盘，`response.data` 为 `null`（除非 `savePath` 是函数回调）。

---

## 21. HttpClientAdapter 适配器：代理 / 证书校验 / HTTP2 / Native

`dio.httpClientAdapter` 是 Dio 与底层网络栈之间的接缝。默认：native 用 `IOHttpClientAdapter`，Web 用 `BrowserHttpClientAdapter`。

### IOHttpClientAdapter（native）

```dart
import 'package:dio/io.dart'; // IOHttpClientAdapter

dio.httpClientAdapter = IOHttpClientAdapter(
  // 自定义 dart:io HttpClient（代理、客户端证书等）
  onHttpClientCreate: (client) {
    client.findProxy = (uri) => 'PROXY 192.168.1.10:8888'; // Charles/Fiddler 抓包
    client.badCertificateCallback =
        (cert, host, port) => true; // ⚠️ 仅调试，生产不要跳过校验
    return client;
  },
  // 自定义证书校验（推荐生产用）
  validateCertificate: (X509Certificate? cert, String host, int port) {
    if (cert == null) return false;
    return cert.issuer == 'CN=My-CA' && host == 'api.example.com';
  },
);
```

### BrowserHttpClientAdapter（Web）

```dart
import 'package:dio/browser.dart';

dio.httpClientAdapter = BrowserHttpClientAdapter(
  withCredentials: true, // 跨域携带 Cookie（CORS 需服务端允许）
);
```

### HTTP/2 适配器（dio_http2_adapter）

```yaml
dependencies:
  dio_http2_adapter: ^2.5.0
```

```dart
import 'package:dio_http2_adapter/dio_http2_adapter.dart';

dio.httpClientAdapter = Http2Adapter(
  ConnectionManager(idleTimeout: const Duration(seconds: 10)),
);
```

### Native 适配器（native_dio_adapter，基于 Cronet）

```yaml
dependencies:
  native_dio_adapter: ^2.1.0
```

```dart
import 'package:native_dio_adapter/native_dio_adapter.dart';

dio.httpClientAdapter = NativeAdapter(); // 使用平台原生网络栈
```

---

## 22. Transformer 与 BackgroundTransformer

`Transformer` 负责把原始响应字节转换为 `Response.data`。默认 `BackgroundTransformer` 会在响应体 **大于约 50KB 时于 isolate 中解析 JSON**，避免主线程卡顿（大列表免费优化）。

```dart
import 'package:dio/src/transformers/default_transformer.dart'
    show BackgroundTransformer;

dio.transformer = BackgroundTransformer(
  jsonDecodeCallback: (data) => myCustomDecode(data), // 可选自定义解析
);
```

自定义 `Transformer`：

```dart
class XmlTransformer extends Transformer {
  @override
  Future<String> transformRequest(RequestOptions options) async {
    // 把 data 编码为请求体字符串（默认按 contentType 处理）
    return super.transformRequest(options);
  }

  @override
  Future<dynamic> transformResponse(
      RequestOptions options, ResponseBody body) async {
    final text = await body.stream.bytesToString();
    return parseXml(text); // 返回自定义解码结果
  }
}

dio.transformer = XmlTransformer();
```

`ResponseBody` 字段：`stream`（`Stream<Uint8List>`）、`statusCode`（`int?`）、`headers`（`Headers`）、`statusMessage`（`String?`）、`contentLength`（`int?`）、`isRedirect`（`bool`）。

---

## 23. 请求/响应编解码：requestEncoder 与 responseDecoder

不用自定义 `Transformer` 也能改写编解码，直接在 `Options` 上挂回调：

```dart
dio.options.responseDecoder =
    (String? data, ResponseBody? response, RequestOptions options) {
  if (data == null) return null;
  // 统一解密服务器返回的密文
  final plain = decrypt(data);
  return jsonDecode(plain); // 返回任意类型，成为 response.data
};

dio.options.requestEncoder =
    (String requestData, RequestOptions options) {
  // 对请求体做加密/压缩后再发送
  return encrypt(requestData);
};
```

`responseDecoder` 签名：`String? Function(String? data, ResponseBody? response, RequestOptions options)`；`requestEncoder` 签名：`FutureOr<String> Function(String requestData, RequestOptions options)`。

---

## 24. 代理与 SSL 证书校验

抓包调试（Charles/Fiddler）：

```dart
import 'package:dio/io.dart';

dio.httpClientAdapter = IOHttpClientAdapter(
  onHttpClientCreate: (client) {
    client.findProxy = (uri) => 'PROXY 192.168.1.10:8888';
    // 信任 Charles 根证书（仅调试）
    client.badCertificateCallback = (cert, host, port) => true;
    return client;
  },
);
```

生产环境证书绑定（Certificate Pinning）：

```dart
dio.httpClientAdapter = IOHttpClientAdapter(
  validateCertificate: (X509Certificate? cert, String host, int port) {
    if (cert == null) return false;
    // 比对 SHA-256 指纹或签发者
    const expectedSha = '9F:3B:...'; // 你的证书指纹
    return cert.sha1 == expectedSha && host == 'api.example.com';
  },
);
```

> 自签名证书调试可临时 `badCertificateCallback` 返回 `true`，**绝不可**发布到生产。

---

## 25. HTTP/2 支持

见第 21 节 `Http2Adapter`。启用后所有请求走 HTTP/2 多路复用，配合 `ConnectionManager` 管理连接生命周期：

```dart
import 'package:dio_http2_adapter/dio_http2_adapter.dart';

dio.httpClientAdapter = Http2Adapter(
  ConnectionManager(
    idleTimeout: const Duration(seconds: 10),
    onClientCreate: (_, clientSetting) {
      // 可进一步配置 TLS
    },
  ),
);
```

---

## 26. 与 Retrofit 结合：类型安全的 REST 客户端

Retrofit 在 Dio 之上做代码生成，把注解编译成类型安全的 API 接口，避免手写 URL/参数。

```yaml
dependencies:
  dio: ^5.11.1
  retrofit: ^4.4.0
  retrofit_annotation: ^4.4.0
dev_dependencies:
  retrofit_generator: ^4.4.0
  build_runner: ^2.4.0
  json_serializable: ^6.8.0
```

```dart
import 'package:retrofit/retrofit.dart';
import 'package:dio/dio.dart';
import 'package:json_annotation/json_annotation.dart';

part 'api_client.g.dart';

@RestApi(baseUrl: 'https://jsonplaceholder.typicode.com')
abstract class ApiClient {
  factory ApiClient(Dio dio, {String? baseUrl}) = _ApiClient;

  @GET('/posts')
  Future<List<Post>> getPosts(@Query('userId') int userId);

  @GET('/posts/{id}')
  Future<Post> getPost(@Path('id') int id);

  @POST('/posts')
  Future<Post> createPost(@Body() Post post);

  @FormUrlEncoded()
  @POST('/login')
  Future<Token> login(@Field('user') String user, @Field('pass') String pass);

  @DELETE('/posts/{id}')
  Future<void> deletePost(@Path('id') int id);

  @Header('X-Api-Version') // 单次请求头
  @GET('/version')
  Future<String> version(@Header('X-Trace') String trace);

  @MultiPart()
  @POST('/upload')
  Future<void> upload(@Part() File file, @Part() String name);
}
```

运行生成：`dart run build_runner build`。调用：

```dart
final client = ApiClient(dio);
final posts = await client.getPosts(1);
```

Retrofit 常用注解：`@RestApi`、`@GET`/`@POST`/`@PUT`/`@DELETE`/`@PATCH`/`@HEAD`、`@Query`、`@Path`、`@Body`、`@Field`、`@FormUrlEncoded`、`@Header`、`@Part`、`@MultiPart`、`@Queries`。

---

## 27. 与 json_serializable 模型序列化

```dart
import 'package:json_annotation/json_annotation.dart';
part 'post.g.dart';

@JsonSerializable()
class Post {
  Post({required this.id, required this.title, required this.body});

  final int id;
  final String title;
  final String body;

  factory Post.fromJson(Map<String, dynamic> json) => _$PostFromJson(json);
  Map<String, dynamic> toJson() => _$PostToJson(this);
}

// 配合 Dio 使用泛型
final resp = await dio.get<Map<String, dynamic>>('/posts/1');
final post = Post.fromJson(resp.data!);
```

> 也可让 Retrofit 直接返回 `Future<Post>`（而非 `Future<Map>`），由生成的代码自动调用 `fromJson`，实现端到端类型安全。

---

## 28. 单例封装与最佳实践

推荐把 Dio 封装成一个可复用的 `AppHttpClient`：

```dart
class AppHttpClient {
  AppHttpClient._() {
    _dio = Dio(BaseOptions(
      baseUrl: const String.fromEnvironment('API_BASE',
          defaultValue: 'https://api.example.com/v1'),
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Accept': 'application/json'},
    ));
    _dio.interceptors
      ..add(LogInterceptor(requestBody: true, responseBody: true,
          logPrint: (o) => debugPrint(o.toString())))
      ..add(_AuthInterceptor())
      ..add(_RetryInterceptor(_dio));
  }

  static final AppHttpClient instance = AppHttpClient._();
  late final Dio _dio;
  Dio get dio => _dio;

  Future<Response<T>> get<T>(String path, {Object? data,
    Map<String, dynamic>? queryParameters, Options? options,
    CancelToken? cancelToken}) =>
    _dio.get<T>(path, data: data,
        queryParameters: queryParameters, options: options,
        cancelToken: cancelToken);
  // post/put/delete 同构省略……
}

class _AuthInterceptor extends InterceptorsWrapper {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = AuthStore().token;
    if (token != null) {
      options.headers[Headers.authorizationHeader] = 'Bearer $token';
    }
    handler.next(options);
  }
}

class _RetryInterceptor extends QueuedInterceptor {
  _RetryInterceptor(this.dio);
  final Dio dio;

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    const max = 3;
    final attempt = err.requestOptions.extra['attempt'] as int? ?? 0;
    if (err.type == DioExceptionType.connectionError && attempt < max) {
      final opts = err.requestOptions..extra['attempt'] = attempt + 1;
      try {
        return handler.resolve(await dio.fetch(opts));
      } on DioException catch (e) {
        return handler.next(e);
      }
    }
    handler.next(err);
  }
}
```

最佳实践清单：

1. **单例复用** Dio 实例，享受连接池（keep-alive）与统一配置。
2. **`LogInterceptor` 放最后**，记录真实最终请求/响应；用 `debugPrint` 避免被截断。
3. **token 刷新用 `QueuedInterceptor` 或共享 Future**，避免 401 惊群。
4. **页面销毁时 `CancelToken.cancel`**，防止 `setState` 在已卸载 Widget 上崩溃。
5. **`FormData`/`MultipartFile` 不复用**，每次请求新建。
6. **生产环境务必校验证书**，不要 `badCertificateCallback = true` 上线。
7. 大响应体依赖 `BackgroundTransformer` 的 isolate 解析，不要自己主线程 `jsonDecode`。
8. 用 `validateStatus` 或拦截器做业务状态码归一化（如 `{code:0,data:...}` 拆包）。
9. 网络层与 UI 解耦：用 `Either`/自定义 `Result` 包装成功失败，UI 只关心领域模型。
10. 用 Dart 宏（`macro`）或 `json_serializable` 做模型映射，杜绝手写 `map['x']` 拼写错误。

---

## 29. 常见坑与排错清单

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| `DioError` 找不到 | 5.x 已改名 `DioException` | 改用 `on DioException catch` |
| Web 上证书/重定向报错 | `Headers` 替代 `HttpHeaders`；`followRedirects`/`maxRedirects` 无效 | 用 `Headers`，重定向交给浏览器 |
| `FormData` 第二次请求报 `Cannot finalize` | 复用了同一 `MultipartFile` | 每次新建 `FormData` |
| 上传进度 `total=-1` | 服务器未返回 `Content-Length` | 进度条用不确定模式 |
| `receiveTimeout` 没触发 | 它是「字节间隔」而非整体 | 用 `Future.timeout` 兜底 |
| Android release 网络失败 | 缺 `INTERNET` 权限 | `AndroidManifest.xml` 加 `<uses-permission android:name="android.permission.INTERNET"/>` |
| macOS 网络失败 | 缺 entitlements | 加 `com.apple.security.network.client` |
| 抓包无响应 | 未设代理/证书 | `IOHttpClientAdapter.onHttpClientCreate` 设 `findProxy` |
| 401 刷新死循环 | 重试请求再次进入刷新 | 用 `extra['retry']=true` 标记 |
| 大 JSON 卡 UI | 主线程 `jsonDecode` | 用默认 `BackgroundTransformer` |
| `response.data` 是 `String` 而非 `Map` | `responseType` 被设为 `plain` | 默认 `json` 即可 |

---

## 30. 参考文档

- Dio 官方文档（GitHub Wiki）：[https://github.com/cfug/dio/wiki](https://github.com/cfug/dio/wiki)
- Dio pub.dev 主页：[https://pub.dev/packages/dio](https://pub.dev/packages/dio)
- Dio GitHub 仓库：[https://github.com/cfug/dio](https://github.com/cfug/dio)
- Dio API 参考（最新稳定版）：[https://pub.dev/documentation/dio/latest/dio/dio-library.html](https://pub.dev/documentation/dio/latest/dio/dio-library.html)
- Dio 中文文档（cfug）：[https://github.com/cfug/dio/wiki/中文文档](https://github.com/cfug/dio/wiki/中文文档)
- dio_cookie_manager：[https://pub.dev/packages/dio_cookie_manager](https://pub.dev/packages/dio_cookie_manager)
- dio_http2_adapter：[https://pub.dev/packages/dio_http2_adapter](https://pub.dev/packages/dio_http2_adapter)
- native_dio_adapter（Cronet）：[https://pub.dev/packages/native_dio_adapter](https://pub.dev/packages/native_dio_adapter)
- Retrofit for Dart：[https://pub.dev/packages/retrofit](https://pub.dev/packages/retrofit)
- json_serializable：[https://pub.dev/packages/json_serializable](https://pub.dev/packages/json_serializable)
- Flutter 官方「Fetch data from the internet」教程：[https://docs.flutter.dev/cookbook/networking/fetch-data](https://docs.flutter.dev/cookbook/networking/fetch-data)
- Dart `dart:io` HttpClient 文档：[https://api.dart.dev/stable/dart-io/HttpClient-class.html](https://api.dart.dev/stable/dart-io/HttpClient-class.html)
- cookie_jar（持久化 Cookie）：[https://pub.dev/packages/cookie_jar](https://pub.dev/packages/cookie_jar)
- Dio CHANGELOG（5.x 破坏性变更明细）：[https://pub.dev/packages/dio/changelog](https://pub.dev/packages/dio/changelog)
- Dio 官方示例代码（examples）：[https://github.com/cfug/dio/tree/main/example](https://github.com/cfug/dio/tree/main/example)
- Flutter 网络与 HTTP 指南：[https://docs.flutter.dev/data-and-backend/networking](https://docs.flutter.dev/data-and-backend/networking)
- Dart 官方 http 包（对比参考）：[https://pub.dev/packages/http](https://pub.dev/packages/http)
- Retrofit 生成器 retrofit_generator：[https://pub.dev/packages/retrofit_generator](https://pub.dev/packages/retrofit_generator)
