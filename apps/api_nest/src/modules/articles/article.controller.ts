/**
 * 文章控制器（对应 api_express/routes/articleRouter.js）
 * /blog/api/articles 及嵌套评论 /blog/api/articles/:articleId/comments
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ArticlesService } from './article.service.js';
import { Reply } from '../../common/reply.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly svc: ArticlesService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('page_size') page_size?: string,
    @Query('category_id') category_id?: string,
    @Query('tag') tag?: string,
  ) {
    const data = await this.svc.list({
      page: page ? Number(page) : undefined,
      page_size: page_size ? Number(page_size) : undefined,
      category_id: category_id ? Number(category_id) : null,
      tag: tag || undefined,
    });
    return Reply.ok(data);
  }

  // 评论列表（两段路径，声明在 /:id 之前，避免被单段参数捕获）
  @Get(':articleId/comments')
  async listComments(@Param('articleId') articleId: string) {
    const data = await this.svc.listComments(Number(articleId));
    return Reply.ok(data);
  }

  @Post(':articleId/comments')
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async createComment(
    @Param('articleId') articleId: string,
    @Body() body: { content?: string; parent_id?: number },
    @CurrentUser() user: AuthUser,
  ) {
    const data = await this.svc.createComment(Number(articleId), body, user);
    return Reply.ok(data, '评论成功');
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const data = await this.svc.detail(Number(id));
    return Reply.ok(data);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(201)
  async create(@Body() body: any, @CurrentUser() user: AuthUser) {
    const data = await this.svc.create(body, user);
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
