/**
 * 首页 banner 封面图控制器（对应 api_express/routes/bannerRouter.js）
 * /blog/api/banners（无需数据库）
 */
import { Controller, Get, Query } from '@nestjs/common';
import { BannerService } from './banner.service.js';
import { Reply } from '../../common/reply.js';

@Controller('banners')
export class BannerController {
  constructor(private readonly svc: BannerService) {}

  @Get()
  banner(@Query('count') count?: string) {
    const data = this.svc.pickSlides(count ? Number(count) : undefined);
    return Reply.ok(data);
  }
}
