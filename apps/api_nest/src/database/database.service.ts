/**
 * 数据库服务：对 node-postgres 的轻封装（对应 api_express 的 db/index.js）
 *
 * 直接暴露 query() 执行原始 SQL，与 api_express 的查询逻辑 1:1 移植，
 * 复用同一套 Docker PostgreSQL（表已在 api_express 初始化时建好）。
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number | null;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool: pg.Pool;

  constructor() {
    this.pool = new pg.Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5433,
      database: process.env.PGDATABASE || 'blog',
      user: process.env.PGUSER || 'blog',
      password: process.env.PGPASSWORD || 'blog123456',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    this.pool.on('error', (err) => {
      console.error('[pg] 连接池空闲连接异常:', err.message);
    });
  }

  query<T = any>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    return this.pool.query(text, params) as unknown as Promise<QueryResult<T>>;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
