import { Link } from 'react-router-dom'
import SectionHeader from '../../components/ui/SectionHeader'

const COPY = {
  tags: { title: '标签管理', sub: '设计稿已规划，后端 API 待补', hint: '建议字段：name / slug / color / count。前端会读取文章 tags 字段做云图。' },
  comments: { title: '评论管理', sub: '设计稿已规划，后端 API 待补', hint: '建议接口：GET /api/admin/comments（带状态过滤：待审/已通过/已屏蔽）。' },
  links: { title: '友链管理', sub: '设计稿已规划，后端 API 待补', hint: '建议表 friend_links(id, name, url, sort, status)。Footer 已读取并展示。' },
  settings: { title: '系统设置', sub: '设计稿已规划，后端 API 待补', hint: '建议接口：GET/PUT /api/admin/settings（站点标题/备案号/统计代码等）。' },
}

export default function Placeholder({ kind }) {
  const c = COPY[kind] || { title: kind, sub: '', hint: '' }
  return (
    <div className="space-y-6">
      <SectionHeader title={c.title} sub={c.sub} />
      <div className="card p-10 text-center">
        <div className="text-5xl mb-3">🛠️</div>
        <h2 className="text-lg font-semibold text-ink-900 mb-2">该模块设计中</h2>
        <p className="text-sm text-ink-400 max-w-md mx-auto leading-7">
          {c.hint}<br />
          后端补完 API 后可在 <Link to="/admin" className="link-primary">仪表盘</Link> 看到效果。
        </p>
      </div>
    </div>
  )
}
