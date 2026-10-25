import { Module } from '@nestjs/common';
import { StatService } from './stat.service.js';
import { StatController } from './stat.controller.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [StatController],
  providers: [StatService],
})
export class StatModule {}
