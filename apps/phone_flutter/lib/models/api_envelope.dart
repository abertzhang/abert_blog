/// 统一 API 响应信封。
///
/// 后端（api_express）所有接口返回 `{ code, msg, data }`：
///   code === 0 表示成功，非 0 为业务错误（前端展示 msg）。
/// 见 doc/web_react_api.md 第 1.2 节。
class ApiEnvelope<T> {
  const ApiEnvelope({required this.code, required this.msg, required this.data});

  final int code;
  final String msg;
  final T data;

  bool get ok => code == 0;

  /// 从解码后的 JSON map 构造；dataParser 负责把 dynamic 的 data 反序列化为 T。
  static ApiEnvelope<T> fromJson<T>(
    Map<String, dynamic> json,
    T Function(Object? data) dataParser,
  ) {
    return ApiEnvelope<T>(
      code: (json['code'] as num?)?.toInt() ?? -1,
      msg: (json['msg'] as String?) ?? '',
      data: dataParser(json['data']),
    );
  }
}

/// 业务错误（code !== 0 或网络层失败），UI 统一捕获后展示 message。
class ApiException implements Exception {
  const ApiException(this.code, this.message);

  final int code;
  final String message;

  @override
  String toString() => 'ApiException($code): $message';
}
