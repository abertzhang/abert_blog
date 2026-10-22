// 后台 CRUD 页面的框架占位：标题 + 新建按钮 + 空表格骨架。
// 真实增删改查在此之上对接 /blog/api（PostgreSQL 后端）。
export default function CrudPlaceholder({
  title,
  columns,
}: {
  title: string
  columns: string[]
}) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">{title}</h1>
        <button className="btn-primary">+ 新建</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-ink-600">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-3 font-semibold">
                  {c}
                </th>
              ))}
              <th className="px-4 py-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-ink-400">
                暂无数据 —— 此处为「{title}」框架占位
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
