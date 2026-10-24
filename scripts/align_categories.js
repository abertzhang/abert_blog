'use strict';

/**
 * 分类对齐脚本
 *
 * 把 md/zh-cn 下所有文档 frontmatter 的 category 统一到数据库的 5 个标准分类
 * slug（flutter / nodejs / react / golang / other），并同步：
 *   1. 改写每篇文档 frontmatter 里的 category 行（只改这一行，正文不动）；
 *   2. 按 title 更新 articles.category_id（文章已由 md_to_articles 落库）；
 *   3. 刷新 categories.article_count 冗余计数（按已发布文章实时聚合）。
 *
 * 用法（仓库根目录）：
 *   node scripts/align_categories.js            # 仅预览（--dry-run 也可显式指定）
 *   node scripts/align_categories.js --apply    # 真正改写文档 + 更新数据库
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const MD_ROOT = path.join(REPO_ROOT, 'md', 'zh-cn');
const API_EXPRESS = path.join(REPO_ROOT, 'apps', 'api_express');

const APPLY = process.argv.includes('--apply');

// 旧分类 slug → 标准分类 slug
const CATEGORY_MAP = {
  // Node 生态 → nodejs
  node: 'nodejs',
  backend: 'nodejs',
  cache: 'nodejs',
  database: 'nodejs',
  'message-queue': 'nodejs',
  api: 'nodejs',
  rpc: 'nodejs',
  iot: 'nodejs',
  devops: 'nodejs',
  monitoring: 'nodejs',
  search: 'nodejs',
  // 前端 → react
  'next.js': 'react',
  ReactNative: 'react',
  frontend: 'react',
  'web-api': 'react',
  // Go → golang
  golang: 'golang',
  go: 'golang',
  // 其它 → other
  harmony: 'other',
  tools: 'other',
  css: 'other',
  other: 'other',
  // 已是标准（恒等映射，保证脚本可重复执行 / 幂等）
  flutter: 'flutter',
  react: 'react',
  nodejs: 'nodejs',
  golang: 'golang',
};

// 少数文档按文件名覆盖（其分类 slug 与实际内容不符）
const FILE_OVERRIDES = {
  harmony_hdc: 'other',   // 鸿蒙 HDC，非 Node
  harmony_hilog: 'other', // 鸿蒙 hilog，非 Node
};

function walkMd(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walkMd(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

// 解析 frontmatter：返回 { lines, title, category, categoryLineIndex }
function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end < 0) return null;
  let title = '';
  let category = '';
  let categoryLineIndex = -1;
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^([A-Za-z0-9_-]+):[ ]?(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (key === 'title') title = val;
    if (key === 'category') { category = val; categoryLineIndex = i; }
  }
  return { lines, end, title, category, categoryLineIndex };
}

async function main() {
  const files = walkMd(MD_ROOT).sort();
  const changes = []; // { file, title, oldCat, newSlug }
  const titleToSlug = {}; // title -> newSlug (用于更新 DB)

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm) { console.log('⚠️  跳过（无 frontmatter）:', path.relative(REPO_ROOT, file)); continue; }
    const base = path.basename(file, '.md');
    const override = FILE_OVERRIDES[base];
    const newSlug = override || CATEGORY_MAP[fm.category] || 'other';
    // 无论是否变化，都记录 title -> slug 供 DB 全量同步（幂等）
    titleToSlug[fm.title] = newSlug;
    if (newSlug !== fm.category) {
      changes.push({
        file: path.relative(REPO_ROOT, file),
        title: fm.title,
        oldCat: fm.category,
        newSlug,
      });
      if (APPLY && fm.categoryLineIndex >= 0) {
        const lines = [...fm.lines];
        lines[fm.categoryLineIndex] = `category:${newSlug}`;
        fs.writeFileSync(file, lines.join('\n'));
      }
    }
  }

  console.log(`\n共扫描 ${files.length} 篇，需改写 ${changes.length} 篇：\n`);
  for (const c of changes) {
    console.log(`  ${c.oldCat.padEnd(14)} -> ${c.newSlug.padEnd(8)}  ${c.title}`);
  }

  if (!APPLY) {
    console.log('\n（预览模式，未写入。加 --apply 才会改写文档并更新数据库）');
    return;
  }

  // ---- 更新数据库 ----
  try { require('dotenv').config({ path: path.join(API_EXPRESS, '.env') }); } catch (e) { /* 忽略 */ }
  const { Pool } = require(path.join(API_EXPRESS, 'node_modules', 'pg'));
  const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5433,
    database: process.env.PGDATABASE || 'blog',
    user: process.env.PGUSER || 'blog',
    password: process.env.PGPASSWORD || 'blog123456',
  });

  // slug -> id
  const catRes = await pool.query('SELECT id, slug FROM categories');
  const slugToId = {};
  for (const r of catRes.rows) slugToId[r.slug] = Number(r.id);

  let updated = 0;
  for (const [title, slug] of Object.entries(titleToSlug)) {
    const id = slugToId[slug];
    if (!id) { console.log(`⚠️  分类 ${slug} 不存在，跳过：${title}`); continue; }
    const res = await pool.query('UPDATE articles SET category_id = $1 WHERE title = $2', [id, title]);
    updated += res.rowCount;
  }
  console.log(`\n✅ 已更新 ${updated} 篇文章的 category_id`);

  // 刷新分类计数（按已发布文章实时聚合）
  await pool.query(`
    UPDATE categories c SET article_count =
      (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id AND a.status = 'published')
  `);
  const counts = await pool.query(
    `SELECT c.slug, c.name, c.article_count
       FROM categories c ORDER BY c.sort`
  );
  console.log('\n刷新后各分类文章数：');
  for (const r of counts.rows) console.log(`  ${String(r.article_count).padStart(3)}  ${r.name} (${r.slug})`);

  await pool.end();
  console.log('\n🎉 分类对齐完成');
}

main().catch((e) => { console.error('❌ 失败:', e.message); process.exit(1); });
