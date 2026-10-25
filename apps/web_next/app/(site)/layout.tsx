import { Suspense } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

// 前台 Layout：Navbar + 内容 + Footer
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Navbar 使用 usePathname 等客户端 Hook，动态路由预渲染需包裹 Suspense */}
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
