/**
 * 轻量 HTTP 客户端（基于 RN 内置 fetch）
 *
 * 与 web_react 的 axios 封装职责相同：
 *   - 统一 baseURL（/blog/api）
 *   - 请求带上登录态 token（可选）
 *   - 响应解包信封 { code, msg, data }；code !== 0 或网络错误时抛出 ApiError
 *
 * 说明：RN 原生 fetch 不受浏览器 CORS 限制，因此无需后端开启 CORS；
 * 仅 Android 需在 AndroidManifest 允许明文 HTTP（已设置）。
 */
import { API_BASE_URL, API_TIMEOUT } from '../config'
import type { ApiEnvelope } from '../types'

/** 统一的接口错误类型 */
export class ApiError extends Error {
  code: number
  constructor(code: number, msg: string) {
    super(msg)
    this.name = 'ApiError'
    this.code = code
  }
}

// 登录态 token（内存级即可；公开博客接口大多不需要鉴权）
let authToken: string | null = null
export function setToken(token: string | null) {
  authToken = token
}
export function getToken() {
  return authToken
}

/** 解包信封：成功返回 data，失败抛 ApiError */
function unwrap<T>(env: ApiEnvelope<T>): T {
  if (env && env.code === 0) return env.data
  throw new ApiError(env?.code ?? -1, env?.msg || '请求失败')
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  params?: Record<string, unknown>
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', params, body, signal } = opts

  // 拼接 query string
  let url = `${API_BASE_URL}${path}`
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    if (qs) url += `?${qs}`
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT)
  // 允许外部 signal 中止（如组件卸载时的请求取消）
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const text = await res.text()
    let json: ApiEnvelope<T>
    try {
      json = text ? JSON.parse(text) : ({} as ApiEnvelope<T>)
    } catch {
      throw new ApiError(res.status, `响应不是合法 JSON（HTTP ${res.status}）`)
    }
    // 后端对 404 / 错误也返回 { code, msg, data } 信封
    if (typeof json.code === 'number' && json.code !== 0) {
      throw new ApiError(json.code, json.msg || `请求失败（${json.code}）`)
    }
    if (!res.ok) {
      throw new ApiError(res.status, json.msg || `HTTP ${res.status}`)
    }
    return unwrap<T>(json)
  } catch (err) {
    if (err instanceof ApiError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(408, '请求超时或被取消')
    }
    throw new ApiError(-1, (err as Error).message || '网络错误')
  } finally {
    clearTimeout(timer)
  }
}

export const apiClient = {
  get: <T,>(path: string, params?: Record<string, unknown>, signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', params, signal }),
  post: <T,>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal }),
  put: <T,>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PUT', body, signal }),
  delete: <T,>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: 'DELETE', signal }),
}

export default apiClient
