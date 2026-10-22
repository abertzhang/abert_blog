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
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem('user')
      return u ? (JSON.parse(u) as User) : null
    } catch {
      return null
    }
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !user) {
      getCurrentUser()
        .then((res) => setUserState(res.data))
        .catch(() => {})
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [user])

  const login = (token: string, u: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(u))
    setUserState(u)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
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
