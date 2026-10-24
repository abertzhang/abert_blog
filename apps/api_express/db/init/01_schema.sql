-- ============================================================
-- 博客核心表：users + categories + articles（PostgreSQL）
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
-- 2) 分类表 categories
-- 说明：文章分类目录（Flutter / NodeJs / React / Golang / Other）。
--       articles.category_id 指向本表；删除分类时文章保留（置空）。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(64) NOT NULL,                     -- 分类中文名（导航展示）
  slug          VARCHAR(64) NOT NULL DEFAULT '',          -- 英文 URL 标识（flutter/nodejs/react/golang/other）
  sort          INT NOT NULL DEFAULT 0,                   -- 排序权重，升序展示
  article_count INT NOT NULL DEFAULT 0,                   -- 冗余计数，便于列表 / 导航直读文章数
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()        -- 创建时间
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);

-- name 唯一约束（可选，数据库层强制）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_categories_name') THEN
    ALTER TABLE categories ADD CONSTRAINT uq_categories_name UNIQUE (name);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) 文章表 articles
-- 说明：category_id 指向 categories(id)；author_id 指向 users(id)。
--      删除分类 / 作者时文章保留（置空），避免误删连带清空。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id            BIGSERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  summary       TEXT,
  content       TEXT,
  cover         VARCHAR(512) DEFAULT '',
  category_id   BIGINT REFERENCES categories(id) ON DELETE SET NULL,
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
-- 4) updated_at 自动维护（PostgreSQL 不会自动刷新更新时间；categories 无 updated_at，不加）
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

-- ------------------------------------------------------------
-- 5) 评论表 comments
-- 说明：文章评论，支持楼中楼（parent_id 自引用）。
--       is_author 标记评论者是否为文章作者 / 管理员（后端按登录态注入）。
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 6) 友情链接表 friend_links
-- 说明：站点友链；enabled 控制是否展示，sort 控制展示顺序。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS friend_links (
  id        BIGSERIAL PRIMARY KEY,
  name      VARCHAR(64) NOT NULL,
  url       VARCHAR(512) NOT NULL,
  desc      VARCHAR(128) DEFAULT '',
  enabled   BOOLEAN NOT NULL DEFAULT true,
  sort      INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
