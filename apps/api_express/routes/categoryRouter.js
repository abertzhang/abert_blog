'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { ok, fail, asyncHandler } = require('../utils/response');
const { authenticate, requireAdmin } = require('../middleware/auth');

function toCategory(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug || '',
    sort: Number(row.sort || 0),
    article_count: Number(row.article_count || 0),
  };
}

/**
 * GET /categories
 * 分类列表（含每个分类的已发布文章数）
 */
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT c.id, c.name, c.slug, c.sort,
            COUNT(a.id) FILTER (WHERE a.status = 'published') AS article_count
       FROM categories c
       LEFT JOIN articles a ON a.category_id = c.id
      GROUP BY c.id, c.name, c.slug, c.sort
      ORDER BY c.sort ASC, c.id ASC`
  );
  return ok(res, rows.map(toCategory));
}));

/**
 * POST /categories  （管理员）
 * 新建分类，body: { name, slug?, sort? }
 */
router.post('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, slug, sort } = req.body || {};
  if (!name || !name.trim()) {
    return fail(res, 400, '分类名称 name 不能为空');
  }
  try {
    const { rows } = await query(
      `INSERT INTO categories (name, slug, sort)
       VALUES ($1, $2, COALESCE($3, 0))
       RETURNING id, name, slug, sort, 0 AS article_count`,
      [name.trim(), (slug || '').trim(), sort == null ? 0 : Number(sort)]
    );
    return ok(res, toCategory(rows[0]), '创建成功', 201);
  } catch (e) {
    // 唯一约束（slug / name）冲突 → 友好的 409，避免裸 500
    if (e.code === '23505') return fail(res, 409, '该分类 slug 或名称已存在', 409);
    throw e;
  }
}));

/**
 * PUT /categories/:id  （管理员）
 * 更新分类，body: { name?, slug?, sort? }
 */
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, slug, sort } = req.body || {};
  const sets = [];
  const params = [];
  let i = 1;
  if (name !== undefined) { sets.push(`name = $${i++}`); params.push(name); }
  if (slug !== undefined) { sets.push(`slug = $${i++}`); params.push(slug); }
  if (sort !== undefined) { sets.push(`sort = $${i++}`); params.push(Number(sort)); }
  if (sets.length === 0) {
    return fail(res, 400, '没有任何可更新的字段');
  }
  params.push(id);
  try {
    const { rows } = await query(
      `UPDATE categories SET ${sets.join(', ')}
       WHERE id = $${i}
       RETURNING id, name, slug, sort,
         (SELECT COUNT(*) FROM articles a WHERE a.category_id = categories.id AND a.status='published') AS article_count`,
      params
    );
    if (rows.length === 0) return fail(res, 404, '分类不存在');
    return ok(res, toCategory(rows[0]));
  } catch (e) {
    if (e.code === '23505') return fail(res, 409, '该分类 slug 或名称已存在', 409);
    throw e;
  }
}));

/**
 * DELETE /categories/:id  （管理员）
 * 删除分类；文章外键 ON DELETE SET NULL，删除分类后文章保留（category_id 置空）
 */
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [id]);
  if (rowCount === 0) return fail(res, 404, '分类不存在');
  return ok(res, {});
}));

module.exports = router;
