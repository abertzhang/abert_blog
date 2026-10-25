import { NestFactory } from '@nestjs/core';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 统一前缀 /blog/api（与前端 axios baseURL 一致）
  app.setGlobalPrefix('blog/api');

  // CORS：允许浏览器 / Flutter Web 跨域访问（原生移动端不受同源策略约束，无需）
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 全局异常过滤器：把任何异常统一转成 { code, msg, data: null } 信封
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();

  // /blog/api 下未匹配到的路由 → 友好的 404 信封（在 NestJS 路由之后注册）
  app.use('/blog/api', (req: Request, res: Response, _next: NextFunction) => {
    res
      .status(404)
      .json({ code: 404, msg: `接口不存在: ${req.method} ${req.originalUrl}`, data: null });
  });

  // 自定义 api_express 为 3001，api_nest 为 3002，api_go 为 3003
  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();
