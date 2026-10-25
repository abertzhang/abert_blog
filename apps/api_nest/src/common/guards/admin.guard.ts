/**
 * 管理员权限守卫（对应 api_express 的 middleware/auth.js 的 requireAdmin）
 *
 * 需在 JwtAuthGuard 之后使用，校验 req.user.role === 'admin'，否则抛出 403。
 */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user || req.user.role !== 'admin') {
      throw new ForbiddenException('需要管理员权限');
    }
    return true;
  }
}
