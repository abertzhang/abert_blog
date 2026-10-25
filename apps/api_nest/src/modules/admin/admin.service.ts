/**
 * 后台管理服务（对应 api_express/routes/adminRouter.js）
 * 后台文章列表（含草稿）/ 文章详情（编辑用，不增浏览量）/ 后台友链列表（含未启用）。
 *
 * 直接复用 articles 模块导出的 SQL 列常量与 toArticle 映射，避免跨模块注入。
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { DETAIL_COLS, FROM_JOIN, toArticle, Article } from '../articles/article.service.js';
import { FriendLinksService, FriendLink } from '../friend-links/friend-links.service.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly db: DatabaseService,
    private readonly friendLinks: FriendLinksService,
  ) {}

  async listArticles(): Promise<Article[]> {
    const { rows } = await this.db.query(
      `SELECT ${DETAIL_COLS} ${FROM_JOIN} ORDER BY a.created_at DESC, a.id DESC`,
    );
    return rows.map((r: any) => toArticle(r));
  }

  async getArticle(id: number): Promise<Article> {
    const { rows } = await this.db.query(`SELECT ${DETAIL_COLS} ${FROM_JOIN} WHERE a.id = $1`, [id]);
    if (rows.length === 0) throw new NotFoundException('文章不存在');
    return toArticle(rows[0], true);
  }

  async listFriendLinks(): Promise<FriendLink[]> {
    return this.friendLinks.list();
  }
}
