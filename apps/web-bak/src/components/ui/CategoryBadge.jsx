import { categoryStyle } from '../../lib/categoryColor'

// 设计稿 # Flutter / # 鸿蒙 样式的小标签
export default function CategoryBadge({ name, withDot = true, className = '' }) {
  if (!name) return null
  const s = categoryStyle(name)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded ${s.bg} ${s.text} ${className}`}>
      {withDot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      # {name}
    </span>
  )
}
