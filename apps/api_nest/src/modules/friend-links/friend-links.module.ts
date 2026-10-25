import { Module } from '@nestjs/common';
import { FriendLinksService } from './friend-links.service.js';
import { FriendLinksController } from './friend-links.controller.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [FriendLinksController],
  providers: [FriendLinksService],
  exports: [FriendLinksService],
})
export class FriendLinksModule {}
