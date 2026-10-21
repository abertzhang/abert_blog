import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listArticles } from '../api/blog'
import Logo from './ui/Logo'

// 说明：原先此处硬编码了一份 FRIEND_LINKS 假数据（href 全为 #）用于页脚展示，
// 已随页脚友链段一并删除。真实友链走后端 /blog/api/friend-links，
// 由首页右栏的 <FriendLinks /> 渲染，后台「友链管理」可增删改与启停。

// 站点上线年份（固定值，只作为版权区间的起始年）
const SITE_SINCE_YEAR = 2024

function fmt(n) {
  return (n || 0).toLocaleString('en-US')
}

export default function Footer() {
  const [stats, setStats] = useState({ articles: 0, views: 0, days: 0 })

  // 版权年份区间：结束年取**当前年份**，跨年后自动变成「2024-2027」；
  // 与起始年相同（站点上线当年）时只显示单个年份，避免出现「2024-2024」
  const year = new Date().getFullYear()
  const copyright = year > SITE_SINCE_YEAR ? `${SITE_SINCE_YEAR}-${year}` : `${SITE_SINCE_YEAR}`

  useEffect(() => {
    listArticles({ page: 1, page_size: 1000 })
      .then((r) => {
        const list = r.data?.list || []
        const articles = r.data?.total || list.length
        const views = list.reduce((s, a) => s + (a.view_count || 0), 0)
        // 运行天数 = 今天 - 最早文章 created_at
        let days = 0
        if (list.length) {
          const earliest = list
            .map((a) => new Date(a.created_at).getTime())
            .filter((t) => !Number.isNaN(t))
            .sort((a, b) => a - b)[0]
          if (earliest) days = Math.max(1, Math.ceil((Date.now() - earliest) / 86400000))
        }
        setStats({ articles, views, days })
      })
      .catch(() => {})
  }, [])

  return (
    <footer className="mt-12 bg-canvas border-t border-ink-200/70">
      <div className="container-page py-10 grid md:grid-cols-2 gap-8">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-ink-600 leading-7 max-w-md">
            专注大前端全栈开发技术，分享前沿技术和生态建设。
            <br />
            保持好奇，深邃思考，品质输出。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '总文章数', value: fmt(stats.articles), unit: '篇' },
            { label: '总访问量', value: fmt(stats.views), unit: '次' },
            { label: '运行天数', value: fmt(stats.days || 0), unit: '天' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg p-4 border border-ink-200/70">
              <div className="text-xs text-ink-400">{s.label}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-ink-900">{s.value}</span>
                <span className="text-sm text-ink-400">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-ink-200/70">
        <div className="container-page py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400">
          <div>© {copyright} 一码平川. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-primary">京ICP备XXXXXXXX号-1</a>
            <span>Powered by React & Vite</span>
            <div className="flex items-center gap-3 ml-2">
              <Link to="/rss" className="hover:text-primary">RRS订阅</Link>
              <Link to="/about" className="hover:text-primary">关于我</Link>
              <Link to="/weekly" className="hover:text-primary">技术周刊</Link>
              <Link to="/sitemap" className="hover:text-primary">站点地图</Link>
            </div>
          </div>
        </div>
      </div>

      {/* 友情链接段已移除：底部原为设计稿硬编码的假链接（href 全为 #），
          与后台「友链管理」里的真实数据重复。真实友链统一由首页右栏 <FriendLinks /> 展示。 */}
    </footer>
  )
}
