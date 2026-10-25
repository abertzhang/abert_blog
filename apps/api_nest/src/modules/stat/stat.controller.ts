/**
 * 统计控制器（对应 api_express/routes/statRouter.js）
 * 挂在全局前缀 /blog/api 下：/blog/api/hot、/blog/api/wordcloud、/blog/api/tags
 */
import { Controller, Get, Query } from '@nestjs/common';
import { StatService } from './stat.service.js';
import { Reply } from '../../common/reply.js';

@Controller('')
export class StatController {
  constructor(private readonly svc: StatService) {}

  @Get('hot')
  async hot(@Query('limit') limit?: string) {
    const data = await this.svc.hot(limit ? Number(limit) : 20);
    return Reply.ok(data);
  }

  @Get('wordcloud')
  async wordcloud(@Query('limit') limit?: string) {
    const lim = limit ? Number(limit) : undefined;
    const data = await this.svc.wordcloud(lim);
    return Reply.ok(data);
  }

  @Get('tags')
  async tags() {
    const data = await this.svc.tags();
    return Reply.ok(data);
  }
}
