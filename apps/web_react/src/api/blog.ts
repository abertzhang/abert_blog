import client from './client'
import type {
  ApiEnvelope,
  Article,
  Category,
  Comment,
  FriendLink,
  Paginated,
  TagCount,
  User,
} from '../types/blog'
import * as mock from '../data/mock'

// ====== 数据源开关 ======
// true  → 使用本地 mock 数据（无需后端，框架即可预览）
// false → 走真实 /blog/api（后端 PostgreSQL 存储），页面代码无需改动
export const USE_MOCK = true

// 模拟网络延迟，让加载态可见
const delay = <T,>(v: T, ms = 200): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms))

// 统一把数据包装成后端信封 { code, msg, data }
const ok = <T,>(data: T): Promise<ApiEnvelope<T>> =>
  delay({ code: 0, msg: 'ok', data })

// ---------- 认证 ----------
export const sendSMS = (phone: string) => client.post('/auth/sms/send', { phone })
export const loginOrRegister = (phone: string, code: string, password: string) =>
  client.post('/auth/login', { phone, code, password })
export const getCurrentUser = (): Promise<ApiEnvelope<User>> =>
  USE_MOCK
    ? ok({ id: 1, nickname: '行云流水', phone: '13123456789', role: 'admin' })
    : client.get('/auth/me')

// ---------- 分类 ----------
export const listCategories = (): Promise<ApiEnvelope<Category[]>> =>
  USE_MOCK ? ok(mock.mockCategories) : client.get('/categories')

export const createCategory = (data: Partial<Category>) => client.post('/categories', data)
export const updateCategory = (id: number, data: Partial<Category>) =>
  client.put(`/categories/${id}`, data)
export const deleteCategory = (id: number) => client.delete(`/categories/${id}`)

// ---------- 文章 ----------
interface ListParams {
  page?: number
  page_size?: number
  category_id?: number
  tag?: string
}

export const listArticles = (params: ListParams = {}): Promise<ApiEnvelope<Paginated<Article>>> => {
  if (USE_MOCK) {
    let list = [...mock.mockArticles]
    if (params.category_id) list = list.filter((a) => a.category_id === params.category_id)
    if (params.tag) {
      const t = params.tag.toLowerCase()
      list = list.filter((a) => (a.tags || '').toLowerCase().includes(t))
    }
    const total = list.length
    const page = params.page ?? 1
    const size = params.page_size ?? 12
    return ok({ list: list.slice((page - 1) * size, page * size), total, page, page_size: size })
  }
  return client.get('/articles', { params })
}

export const getArticle = (id: number | string): Promise<ApiEnvelope<Article>> =>
  USE_MOCK
    ? ok(mock.mockArticles.find((a) => String(a.id) === String(id)) ?? mock.mockArticles[0])
    : client.get(`/articles/${id}`)

export const createArticle = (data: Partial<Article>) => client.post('/articles', data)
export const updateArticle = (id: number, data: Partial<Article>) =>
  client.put(`/articles/${id}`, data)
export const deleteArticle = (id: number) => client.delete(`/articles/${id}`)
export const adminListArticles = () => client.get('/admin/articles')
export const adminGetArticle = (id: number) => client.get(`/admin/articles/${id}`)

// ---------- 评论 ----------
export const listComments = (articleId: number): Promise<ApiEnvelope<Comment[]>> =>
  USE_MOCK ? ok(mock.mockComments[articleId] ?? []) : client.get(`/articles/${articleId}/comments`)

export const createComment = (articleId: number, data: { content: string; parent_id?: number }) =>
  client.post(`/articles/${articleId}/comments`, data)

// ---------- 热度 / 标签云 ----------
export const hotArticles = (params: { limit?: number } = {}): Promise<ApiEnvelope<Article[]>> =>
  USE_MOCK ? ok(mock.mockHot.slice(0, params.limit ?? 20)) : client.get('/hot', { params })

export const wordCloud = (params: { limit?: number } = {}): Promise<ApiEnvelope<TagCount[]>> =>
  USE_MOCK ? ok(mock.mockTags) : client.get('/wordcloud', { params })

export const listTags = (): Promise<ApiEnvelope<TagCount[]>> =>
  USE_MOCK ? ok(mock.mockTags) : client.get('/tags')

// ---------- 友情链接 ----------
export const listFriendLinks = (): Promise<ApiEnvelope<FriendLink[]>> =>
  USE_MOCK
    ? ok(mock.mockFriendLinks.filter((l) => l.enabled !== false))
    : client.get('/friend-links')

export const adminListFriendLinks = () => client.get('/admin/friend-links')
export const createFriendLink = (data: Partial<FriendLink>) =>
  client.post('/friend-links', data)
export const updateFriendLink = (id: number, data: Partial<FriendLink>) =>
  client.put(`/friend-links/${id}`, data)
export const deleteFriendLink = (id: number) => client.delete(`/friend-links/${id}`)
