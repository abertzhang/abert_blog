'use strict';

/**
 * 后台管理路由（挂在 /blog/api/admin 下）
 *
 * 对应前端：adminListArticles / adminGetArticle / adminListFriendLinks。
 * 注意：路径是顶层 /admin/articles、/admin/friend-links，并非嵌套在
 * /articles 或 /friend-links 之下（与 web_react_api.md 一致）。
 */

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { ok, fail, asyncHandler } = require('../utils/response');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { toArticle } = require('../utils/articleMapper');

const LIST_COLS =
  `a.id, a.title, a.summary, a.cover, a.category_id, a.author_name, a.tags,
   a.copyright, a.status, a.pinned, a.view_count, a.published_at, a.created_at,
   c.name AS category_name`;
const DETAIL_COLS = LIST_COLS + `, a.content`;
const FROM_JOIN = `FROM articles a LEFT JOIN categories c ON c.id = a.category_id`;

/**
 * GET /admin/articles
 * 后台文章列表（管理视图，含草稿，不翻页直接返回全量）
 */
router.get('/articles', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT ${LIST_COLS} ${FROM_JOIN} ORDER BY a.created_at DESC, a.id DESC`
  );
  return ok(res, rows.map((r) => toArticle(r)));
}));

/**
 * GET /admin/articles/:id
 * 后台文章详情（编辑用，含正文，不增加浏览量）
 */
router.get('/articles/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await query(
    `SELECT ${DETAIL_COLS} ${FROM_JOIN} WHERE a.id = $1`,
    [id]
  );
  if (rows.length === 0) return fail(res, 404, '文章不存在');
  return ok(res, toArticle(rows[0], { withContent: true }));
}));

/**
 * GET /admin/friend-links
 * 后台友链列表（含未启用）
 */
router.get('/friend-links', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, url, "desc", enabled, sort FROM friend_links ORDER BY sort ASC, id ASC'
  );
  return ok(res, rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    url: r.url,
    desc: r.desc || '',
    enabled: !!r.enabled,
    sort: Number(r.sort || 0),
  })));
}));

module.exports = router;
