export default function Dashboard() {
  const stats = [
    { label: '文章总数', value: 12 },
    { label: '分类数', value: 6 },
    { label: '评论数', value: 2 },
    { label: '友链数', value: 6 },
  ]
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-ink-900">仪表盘</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-xs text-ink-400">{s.label}</div>
            <div className="mt-1 text-3xl font-bold text-ink-900">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card mt-6 p-8 text-center text-sm text-ink-400">
        此处为后台框架占位，文章 / 分类 / 标签 / 友链的增删改查将在此实现。
      </div>
    </div>
  )
}
