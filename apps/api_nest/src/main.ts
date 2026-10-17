import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  // 自定义api_express为3001，api_nest为3002，api_go为3003
  await app.listen(process.env.PORT ?? 3002);
}
await bootstrap();
