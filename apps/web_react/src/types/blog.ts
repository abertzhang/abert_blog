// 博客领域模型类型定义。
//
// 这些类型与后端（PostgreSQL 存储，/blog 前缀 API）返回的数据结构一一对应，
// 完整的建表语句见 src/db/schema.sql。修改此处时，记得同步更新后端 DTO。

/** 分类 */
export interface Category {
  id: number
  name: string
  /** 英文 slug，用于 URL（如 flutter / react / nodejs / golang / other），由后端 categories.slug 字段下发 */
  slug?: string
  /** 排序权重，升序展示，「其他」兜底分类固定排最后 */
  sort?: number
  /** 该分类下已发布文章数（后端 SQL 聚合，覆盖全库，并非单页统计） */
  article_count?: number
}

/** 文章（列表项 / 详情共用，详情多出 content、comments 等字段） */
export interface Article {
  id: number
  title: string
  /** 摘要，列表卡片展示；缺失时由 content 前 80 字兜底 */
  summary?: string
  /** Markdown 正文（详情接口返回） */
  content?: string
  /** 封面图 URL，缺省时使用 SVG 渐变占位 */
  cover?: string
  /** 关联分类 id */
  category_id?: number
  /** 关联分类名称（接口冗余返回，便于前端直接展示） */
  category_name?: string
  /** 逗号 / 中文逗号分隔的标签串，如 "React,Vite,性能" */
  tags?: string
  author_name?: string
  /** 是否声明版权（展示 © 标记） */
  copyright?: boolean
  /** 浏览量 */
  view_count?: number
  /** 发布时间 ISO 串 */
  published_at?: string
  /** 创建时间 ISO 串 */
  created_at?: string
  /** 状态：published / draft */
  status?: 'published' | 'draft'
  pinned?: boolean
}

/** 分页列表通用响应（后端 /articles 等接口返回） */
export interface Paginated<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

/** 标签聚合（词云 / 标签云使用）：词 + 出现次数 */
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

/** 统一 API 响应信封：后端返回 { code, msg, data } 时由 axios 拦截器抽离 data */
export interface ApiEnvelope<T> {
  code: number
  msg: string
  data: T
}
