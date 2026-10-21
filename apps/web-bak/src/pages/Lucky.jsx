// pages/Lucky.jsx — 预留路由 /lucky 的占位页
//
// 用途：该路由是**提前预留**的，功能尚未实现，先占住 URL 以免将来
//       接入时改动路由结构（也避免现在访问 /lucky 直接落到 404 或首页）。
//
// 当前行为：展示「功能建设中」占位内容，链接回首页/文章列表。
// 将来接入真实功能时：**整体替换本文件的 return 内容即可**，
//       App.jsx 里的 <Route path="/lucky" element={<Lucky />} /> 无需改动。
//
// 注意：本页挂载在前台 Layout 内（见 App.jsx），因此自带导航栏与页脚。

import { Link } from 'react-router-dom'
import SectionHeader from '../components/ui/SectionHeader'

export default function Lucky() {
  return (
    <div className="container-page py-8">
      <SectionHeader title="Lucky" sub="敬请期待" />

      <div className="card p-10 text-center">
        {/* 占位图标：一个淡淡的幸运草色圆形，纯 CSS，无需额外图片资源 */}
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-2xl">🍀</span>
        </div>

        <h3 className="text-base font-semibold text-ink-900 mb-2">功能建设中</h3>
        <p className="text-sm text-ink-400 mb-6">
          这个页面已经预留好了，内容还在路上，先去看看别的吧。
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition"
          >
            回到首页
          </Link>
          <Link
            to="/articles"
            className="px-4 py-2 rounded-lg border border-ink-200 text-sm text-ink-600 hover:border-primary hover:text-primary transition"
          >
            浏览文章
          </Link>
        </div>
      </div>
    </div>
  )
}
