import { useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Logo from './ui/Logo'
import { useAuth } from '../context/AuthContext'
import { categorySlug } from '../lib/categorySlug'
import { useCategories } from '../lib/useCategories'
import { sortCategories } from '../lib/categoryColor'

// 分类导航项动态生成：后台新增分类后导航自动同步。
// slug 由 categorySlug() 生成，URL 里不出现中文。
// 「全部」指向 /articles 列表页（可翻页、总数准确），不是首页。
const NAV_ALL = { to: '/articles', label: '全部', slug: '', end: true }

// 🔒 登录/注册入口不对外展示（个人博客只有一个管理员账号）。
// 想恢复：把下面的值改成 true 即可。
const SHOW_LOGIN_ENTRY = false

export default function Navbar() {
  const [q, setQ] = useState('')
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const cats = useCategories()

  const navItems = [
    NAV_ALL,
    ...sortCategories(cats).map((c) => ({
      to: `/category/${encodeURIComponent(categorySlug(c))}`,
      label: c.name,
      slug: categorySlug(c),
      end: false,
    })),
  ]

  const pathCat = loc.pathname.startsWith('/category/')
    ? decodeURIComponent(loc.pathname.slice('/category/'.length))
    : ''
  const activeCat = pathCat || new URLSearchParams(loc.search).get('cat') || ''

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    const v = q.trim()
    navigate(v ? `/?q=${encodeURIComponent(v)}` : '/')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white">
      <div className="container-page flex h-16 items-center gap-8">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden flex-1 items-center gap-6 text-sm md:flex">
          {navItems.map((n) => {
            const isAll = n.end
            const isActive = isAll
              ? loc.pathname === '/articles'
              : activeCat === n.slug || activeCat === n.label
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={`relative py-1 transition ${
                  isActive ? 'font-medium text-primary' : 'text-ink-800 hover:text-primary'
                }`}
              >
                {n.label}
                {isActive && (
                  <span className="absolute -bottom-[19px] left-0 right-0 h-0.5 bg-primary" />
                )}
              </NavLink>
            )
          })}
        </nav>

        <form onSubmit={submitSearch} className="hidden sm:block">
          <div className="flex h-9 w-56 items-center gap-2 rounded-md border border-ink-200/80 bg-canvas px-3 text-sm text-ink-600 transition focus-within:border-primary focus-within:bg-white">
            <span className="text-ink-400">🔍</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索文章..."
              className="flex-1 bg-transparent outline-none placeholder:text-ink-400"
            />
          </div>
        </form>

        {isAdmin && (
          <Link to="/admin" className="btn-dark px-3 py-1.5 text-xs">
            后台管理
          </Link>
        )}

        {user ? (
          <div className="flex items-center gap-2 border-l border-ink-200/70 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-xs font-bold text-white">
              {(user.nickname || 'U').slice(0, 1)}
            </div>
            <span className="hidden text-sm font-medium text-ink-900 sm:block">{user.nickname}</span>
            <button
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="text-xs text-ink-400 transition hover:text-error"
            >
              退出
            </button>
          </div>
        ) : (
          SHOW_LOGIN_ENTRY && (
            <Link to="/login" className="btn-primary px-3 py-1.5 text-xs">
              登录 / 注册
            </Link>
          )
        )}
      </div>
    </header>
  )
}
