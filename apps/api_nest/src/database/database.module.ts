/**
 * 数据库模块：提供 DatabaseService 单例（pg.Pool 封装）。
 * 其他业务模块 import DatabaseModule 后即可注入 DatabaseService。
 */
import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
