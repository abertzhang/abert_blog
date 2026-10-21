import { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import Logo from './ui/Logo'
import { useAuth } from '../context/AuthContext'
import { categorySlug } from '../lib/categorySlug'
import { useCategories } from '../lib/useCategories'
import { sortCategories } from '../lib/categoryColor'

// 分类导航项现在是**动态生成**的：直接取后台分类接口的数据，
// 因此后台新增一个分类（如 Kotlin），导航、首页右栏、分类列表会同时出现该入口，
// 不需要再改前端代码。
//
// slug 由 categorySlug() 生成，URL 里不出现中文：鸿蒙 → harmony、其他 → other。
// 例如：/category/harmony、/category/flutter
//
// 「全部」指向 /articles 列表页（可翻页、总数准确），不是首页 ——
// 首页是「最新发表 10 篇 + 轮播」的门户页，不是文章全量列表。
const NAV_ALL = { to: '/articles', label: '全部', slug: '', end: true }

// 🔒 导航栏「登录 / 注册」入口不对外展示（这是**长期设定**，不是临时开关）
//
// 背景：这是个人博客，只有一个管理员账号，不需要访客注册/登录。
//       2026-09-02 已完成登录通道收敛——短信验证码登录与自动注册在后端默认关闭
//       （config.AllowSMSLogin / AllowRegister），登录页也只保留密码登录，
//       登录入口继续隐藏，避免把后台地址暴露在公网上被反复尝试。
//
// 想恢复：把下面的值改成 true 即可，无需改动其它代码。
// 注意：这里只隐藏「未登录」时显示的入口按钮；已登录用户的头像、退出、
//       以及管理员的「后台管理」入口不受影响，仍可正常使用。
//       （/login 页面本身仍可直接访问，安全性由后端限流与密码校验保证。）
const SHOW_LOGIN_ENTRY = false

export default function Navbar() {
  const [q, setQ] = useState('')
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  // 共享分类缓存：后台增删改分类后 refreshCategories() 会推送到这里，导航自动同步
  const cats = useCategories()

  // 后台分类 → 导航项。sort 升序（「其他」永远排最后），slug 保证 URL 全英文
  const navItems = [
    NAV_ALL,
    ...sortCategories(cats).map((c) => ({
      to: `/category/${encodeURIComponent(categorySlug(c))}`,
      label: c.name,
      slug: categorySlug(c),
    })),
  ]
  // 当前分类：优先取 /category/:slug 的路径参数，其次兼容旧的 ?cat= 查询参数
  // 路径里存的是英文 slug（如 harmony），所以高亮比较用 slug；
  // 旧的 ?cat= 里存的是中文名，故两种都要比一遍。
  const pathCat = loc.pathname.startsWith('/category/')
    ? decodeURIComponent(loc.pathname.slice('/category/'.length))
    : ''
  const activeCat = pathCat || new URLSearchParams(loc.search).get('cat') || ''

  const submitSearch = (e) => {
    e.preventDefault()
    const v = q.trim()
    navigate(v ? `/?q=${encodeURIComponent(v)}` : '/')
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-ink-200/70">
      <div className="container-page h-16 flex items-center gap-8">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm flex-1">
          {navItems.map((n) => {
            // 全部 / 分类高亮判断：路径里是 slug，查询串里可能是中文原名
            const isAll = n.end
            const isActive = isAll
              // 「全部」在 /articles 列表页高亮；首页走 Logo 返回，不抢高亮
              ? loc.pathname === '/articles'
              : activeCat === n.slug || activeCat === n.label
            return (
              <NavLink
                // 用 to 作 key：后台改名/改 slug 时链接会变，React 会重建该节点，
                // 避免沿用旧 key 导致的顺序错乱
                key={n.to}
                to={n.to}
                end={n.end}
                className={`relative py-1 transition ${
                  isActive ? 'text-primary font-medium' : 'text-ink-800 hover:text-primary'
                }`}
              >
                {n.label}
                {isActive && <span className="absolute -bottom-[19px] left-0 right-0 h-0.5 bg-primary" />}
              </NavLink>
            )
          })}
        </nav>

        <form onSubmit={submitSearch} className="hidden sm:block">
          <div className="flex items-center gap-2 px-3 h-9 w-56 rounded-md border border-ink-200/80 bg-canvas text-sm text-ink-600 focus-within:border-primary focus-within:bg-white transition">
            <span className="text-ink-400">🔍</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索文章..."
              className="bg-transparent outline-none flex-1 placeholder-ink-400"
            />
          </div>
        </form>

        {isAdmin && (
          <Link to="/admin" className="btn-dark text-xs px-3 py-1.5">
            后台管理
          </Link>
        )}

        {user ? (
          <div className="flex items-center gap-2 pl-3 border-l border-ink-200/70">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center text-xs font-bold">
              {(user.nickname || 'U').slice(0, 1)}
            </div>
            <span className="text-sm font-medium text-ink-900 hidden sm:block">{user.nickname}</span>
            <button
              onClick={() => { logout(); navigate('/') }}
              className="text-xs text-ink-400 hover:text-error transition"
            >
              退出
            </button>
          </div>
        ) : (
          // 登录入口由 SHOW_LOGIN_ENTRY 开关控制，关闭时不渲染该按钮
          SHOW_LOGIN_ENTRY && (
            <Link to="/login" className="btn-primary text-xs px-3 py-1.5">
              登录 / 注册
            </Link>
          )
        )}
      </div>
    </header>
  )
}
