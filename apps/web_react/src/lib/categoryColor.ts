// 分类识别色：与设计稿 color-palette 一致
// Flutter / React / NodeJs / Golang / 其他(Other)
import type { Category } from '../types/blog'

export interface CategoryStyle {
  bg: string
  text: string
  dot: string
}

const STYLES: Record<string, CategoryStyle> = {
  Flutter: { bg: 'bg-primary-light', text: 'text-primary-dark', dot: 'bg-cat-flutter' },
  NodeJs: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-cat-nodejs' },
  Golang: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-cat-golang' },
  React: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-cat-react' },
  // 「其他」：中性灰，作为兜底分类不抢主色
  其他: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-cat-other' },
}
const FALLBACK: CategoryStyle = { bg: 'bg-slate-100', text: 'text-ink-600', dot: 'bg-ink-400' }

export function categoryStyle(name?: string): CategoryStyle {
  return (name && STYLES[name]) || FALLBACK
}

// 后台「分类管理」里区分核心/非核心的分组依据（后台语义，不含「其他」）
// 核心分类 = 前四种技术栈；其余统一归入「其他」。
export const CORE_CATEGORIES = ['Flutter', 'React', 'NodeJs', 'Golang']

/**
 * 分类的统一展示顺序：按后台 sort 升序 → 同 sort 按 id 升序；「其他」兜底分类永远排最后
 */
export function sortCategories(cats: Category[] = []): Category[] {
  return cats.slice().sort((a, b) => {
    const ra = a.name === '其他' ? Number.MAX_SAFE_INTEGER : a.sort ?? 0
    const rb = b.name === '其他' ? Number.MAX_SAFE_INTEGER : b.sort ?? 0
    return ra - rb || (a.id ?? 0) - (b.id ?? 0)
  })
}
