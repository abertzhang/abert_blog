'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Logo from '../ui/Logo'
import { useAuth } from '../../context/AuthContext'

const MENU = [
  { to: '/admin', label: '仪表盘', end: true },
  { to: '/admin/articles', label: '文章管理' },
  { to: '/admin/categories', label: '分类管理' },
  { to: '/admin/tags', label: '标签管理' },
  { to: '/admin/links', label: '友链管理' },
  { to: '/admin/comments', label: '评论管理' },
  { to: '/admin/settings', label: '站点设置' },
]

// 后台 Layout：左侧菜单 + 右侧内容
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // 判断菜单项是否处于激活态（Next 16 的 Link 不再支持函数式 className）
  const isMenuItemActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + '/')

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-60 shrink-0 flex-col border-r border-ink-200/70 bg-white">
        <div className="border-b border-ink-200/70 p-4">
          <Logo suffix=" · 后台" className="text-sm" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {MENU.map((m) => {
            const active = isMenuItemActive(m.to, m.end)
            return (
              <Link
                key={m.to}
                href={m.to}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active ? 'bg-primary-light text-primary-dark font-medium' : 'text-ink-800 hover:bg-canvas'
                }`}
              >
                {m.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-ink-200/70 p-3">
          <div className="mb-2 flex items-center gap-2 px-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-xs font-bold text-white">
              {(user?.nickname || 'U').slice(0, 1)}
            </div>
            <span className="font-medium text-ink-900">{user?.nickname}</span>
          </div>
          <button
            onClick={() => {
              logout()
              router.push('/')
            }}
            className="w-full rounded-lg border border-ink-200/80 px-3 py-2 text-sm text-ink-600 transition hover:border-primary hover:text-primary"
          >
            退出登录
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex h-14 items-center border-b border-ink-200/70 bg-white px-6">
          <Link href="/" className="text-sm text-ink-400 hover:text-primary">
            ← 返回前台
          </Link>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
