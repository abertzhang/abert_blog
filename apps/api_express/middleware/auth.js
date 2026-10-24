'use strict';

/**
 * 鉴权中间件
 *
 * 解析 Authorization: Bearer <token>（前端请求拦截器注入），校验后把
 * 用户信息挂到 req.user = { id, role }，供后续接口使用。
 *   - authenticate：需登录（任何已注册用户），校验失败返回 401（前端会清空登录态）
 *   - requireAdmin：需在 authenticate 之后使用，校验 role === 'admin'，否则返回 403
 */

const { verify } = require('../utils/token');
const { fail } = require('../utils/response');

function extractToken(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return '';
}

function authenticate(req, res, next) {
  const token = extractToken(req);
  const payload = verify(token);
  if (!payload) {
    return fail(res, 401, '未登录或登录已失效', 401);
  }
  req.user = { id: payload.uid, role: payload.role };
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return fail(res, 403, '需要管理员权限', 403);
  }
  next();
}

module.exports = { authenticate, requireAdmin };
