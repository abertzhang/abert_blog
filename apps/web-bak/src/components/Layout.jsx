import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

// 前台 Layout：Navbar + Outlet + Footer
export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
