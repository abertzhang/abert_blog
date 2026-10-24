/**
 * 格式化工具
 */

/** 把 ISO 时间格式化为 YYYY-MM-DD（设计稿统一风格） */
export function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 估算阅读时长（分钟）。
 * 中文按 CJK 字符计（~300 字/分钟），英文按单词计（~150 词/分钟），取较大者。
 * 设计稿示例：9~13 分钟。
 */
export function readMinutes(content?: string): number {
  if (!content) return 1
  const cjk = (content.match(/[一-鿿]/g) || []).length
  const words = (content.match(/[A-Za-z0-9]+/g) || []).length
  const mins = Math.ceil(cjk / 300 + words / 150)
  return Math.max(1, mins)
}

/** 把 "a,b,c" 或 "a，b，c" 拆成标签数组 */
export function splitTags(tags?: string): string[] {
  if (!tags) return []
  return tags
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
}
