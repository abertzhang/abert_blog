import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

import '../models/api_envelope.dart';

/// 博客后台 API 客户端。
///
/// 目标服务：apps/api_express（Express，端口 3001，统一前缀 /blog/api，
/// 响应信封 { code, msg, data }，见 doc/web_react_api.md）。
///
/// baseUrl 解析优先级：
///   1. 编译期注入：flutter run --dart-define=API_BASE_URL=http://<主机IP>:3001/blog/api
///   2. Android 模拟器默认 http://10.0.2.2:3001/blog/api（10.0.2.2 是模拟器到宿主机的回环地址）
///   3. 其它平台（Web / iOS 模拟器 / macOS / 真机同网段）默认 http://localhost:3001/blog/api
///
/// 注意：Web 端 dart:io 的 Platform 不可用（会抛 Unsupported operation），
/// 必须先用 kIsWeb 分流，再在原生端判断 Platform.isAndroid。
class ApiClient {
  ApiClient._();

  static const String _defaultBaseUrl = 'http://localhost:3001/blog/api';

  /// Android 模拟器访问宿主机 localhost 的特殊地址
  static const String _androidEmulatorBaseUrl = 'http://10.0.2.2:3001/blog/api';

  /// 可通过 --dart-define=API_BASE_URL=... 覆盖（真机调试 / 部署到服务器时使用）
  static const String _overrideBaseUrl =
      String.fromEnvironment('API_BASE_URL');

  static String get baseUrl {
    if (_overrideBaseUrl.isNotEmpty) {
      return _overrideBaseUrl.replaceAll(RegExp(r'/+$'), '');
    }
    if (kIsWeb) return _defaultBaseUrl;
    // Platform.isAndroid 为 true 时也包括真机；真机与模拟器都常用 10.0.2.2 之外的方式，
    // 因此这里仅对「模拟器常见场景」给默认值，真机请用 --dart-define 指定局域网 IP。
    if (Platform.isAndroid) return _androidEmulatorBaseUrl;
    return _defaultBaseUrl;
  }

  static final http.Client _client = http.Client();

  /// GET 请求，返回信封中的 data（code !== 0 时抛 ApiException）。
  static Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String?>? query,
  }) async {
    final uri = _buildUri(path, query);
    http.Response resp;
    try {
      resp = await _client
          .get(uri, headers: const {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 15));
    } catch (e) {
      throw ApiException(-1, '网络请求失败：$e');
    }
    return _unwrap(resp);
  }

  /// POST 请求（JSON body）。
  static Future<Map<String, dynamic>> post(
    String path, {
    Object? body,
  }) async {
    final uri = _buildUri(path, null);
    http.Response resp;
    try {
      resp = await _client
          .post(
            uri,
            headers: const {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: body == null ? null : jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));
    } catch (e) {
      throw ApiException(-1, '网络请求失败：$e');
    }
    return _unwrap(resp);
  }

  /// PUT 请求（JSON body）。
  static Future<Map<String, dynamic>> put(
    String path, {
    Object? body,
  }) async {
    final uri = _buildUri(path, null);
    http.Response resp;
    try {
      resp = await _client
          .put(
            uri,
            headers: const {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: body == null ? null : jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));
    } catch (e) {
      throw ApiException(-1, '网络请求失败：$e');
    }
    return _unwrap(resp);
  }

  /// DELETE 请求。
  static Future<Map<String, dynamic>> delete(String path) async {
    final uri = _buildUri(path, null);
    http.Response resp;
    try {
      resp = await _client
          .delete(uri, headers: const {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 15));
    } catch (e) {
      throw ApiException(-1, '网络请求失败：$e');
    }
    return _unwrap(resp);
  }

  static Uri _buildUri(String path, Map<String, String?>? query) {
    final q = <String, String>{};
    query?.forEach((k, v) {
      if (v != null && v.isNotEmpty) q[k] = v;
    });
    return Uri.parse('$baseUrl$path').replace(queryParameters: q.isEmpty ? null : q);
  }

  /// 解析响应信封；HTTP 200 且 code === 0 时返回 data map，否则抛 ApiException。
  static Map<String, dynamic> _unwrap(http.Response resp) {
    if (resp.statusCode != 200) {
      throw ApiException(
        resp.statusCode,
        'HTTP ${resp.statusCode}：${resp.reasonPhrase ?? '请求失败'}',
      );
    }
    final Object? decoded = jsonDecode(utf8.decode(resp.bodyBytes));
    if (decoded is! Map<String, dynamic>) {
      throw const ApiException(-1, '响应格式错误');
    }
    final code = (decoded['code'] as num?)?.toInt() ?? -1;
    final msg = (decoded['msg'] as String?) ?? '';
    if (code != 0) {
      throw ApiException(code, msg.isEmpty ? '请求失败（code=$code）' : msg);
    }
    final data = decoded['data'];
    if (data is Map<String, dynamic>) return data;
    // data 可能是 List 或 null，统一包一层 { 'data': ... } 交由上层处理
    return <String, dynamic>{'data': data};
  }
}
