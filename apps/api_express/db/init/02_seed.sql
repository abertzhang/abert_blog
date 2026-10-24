-- ============================================================
-- 种子数据：默认管理员账号
-- 依赖 01_schema.sql 已执行；密码用 pgcrypto 的 crypt() 生成 bcrypt 哈希
-- 明文密码：admin123（首次登录后请务必修改）
-- ============================================================

INSERT INTO users (phone, nickname, password, role) VALUES
  ('13123456789', '行云流水', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT (phone) DO NOTHING;

-- 分类初始数据（与 web_react/src/db/schema.sql 一致；slug 唯一，重复执行安全）
INSERT INTO categories (name, slug, sort) VALUES
  ('Flutter', 'flutter', 1),
  ('NodeJs',  'nodejs',  2),
  ('React',   'react',   3),
  ('Golang',  'golang',  4),
  ('其他',    'other',   99)
ON CONFLICT (slug) DO NOTHING;

-- 友情链接示例数据（enabled=true 才会在前台展示）
INSERT INTO friend_links (name, url, desc, enabled, sort) VALUES
  ('WorkBuddy', 'https://www.workbuddy.cn', 'AI 协作工作台', true, 1),
  ('Node.js 中文网', 'https://nodejs.org/zh-cn', 'Node.js 官方文档', true, 2)
ON CONFLICT DO NOTHING;
