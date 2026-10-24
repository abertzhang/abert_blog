'use strict';

/**
 * 一次性迁移脚本：为已存在的数据库补齐 comments 与 friend_links 两张表。
 *
 * 背景：api_express 的建表脚本 db/init/01_schema.sql 后续补充了这两张表，
 * 但「数据库已建立好」的容器是在补充前初始化的，/docker-entrypoint-initdb.d
 * 不会重跑，因此这两张表缺失。本脚本用 CREATE TABLE IF NOT EXISTS 幂等补齐，
 * 并补一条友链示例数据。
 *
 * 用法（在 apps/api_express 目录下）：
 *   node db/migrate_missing_tables.js
 * 连接参数读取 .env（与 db/index.js 一致）。
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) { /* 忽略 */ }
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5433,
  database: process.env.PGDATABASE || 'blog',
  user: process.env.PGUSER || 'blog',
  password: process.env.PGPASSWORD || 'blog123456',
});

async function main() {
  // 评论表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id          BIGSERIAL PRIMARY KEY,
      article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      parent_id   BIGINT REFERENCES comments(id) ON DELETE CASCADE,
      nickname    VARCHAR(64) NOT NULL,
      content     TEXT NOT NULL,
      is_author   BOOLEAN NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_comments_article ON comments (article_id);
  `);
  console.log('✅ comments 表已就绪');

  // 友情链接表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friend_links (
      id        BIGSERIAL PRIMARY KEY,
      name      VARCHAR(64) NOT NULL,
      url       VARCHAR(512) NOT NULL,
      "desc"    VARCHAR(128) DEFAULT '',
      enabled   BOOLEAN NOT NULL DEFAULT true,
      sort      INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  console.log('✅ friend_links 表已就绪');

  // 友链示例数据（仅当表为空时插入）
  const { rows } = await pool.query('SELECT COUNT(*) AS c FROM friend_links');
  if (Number(rows[0].c) === 0) {
    await pool.query(`
      INSERT INTO friend_links (name, url, "desc", enabled, sort) VALUES
        ('WorkBuddy', 'https://www.workbuddy.cn', 'AI 协作工作台', true, 1),
        ('Node.js 中文网', 'https://nodejs.org/zh-cn', 'Node.js 官方文档', true, 2)
    `);
    console.log('✅ 已写入 2 条友链示例数据');
  } else {
    console.log('ℹ️  friend_links 已有数据，跳过种子');
  }

  await pool.end();
  console.log('🎉 迁移完成');
}

main().catch((e) => {
  console.error('❌ 迁移失败:', e.message);
  process.exit(1);
});
