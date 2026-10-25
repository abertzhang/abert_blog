/**
 * 统计服务（对应 api_express/routes/statRouter.js）
 * 热门文章 / 标签云词频 / 标签列表。
 */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { toArticle, LIST_COLS, FROM_JOIN, Article } from '../articles/article.service.js';

export interface TagCount {
  word: string;
  count: number;
}

@Injectable()
export class StatService {
  constructor(private readonly db: DatabaseService) {}

  async hot(limit = 20): Promise<Article[]> {
    const lim = Math.min(100, Math.max(1, limit));
    const { rows } = await this.db.query(
      `SELECT ${LIST_COLS} ${FROM_JOIN}
        WHERE a.status = 'published'
        ORDER BY a.view_count DESC, COALESCE(a.published_at, a.created_at) DESC
        LIMIT $1`,
      [lim],
    );
    return rows.map((r) => toArticle(r));
  }

  async aggregateTags(limit?: number): Promise<TagCount[]> {
    const { rows } = await this.db.query<{ tags: string }>(
      `SELECT tags FROM articles WHERE status = 'published' AND tags IS NOT NULL AND tags <> ''`,
    );
    const counts = new Map<string, number>();
    for (const r of rows) {
      const parts = String(r.tags)
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const p of parts) counts.set(p, (counts.get(p) || 0) + 1);
    }
    let arr: TagCount[] = Array.from(counts.entries()).map(([word, count]) => ({ word, count }));
    arr.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
    if (limit && Number.isFinite(limit)) arr = arr.slice(0, Math.max(1, limit));
    return arr;
  }

  wordcloud(limit?: number): Promise<TagCount[]> {
    return this.aggregateTags(limit);
  }

  tags(): Promise<TagCount[]> {
    return this.aggregateTags(undefined);
  }
}
