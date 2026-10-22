import type { ReactNode } from 'react'

interface Props {
  title: string
  sub?: string
  action?: ReactNode
  className?: string
}

// 设计稿的「带 teal 竖条 + 标题 + 右侧 action」标准章节头
export default function SectionHeader({ title, sub, action, className = '' }: Props) {
  return (
    <div className={`mb-4 flex items-end justify-between ${className}`}>
      <div className="flex items-center gap-2">
        <span className="h-5 w-1 rounded-sm bg-primary" />
        <div>
          <h2 className="text-lg font-semibold leading-tight text-ink-900">
            {title}
            {sub && <span className="ml-1.5 text-sm font-normal text-ink-400">({sub})</span>}
          </h2>
        </div>
      </div>
      {action}
    </div>
  )
}
