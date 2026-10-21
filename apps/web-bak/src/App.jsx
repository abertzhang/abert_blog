import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import ArticleDetail from './pages/ArticleDetail'
import ArticleList from './pages/ArticleList'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Lucky from './pages/Lucky'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/articles" element={<ArticleList />} />
          {/* 分类列表页：:slug 为英文标识（鸿蒙 → harmony），URL 中不出现中文 */}
          <Route path="/category/:slug" element={<ArticleList />} />
          <Route path="/article/:id" element={<ArticleDetail />} />
          {/* 预留路由：功能未实现，当前为占位页（pages/Lucky.jsx）。
              将来接入时只需替换 Lucky.jsx 的内容，本行无需改动。 */}
          <Route path="/lucky" element={<Lucky />} />
          </Route>
          <Route path="/admin/*" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
