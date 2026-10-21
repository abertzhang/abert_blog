import axios from 'axios'

// 所有请求统一走 /blog/api 前缀（开发期由 Vite 代理到后端 :8080）
const client = axios.create({
  baseURL: '/blog/api',
  timeout: 10000,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const data = err.response?.data
    if (data?.code === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    return Promise.reject(data || { msg: '网络错误' })
  }
)

export default client
