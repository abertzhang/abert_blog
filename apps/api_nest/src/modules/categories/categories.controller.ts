/**
 * 分类控制器（对应 api_express/routes/categoryRouter.js）
 * /blog/api/categories
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
import { CategoriesService, Category } from './categories.service.js';
import { Reply } from '../../common/reply.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  async list() {
    const data = await this.svc.list();
    return Reply.ok(data);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(201)
  async create(@Body() body: { name?: string; slug?: string; sort?: number }) {
    const data = await this.svc.create(body.name, body.slug, body.sort);
    return Reply.ok(data, '创建成功');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string; sort?: number },
  ) {
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
