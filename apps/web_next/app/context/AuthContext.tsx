'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getCurrentUser } from '../api/blog'
import type { User } from '../types/blog'

interface AuthValue {
  user: User | null
  /** 登录：写入 token + user（web-bak 中此函数名为 setUser） */
  setUser: (token: string, user: User) => void
  logout: () => void
  isAdmin: boolean
  ready: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // 初始态统一为 null：服务端预渲染与客户端首屏一致，避免水合不匹配。
  // localStorage 仅在客户端 useEffect 中读取。
  const [user, setUserState] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const u = window.localStorage.getItem('user')
      if (u) setUserState(JSON.parse(u) as User)
    } catch {
      /* ignore */
    }
    const token = window.localStorage.getItem('token')
    if (token) {
      getCurrentUser()
        .then((res) => setUserState(res.data))
        .catch(() => {})
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

  const login = (token: string, u: User) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('token', token)
      window.localStorage.setItem('user', JSON.stringify(u))
    }
    setUserState(u)
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token')
      window.localStorage.removeItem('user')
    }
    setUserState(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, setUser: login, logout, isAdmin: user?.role === 'admin', ready }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
