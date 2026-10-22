// 分类名 ↔ URL slug 映射工具
//
// URL 里不出现中文，统一使用英文 slug：鸿蒙 → /category/harmony、其他 → /category/other
// slug 真值来自后端 categories.slug 字段；本文件的映射表与 ASCII 化规则仅作兜底。
import type { Category } from '../types/blog'

const SLUG_MAP: Record<string, string> = {
  鸿蒙: 'harmony',
  harmony: 'harmony',
  harmonyos: 'harmony',
  其他: 'other',
  其他分类: 'other',
  测试: 'test',
  未分类: 'uncategorized',
}

/** 从分类名（或分类对象）生成 URL slug */
export function categorySlug(cat: string | Category | null | undefined): string {
  const name = (typeof cat === 'string' ? cat : cat?.name) || ''
  const id = typeof cat === 'object' && cat !== null ? Number(cat.id) || 0 : 0

  // 0) 后端下发的 slug 优先
  const remote = (typeof cat === 'object' && cat !== null ? cat.slug : '') || ''
  const remoteKey = remote.trim().toLowerCase()
  if (/^[a-z0-9][a-z0-9-]*$/.test(remoteKey)) return remoteKey

  const key = name.trim().toLowerCase()
  if (SLUG_MAP[key]) return SLUG_MAP[key]

  const ascii = key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  if (ascii) return ascii

  return id ? `c${id}` : ''
}

/** 给后台「新增分类」表单做 slug 自动建议（不含 c{id} 兜底） */
export function suggestSlug(name: string): string {
  const key = (name || '').trim().toLowerCase()
  if (SLUG_MAP[key]) return SLUG_MAP[key]
  if (/[^\x00-\x7F]/.test(key)) return ''
  const ascii = key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return /^[a-z0-9][a-z0-9-]*$/.test(ascii) ? ascii : ''
}

/** 生成分类列表页链接 /category/:slug */
export function categoryPath(cat: string | Category | null | undefined): string {
  const slug = categorySlug(cat)
  return slug ? `/category/${encodeURIComponent(slug)}` : '/articles'
}

/** 反查：从 URL slug 找到对应的分类对象 */
export function findCategoryBySlug(
  cats: Category[] = [],
  slug: string | null | undefined,
): Category | null {
  const raw = (slug || '').trim().toLowerCase()
  if (!raw || !Array.isArray(cats)) return null

  let hit = cats.find((c) => (c.slug || '').trim().toLowerCase() === raw)
  if (!hit) hit = cats.find((c) => categorySlug(c) === raw)
  if (hit) return hit

  if (/^c\d+$/.test(raw)) {
    const byId = cats.find((c) => String(c.id) === raw.slice(1))
    if (byId) return byId
  }

  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    /* 非法编码时保持原样 */
  }
  return (
    cats.find((c) => (c.name || '').trim().toLowerCase() === decoded) ||
    cats.find((c) => (c.name || '').trim().toLowerCase() === raw) ||
    null
  )
}
