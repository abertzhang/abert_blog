-- ============================================================
-- 博客数据库 Schema（PostgreSQL）
-- 说明：前端 web_react 通过 /blog/api 调用后端，后端使用本 Schema 存储。
--       前端 src/types/blog.ts 的类型定义与下表字段一一对应。
--       在后端服务（如 api_go / api_nest / api_express）初始化时执行本文件。
-- ============================================================

-- 用户（管理员）
CREATE TABLE IF NOT EXISTS users (
  id          BIGSERIAL PRIMARY KEY,
  phone       VARCHAR(20) UNIQUE NOT NULL,
  nickname    VARCHAR(64) NOT NULL DEFAULT '',
  password    VARCHAR(128),                 -- bcrypt 哈希；短信登录可空
  role        VARCHAR(16) NOT NULL DEFAULT 'user',  -- admin | user
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 分类
CREATE TABLE IF NOT EXISTS categories (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(64) NOT NULL,
  slug          VARCHAR(64) NOT NULL DEFAULT '',  -- 英文 URL 标识（flutter/react/nodejs/golang/other）
  sort          INT NOT NULL DEFAULT 0,
  article_count INT NOT NULL DEFAULT 0,           -- 冗余计数，便于列表直读
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);

-- 文章
CREATE TABLE IF NOT EXISTS articles (
  id            BIGSERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  summary       TEXT,
  content       TEXT,                          -- Markdown 正文
  cover         VARCHAR(512) DEFAULT '',       -- 封面图 URL
  category_id   BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  author_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  author_name   VARCHAR(64) DEFAULT '',
  tags          VARCHAR(512) DEFAULT '',       -- 逗号 / 中文逗号分隔
  copyright     BOOLEAN NOT NULL DEFAULT false,
  status        VARCHAR(16) NOT NULL DEFAULT 'published', -- published | draft
  pinned        BOOLEAN NOT NULL DEFAULT false,
  view_count    INT NOT NULL DEFAULT 0,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category_id);
CREATE INDEX IF NOT EXISTS idx_articles_status   ON articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published_at DESC);

-- 标签（归一化表；标签本质是文章 tags 字段的聚合视图，这里提供独立管理）
CREATE TABLE IF NOT EXISTS tags (
  id    BIGSERIAL PRIMARY KEY,
  name  VARCHAR(64) NOT NULL UNIQUE
);

-- 文章-标签多对多
CREATE TABLE IF NOT EXISTS article_tags (
  article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id     BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- 评论
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

-- 友情链接
CREATE TABLE IF NOT EXISTS friend_links (
  id        BIGSERIAL PRIMARY KEY,
  name      VARCHAR(64) NOT NULL,
  url       VARCHAR(512) NOT NULL,
  desc      VARCHAR(128) DEFAULT '',
  enabled   BOOLEAN NOT NULL DEFAULT true,
  sort      INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 初始分类（与前端 mock / 导航顺序一致；slug 用于 URL）
-- 文章类型固定为 Flutter / React / NodeJs / Golang / 其他(Other)，
-- 不属于前四类的文章统一归入「其他」兜底分类。
INSERT INTO categories (name, slug, sort) VALUES
  ('Flutter', 'flutter', 1),
  ('React',   'react',   2),
  ('NodeJs',  'nodejs',  3),
  ('Golang',  'golang',  4),
  ('其他',    'other',   99)
ON CONFLICT DO NOTHING;
