/**
 * 博客接口封装（与 apps/web_react/src/api/blog.ts 的接口名/语义保持一致）
 *
 * 所有函数默认走真实后台 api_express；当 config.USE_MOCK 为 true 时回落到内置 mock，
 * 方便无后端时预览界面。页面组件只依赖这里的函数签名，不关心数据来源。
 */
import { USE_MOCK } from '../config'
import apiClient from './client'
import * as mock from '../data/mock'
import type {
  Article,
  Banner,
  Category,
  Comment,
  FriendLink,
  Paginated,
  TagCount,
  User,
} from '../types'

// 模拟网络延迟，让加载态可见
const delay = <T,>(v: T, ms = 200): Promise<T> =>
  new Promise((r) => setTimeout(() => r(v), ms))

// ---------- 分类 ----------
export const listCategories = (): Promise<Category[]> =>
  USE_MOCK ? delay(mock.mockCategories) : apiClient.get<Category[]>('/categories')

// ---------- 文章 ----------
interface ListParams {
  page?: number
  page_size?: number
  category_id?: number
  tag?: string
}

export const listArticles = (
  params: ListParams = {},
): Promise<Paginated<Article>> => {
  if (USE_MOCK) {
    let list = [...mock.mockArticles]
    if (params.category_id)
      list = list.filter((a) => a.category_id === params.category_id)
    if (params.tag) {
      const t = params.tag.toLowerCase()
      list = list.filter((a) => (a.tags || '').toLowerCase().includes(t))
    }
    const total = list.length
    const page = params.page ?? 1
    const size = params.page_size ?? 12
    return delay({
      list: list.slice((page - 1) * size, page * size),
      total,
      page,
      page_size: size,
    })
  }
  return apiClient.get<Paginated<Article>>('/articles', params as Record<string, unknown>)
}

export const getArticle = (id: number | string): Promise<Article> =>
  USE_MOCK
    ? delay(mock.mockArticles.find((a) => String(a.id) === String(id)) ?? mock.mockArticles[0])
    : apiClient.get<Article>(`/articles/${id}`)

// ---------- 评论 ----------
export const listComments = (articleId: number): Promise<Comment[]> =>
  USE_MOCK
    ? delay(mock.mockComments[articleId] ?? [])
    : apiClient.get<Comment[]>(`/articles/${articleId}/comments`)

// ---------- 热度 / 标签云 ----------
export const hotArticles = (params: { limit?: number } = {}): Promise<Article[]> =>
  USE_MOCK
    ? delay(mock.mockArticles.slice(0, params.limit ?? 20))
    : apiClient.get<Article[]>('/hot', params)

export const listTags = (): Promise<TagCount[]> =>
  USE_MOCK ? delay(mock.mockTags) : apiClient.get<TagCount[]>('/tags')

// ---------- 友情链接 ----------
export const listFriendLinks = (): Promise<FriendLink[]> =>
  USE_MOCK
    ? delay(mock.mockFriendLinks.filter((l) => l.enabled !== false))
    : apiClient.get<FriendLink[]>('/friend-links')

// ---------- 首页 banner 封面图 ----------
export const getBanners = (count = 5): Promise<Banner[]> =>
  USE_MOCK
    ? delay(Array.from({ length: count }, () => ({ image: '', category: '其他' })))
    : apiClient.get<Banner[]>('/banners', { count })

// ---------- 认证（公开博客暂未用到，保留接口与 web_react 对齐） ----------
export const sendSMS = (phone: string) => apiClient.post('/auth/sms/send', { phone })
export const loginOrRegister = (phone: string, code: string, password: string) =>
  apiClient.post('/auth/login', { phone, code, password })
export const getCurrentUser = (): Promise<User> =>
  USE_MOCK
    ? delay({ id: 1, nickname: '行云流水', phone: '13123456789', role: 'admin' })
    : apiClient.get<User>('/auth/me')
