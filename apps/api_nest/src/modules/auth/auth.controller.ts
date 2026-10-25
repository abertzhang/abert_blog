/**
 * 认证控制器（对应 api_express/routes/authRouter.js）
 * 路由前缀 auth，全局前缀 /blog/api，故接口为 /blog/api/auth/*
 */
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Reply } from '../../common/reply.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: { phone?: string; password?: string; nickname?: string }) {
    const result = await this.auth.register(body.phone, body.password, body.nickname);
    return Reply.ok(result, '注册成功');
  }

  @Post('sms/send')
  async sendSms(@Body() body: { phone?: string }) {
    this.auth.sendSms(body.phone);
    return Reply.ok({});
  }

  @Post('login')
  async login(@Body() body: { phone?: string; password?: string; code?: string }) {
    const result = await this.auth.login(body.phone, body.password, body.code);
    return Reply.ok(result);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    const data = await this.auth.me(user.id);
    return Reply.ok(data);
  }
}
