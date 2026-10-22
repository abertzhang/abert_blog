-- ============================================================
-- 种子数据：默认管理员账号
-- 依赖 01_schema.sql 已执行；密码用 pgcrypto 的 crypt() 生成 bcrypt 哈希
-- 明文密码：admin123（首次登录后请务必修改）
-- ============================================================

INSERT INTO users (phone, nickname, password, role) VALUES
  ('13123456789', '行云流水', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT (phone) DO NOTHING;
