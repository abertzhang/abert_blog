/**
 * 博客领域模型类型定义。
 *
 * 字段与后端 apps/api_express 返回的 JSON、以及 apps/web_react/src/types/blog.ts
 * 一一对应（后端 articles 表 → toArticle 映射）。修改时请同步后端 DTO。
 */

/** 分类 */
export interface Category {
  id: number
  name: string
  /** 英文 slug（flutter / react / nodejs / golang / other），URL 用 */
  slug?: string
  /** 排序权重，升序展示 */
  sort?: number
  /** 该分类下已发布文章数（后端 SQL 聚合） */
  article_count?: number
}

/** 文章（列表项与详情共用；详情多出 content 字段） */
export interface Article {
  id: number
  title: string
  /** 摘要，列表卡片展示；缺失时由 content 前若干字兜底 */
  summary?: string
  /** Markdown 正文（仅详情接口返回） */
  content?: string
  /** 封面图 URL，缺省时显示渐变占位 */
  cover?: string
  /** 关联分类 id */
  category_id?: number | null
  /** 关联分类名称（后端冗余返回，前端直接展示） */
  category_name?: string
  /** 逗号 / 中文逗号分隔的标签串，如 "React,Vite,性能" */
  tags?: string
  /** 作者名 */
  author_name?: string
  /** 是否声明版权 */
  copyright?: boolean
  /** 浏览量 */
  view_count?: number
  /** 发布时间 ISO 串 */
  published_at?: string | null
  /** 创建时间 ISO 串 */
  created_at?: string | null
  /** 状态：published / draft */
  status?: 'published' | 'draft'
  /** 是否置顶 */
  pinned?: boolean
}

/** 分页列表通用响应（/articles 等接口） */
export interface Paginated<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

/** 标签聚合（词云 / 标签云）：词 + 出现次数 */
export interface TagCount {
  word: string
  count: number
}

/** 评论 */
export interface Comment {
  id: number
  article_id: number
  parent_id?: number | null
  nickname: string
  content: string
  is_author?: boolean
  created_at: string
}

/** 友情链接 */
export interface FriendLink {
  id: number
  name: string
  url: string
  desc?: string
  /** 是否启用（前端通常只展示 enabled 的） */
  enabled?: boolean
  sort?: number
}

/** 用户（登录态） */
export interface User {
  id: number
  nickname: string
  phone?: string
  role: 'admin' | 'user'
}

/** 首页轮播 banner 封面图 */
export interface Banner {
  image: string
  category: string
  href?: string
}

/** 统一 API 响应信封：后端返回 { code, msg, data } */
export interface ApiEnvelope<T> {
  code: number
  msg: string
  data: T
}
