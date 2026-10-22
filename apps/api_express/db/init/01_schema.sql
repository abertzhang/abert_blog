-- ============================================================
-- 博客核心表：users + articles（PostgreSQL）
-- 本文件挂载到 /docker-entrypoint-initdb.d，容器首次启动时自动执行
-- 表设计依据：doc/sql.md（与 web_react/src/types/blog.ts 口径一致）
-- ============================================================

-- 启用 pgcrypto：用于 02_seed.sql 中生成 bcrypt 密码哈希
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1) 用户表 users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          BIGSERIAL PRIMARY KEY,
  phone       VARCHAR(20) UNIQUE NOT NULL,        -- 手机号，全局唯一，登录账号
  nickname    VARCHAR(64) NOT NULL DEFAULT '',     -- 昵称 / 展示名
  password    VARCHAR(128),                        -- bcrypt 哈希；短信登录可空
  role        VARCHAR(16) NOT NULL DEFAULT 'user', -- 角色：admin | user
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 角色取值约束（可选，数据库层强制）
-- 注：PostgreSQL 的 ADD CONSTRAINT 不支持 IF NOT EXISTS，用 DO 块先判断再添加，兼顾重复执行
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role') THEN
    ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('admin', 'user'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) 文章表 articles
-- 说明：本次仅建 users 与 articles 两张表，categories 不在本次范围，
--      故 category_id 保留为普通 BIGINT（去掉指向 categories 的外键），
--      待后续补建 categories 表后再按需加外键；author_id 指向 users 保留外键。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id            BIGSERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  summary       TEXT,
  content       TEXT,
  cover         VARCHAR(512) DEFAULT '',
  category_id   BIGINT,
  author_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  author_name   VARCHAR(64) DEFAULT '',
  tags          VARCHAR(512) DEFAULT '',
  copyright     BOOLEAN NOT NULL DEFAULT false,
  status        VARCHAR(16) NOT NULL DEFAULT 'published',
  pinned        BOOLEAN NOT NULL DEFAULT false,
  view_count    INT NOT NULL DEFAULT 0,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引：加速按分类、状态、发布时间的常见查询
CREATE INDEX IF NOT EXISTS idx_articles_category   ON articles (category_id);
CREATE INDEX IF NOT EXISTS idx_articles_status     ON articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_published  ON articles (published_at DESC);

-- 状态取值约束（可选，数据库层强制）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_articles_status') THEN
    ALTER TABLE articles ADD CONSTRAINT chk_articles_status CHECK (status IN ('published', 'draft'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) updated_at 自动维护（PostgreSQL 不会自动刷新更新时间）
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_articles_updated_at ON articles;
CREATE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
