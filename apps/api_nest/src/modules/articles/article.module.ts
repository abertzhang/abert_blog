import { Module } from '@nestjs/common';
import { ArticlesService } from './article.service.js';
import { ArticlesController } from './article.controller.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
