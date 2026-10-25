/**
 * 文章服务（对应 api_express/routes/articleRouter.js + utils/articleMapper.js）
 *
 * 列表/详情共用的 SQL 列与 FROM_JOIN 在此集中定义，供 admin 模块复用。
 * 所有 SQL 与 api_express 保持 1:1 一致，连同一套 PostgreSQL。
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export const LIST_COLS = `a.id, a.title, a.summary, a.cover, a.category_id, a.author_name, a.tags,
   a.copyright, a.status, a.pinned, a.view_count, a.published_at, a.created_at,
   c.name AS category_name`;
export const DETAIL_COLS = `${LIST_COLS}, a.content`;
export const FROM_JOIN = `FROM articles a LEFT JOIN categories c ON c.id = a.category_id`;
export const ORDER_BY = `ORDER BY a.pinned DESC, COALESCE(a.published_at, a.created_at) DESC, a.id DESC`;

export interface ArticleRow {
  id: number;
  title: string;
  summary: string | null;
  cover: string | null;
  category_id: number | null;
  author_name: string | null;
  tags: string | null;
  copyright: boolean;
  status: string;
  pinned: boolean;
  view_count: number;
  published_at: Date | null;
  created_at: Date | null;
  category_name?: string | null;
  content?: string | null;
}

export interface Article {
  id: number;
  title: string;
  summary: string;
  cover: string;
  category_id: number | null;
  category_name: string;
  tags: string;
  author_name: string;
  copyright: boolean;
  view_count: number;
  status: string;
  pinned: boolean;
  published_at: string | null;
  created_at: string | null;
  content?: string;
}

export function toArticle(row: ArticleRow, withContent = false): Article {
  const o: Article = {
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
  if (withContent) o.content = row.content || '';
  return o;
}

export interface CommentRow {
  id: number;
  article_id: number;
  parent_id: number | null;
  nickname: string;
  content: string;
  is_author: boolean;
  created_at: Date | null;
}

export interface Comment {
  id: number;
  article_id: number;
  parent_id: number | null;
  nickname: string;
  content: string;
  is_author: boolean;
  created_at: string | null;
}

export function toComment(row: CommentRow): Comment {
  return {
    id: Number(row.id),
    article_id: Number(row.article_id),
    parent_id: row.parent_id != null ? Number(row.parent_id) : null,
    nickname: row.nickname,
    content: row.content,
    is_author: !!row.is_author,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

@Injectable()
export class ArticlesService {
  constructor(private readonly db: DatabaseService) {}

  async list(params: {
    page?: number;
    page_size?: number;
    category_id?: number | null;
    tag?: string;
  }): Promise<{ list: Article[]; total: number; page: number; page_size: number }> {
    const page = Math.max(1, parseInt(String(params.page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(params.page_size), 10) || 12));
    const categoryId = params.category_id ? Number(params.category_id) : null;
    const tag = params.tag ? String(params.tag).trim() : '';

    const where = ['a.status = $1'];
    const whereParams: unknown[] = ['published'];
    let pi = 2;
    if (categoryId) {
      where.push(`a.category_id = $${pi++}`);
      whereParams.push(categoryId);
    }
    if (tag) {
      where.push(`a.tags ILIKE $${pi++}`);
      whereParams.push(`%${tag}%`);
    }
    const whereSql = 'WHERE ' + where.join(' AND ');

    const countRes = await this.db.query(`SELECT COUNT(*) AS total ${FROM_JOIN} ${whereSql}`, whereParams);
    const total = Number(countRes.rows[0].total);

    const dataParams = [...whereParams, pageSize, (page - 1) * pageSize];
    const { rows } = await this.db.query<ArticleRow>(
      `SELECT ${LIST_COLS} ${FROM_JOIN} ${whereSql} ${ORDER_BY}
       LIMIT $${pi++} OFFSET $${pi++}`,
      dataParams,
    );
    return { list: rows.map((r) => toArticle(r)), total, page, page_size: pageSize };
  }

  async detail(id: number): Promise<Article> {
    if (!Number.isInteger(id)) throw new BadRequestException('非法的文章 id');
    // 先自增浏览量（不存在时影响 0 行）
    await this.db.query('UPDATE articles SET view_count = view_count + 1 WHERE id = $1', [id]);
    const { rows } = await this.db.query<ArticleRow>(
      `SELECT ${DETAIL_COLS} ${FROM_JOIN} WHERE a.id = $1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('文章不存在');
    return toArticle(rows[0], true);
  }

  async create(body: any, user: { id: number; role: string }): Promise<Article> {
    if (!body.title || !String(body.title).trim()) {
      throw new BadRequestException('标题 title 不能为空');
    }
    const u = await this.db.query<{ nickname: string }>('SELECT nickname FROM users WHERE id = $1', [user.id]);
    const authorName = u.rows.length ? u.rows[0].nickname : '';

    const cols = ['title', 'author_id', 'author_name'];
    const sqlParams: unknown[] = [String(body.title).trim(), user.id, authorName];
    const segs = ['$1', '$2', '$3'];
    let pi = sqlParams.length;
    const add = (col: string, value: unknown, raw?: string) => {
      cols.push(col);
      if (raw) {
        segs.push(raw);
      } else {
        sqlParams.push(value);
        segs.push(`$${++pi}`);
      }
    };

    if (body.summary !== undefined) add('summary', body.summary);
    if (body.content !== undefined) add('content', body.content);
    if (body.cover !== undefined) add('cover', body.cover || '');
    if (body.category_id !== undefined && body.category_id !== null && body.category_id !== '')
      add('category_id', Number(body.category_id));
    if (body.tags !== undefined) add('tags', body.tags || '');
    if (body.copyright !== undefined) add('copyright', !!body.copyright);
    if (body.pinned !== undefined) add('pinned', !!body.pinned);
    const status = body.status === 'draft' ? 'draft' : 'published';
    add('status', status);
    if (status === 'published' && !body.published_at) add('published_at', null, 'now()');
    else if (body.published_at) add('published_at', new Date(body.published_at));

    const { rows } = await this.db.query<ArticleRow>(
      `INSERT INTO articles (${cols.join(', ')})
       VALUES (${segs.join(', ')})
       RETURNING id`,
      sqlParams,
    );
    const newId = Number(rows[0].id);
    const detail = await this.db.query<ArticleRow>(
      `SELECT ${DETAIL_COLS} ${FROM_JOIN} WHERE a.id = $1`,
      [newId],
    );
    return toArticle(detail.rows[0], true);
  }

  async update(id: number, body: any): Promise<Article> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    const set = (col: string, value: unknown) => {
      sets.push(`${col} = $${i++}`);
      params.push(value);
    };

    if (body.title !== undefined) set('title', String(body.title).trim());
    if (body.summary !== undefined) set('summary', body.summary);
    if (body.content !== undefined) set('content', body.content);
    if (body.cover !== undefined) set('cover', body.cover || '');
    if (body.category_id !== undefined)
      set('category_id', body.category_id === '' || body.category_id == null ? null : Number(body.category_id));
    if (body.tags !== undefined) set('tags', body.tags || '');
    if (body.copyright !== undefined) set('copyright', !!body.copyright);
    if (body.pinned !== undefined) set('pinned', !!body.pinned);
    if (body.status !== undefined) set('status', body.status === 'draft' ? 'draft' : 'published');
    if (body.published_at !== undefined) set('published_at', body.published_at ? new Date(body.published_at) : null);

    if (sets.length === 0) throw new BadRequestException('没有任何可更新的字段');

    params.push(id);
    const { rowCount } = await this.db.query(
      `UPDATE articles SET ${sets.join(', ')} WHERE id = $${i}`,
      params,
    );
    if (rowCount === 0) throw new NotFoundException('文章不存在');

    const detail = await this.db.query<ArticleRow>(
      `SELECT ${DETAIL_COLS} ${FROM_JOIN} WHERE a.id = $1`,
      [id],
    );
    return toArticle(detail.rows[0], true);
  }

  async remove(id: number): Promise<void> {
    const { rowCount } = await this.db.query('DELETE FROM articles WHERE id = $1', [id]);
    if (rowCount === 0) throw new NotFoundException('文章不存在');
  }

  // ---------------------- 评论 ----------------------

  async listComments(articleId: number): Promise<Comment[]> {
    const { rows } = await this.db.query<CommentRow>(
      `SELECT id, article_id, parent_id, nickname, content, is_author, created_at
         FROM comments
        WHERE article_id = $1
        ORDER BY created_at ASC, id ASC`,
      [articleId],
    );
    return rows.map(toComment);
  }

  async createComment(
    articleId: number,
    body: { content?: string; parent_id?: number },
    user: { id: number; role: string },
  ): Promise<Comment> {
    const content = body.content;
    if (!content || !String(content).trim()) {
      throw new BadRequestException('评论内容不能为空');
    }
    const u = await this.db.query<{ nickname: string }>('SELECT nickname FROM users WHERE id = $1', [user.id]);
    const nickname = u.rows.length ? u.rows[0].nickname : '匿名用户';

    const art = await this.db.query<{ author_id: number | null }>(
      'SELECT author_id FROM articles WHERE id = $1',
      [articleId],
    );
    const isAuthor =
      user.role === 'admin' || (art.rows.length && Number(art.rows[0].author_id) === user.id);

    const pid = body.parent_id ? Number(body.parent_id) : null;
    const { rows } = await this.db.query<CommentRow>(
      `INSERT INTO comments (article_id, parent_id, nickname, content, is_author)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, article_id, parent_id, nickname, content, is_author, created_at`,
      [articleId, pid, nickname, String(content).trim(), !!isAuthor],
    );
    return toComment(rows[0]);
  }
}
