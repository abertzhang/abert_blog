import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminListArticles, deleteArticle, listCategories } from '../../api/blog'
import SectionHeader from '../../components/ui/SectionHeader'

export default function ArticleList() {
  const [articles, setArticles] = useState([])
  const [cats, setCats] = useState([])
  const [filterCat, setFilterCat] = useState('')
  const [status, setStatus] = useState('')

  const load = () => {
    adminListArticles().then((r) => setArticles(r.data || [])).catch(() => {})
  }
  useEffect(load, [])
  useEffect(() => { listCategories().then((r) => setCats(r.data || [])).catch(() => {}) }, [])

  const visible = articles.filter((a) =>
    (!filterCat || String(a.category_id) === String(filterCat)) &&
    (!status || a.status === status)
  )

  const remove = (id) => {
    if (!confirm('确认删除该文章？')) return
    deleteArticle(id).then(load).catch((e) => alert(e.msg || '删除失败'))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="文章管理" sub="Articles" />
        <Link to="/admin/articles/new" className="btn-primary text-sm">+ 撰写新文章</Link>
      </div>

      {/* 筛选 */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <select className="h-9 px-3 border border-ink-200/80 rounded-md text-sm bg-white" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">全部分类</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="h-9 px-3 border border-ink-200/80 rounded-md text-sm bg-white" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
        </select>
        <div className="ml-auto text-sm text-ink-400">共 {visible.length} 篇</div>
      </div>

      {/* 表 */}
      <div className="card p-5 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-400 border-b border-ink-200/70">
              <th className="py-2.5 font-medium">文章标题</th>
              <th className="py-2.5 font-medium">分类</th>
              <th className="py-2.5 font-medium">状态</th>
              <th className="py-2.5 font-medium">浏览</th>
              <th className="py-2.5 font-medium">发表</th>
              <th className="py-2.5 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={a.id} className="border-b border-ink-200/60 hover:bg-canvas/50">
                <td className="py-3 text-ink-900 font-medium max-w-md truncate">{a.title}</td>
                <td className="py-3 text-ink-600">{a.category_name}</td>
                <td className="py-3">
                  <span className={a.status === 'published' ? 'badge-published' : 'badge-draft'}>
                    {a.status === 'published' ? '已发布' : '草稿'}
                  </span>
                </td>
                <td className="py-3 text-ink-600">{(a.view_count || 0).toLocaleString()}</td>
                <td className="py-3 text-ink-600">{(a.created_at || '').slice(0, 10)}</td>
                <td className="py-3 text-right space-x-2 whitespace-nowrap">
                  <Link to={`/admin/articles/${a.id}/edit`} className="text-primary hover:underline">编辑</Link>
                  <button onClick={() => remove(a.id)} className="text-error hover:underline">删除</button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-ink-400">暂无文章 · <Link to="/admin/articles/new" className="text-primary">去撰写</Link></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
