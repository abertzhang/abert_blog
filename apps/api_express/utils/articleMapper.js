'use strict';

/**
 * 数据库行 → 前端 Article 类型映射
 *
 * 字段命名与 apps/web_react/src/types/blog.ts 的 Article 一一对应。
 * 列表接口不返回 content（减轻体积），详情接口返回 content。
 *
 * @param {Object} row  articles 表行（含可选的 category_name，来自 LEFT JOIN categories）
 * @param {Object} [opts]
 * @param {boolean} [opts.withContent=false] 是否包含 content 正文
 * @returns {Object} 符合前端 Article 类型的对象
 */
function toArticle(row, opts = {}) {
  const o = {
    id: Number(row.id),
    title: row.title,
    summary: row.summary || '',
    cover: row.cover || '',
    category_id: row.category_id != null ? Number(row.category_id) : null,
    category_name: row.category_name || '',
    tags: row.tags || '',
    author_name: row.author_name || '',
    copyright: !!row.copyright,
    view_count: Number(row.view_count || 0),
    status: row.status || 'published',
    pinned: !!row.pinned,
    published_at: row.published_at ? new Date(row.published_at).toISOString() : null,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
  if (opts.withContent) {
    o.content = row.content || '';
  }
  return o;
}

module.exports = { toArticle };
