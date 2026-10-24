'use strict';

/**
 * 轻量 Token 工具（零依赖，基于 Node 内置 crypto 的 HMAC-SHA256）
 *
 * 本项目未引入 jsonwebtoken，这里用「base64url(payload) + '.' + HMAC 签名」实现
 * 与 JWT 同构的令牌：可被签名校验、可携带过期时间、防篡改。
 * 前端在 localStorage['token'] 中保存，并在 Authorization: Bearer <token> 中携带。
 *
 * 生产环境请通过环境变量 JWT_SECRET 设置一个强随机密钥。
 */

const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'abert_blog_default_secret_change_me';
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 默认 7 天

/** 当前秒级时间戳 */
function nowSec() {
  return Math.floor(Date.now() / 1000);
}

/**
 * 签发令牌
 * @param {{ uid: number, role: string }} payload 至少包含 uid 与 role
 * @param {number} [ttlSeconds] 有效期（秒），默认 7 天
 * @returns {string} token
 */
function sign(payload, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const bodyObj = { ...payload, exp: nowSec() + ttlSeconds };
  const body = Buffer.from(JSON.stringify(bodyObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * 校验令牌
 * @param {string} [token]
 * @returns {{ uid: number, role: string, exp: number } | null} 有效则返回载荷，否则 null
 */
function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  // 长度不等直接失败，避免 timingSafeEqual 抛错
  if (sig.length !== expected.length) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (!crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp === 'number' && payload.exp < nowSec()) return null;
    if (typeof payload.uid !== 'number') return null;
    return payload;
  } catch (e) {
    return null;
  }
}

module.exports = { sign, verify, nowSec };
