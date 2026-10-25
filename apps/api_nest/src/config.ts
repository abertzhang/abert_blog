/**
 * 全局配置：读取环境变量，未设置时使用与 api_express 一致的默认值。
 *
 * 复用 api_express 的同一套 Docker PostgreSQL（宿主 5433，库名 blog，已建表 + 种子）。
 * 因此本服务无需重新跑迁移/种子，直接连接即可读写同一份数据。
 */
import 'dotenv/config';

export const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5433,
  database: process.env.PGDATABASE || 'blog',
  user: process.env.PGUSER || 'blog',
  password: process.env.PGPASSWORD || 'blog123456',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Token 签名密钥：与 api_express 共用同一算法，双方签发的令牌可互验。
export const jwtSecret = process.env.JWT_SECRET || 'abert_blog_default_secret_change_me';
