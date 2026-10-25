import { categoryStyle } from '../../lib/categoryColor'

interface Props {
  name?: string
  withDot?: boolean
  className?: string
}

// 设计稿 # Flutter / # NodeJs 样式的小标签
export default function CategoryBadge({ name, withDot = true, className = '' }: Props) {
  if (!name) return null
  const s = categoryStyle(name)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text} ${className}`}
    >
      {withDot && <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
      # {name}
    </span>
  )
}
