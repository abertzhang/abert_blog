'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './admin/AdminLayout'
import Dashboard from './admin/Dashboard'
import CrudPlaceholder from './admin/CrudPlaceholder'
import Placeholder from './admin/Placeholder'

export default function Admin() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAdmin) router.replace('/login')
  }, [isAdmin, router])

  if (!isAdmin) return null

  const path = pathname.replace(/^\/admin\/?/, '')
  let body
  if (!path) body = <Dashboard />
  else if (path === 'articles') body = <CrudPlaceholder title="文章管理" columns={['标题', '分类', '状态', '更新时间']} />
  else if (path === 'articles/new' || /^articles\/\d+\/edit$/.test(path))
    body = <CrudPlaceholder title="文章编辑" columns={['字段', '值']} />
  else if (path === 'categories') body = <CrudPlaceholder title="分类管理" columns={['名称', 'Slug', '排序', '文章数']} />
  else if (path === 'tags') body = <CrudPlaceholder title="标签管理" columns={['标签', '文章数']} />
  else if (path === 'links') body = <CrudPlaceholder title="友链管理" columns={['名称', '链接', '状态']} />
  else if (['comments', 'settings'].includes(path)) body = <Placeholder kind={path} />
  else body = <Dashboard />

  return <AdminLayout>{body}</AdminLayout>
}
