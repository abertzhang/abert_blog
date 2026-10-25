import { Module } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ArticlesModule } from '../articles/article.module.js';
import { FriendLinksModule } from '../friend-links/friend-links.module.js';

@Module({
  imports: [DatabaseModule, ArticlesModule, FriendLinksModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
