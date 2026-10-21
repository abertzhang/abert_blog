import { Link } from 'react-router-dom'
import CategoryBadge from './ui/CategoryBadge'
import { categoryStyle } from '../lib/categoryColor'

// 阅读时长估算
function readMinutes(s) {
  if (!s) return 1
  return Math.max(1, Math.round(s.length / 500))
}
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 装饰封面（无后端 cover 字段时用的 SVG 占位）
function CoverSVG({ article, className = '' }) {
  const id = article?.id || 0
  const palettes = [
    ['#0D9488', '#0F766E'],
    ['#0284C7', '#075985'],
    ['#4F46E5', '#3730A3'],
    ['#2563EB', '#1D4ED8'],
    ['#0891B2', '#0E7490'],
  ]
  const [c1, c2] = palettes[id % palettes.length]
  const initial = (article?.title || '码').slice(0, 1).toUpperCase()
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
          <pattern id={`d${id}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.08)" />
          </pattern>
        </defs>
        <rect width="800" height="450" fill={`url(#g${id})`} />
        <rect width="800" height="450" fill={`url(#d${id})`} />
        <text x="60" y="320" fill="rgba(255,255,255,0.95)"
          fontSize="200" fontWeight="700" fontFamily="system-ui, sans-serif">
          {initial}
        </text>
        <text x="60" y="420" fill="rgba(255,255,255,0.75)" fontSize="22"
          fontFamily="system-ui, sans-serif">
          # {article?.category_name || 'Article'}
        </text>
      </svg>
    </div>
  )
}

// 文章卡
export default function ArticleCard({ a }) {
  return (
    <article className="card overflow-hidden group hover:shadow-card-hover transition">
      <Link to={`/article/${a.id}`} className="block">
        {a.cover ? (
          <img src={a.cover} alt={a.title} className="w-full aspect-[16/9] object-cover" />
        ) : (
          <CoverSVG article={a} className="aspect-[16/9]" />
        )}
      </Link>
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <CategoryBadge name={a.category_name} />
          <span className="text-xs text-ink-400">{a.copyright ? '© ' : ''}{fmtDate(a.published_at || a.created_at)}</span>
        </div>
        <h3 className="text-base font-semibold text-ink-900 line-clamp-2 mb-2 group-hover:text-primary transition">
          {a.title}
        </h3>
        <p className="text-sm text-ink-600 line-clamp-2 leading-6 mb-4">
          {a.summary || a.content?.slice(0, 80) || ''}
        </p>
        <div className="flex items-center justify-between text-xs text-ink-400">
          <span>{readMinutes(a.content)} min read</span>
          <Link to={`/article/${a.id}`} className="link-primary font-medium">
            阅读全文 →
          </Link>
        </div>
      </div>
    </article>
  )
}
