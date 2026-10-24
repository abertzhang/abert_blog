#!/usr/bin/env node
/**
 * md_to_articles.mjs
 * --------------------------------------------------------------
 * 扫描 md/zh-cn 下所有 .md 文档（含子文件夹），解析 frontmatter，
 * 生成「文章表 articles」的记录。
 *
 * 输出：
 *   1) articles_seed.sql     —— PostgreSQL 插入语句（幂等，重复执行不重复入库）
 *   2) articles_records.json —— 结构化记录（含未入库的 keywords 等附加字段）
 *
 * 可选：--db  直接连 PostgreSQL 落库（读取 apps/api_express/.env 的库配置，
 *                并使用该子项目已安装的 pg 驱动）。
 *
 * 用法：
 *   node scripts/md_to_articles.mjs
 *   node scripts/md_to_articles.mjs --db
 *   node scripts/md_to_articles.mjs --root md/zh-cn --out-sql scripts/articles_seed.sql
 *
 * 依赖：仅 Node 内置模块，无需 npm install。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..'); // scripts/ -> 仓库根

// ---------------------------------------------------------------------------
// 1. 命令行参数
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
};
const ROOT = path.resolve(REPO_ROOT, getArg('--root', 'md/zh-cn'));
const OUT_SQL = path.resolve(REPO_ROOT, getArg('--out-sql', 'scripts/articles_seed.sql'));
const OUT_JSON = path.resolve(REPO_ROOT, getArg('--out-json', 'scripts/articles_records.json'));
const DO_DB = args.includes('--db');

// ---------------------------------------------------------------------------
// 2. frontmatter 解析（轻量 YAML，不依赖第三方库）
// ---------------------------------------------------------------------------
function parseValue(v) {
  if (v === '' || v == null) return '';
  // 内联数组：[a, b, c]
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
  }
  const low = String(v).toLowerCase();
  if (low === 'true' || low === '1' || low === 'yes') return true;
  if (low === 'false' || low === '0' || low === 'no') return false;
  // 去掉首尾引号
  return String(v).replace(/^["']|["']$/g, '');
}

function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== '---') return { data: {}, content: text };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return { data: {}, content: text };

  const data = {};
  for (const raw of lines.slice(1, end)) {
    if (!raw.trim()) continue;
    const idx = raw.indexOf(':');
    if (idx === -1) continue;
    const key = raw.slice(0, idx).trim();
    const val = raw.slice(idx + 1).trim();
    data[key] = parseValue(val);
  }
  // 正文：去掉开头空行
  const content = lines
    .slice(end + 1)
    .join('\n')
    .replace(/^\n+/, '');
  return { data, content };
}

// ---------------------------------------------------------------------------
// 3. 字段映射：frontmatter -> articles 表记录
// ---------------------------------------------------------------------------
const DEFAULT_AUTHOR = '行云流水'; // 与管理员种子账号昵称一致

function toRecord(file, { data, content }) {
  const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [];
  const keywords = Array.isArray(data.keywords)
    ? data.keywords
    : data.keywords
      ? [data.keywords]
      : [];
  const create = typeof data.create === 'string' ? data.create : '';
  const update = typeof data.update === 'string' && data.update ? data.update : create;

  return {
    file: path.relative(REPO_ROOT, file),
    title: data.title || path.basename(file, '.md'),
    summary: typeof data.summary === 'string' ? data.summary : '',
    content,
    cover: typeof data.cover === 'string' ? data.cover : '',
    category_slug: typeof data.category === 'string' ? data.category : '',
    author_name: DEFAULT_AUTHOR,
    tags,
    keywords, // 文章表无该列，仅保留在 JSON 中供参考
    copyright: data.copyright === true,
    pinned: data.top === true, // top:1 / true 视为置顶
    status: 'published',
    view_count: 0,
    published_at: create,
    created_at: create,
    updated_at: update,
  };
}

// ---------------------------------------------------------------------------
// 4. PostgreSQL 字面量构造（dollar-quoting 避免转义地狱）
// ---------------------------------------------------------------------------
function dollarQuote(str) {
  let s = String(str == null ? '' : str);
  let tag = 'fm'; // 选一个正文几乎不可能出现的标签
  while (s.includes('$' + tag + '$')) tag += '_';
  return '$' + tag + '$' + s + '$' + tag + '$';
}

const dateLit = (d) => (d ? `'${String(d).replace(/'/g, "''")}'` : 'NULL');

function buildSql(rec) {
  // category_id：优先按 slug 匹配，其次按 name 匹配；都匹配不到则 NULL
  const catSub = rec.category_slug
    ? `(SELECT id FROM categories WHERE slug = ${dollarQuote(rec.category_slug)} OR name = ${dollarQuote(rec.category_slug)} LIMIT 1)`
    : 'NULL';
  // author_id：取第一个 admin（与管理员种子账号对应）
  const authorSub = `(SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)`;

  const cols = [
    'title', 'summary', 'content', 'cover', 'category_id', 'author_id',
    'author_name', 'tags', 'copyright', 'status', 'pinned',
    'view_count', 'published_at', 'created_at', 'updated_at',
  ];
  const tagsStr = rec.tags.join(',');

  return `INSERT INTO articles (${cols.join(', ')})
SELECT
  ${dollarQuote(rec.title)},
  ${dollarQuote(rec.summary)},
  ${dollarQuote(rec.content)},
  ${dollarQuote(rec.cover)},
  ${catSub},
  ${authorSub},
  ${dollarQuote(rec.author_name)},
  ${dollarQuote(tagsStr)},
  ${rec.copyright ? 'TRUE' : 'FALSE'},
  ${dollarQuote(rec.status)},
  ${rec.pinned ? 'TRUE' : 'FALSE'},
  ${rec.view_count},
  ${dateLit(rec.published_at)},
  ${dateLit(rec.created_at)},
  ${dateLit(rec.updated_at)}
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title = ${dollarQuote(rec.title)});`;
}

// ---------------------------------------------------------------------------
// 5. 目录递归遍历
// ---------------------------------------------------------------------------
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 6. 主流程
// ---------------------------------------------------------------------------
function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

async function runDb(sqlFile) {
  const apiExpress = path.resolve(REPO_ROOT, 'apps/api_express');
  const env = loadEnv(path.join(apiExpress, '.env'));
  // 复用 api_express 已安装的 pg 驱动（避免额外安装）
  const require = createRequire(path.join(apiExpress, 'package.json'));
  let pg;
  try {
    pg = require('pg');
  } catch {
    pg = (await import('pg')).default;
  }
  const client = new pg.Client({
    host: env.PGHOST || 'localhost',
    port: Number(env.PGPORT) || 5432,
    user: env.PGUSER || 'postgres',
    password: env.PGPASSWORD || '',
    database: env.PGDATABASE || 'blog',
    connectionTimeoutMillis: 8000, // 8 秒连不上就报错，避免长时间挂起
  });
  console.log(`→ 连接 PostgreSQL: ${client.host}:${client.port}  database=${client.database}  user=${client.user}`);
  await client.connect();
  const sql = fs.readFileSync(sqlFile, 'utf8');
  // 简单查询协议支持多语句，一次性发送即可（dollar-quote 保证内容不被截断）
  const res = await client.query(sql);
  await client.end();
  return res;
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`[错误] 目录不存在：${ROOT}`);
    process.exit(1);
  }

  const files = walk(ROOT).sort();
  if (files.length === 0) {
    console.error(`[错误] 在 ${ROOT} 下未找到任何 .md 文档`);
    process.exit(1);
  }

  const records = files.map((f) => toRecord(f, parseFrontmatter(fs.readFileSync(f, 'utf8'))));

  const header = `-- ============================================================
-- 文章表 articles 种子数据（由 scripts/md_to_articles.mjs 自动生成）
-- 生成时间：${new Date().toISOString()}
-- 来源目录：${path.relative(REPO_ROOT, ROOT)}
-- 说明：每条 INSERT 带 WHERE NOT EXISTS 守卫，重复执行不会重复入库。
--       category_id 按 slug/name 自动解析，匹配不到则置 NULL（外键允许空）。
-- ============================================================\n\n`;
  const sql = header + records.map(buildSql).join('\n\n') + '\n';

  fs.mkdirSync(path.dirname(OUT_SQL), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_SQL, sql);
  fs.writeFileSync(OUT_JSON, JSON.stringify(records, null, 2));

  // 汇总
  const byCat = {};
  let noSummary = 0;
  let noTitle = 0;
  for (const r of records) {
    byCat[r.category_slug || '(空)'] = (byCat[r.category_slug || '(空)'] || 0) + 1;
    if (!r.summary) noSummary++;
    if (r.title === path.basename(r.file, '.md')) noTitle++;
  }

  console.log('========================================');
  console.log(`扫描目录 : ${ROOT}`);
  console.log(`文档数量 : ${records.length}`);
  console.log(`SQL 输出 : ${path.relative(REPO_ROOT, OUT_SQL)}`);
  console.log(`JSON 输出: ${path.relative(REPO_ROOT, OUT_JSON)}`);
  console.log('----------------------------------------');
  console.log('按 category 分布：');
  for (const [k, v] of Object.entries(byCat).sort()) {
    console.log(`  ${k.padEnd(12)} : ${v}`);
  }
  if (noSummary) console.log(`⚠️  ${noSummary} 篇 summary 为空`);
  if (noTitle) console.log(`⚠️  ${noTitle} 篇缺少 title（已用文件名兜底）`);
  console.log('========================================');

  if (DO_DB) {
    console.log('正在连接 PostgreSQL 落库 ...');
    runDb(OUT_SQL)
      .then(() => console.log('✅ 已写入数据库（重复 title 自动跳过）'))
      .catch((e) => {
        console.error('❌ 落库失败：', e.message);
        process.exit(1);
      });
  } else {
    console.log('（未加 --db，仅生成文件。需要落库请加 --db 参数）');
  }
}

main();
