/**
 * 导航上下文（与界面无关的纯类型 + Provider 的 value 构造）
 *
 * 这里只定义 Context 与 Hook，不依赖任何页面组件，避免循环引用。
 * 真正的状态与渲染在 AppNavigator.tsx。
 */
import React, { createContext, useContext } from 'react'

export type TabName = 'home' | 'category' | 'about'

export interface NavContextValue {
  /** 当前所在的底部标签页 */
  tab: TabName
  /** 正在查看的文章 id；非 null 时覆盖在标签页之上显示文章详情 */
  articleId: number | null
  /** 分类页当前聚焦的 slug（用于从卡片/面包屑跳转后定位） */
  categorySlug: string | null
  /** 切换到某个底部标签页（同时退出文章详情） */
  navigateTab: (t: TabName) => void
  /** 打开文章详情（保留当前标签页） */
  openArticle: (id: number) => void
  /** 回到首页并退出文章详情 */
  goHome: () => void
  /** 打开分类页，可指定聚焦的分类 slug */
  openCategory: (slug?: string) => void
}

export const NavContext = createContext<NavContextValue | null>(null)

export function useNavigation(): NavContextValue {
  const ctx = useContext(NavContext)
  if (!ctx) {
    throw new Error('useNavigation 必须在 <AppNavigator> 内部使用')
  }
  return ctx
}
