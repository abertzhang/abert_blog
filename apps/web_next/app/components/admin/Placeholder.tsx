export default function Placeholder({ kind }: { kind: string }) {
  const label: Record<string, string> = {
    comments: '评论管理',
    settings: '站点设置',
  }
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-ink-900">{label[kind] || kind}</h1>
      <div className="card p-8 text-center text-sm text-ink-400">「{label[kind] || kind}」页面框架占位。</div>
    </div>
  )
}
