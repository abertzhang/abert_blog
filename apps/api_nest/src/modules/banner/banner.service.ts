/**
 * 首页 banner 封面图服务（对应 api_express/routes/bannerRouter.js）
 *
 * 封面图源为 aknot 公共图床（https://img-common.aknot.uk/cover），
 * 共三种类型：land / car / moto，每种编号 01~50，共 150 张。
 * 从三类随机取 count 张（默认 5，1~10），类型间随机、编号随机，去重。
 */
import { Injectable } from '@nestjs/common';

export interface BannerSlide {
  image: string;
  category: string;
}

const COVER_BASE = 'https://img-common.aknot.uk/cover';
const TYPES = ['land', 'car', 'moto'];
const MAX_INDEX = 50;
const MAX_COUNT = 10;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

@Injectable()
export class BannerService {
  pickSlides(n?: number): BannerSlide[] {
    const count = Math.min(Math.max(Number(n) || 5, 1), MAX_COUNT);
    const seen = new Set<string>();
    const slides: BannerSlide[] = [];
    let guard = 0;
    while (slides.length < count && guard < 200) {
      guard += 1;
      const type = TYPES[Math.floor(Math.random() * TYPES.length)];
      const idx = Math.floor(Math.random() * MAX_INDEX) + 1; // 1~50
      const key = `${type}-${idx}`;
      if (seen.has(key)) continue;
      seen.add(key);
      slides.push({
        image: `${COVER_BASE}/${type}-${pad2(idx)}.jpg`,
        category: type.charAt(0).toUpperCase() + type.slice(1), // Land / Car / Moto
      });
    }
    return slides;
  }
}
