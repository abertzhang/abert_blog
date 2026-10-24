'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { ok, fail, asyncHandler } = require('../utils/response');
const { authenticate, requireAdmin } = require('../middleware/auth');

function toFriendLink(row) {
  return {
    id: Number(row.id),
    name: row.name,
    url: row.url,
    desc: row.desc || '',
    enabled: !!row.enabled,
    sort: Number(row.sort || 0),
  };
}

/**
 * GET /friend-links
 * 友链列表（前台通常再按 enabled 过滤）
 */
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, url, "desc", enabled, sort FROM friend_links ORDER BY sort ASC, id ASC'
  );
  return ok(res, rows.map(toFriendLink));
}));

/**
 * POST /friend-links  （管理员）
 * 新建友链，body: { name, url, desc?, enabled?, sort? }
 */
router.post('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, url, desc, enabled, sort } = req.body || {};
  if (!name || !name.trim()) return fail(res, 400, '友链名称 name 不能为空');
  if (!url || !url.trim()) return fail(res, 400, '友链地址 url 不能为空');
  const { rows } = await query(
    `INSERT INTO friend_links (name, url, "desc", enabled, sort)
     VALUES ($1, $2, $3, COALESCE($4, true), COALESCE($5, 0))
     RETURNING id, name, url, "desc", enabled, sort`,
    [name.trim(), url.trim(), desc || '', enabled === undefined ? true : !!enabled, sort == null ? 0 : Number(sort)]
  );
  return ok(res, toFriendLink(rows[0]), '创建成功', 201);
}));

/**
 * PUT /friend-links/:id  （管理员）
 */
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, url, desc, enabled, sort } = req.body || {};
  const sets = [];
  const params = [];
  let i = 1;
  const set = (col, value) => { sets.push(`${col} = $${i++}`); params.push(value); };
  if (name !== undefined) set('name', name);
  if (url !== undefined) set('url', url);
  if (desc !== undefined) set('desc', desc);
  if (enabled !== undefined) set('enabled', !!enabled);
  if (sort !== undefined) set('sort', Number(sort));
  if (sets.length === 0) return fail(res, 400, '没有任何可更新的字段');
  params.push(id);
  const { rowCount } = await query(
    `UPDATE friend_links SET ${sets.join(', ')} WHERE id = $${i}`,
    params
  );
  if (rowCount === 0) return fail(res, 404, '友链不存在');
  const { rows } = await query(
    'SELECT id, name, url, "desc", enabled, sort FROM friend_links WHERE id = $1',
    [id]
  );
  return ok(res, toFriendLink(rows[0]));
}));

/**
 * DELETE /friend-links/:id  （管理员）
 */
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { rowCount } = await query('DELETE FROM friend_links WHERE id = $1', [id]);
  if (rowCount === 0) return fail(res, 404, '友链不存在');
  return ok(res, {});
}));

module.exports = router;
