// 设计稿的「带 teal 竖条 + 标题 + 右侧 action」标准章节头
export default function SectionHeader({ title, sub, action, className = '' }) {
  return (
    <div className={`flex items-end justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="w-1 h-5 bg-primary rounded-sm" />
        <div>
          <h2 className="text-lg font-semibold text-ink-900 leading-tight">
            {title}
            {sub && <span className="ml-1.5 text-sm font-normal text-ink-400">({sub})</span>}
          </h2>
        </div>
      </div>
      {action}
    </div>
  )
}
