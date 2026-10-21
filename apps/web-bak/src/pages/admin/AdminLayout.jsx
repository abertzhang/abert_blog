import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Logo from '../../components/ui/Logo'

const MENU = [
  { key: 'dashboard', label: '仪表盘', icon: '📊', to: '/admin' },
  { key: 'articles', label: '文章管理', icon: '📄', to: '/admin/articles' },
  { key: 'categories', label: '分类管理', icon: '🏷️', to: '/admin/categories' },
  { key: 'tags', label: '标签管理', icon: '#️⃣', to: '/admin/tags' },
  { key: 'comments', label: '评论管理', icon: '💬', to: '/admin/comments' },
  { key: 'links', label: '友链管理', icon: '🔗', to: '/admin/links' },
  { key: 'settings', label: '系统设置', icon: '⚙️', to: '/admin/settings' },
]

export default function AdminLayout({ children }) {
  const loc = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const active = (() => {
    const p = loc.pathname.replace('/admin', '').replace(/^\//, '') || 'dashboard'
    if (!p) return 'dashboard'
    if (p.startsWith('articles')) return 'articles'
    if (p.startsWith('categories')) return 'categories'
    if (p.startsWith('tags')) return 'tags'
    if (p.startsWith('comments')) return 'comments'
    if (p.startsWith('links')) return 'links'
    if (p.startsWith('settings')) return 'settings'
    return 'dashboard'
  })()

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* 侧边栏 */}
      <aside className="w-60 shrink-0 bg-white border-r border-ink-200/70 flex flex-col">
        <div className="h-16 px-4 flex items-center border-b border-ink-200/70">
          <Logo suffix="后台" className="text-base" />
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {MENU.map((m) => {
            const isActive = active === m.key
            return (
              <Link
                key={m.key}
                to={m.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition relative ${
                  isActive
                    ? 'bg-primary-light text-primary-dark font-medium'
                    : 'text-ink-600 hover:bg-canvas hover:text-ink-900'
                }`}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-primary" />}
                <span className="text-base">{m.icon}</span>
                {m.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-ink-200/70 text-xs text-ink-400">
          <Link to="/" className="hover:text-primary">← 返回前台</Link>
        </div>
      </aside>

      {/* 主区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶栏 */}
        <header className="h-16 bg-white border-b border-ink-200/70 px-6 flex items-center gap-4 sticky top-0 z-20">
          <div className="flex-1 max-w-md">
            <div className="flex items-center gap-2 px-3 h-9 rounded-md border border-ink-200/80 bg-canvas text-sm text-ink-600 focus-within:border-primary focus-within:bg-white transition">
              <span className="text-ink-400">🔍</span>
              <input placeholder="检索全站..." className="bg-transparent outline-none flex-1 placeholder-ink-400" />
            </div>
          </div>
          <button className="relative w-9 h-9 rounded-md hover:bg-canvas text-ink-600 flex items-center justify-center">
            🔔
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-ink-200/70">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center text-xs font-bold">
              {(user?.nickname || 'A').slice(0, 1)}
            </div>
            <div className="text-sm">
              <div className="text-ink-900 font-medium leading-tight">{user?.nickname || 'Admin'}</div>
              <div className="text-xs text-ink-400 leading-tight">超级管理员</div>
            </div>
            <button onClick={() => { logout(); navigate('/') }} className="ml-2 text-xs text-ink-400 hover:text-error">退出</button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
