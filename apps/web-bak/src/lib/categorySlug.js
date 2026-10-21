/// 分类名 ↔ URL slug 映射工具
///
/// 背景：URL 里不出现中文。中文分类名直接放进路径会被百分号编码成
/// `/category/%E9%B8%BF%E8%92%99` 这样一长串，不利于阅读、分享、SEO，
/// 也不方便在 Nginx / 日志里排查。因此分类页路径统一使用英文 slug：
///
///     鸿蒙    → /category/harmony
///     Flutter → /category/flutter
///     其他    → /category/other
///
/// slug 的真值是后端 categories 表的 slug 字段（后台「分类管理」可编辑）；
/// 本文件里的映射表与 ASCII 化规则只是兜底，用于后端还没下发 slug 的老数据。
///
/// 三个对外函数：
///   categorySlug(cat)              分类名(或分类对象) → slug
///   categoryPath(cat)              分类名(或分类对象) → /category/xxx 链接
///   findCategoryBySlug(cats, slug) slug → 分类对象（反查，含旧链接兼容）
///
/// 约定：slug 一律小写、只含 [a-z0-9-]，保证整个 URL 是纯 ASCII。

/// 中文分类名 → 英文 slug 的显式映射（key 用小写，未命中的走下面的通用规则）
const SLUG_MAP = {
  鸿蒙: 'harmony',
  harmony: 'harmony',
  harmonyos: 'harmony',
  其他: 'other',
  其他分类: 'other',
  测试: 'test',
  未分类: 'uncategorized',
}

/// 从分类名（或分类对象）生成 URL slug
///
/// 优先级：后端下发的 slug → 显式映射表 → 名称 ASCII 化 → `c{id}` 兜底。
/// 最后一档用 id 是为了保证「URL 里绝不出中文」这条硬约束：遇到既没有映射、
/// 名字又全是中文的分类（例如后台新建的「测试分类X」），即便名字里没有
/// 任何 ASCII 字符，也能得到 /category/c12 这样的纯 ASCII 链接。
///
/// @param {string|{id?:number, name?:string, slug?:string}} cat 分类名或分类对象
/// @returns {string} slug，形如 'harmony' / 'flutter' / 'c12'
export function categorySlug(cat) {
  const name = (typeof cat === 'string' ? cat : cat?.name) || ''
  const id = typeof cat === 'object' && cat !== null ? Number(cat.id) || 0 : 0

  // 0) 后端下发的 slug 是真值：后台可自定义，优先级最高。
  //    只有它是合法 ASCII slug 才采用（老数据的 slug 可能还是中文名）
  const remote = (typeof cat === 'object' && cat !== null ? cat.slug : '') || ''
  const remoteKey = remote.trim().toLowerCase()
  if (/^[a-z0-9][a-z0-9-]*$/.test(remoteKey)) return remoteKey

  const key = name.trim().toLowerCase()
  // 1) 显式映射：中文名优先走这张表
  if (SLUG_MAP[key]) return SLUG_MAP[key]

  // 2) 通用 ASCII 化：连续的非字母数字折叠成一个连字符，再去掉首尾连字符
  const ascii = key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  if (ascii) return ascii

  // 3) 兜底：纯中文/无 ASCII 且无映射 → 用 id，保证 URL 仍是纯 ASCII
  return id ? `c${id}` : ''
}

/// 是否含非 ASCII 字符（中文、日文、全角标点等）
function hasNonASCII(s) {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(s || '')
}

/// 给后台「新增分类」表单做 slug 自动建议（与后端 handler/category.go 的推导规则一致）
///
/// 与 categorySlug() 的区别：这里**不做 c{id} 兜底**。
/// 原因是自动建议的结果会直接填进输入框并被用户提交 —— 若对「测试分类Z」
/// 建议出 "z"、「前端 进阶」建议出 "frontend"，这种既不可读又容易撞车的值
/// 会被当成正式 slug 存下来。因此名字里含中文且不在映射表时返回空串，
/// 让用户显式填一个明确的英文标识。
///
/// @param {string} name 用户输入的分类名
/// @returns {string} 建议的 slug；无法推导时返回空串
export function suggestSlug(name) {
  const key = (name || '').trim().toLowerCase()
  if (SLUG_MAP[key]) return SLUG_MAP[key]
  // 名字里还有非 ASCII → 不推导，交给用户显式指定
  if (hasNonASCII(key)) return ''
  // 通用 ASCII 化：连续的非字母数字折叠成一个连字符，再去掉首尾连字符
  const ascii = key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return /^[a-z0-9][a-z0-9-]*$/.test(ascii) ? ascii : ''
}

/// 生成分类列表页链接 /category/:slug
///
/// @param {string|{id?:number, name?:string}} cat 分类名或分类对象
/// @returns {string} 形如 '/category/harmony'；无法确定 slug 时返回 '/articles'
export function categoryPath(cat) {
  const slug = categorySlug(cat)
  return slug ? `/category/${encodeURIComponent(slug)}` : '/articles'
}

/// 反查：从 URL slug 找到对应的分类对象
///
/// 匹配顺序：slug 精确匹配 → `c{id}` 形式 → 旧链接兼容（原名，可能是中文、
/// 也可能仍带百分号编码）。最后一步是为了让改造前已经分享出去的
/// `/category/%E9%B8%BF%E8%92%99` 和 `/?cat=鸿蒙` 继续可用。
///
/// @param {Array<{id:number, name:string}>} cats 分类列表（接口返回）
/// @param {string} slug URL 中的分类标识（已 decode 或未 decode 均可）
/// @returns {{id:number, name:string}|null} 命中的分类，未命中返回 null
export function findCategoryBySlug(cats, slug) {
  const raw = (slug || '').trim().toLowerCase()
  if (!raw || !Array.isArray(cats)) return null

  // 1) 后端下发的 slug 字段（真值，后台可自定义）
  let hit = cats.find((c) => ((c.slug || '').trim().toLowerCase() === raw))

  // 2) categorySlug() 计算结果（后端没下发 slug 的老数据时才走到这里）
  if (!hit) hit = cats.find((c) => categorySlug(c) === raw)
  if (hit) return hit

  // 3) c{id} 兜底形式：/category/c7
  if (/^c\d+$/.test(raw)) {
    const byId = cats.find((c) => String(c.id) === raw.slice(1))
    if (byId) return byId
  }

  // 4) 旧链接兼容：直接用分类原名比较（可能还是百分号编码过的中文）
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    // 非法编码（比如手输了一个孤立的 %）时保持原样继续比较
  }
  return (
    cats.find((c) => (c.name || '').trim().toLowerCase() === decoded) ||
    cats.find((c) => (c.name || '').trim().toLowerCase() === raw) ||
    null
  )
}
