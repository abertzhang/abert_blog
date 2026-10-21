// 分类识别色：与设计稿 color-palette 一致
// Flutter / 鸿蒙 (HarmonyOS) / Golang / React / Rust
const STYLES = {
  Flutter: { bg: 'bg-primary-light', text: 'text-primary-dark', dot: 'bg-cat-flutter' },
  鸿蒙: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-cat-harmony' },
  HarmonyOS: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-cat-harmony' },
  Harmony: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-cat-harmony' },
  Golang: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-cat-golang' },
  React: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-cat-react' },
  Rust: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cat-rust' },
  // 「其他」：中性灰，作为兜底分类不抢主色
  其他: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-cat-other' },
}
const FALLBACK = { bg: 'bg-slate-100', text: 'text-ink-600', dot: 'bg-ink-400' }

export function categoryStyle(name) {
  return STYLES[name] || FALLBACK
}

// 后台「分类管理」里区分核心/非核心的分组依据（后台语义，不含「其他」）
export const CORE_CATEGORIES = ['鸿蒙', 'Flutter', 'Golang', 'React', 'Rust']

// 兜底展示顺序：后台还没下发 sort 字段（老服务端）时才用得上，
// 保证「其他」这类兜底分类排在末尾。正常情况下排序由 sortCategories() 负责。
export const CATEGORY_ORDER = [...CORE_CATEGORIES, '其他']

/// 分类的统一展示顺序：按后台 sort 升序 → 同 sort 按 id 升序；「其他」兜底分类永远排最后
///
/// 导航与首页右栏共用它，保证两处顺序一致；后台新增的分类（默认 sort=0）
/// 也有确定的插入位置，不会出现「导航一个顺序、右栏另一个顺序」。
/// @param {Array<{id:number,name:string,sort?:number}>} cats 分类列表
/// @returns {Array} 新的有序数组（不修改入参）
export function sortCategories(cats) {
  return (cats || []).slice().sort((a, b) => {
    // 「其他」是兜底分类，不参与 sort 排序，固定在末尾
    const ra = a.name === '其他' ? Number.MAX_SAFE_INTEGER : (a.sort || 0)
    const rb = b.name === '其他' ? Number.MAX_SAFE_INTEGER : (b.sort || 0)
    return ra - rb || (a.id || 0) - (b.id || 0)
  })
}
