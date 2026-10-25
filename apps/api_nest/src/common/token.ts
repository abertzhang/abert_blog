/**
 * 轻量 Token 工具（零依赖，基于 Node 内置 crypto 的 HMAC-SHA256）
 *
 * 与 api_express 的 utils/token.js 实现完全一致 —— 用 base64url(payload) + '.' + HMAC 签名
 * 构成与 JWT 同构的令牌，可被签名校验、携带过期时间、防篡改。
 * 因此 api_express 与 api_nest 签发的令牌可互相验证（共用 JWT_SECRET）。
 *
 * 前端在 localStorage['token'] 保存，请求拦截器注入 Authorization: Bearer <token>。
 */
import crypto from 'node:crypto';
import { jwtSecret } from '../config.js';

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 默认 7 天

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export interface TokenPayload {
  uid: number;
  role: string;
  exp: number;
}

/** 签发令牌 */
export function sign(payload: { uid: number; role: string }, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const bodyObj = { ...payload, exp: nowSec() + ttlSeconds };
  const body = Buffer.from(JSON.stringify(bodyObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', jwtSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** 校验令牌，无效或过期返回 null */
export function verify(token?: string): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = crypto.createHmac('sha256', jwtSecret).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (!crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (typeof payload.exp === 'number' && payload.exp < nowSec()) return null;
    if (typeof payload.uid !== 'number') return null;
    return payload;
  } catch {
    return null;
  }
}
