import axios from 'axios'
import type { AxiosResponse } from 'axios'

// 所有请求统一走 /blog/api 前缀（开发期由 Vite 代理到后端 :8080，PostgreSQL 存储）
const client = axios.create({
  baseURL: '/blog/api',
  timeout: 10000,
})

// 请求拦截：携带登录态 token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：抽离信封，返回 { code, msg, data }；401 清登录态
// 注意：拦截器在运行时直接返回 res.data（后端信封对象），因此业务层拿到的就是
// ApiEnvelope<T>。这里用 `as unknown as AxiosResponse` 只是为了让 axios 的类型签名
// 通过（它期望 fulfilled 回调返回 AxiosResponse）；运行时仍然是信封对象本身。
client.interceptors.response.use(
  (res) => res.data as unknown as AxiosResponse,
  (err) => {
    const data = err.response?.data
    if (data?.code === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    return Promise.reject(data || { msg: '网络错误' })
  },
)

export default client
