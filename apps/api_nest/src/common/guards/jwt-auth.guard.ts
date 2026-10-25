/**
 * 鉴权守卫（对应 api_express 的 middleware/auth.js 的 authenticate）
 *
 * 解析 Authorization: Bearer <token>，校验后把用户信息挂到 req.user = { id, role }。
 * 校验失败抛出 401（全局过滤器会转成 { code:401, msg, data:null }，前端据此清空登录态）。
 */
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verify } from '../token.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = (req.headers.authorization as string) || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const payload = verify(token);
    if (!payload) {
      throw new UnauthorizedException('未登录或登录已失效');
    }
    req.user = { id: payload.uid, role: payload.role };
    return true;
  }
}
