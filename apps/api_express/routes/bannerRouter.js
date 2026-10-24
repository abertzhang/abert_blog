'use strict';

/**
 * 首页 banner 封面图接口
 *
 * 封面图源为 aknot 公共图床（https://img-common.aknot.uk/cover），
 * 共三种类型：land（风景）、car（汽车）、moto（摩托），每种编号 01~50，共 150 张。
 *
 * GET /banners?count=5
 *   - 随机返回 count 张（默认 5，范围 1~10）封面图，类型在三类间随机、编号 01~50 随机
 *   - 返回结构：{ code:0, msg:'ok', data: [ { image, category }, ... ] }
 *     image   封面图完整 URL
 *     category 类型名（Land / Car / Moto），用作轮播图标签与指示点配色兜底
 */

const express = require('express');
const router = express.Router();

const { ok, fail } = require('../utils/response');

// 封面图基础地址
const COVER_BASE = 'https://img-common.aknot.uk/cover';
// 三种图片类型
const TYPES = ['land', 'car', 'moto'];
// 每种类型的图片数量（编号 01~50）
const MAX_INDEX = 50;
// 单次最多返回张数，避免前端轮播过长
const MAX_COUNT = 10;

// 两位补零：1 → '01'
function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * 随机生成 n 张不重复的封面图
 * 每个候选由「随机类型 + 随机编号」组成，使用 seen 集合去重，最多重试 200 次兜底。
 */
function pickSlides(n) {
  const count = Math.min(Math.max(Number(n) || 5, 1), MAX_COUNT);
  const seen = new Set();
  const slides = [];
  let guard = 0;
  while (slides.length < count && guard < 200) {
    guard += 1;
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const idx = Math.floor(Math.random() * MAX_INDEX) + 1; // 1~50
    const key = `${type}-${idx}`;
    if (seen.has(key)) continue; // 去重
    seen.add(key);
    slides.push({
      image: `${COVER_BASE}/${type}-${pad2(idx)}.jpg`,
      category: type.charAt(0).toUpperCase() + type.slice(1), // Land / Car / Moto
    });
  }
  return slides;
}

/**
 * GET /banners
 */
router.get('/', (req, res) => {
  try {
    const slides = pickSlides(req.query.count);
    return ok(res, slides);
  } catch (e) {
    return fail(res, 500, e.message || '服务器内部错误');
  }
});

module.exports = router;
