'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Logo from './ui/Logo'
import { listArticles } from '../api/blog'

const SITE_SINCE_YEAR = 2024

function fmt(n: number): string {
  return (n || 0).toLocaleString('en-US')
}

export default function Footer() {
  const [stats, setStats] = useState({ articles: 0, views: 0, days: 0 })
  // 年份改为挂载后再计算，避免静态预渲染时 new Date() 报错
  const [year, setYear] = useState(SITE_SINCE_YEAR)
  const copyright = year > SITE_SINCE_YEAR ? `${SITE_SINCE_YEAR}-${year}` : `${SITE_SINCE_YEAR}`

  useEffect(() => {
    setYear(new Date().getFullYear())
    listArticles({ page: 1, page_size: 1000 })
      .then((r) => {
        const list = r.data?.list || []
        const articles = r.data?.total || list.length
        const views = list.reduce((s, a) => s + (a.view_count || 0), 0)
        let days = 0
        if (list.length) {
          const earliest = list
            .map((a) => new Date(a.created_at ?? '').getTime())
            .filter((t) => !Number.isNaN(t))
            .sort((a, b) => a - b)[0]
          if (earliest) days = Math.max(1, Math.ceil((Date.now() - earliest) / 86400000))
        }
        setStats({ articles, views, days })
      })
      .catch(() => {})
  }, [])

  return (
    <footer className="mt-12 border-t border-ink-200/70 bg-canvas">
      <div className="container-page grid gap-8 py-10 md:grid-cols-2">
        <div>
          <Logo />
          <p className="mt-3 max-w-md leading-7 text-sm text-ink-600">
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
            <div key={s.label} className="rounded-lg border border-ink-200/70 bg-white p-4">
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
        <div className="container-page flex flex-col items-center justify-between gap-3 py-4 text-xs text-ink-400 sm:flex-row">
          <div>© {copyright} 行云流水. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-primary">
              京ICP备XXXXXXXX号-1
            </a>
            <span>Powered by Next.js &amp; React</span>
            <div className="ml-2 flex items-center gap-3">
              <a href="#" className="hover:text-primary">
                RRS订阅
              </a>
              <a href="#" className="hover:text-primary">
                关于我
              </a>
              <a href="#" className="hover:text-primary">
                技术周刊
              </a>
              <a href="#" className="hover:text-primary">
                站点地图
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
