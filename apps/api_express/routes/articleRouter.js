'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { ok, fail, asyncHandler } = require('../utils/response');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { toArticle } = require('../utils/articleMapper');

// 列表/详情共用的 SELECT（列表不含 content，详情含 content）
const LIST_COLS =
  `a.id, a.title, a.summary, a.cover, a.category_id, a.author_name, a.tags,
   a.copyright, a.status, a.pinned, a.view_count, a.published_at, a.created_at,
   c.name AS category_name`;
const DETAIL_COLS = LIST_COLS + `, a.content`;

const FROM_JOIN =
  `FROM articles a LEFT JOIN categories c ON c.id = a.category_id`;

const ORDER_BY = `ORDER BY a.pinned DESC, COALESCE(a.published_at, a.created_at) DESC, a.id DESC`;

/**
 * GET /articles
 * 文章分页列表（仅已发布），支持 category_id 与 tag 过滤
 * query: { page?, page_size?, category_id?, tag? }
 */
router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size, 10) || 12));
  const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
  const tag = req.query.tag ? String(req.query.tag).trim() : '';

  const where = ['a.status = $1'];
  const params = ['published'];
  let pi = 2;
  if (categoryId) { where.push(`a.category_id = $${pi++}`); params.push(categoryId); }
  if (tag) { where.push(`a.tags ILIKE $${pi++}`); params.push(`%${tag}%`); }
  const whereSql = 'WHERE ' + where.join(' AND ');

  // 总数
  const countRes = await query(`SELECT COUNT(*) AS total ${FROM_JOIN} ${whereSql}`, params);
  const total = Number(countRes.rows[0].total);

  // 分页数据
  const dataParams = [...params, pageSize, (page - 1) * pageSize];
  const { rows } = await query(
    `SELECT ${LIST_COLS} ${FROM_JOIN} ${whereSql} ${ORDER_BY}
     LIMIT $${pi++} OFFSET $${pi++}`,
    dataParams
  );

  return ok(res, {
    list: rows.map((r) => toArticle(r)),
    total,
    page,
    page_size: pageSize,
  });
}));

/**
 * GET /articles/:id
 * 文章详情（含正文），并自增浏览量
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 400, '非法的文章 id');
  // 先自增浏览量（不存在时影响 0 行）
  await query('UPDATE articles SET view_count = view_count + 1 WHERE id = $1', [id]);
  const { rows } = await query(
    `SELECT ${DETAIL_COLS} ${FROM_JOIN} WHERE a.id = $1`,
    [id]
  );
  if (rows.length === 0) return fail(res, 404, '文章不存在');
  return ok(res, toArticle(rows[0], { withContent: true }));
}));

/**
 * POST /articles  （管理员）
 * 新建文章
 */
router.post('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) {
    return fail(res, 400, '标题 title 不能为空');
  }
  // 取当前登录用户的昵称作为作者名
  const u = await query('SELECT nickname FROM users WHERE id = $1', [req.user.id]);
  const authorName = u.rows.length ? u.rows[0].nickname : '';

  // 列名 / 绑定参数 / 逐列占位符 并行维护，避免用 vals.indexOf 取序号时重复值导致错位
  const cols = ['title', 'author_id', 'author_name'];
  const params = [String(b.title).trim(), req.user.id, authorName];
  const segs = ['$1', '$2', '$3'];
  let pi = params.length; // 下一个绑定参数序号
  const add = (col, value, raw) => {
    cols.push(col);
    if (raw) {
      segs.push(raw); // 直接写 SQL 表达式（如 now()），不占用绑定参数
    } else {
      params.push(value);
      segs.push(`$${++pi}`);
    }
  };

  if (b.summary !== undefined) add('summary', b.summary);
  if (b.content !== undefined) add('content', b.content);
  if (b.cover !== undefined) add('cover', b.cover || '');
  if (b.category_id !== undefined && b.category_id !== null && b.category_id !== '')
    add('category_id', Number(b.category_id));
  if (b.tags !== undefined) add('tags', b.tags || '');
  if (b.copyright !== undefined) add('copyright', !!b.copyright);
  if (b.pinned !== undefined) add('pinned', !!b.pinned);
  const status = b.status === 'draft' ? 'draft' : 'published';
  add('status', status);
  // 发布且未给定发布时间时，默认取数据库当前时间（now() 直接写 SQL，不绑定参数）
  if (status === 'published' && !b.published_at) add('published_at', null, 'now()');
  else if (b.published_at) add('published_at', new Date(b.published_at));

  const { rows } = await query(
    `INSERT INTO articles (${cols.join(', ')})
     VALUES (${segs.join(', ')})
     RETURNING id`,
    params
  );
  const newId = Number(rows[0].id);
  const detail = await query(
    `SELECT ${DETAIL_COLS} ${FROM_JOIN} WHERE a.id = $1`,
    [newId]
  );
  return ok(res, toArticle(detail.rows[0], { withContent: true }), '创建成功', 201);
}));

/**
 * PUT /articles/:id  （管理员）
 * 更新文章
 */
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const sets = [];
  const params = [];
  let i = 1;
  const set = (col, value) => { sets.push(`${col} = $${i++}`); params.push(value); };

  if (b.title !== undefined) set('title', String(b.title).trim());
  if (b.summary !== undefined) set('summary', b.summary);
  if (b.content !== undefined) set('content', b.content);
  if (b.cover !== undefined) set('cover', b.cover || '');
  if (b.category_id !== undefined) set('category_id', b.category_id === '' || b.category_id == null ? null : Number(b.category_id));
  if (b.tags !== undefined) set('tags', b.tags || '');
  if (b.copyright !== undefined) set('copyright', !!b.copyright);
  if (b.pinned !== undefined) set('pinned', !!b.pinned);
  if (b.status !== undefined) set('status', b.status === 'draft' ? 'draft' : 'published');
  if (b.published_at !== undefined) set('published_at', b.published_at ? new Date(b.published_at) : null);

  if (sets.length === 0) return fail(res, 400, '没有任何可更新的字段');

  params.push(id);
  const { rowCount } = await query(
    `UPDATE articles SET ${sets.join(', ')} WHERE id = $${i}`,
    params
  );
  if (rowCount === 0) return fail(res, 404, '文章不存在');

  const detail = await query(
    `SELECT ${DETAIL_COLS} ${FROM_JOIN} WHERE a.id = $1`,
    [id]
  );
  return ok(res, toArticle(detail.rows[0], { withContent: true }));
}));

/**
 * DELETE /articles/:id  （管理员）
 */
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rowCount } = await query('DELETE FROM articles WHERE id = $1', [id]);
  if (rowCount === 0) return fail(res, 404, '文章不存在');
  return ok(res, {});
}));

// ---------------------- 评论（嵌套在文章路由下） ----------------------

function toComment(row) {
  return {
    id: Number(row.id),
    article_id: Number(row.article_id),
    parent_id: row.parent_id != null ? Number(row.parent_id) : null,
    nickname: row.nickname,
    content: row.content,
    is_author: !!row.is_author,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

/**
 * GET /articles/:articleId/comments
 * 某文章评论列表（按时间升序）
 */
router.get('/:articleId/comments', asyncHandler(async (req, res) => {
  const articleId = Number(req.params.articleId);
  const { rows } = await query(
    `SELECT id, article_id, parent_id, nickname, content, is_author, created_at
       FROM comments
      WHERE article_id = $1
      ORDER BY created_at ASC, id ASC`,
    [articleId]
  );
  return ok(res, rows.map(toComment));
}));

/**
 * POST /articles/:articleId/comments  （需登录）
 * 发表评论；作者名 / is_author 由后端按登录态注入，无需前端传
 */
router.post('/:articleId/comments', authenticate, asyncHandler(async (req, res) => {
  const articleId = Number(req.params.articleId);
  const { content, parent_id } = req.body || {};
  if (!content || !String(content).trim()) {
    return fail(res, 400, '评论内容不能为空');
  }
  // 评论者昵称取自已登录用户
  const u = await query('SELECT nickname FROM users WHERE id = $1', [req.user.id]);
  const nickname = u.rows.length ? u.rows[0].nickname : '匿名用户';

  // is_author：评论者为管理员，或评论者正是文章作者
  const art = await query('SELECT author_id FROM articles WHERE id = $1', [articleId]);
  const isAuthor = req.user.role === 'admin' ||
    (art.rows.length && Number(art.rows[0].author_id) === req.user.id);

  const pid = parent_id ? Number(parent_id) : null;
  const { rows } = await query(
    `INSERT INTO comments (article_id, parent_id, nickname, content, is_author)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, article_id, parent_id, nickname, content, is_author, created_at`,
    [articleId, pid, nickname, String(content).trim(), !!isAuthor]
  );
  return ok(res, toComment(rows[0]), '评论成功', 201);
}));

module.exports = router;
