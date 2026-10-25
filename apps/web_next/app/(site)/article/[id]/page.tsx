import { Suspense } from 'react'
import ArticleDetail from '../../../components/ArticleDetail'

export default function Page() {
  // ArticleDetail 内部使用 useParams，包裹 Suspense 以满足动态路由预渲染约束
  return (
    <Suspense fallback={null}>
      <ArticleDetail />
    </Suspense>
  )
}
