import { Suspense } from 'react'
import Admin from '../../components/Admin'

export default function Page() {
  // Admin 内部使用 usePathname 等客户端 Hook，包裹 Suspense 以满足预渲染约束
  return (
    <Suspense fallback={null}>
      <Admin />
    </Suspense>
  )
}
