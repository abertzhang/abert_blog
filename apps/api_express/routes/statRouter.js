'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { ok, asyncHandler } = require('../utils/response');
const { toArticle } = require('../utils/articleMapper');

const LIST_COLS =
  `a.id, a.title, a.summary, a.cover, a.category_id, a.author_name, a.tags,
   a.copyright, a.status, a.pinned, a.view_count, a.published_at, a.created_at,
   c.name AS category_name`;
const FROM_JOIN = `FROM articles a LEFT JOIN categories c ON c.id = a.category_id`;

/**
 * GET /hot
 * 热门文章（按浏览量降序），query: { limit? }，默认 20
 */
router.get('/hot', asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const { rows } = await query(
    `SELECT ${LIST_COLS} ${FROM_JOIN}
      WHERE a.status = 'published'
      ORDER BY a.view_count DESC, COALESCE(a.published_at, a.created_at) DESC
      LIMIT $1`,
    [limit]
  );
  return ok(res, rows.map((r) => toArticle(r)));
}));

/**
 * 聚合文章 tags 字段（逗号 / 中文逗号分隔）为词频
 */
async function aggregateTags(limit) {
  const { rows } = await query(
    `SELECT tags FROM articles WHERE status = 'published' AND tags IS NOT NULL AND tags <> ''`
  );
  const counts = new Map();
  for (const r of rows) {
    const parts = String(r.tags).split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) counts.set(p, (counts.get(p) || 0) + 1);
  }
  let arr = Array.from(counts.entries()).map(([word, count]) => ({ word, count }));
  arr.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  if (limit && Number.isFinite(limit)) arr = arr.slice(0, Math.max(1, limit));
  return arr;
}

/**
 * GET /wordcloud
 * 标签云词频，query: { limit? }
 */
router.get('/wordcloud', asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
  const data = await aggregateTags(limit);
  return ok(res, data);
}));

/**
 * GET /tags
 * 标签列表（与 wordcloud 同源，作为兜底）
 */
router.get('/tags', asyncHandler(async (req, res) => {
  const data = await aggregateTags(undefined);
  return ok(res, data);
}));

module.exports = router;
