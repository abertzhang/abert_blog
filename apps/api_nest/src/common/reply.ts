/**
 * 统一响应信封工具（对应 api_express 的 utils/response.js 的 ok）
 *
 * 前端 web_react 的响应拦截器直接把 HTTP body 当作 { code, msg, data } 信封，
 * 因此所有成功接口都套用该结构：{ code: 0, msg: 'ok', data }。
 * 失败统一通过抛出 NestJS HttpException 由全局过滤器转成 { code, msg, data: null }。
 */
export interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

export class Reply {
  /** 成功响应；可附带自定义 msg（如「创建成功」），HTTP 状态见 @HttpCode */
  static ok<T>(data: T, msg = 'ok'): ApiEnvelope<T> {
    return { code: 0, msg, data };
  }
}
