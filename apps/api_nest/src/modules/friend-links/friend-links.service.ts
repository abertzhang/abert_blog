/**
 * 友情链接服务（对应 api_express/routes/friendLinkRouter.js）
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';

export interface FriendLink {
  id: number;
  name: string;
  url: string;
  desc: string;
  enabled: boolean;
  sort: number;
}

@Injectable()
export class FriendLinksService {
  constructor(private readonly db: DatabaseService) {}

  toFriendLink(row: FriendLink): FriendLink {
    return {
      id: Number(row.id),
      name: row.name,
      url: row.url,
      desc: row.desc || '',
      enabled: !!row.enabled,
      sort: Number(row.sort || 0),
    };
  }

  async list(): Promise<FriendLink[]> {
    const { rows } = await this.db.query<FriendLink>(
      'SELECT id, name, url, "desc", enabled, sort FROM friend_links ORDER BY sort ASC, id ASC',
    );
    return rows.map((r) => this.toFriendLink(r));
  }

  async create(data: {
    name?: string;
    url?: string;
    desc?: string;
    enabled?: boolean;
    sort?: number;
  }): Promise<FriendLink> {
    if (!data.name || !data.name.trim()) throw new BadRequestException('友链名称 name 不能为空');
    if (!data.url || !data.url.trim()) throw new BadRequestException('友链地址 url 不能为空');
    const { rows } = await this.db.query<FriendLink>(
      `INSERT INTO friend_links (name, url, "desc", enabled, sort)
       VALUES ($1, $2, $3, COALESCE($4, true), COALESCE($5, 0))
       RETURNING id, name, url, "desc", enabled, sort`,
      [
        data.name.trim(),
        data.url.trim(),
        data.desc || '',
        data.enabled === undefined ? true : !!data.enabled,
        data.sort == null ? 0 : Number(data.sort),
      ],
    );
    return this.toFriendLink(rows[0]);
  }

  async update(
    id: number,
    data: { name?: string; url?: string; desc?: string; enabled?: boolean; sort?: number },
  ): Promise<FriendLink> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    const set = (col: string, value: unknown) => {
      sets.push(`${col} = $${i++}`);
      params.push(value);
    };
    if (data.name !== undefined) set('name', data.name);
    if (data.url !== undefined) set('url', data.url);
    if (data.desc !== undefined) set('desc', data.desc);
    if (data.enabled !== undefined) set('enabled', !!data.enabled);
    if (data.sort !== undefined) set('sort', Number(data.sort));
    if (sets.length === 0) throw new BadRequestException('没有任何可更新的字段');
    params.push(id);
    const { rowCount } = await this.db.query(
      `UPDATE friend_links SET ${sets.join(', ')} WHERE id = $${i}`,
      params,
    );
    if (rowCount === 0) throw new NotFoundException('友链不存在');
    const { rows } = await this.db.query<FriendLink>(
      'SELECT id, name, url, "desc", enabled, sort FROM friend_links WHERE id = $1',
      [id],
    );
    return this.toFriendLink(rows[0]);
  }

  async remove(id: number): Promise<void> {
    const { rowCount } = await this.db.query('DELETE FROM friend_links WHERE id = $1', [id]);
    if (rowCount === 0) throw new NotFoundException('友链不存在');
  }
}
