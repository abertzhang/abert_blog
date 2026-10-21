import client from './client'

// 认证
export const sendSMS = (phone) => client.post('/auth/sms/send', { phone })

// 登录：两种模式二选一，后端按传入字段判定
//   loginOrRegister(phone, code)      —— 验证码登录（首次自动注册）
//   loginOrRegister(phone, '', pwd)   —— 密码登录（账号须已存在，不自动注册）
export const loginOrRegister = (phone, code, password) =>
  client.post('/auth/login', { phone, code, password })
export const getCurrentUser = () => client.get('/auth/me')

// 分类
export const listCategories = () => client.get('/categories')
export const createCategory = (data) => client.post('/categories', data)
export const updateCategory = (id, data) => client.put(`/categories/${id}`, data)
export const deleteCategory = (id) => client.delete(`/categories/${id}`)

// 文章
export const listArticles = (params) => client.get('/articles', { params })
export const getArticle = (id) => client.get(`/articles/${id}`)
export const createArticle = (data) => client.post('/articles', data)
export const updateArticle = (id, data) => client.put(`/articles/${id}`, data)
export const deleteArticle = (id) => client.delete(`/articles/${id}`)
export const adminListArticles = () => client.get('/admin/articles')
export const adminGetArticle = (id) => client.get(`/admin/articles/${id}`)

// 评论
export const listComments = (articleId) => client.get(`/articles/${articleId}/comments`)
export const createComment = (articleId, data) => client.post(`/articles/${articleId}/comments`, data)

// 热度 & 词云
export const hotArticles = (params) => client.get('/hot', { params })
export const wordCloud = (params) => client.get('/wordcloud', { params })
// 标签聚合（基于全部已发布文章的 tags 字段，用于右栏词云）
export const listTags = () => client.get('/tags')
// 标签管理：标签不是独立表，而是存在文章的 tags 字段里，
// 所以下面几个接口本质都是对全库文章 tags 的批量改写。
export const adminListTags = () => client.get('/admin/tags')
// 新增标签并打到指定文章上（article_ids 必填：没有文章用到它，标签就不存在）
export const createTag = (data) => client.post('/tags', data)
// 重命名 / 合并：{ from, to }；to 已存在时等价于合并去重
export const updateTag = (data) => client.put('/tags', data)
// 删除：从所有文章中移除该标签（只删标签，绝不删文章）
export const deleteTag = (name) => client.delete('/tags', { data: { name } })

// 友情链接
export const listFriendLinks = () => client.get('/friend-links')
export const adminListFriendLinks = () => client.get('/admin/friend-links')
export const createFriendLink = (data) => client.post('/friend-links', data)
export const updateFriendLink = (id, data) => client.put(`/friend-links/${id}`, data)
export const deleteFriendLink = (id) => client.delete(`/friend-links/${id}`)
