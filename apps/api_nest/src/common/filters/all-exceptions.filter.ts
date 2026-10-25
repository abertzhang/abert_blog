/**
 * 全局异常过滤器（对应 api_express 的错误处理中间件）
 *
 * 把任意异常统一转成前端期望的信封：{ code, msg, data: null }
 *   - HttpException（含 NestJS 内置的 BadRequest/Unauthorized/Forbidden/NotFound/Conflict 等）
 *     其状态码即信封 code，message 即 msg
 *   - 其他未知异常 → { code:500, msg: 异常信息, data:null }
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let msg = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        msg = resp;
      } else {
        const r = resp as { message?: string | string[]; msg?: string };
        if (Array.isArray(r.message)) msg = r.message.join(', ');
        else if (r.message) msg = r.message;
        else if (r.msg) msg = r.msg;
        else msg = exception.message;
      }
    } else if (exception && typeof exception === 'object' && 'message' in exception) {
      // 仅当 message 为非空字符串时才采用，避免把默认兜底文案覆盖成空串
      const m = String((exception as { message: unknown }).message ?? '');
      if (m.trim()) msg = m;
    }

    res.status(status).json({
      code: status,
      msg,
      data: null,
    });
  }
}
