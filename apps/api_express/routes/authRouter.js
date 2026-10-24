'use strict';

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { ok, fail, asyncHandler } = require('../utils/response');
const { sign } = require('../utils/token');
const { authenticate } = require('../middleware/auth');

// 内存版短信验证码存储（开发期；生产应替换为 Redis 等持久化 + 真实短信网关）
// key: phone -> { code, exp }
const smsCodes = new Map();
const SMS_TTL_MS = 5 * 60 * 1000; // 5 分钟有效

const PHONE_RE = /^1[3-9]\d{9}$/;

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** 生成「当前登录用户」对外暴露的对象（与前端 User 类型一致） */
function publicUser(row) {
  return {
    id: Number(row.id),
    nickname: row.nickname,
    phone: row.phone,
    role: row.role,
  };
}

/**
 * POST /auth/register
 * 注册新用户（默认 role = 'user'）；注册成功后直接签发 token 自动登录。
 * 与登录路径一致，密码在数据库内用 pgcrypto 的 crypt() 生成 bcrypt 哈希，
 * 因此 Node 侧无需安装 bcrypt。
 * body: { phone, password, nickname? }
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { phone, password, nickname } = req.body || {};

  if (!phone || !PHONE_RE.test(phone)) {
    return fail(res, 400, '请输入合法的手机号');
  }
  if (!password || String(password).length < 6) {
    return fail(res, 400, '密码至少 6 位');
  }

  // 手机号全局唯一，注册前先查重
  const exist = await query('SELECT id FROM users WHERE phone = $1', [phone]);
  if (exist.rows.length > 0) {
    return fail(res, 409, '该手机号已注册', 409);
  }

  // nickname 缺省取手机号；密码用 crypt() 哈希后入库，role 固定为普通用户
  const name = (nickname && String(nickname).trim()) || phone;
  const { rows } = await query(
    `INSERT INTO users (phone, nickname, password, role)
     VALUES ($1, $2, crypt($3, gen_salt('bf')), 'user')
     RETURNING id, nickname, phone, role`,
    [phone, name, password]
  );
  const user = rows[0];
  const token = sign({ uid: Number(user.id), role: user.role });
  return ok(res, { token, user: publicUser(user) }, '注册成功', 201);
}));

/**
 * POST /auth/sms/send
 * 发送短信验证码（前端当前默认关闭，仅保留实现以备启用）
 */
router.post('/sms/send', asyncHandler(async (req, res) => {
  const { phone } = req.body || {};
  if (!phone || !PHONE_RE.test(phone)) {
    return fail(res, 400, '请输入合法的手机号');
  }
  const code = genCode();
  smsCodes.set(phone, { code, exp: Date.now() + SMS_TTL_MS });
  // 开发环境把验证码打印到控制台，方便联调（生产环境应替换为真实短信发送）
  console.log(`[sms] 向 ${phone} 发送验证码：${code}（开发环境打印，未真实发送）`);
  return ok(res, {});
}));

/**
 * POST /auth/login
 * 登录 / 注册（短信或密码）。文档约定：当前前端仅启用管理员密码登录，
 * 但后端同时实现短信验证码路径以备开关启用。
 * body: { phone, code?, password? }
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { phone, code, password } = req.body || {};
  if (!phone || !PHONE_RE.test(phone)) {
    return fail(res, 400, '请输入合法的手机号');
  }

  // —— 路径一：密码登录（当前启用）——
  if (password) {
    // 使用 pgcrypto 的 crypt() 在数据库内完成 bcrypt 比对，无需在 Node 侧安装 bcrypt
    const { rows } = await query(
      `SELECT id, nickname, phone, role
         FROM users
        WHERE phone = $1
          AND password = crypt($2, password)`,
      [phone, password]
    );
    if (rows.length === 0) {
      return fail(res, 401, '手机号或密码错误', 401);
    }
    const user = rows[0];
    const token = sign({ uid: Number(user.id), role: user.role });
    return ok(res, { token, user: publicUser(user) });
  }

  // —— 路径二：短信验证码登录（备用）——
  if (code) {
    const rec = smsCodes.get(phone);
    if (!rec || rec.exp < Date.now()) {
      return fail(res, 400, '验证码已过期，请重新获取');
    }
    if (rec.code !== String(code)) {
      return fail(res, 400, '验证码错误');
    }
    smsCodes.delete(phone);
    const { rows } = await query(
      'SELECT id, nickname, phone, role FROM users WHERE phone = $1',
      [phone]
    );
    if (rows.length === 0) {
      return fail(res, 401, '该手机号尚未注册', 401);
    }
    const user = rows[0];
    const token = sign({ uid: Number(user.id), role: user.role });
    return ok(res, { token, user: publicUser(user) });
  }

  return fail(res, 400, '请提供密码或短信验证码');
}));

/**
 * GET /auth/me
 * 用 token 换取当前登录用户（前端应用启动时若有 token 则拉取）
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, nickname, phone, role FROM users WHERE id = $1',
    [req.user.id]
  );
  if (rows.length === 0) {
    return fail(res, 401, '用户不存在或登录已失效', 401);
  }
  return ok(res, publicUser(rows[0]));
}));

module.exports = router;
