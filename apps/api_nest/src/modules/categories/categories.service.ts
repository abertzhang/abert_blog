/**
 * 分类服务（对应 api_express/routes/categoryRouter.js）
 */
import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface Category {
  id: number;
  name: string;
  slug: string;
  sort: number;
  article_count: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DatabaseService) {}

  toCategory(row: Category): Category {
    return {
      id: Number(row.id),
      name: row.name,
      slug: row.slug || '',
      sort: Number(row.sort || 0),
      article_count: Number(row.article_count || 0),
    };
  }

  async list(): Promise<Category[]> {
    const { rows } = await this.db.query<Category>(
      `SELECT c.id, c.name, c.slug, c.sort,
              COUNT(a.id) FILTER (WHERE a.status = 'published') AS article_count
         FROM categories c
         LEFT JOIN articles a ON a.category_id = c.id
        GROUP BY c.id, c.name, c.slug, c.sort
        ORDER BY c.sort ASC, c.id ASC`,
    );
    return rows.map((r) => this.toCategory(r));
  }

  async create(name?: string, slug?: string, sort?: number): Promise<Category> {
    if (!name || !name.trim()) {
      throw new BadRequestException('分类名称 name 不能为空');
    }
    try {
      const { rows } = await this.db.query<Category>(
        `INSERT INTO categories (name, slug, sort)
         VALUES ($1, $2, COALESCE($3, 0))
         RETURNING id, name, slug, sort, 0 AS article_count`,
        [name.trim(), (slug || '').trim(), sort == null ? 0 : Number(sort)],
      );
      return this.toCategory(rows[0]);
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException('该分类 slug 或名称已存在');
      throw e;
    }
  }

  async update(
    id: number,
    fields: { name?: string; slug?: string; sort?: number },
  ): Promise<Category> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (fields.name !== undefined) {
      sets.push(`name = $${i++}`);
      params.push(fields.name);
    }
    if (fields.slug !== undefined) {
      sets.push(`slug = $${i++}`);
      params.push(fields.slug);
    }
    if (fields.sort !== undefined) {
      sets.push(`sort = $${i++}`);
      params.push(Number(fields.sort));
    }
    if (sets.length === 0) {
      throw new BadRequestException('没有任何可更新的字段');
    }
    params.push(id);
    try {
      const { rows } = await this.db.query<Category>(
        `UPDATE categories SET ${sets.join(', ')}
         WHERE id = $${i}
         RETURNING id, name, slug, sort,
           (SELECT COUNT(*) FROM articles a WHERE a.category_id = categories.id AND a.status='published') AS article_count`,
        params,
      );
      if (rows.length === 0) throw new NotFoundException('分类不存在');
      return this.toCategory(rows[0]);
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException('该分类 slug 或名称已存在');
      throw e;
    }
  }

  async remove(id: number): Promise<void> {
    const { rowCount } = await this.db.query('DELETE FROM categories WHERE id = $1', [id]);
    if (rowCount === 0) throw new NotFoundException('分类不存在');
  }
}
