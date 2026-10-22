'use strict';

/**
 * PostgreSQL 连接池（node-postgres）
 * 连接参数优先从环境变量读取，配置示例见 .env.example。
 * 项目为纯 CommonJS，require 即可使用：
 *   const { pool, query } = require('./db');
 */

const path = require('path');

// 开发环境下若存在 .env 则加载（dotenv 未安装时静默跳过，直接用系统环境变量）
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  /* dotenv 缺失不影响，使用 process.env 即可 */
}

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     Number(process.env.PGPORT) || 5433,
  database: process.env.PGDATABASE || 'blog',
  user:     process.env.PGUSER     || 'blog',
  password: process.env.PGPASSWORD || 'blog123456',
  max:      10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 空闲连接异常不应导致进程退出，仅记录
pool.on('error', (err) => {
  console.error('[pg] 连接池空闲连接异常:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
