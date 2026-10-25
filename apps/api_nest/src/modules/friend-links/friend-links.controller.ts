/**
 * 友情链接控制器（对应 api_express/routes/friendLinkRouter.js）
 * /blog/api/friend-links
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { FriendLinksService } from './friend-links.service.js';
import { Reply } from '../../common/reply.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';

@Controller('friend-links')
export class FriendLinksController {
  constructor(private readonly svc: FriendLinksService) {}

  @Get()
  async list() {
    const data = await this.svc.list();
    return Reply.ok(data);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(201)
  async create(@Body() body: any) {
    const data = await this.svc.create(body);
    return Reply.ok(data, '创建成功');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.svc.update(Number(id), body);
    return Reply.ok(data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.svc.remove(Number(id));
    return Reply.ok({});
  }
}
