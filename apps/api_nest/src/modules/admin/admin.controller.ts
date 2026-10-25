/**
 * 后台管理控制器（对应 api_express/routes/adminRouter.js）
 * /blog/api/admin/articles、/blog/api/admin/articles/:id、/blog/api/admin/friend-links
 */
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { Reply } from '../../common/reply.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('articles')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listArticles() {
    const data = await this.svc.listArticles();
    return Reply.ok(data);
  }

  @Get('articles/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getArticle(@Param('id') id: string) {
    const data = await this.svc.getArticle(Number(id));
    return Reply.ok(data);
  }

  @Get('friend-links')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listFriendLinks() {
    const data = await this.svc.listFriendLinks();
    return Reply.ok(data);
  }
}
