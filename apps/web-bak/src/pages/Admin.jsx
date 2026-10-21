import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './admin/AdminLayout'
import Dashboard from './admin/Dashboard'
import ArticleList from './admin/ArticleList'
import ArticleEditor from './admin/ArticleEditor'
import CategoryAdmin from './admin/CategoryAdmin'
import TagAdmin from './admin/TagAdmin'
import FriendLinkAdmin from './admin/FriendLinkAdmin'
import Placeholder from './admin/Placeholder'

export default function Admin() {
  const { isAdmin } = useAuth()
  const loc = useLocation()
  if (!isAdmin) return <Navigate to="/login" replace />

  const path = loc.pathname.replace(/^\/admin\/?/, '')
  let body
  if (!path) body = <Dashboard />
  else if (path === 'articles') body = <ArticleList />
  else if (path === 'articles/new') body = <ArticleEditor mode="new" />
  else if (/^articles\/\d+\/edit$/.test(path)) {
    const id = path.split('/')[1]
    body = <ArticleEditor mode="edit" id={id} />
  }
  else if (path === 'categories') body = <CategoryAdmin />
  else if (path === 'tags') body = <TagAdmin />
  else if (path === 'links') body = <FriendLinkAdmin />
  else if (['comments', 'settings'].includes(path)) body = <Placeholder kind={path} />
  else body = <Dashboard />

  return <AdminLayout>{body}</AdminLayout>
}
