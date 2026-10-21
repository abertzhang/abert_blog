import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listArticles, listCategories } from '../../api/blog'
import SectionHeader from '../../components/ui/SectionHeader'

const TREND = [
  { d: '05-09', v: 800 }, { d: '05-10', v: 1100 }, { d: '05-11', v: 900 },
  { d: '05-12', v: 1400 }, { d: '05-13', v: 1200 }, { d: '05-14', v: 1600 }, { d: '05-15', v: 1800 },
]

const fmt = (n) => (n || 0).toLocaleString('en-US')

export default function Dashboard() {
  const [stats, setStats] = useState({ articles: 0, views: 0, today: 0, pending: 0, published: 0, drafts: 0 })
  const [articles, setArticles] = useState([])
  const [cats, setCats] = useState([])

  useEffect(() => {
    listArticles({ page: 1, page_size: 100 })
      .then((r) => {
        const list = r.data?.list || []
        setArticles(list)
        const total = r.data?.total || list.length
        const views = list.reduce((s, a) => s + (a.view_count || 0), 0)
        const published = list.filter((a) => a.status === 'published').length
        const drafts = list.filter((a) => a.status === 'draft').length
        setStats((s) => ({ ...s, articles: total, views, published, drafts }))
      })
      .catch(() => {})
    listCategories().then((r) => setCats(r.data || [])).catch(() => {})
  }, [])

  const maxV = Math.max(...TREND.map((t) => t.v))

  return (
    <div className="space-y-6">
      <SectionHeader title="仪表盘监控" sub="Dashboard" />

      {/* 4 统计卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '文章总数', value: fmt(stats.articles), sub: `已发布 ${stats.published} / 草稿 ${stats.drafts}`, icon: '📄' },
          { label: '累计阅读总量', value: fmt(stats.views), sub: '周同比 +12.4%', icon: '👁' },
          { label: '今日实时流量', value: fmt(stats.today), sub: '当前在线 24 人', icon: '↗' },
          { label: '待审评论数', value: stats.pending, sub: '全网总评论数 —', icon: '💬' },
        ].map((s, i) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-ink-400">{s.label}</div>
              <div className="w-8 h-8 rounded-md bg-primary-light text-primary flex items-center justify-center">{s.icon}</div>
            </div>
            <div className="mt-3 text-3xl font-bold text-ink-900">{s.value}</div>
            <div className="mt-1 text-xs text-ink-400">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 7 日访问趋势 + 评论提醒 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-ink-900">全站近 7 日访问趋势 (PV/UV)</h3>
            <span className="text-xs text-ink-400">2026-05-09 ~ 2026-05-15</span>
          </div>
          <div className="h-48 flex items-end gap-4 px-2">
            {TREND.map((t) => (
              <div key={t.d} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-ink-600">{(t.v / 1000).toFixed(1)}k</span>
                <div
                  className="w-full bg-primary rounded-t-md transition-all"
                  style={{ height: `${(t.v / maxV) * 100}%` }}
                />
                <span className="text-xs text-ink-400 mt-1">{t.d}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-base font-semibold text-ink-900 mb-3">最新评论提醒</h3>
          <div className="text-sm text-ink-400 text-center py-12">暂无待处理评论</div>
        </div>
      </div>

      {/* 最近发表的文章 */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-ink-900">最近发表的文章</h3>
          <Link to="/admin/articles/new" className="btn-primary text-xs">+ 撰写新文章</Link>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-400 border-b border-ink-200/70">
                <th className="py-2.5 font-medium">文章标题</th>
                <th className="py-2.5 font-medium">文章分类</th>
                <th className="py-2.5 font-medium">状态</th>
                <th className="py-2.5 font-medium">阅读次数</th>
                <th className="py-2.5 font-medium">发表日期</th>
                <th className="py-2.5 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {articles.slice(0, 6).map((a) => (
                <tr key={a.id} className="border-b border-ink-200/60 hover:bg-canvas/50">
                  <td className="py-3 text-ink-900 font-medium">{a.title}</td>
                  <td className="py-3 text-ink-600">{a.category_name}</td>
                  <td className="py-3">
                    <span className={a.status === 'published' ? 'badge-published' : 'badge-draft'}>
                      {a.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="py-3 text-ink-600">{fmt(a.view_count)}</td>
                  <td className="py-3 text-ink-600">{(a.created_at || '').slice(0, 10)}</td>
                  <td className="py-3 text-right space-x-2 whitespace-nowrap">
                    <Link to={`/admin/articles/${a.id}/edit`} className="text-primary hover:underline">编辑</Link>
                    <button className="text-error hover:underline" onClick={() => {
                      if (confirm('确认删除该文章？')) {/* 需调用 deleteArticle */}
                    }}>删除</button>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-ink-400">暂无文章</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
