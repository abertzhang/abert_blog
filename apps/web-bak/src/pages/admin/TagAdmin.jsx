import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminListTags, adminListArticles, createTag, updateTag, deleteTag } from '../../api/blog'
import SectionHeader from '../../components/ui/SectionHeader'

/// 后台「标签管理」页
///
/// 标签在本项目里**不是独立表**，而是文章 tags 字段里逗号分隔的字符串
/// （历史设计，词云 /tags、/wordcloud 都基于它）。因此这里所有操作的本质都是
/// 「对全库文章的 tags 字段做一次一致的批量改写」：
///   - 新增：给选中的文章追加一个标签（标签必须依附文章存在，否则它没有意义）
///   - 重命名：全库替换；若新名字已存在，就等价于「合并」两个标签
///   - 删除：从所有文章中移除该标签（只删标签，绝不删文章）
///
/// 后端全部在应用层拆分 → 逐项比较 → 重组，不会用 SQL REPLACE 做子串替换，
/// 所以把 "Go" 改成 "Golang" 不会误伤 "GoWeb"。
export default function TagAdmin() {
  const [tags, setTags] = useState([])
  // 文章列表用于「新增标签时选择要打标签的文章」，只在需要时加载一次
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 列表区：关键字过滤 + 排序方式
  const [kw, setKw] = useState('')
  const [sortBy, setSortBy] = useState('count') // count | name

  // 新增表单
  const [newName, setNewName] = useState('')
  const [selected, setSelected] = useState([]) // 被选中的文章 id
  const [artKw, setArtKw] = useState('')

  // 行内重命名：editing 存原标签名（标签没有 id，名字即主键）
  const [editing, setEditing] = useState('')
  const [editName, setEditName] = useState('')

  const load = () => {
    setLoading(true)
    adminListTags()
      .then((r) => setTags(r.data || []))
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // 文章列表：切到「选择文章」时才拉一次，避免进页面就拖慢首屏
  const loadArticles = () => {
    if (articles.length > 0) return
    adminListArticles()
      .then((r) => setArticles(r.data || []))
      .catch(() => setArticles([]))
  }

  /// 过滤 + 排序后的标签列表（纯前端，标签量级小，没必要走后端分页）
  const shown = useMemo(() => {
    const key = kw.trim().toLowerCase()
    const list = key ? tags.filter((t) => t.name.toLowerCase().includes(key)) : [...tags]
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'zh-Hans-CN')
      // 按文章数倒序；数量相同再按名称，保证顺序稳定不跳动
      if (b.count !== a.count) return b.count - a.count
      return a.name.localeCompare(b.name, 'zh-Hans-CN')
    })
    return list
  }, [tags, kw, sortBy])

  /// 新增标签：必须至少选一篇文章，否则标签没有载体
  const add = () => {
    const name = newName.trim().replace(/[,，]/g, '')
    if (!name) return alert('请填写标签名')
    if (name.includes(',')) return alert('标签名不能包含逗号')
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      return alert(`标签「${name}」已存在于列表中，可直接重命名或合并到它`)
    }
    if (selected.length === 0) return alert('请至少选择一篇文章（标签依附于文章存在）')

    setSaving(true)
    createTag({ name, article_ids: selected })
      .then((r) => {
        const n = r?.data?.added ?? 0
        // n 可能小于选中数：那些文章本来就带着同名标签（大小写不敏感去重）
        alert(n > 0 ? `已把标签「${name}」添加到 ${n} 篇文章` : '选中的文章已有该标签')
        setNewName('')
        setSelected([])
        return load()
      })
      .catch((e) => alert(e?.msg || '新增失败'))
      .finally(() => setSaving(false))
  }

  /// 保存重命名：目标名已存在时后端会做合并去重
  const saveEdit = () => {
    const to = editName.trim().replace(/[,，]/g, '')
    if (!to) return alert('请填写新标签名')
    if (to === editing) return setEditing('')
    const dup = tags.find((t) => t.name.toLowerCase() === to.toLowerCase() && t.name !== editing)
    if (dup && !confirm(`标签「${to}」已存在，确认把「${editing}」合并到它吗？\n该操作不可撤销。`)) return

    setSaving(true)
    updateTag({ from: editing, to })
      .then((r) => {
        const n = r?.data?.changed ?? 0
        setEditing('')
        return load().then(() => {
          if (n > 0) alert(`已更新 ${n} 篇文章的标签`)
        })
      })
      .catch((e) => alert(e?.msg || '重命名失败'))
      .finally(() => setSaving(false))
  }

  /// 删除标签：只从文章里摘掉这个标签，文章本身不受影响
  const remove = (t) => {
    if (!confirm(`确认删除标签「${t.name}」？\n将从 ${t.count} 篇文章中移除该标签，文章不会被删除。`)) return
    setSaving(true)
    deleteTag(t.name)
      .then((r) => {
        const n = r?.data?.removed ?? 0
        return load().then(() => alert(`已从 ${n} 篇文章中移除标签「${t.name}」`))
      })
      .catch((e) => alert(e?.msg || '删除失败'))
      .finally(() => setSaving(false))
  }

  // 文章选择器：按标题关键字过滤，最多展示 50 条避免长列表卡顿
  const artOptions = useMemo(() => {
    const key = artKw.trim().toLowerCase()
    const list = key
      ? articles.filter((a) => (a.title || '').toLowerCase().includes(key))
      : articles
    return list.slice(0, 50)
  }, [articles, artKw])

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="标签管理" sub="Tags" />

      {/* 新增标签：标签名 + 选择要打标签的文章 */}
      <div className="card p-5 max-w-3xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">
              标签名<span className="text-error">*</span>
              <span className="text-ink-400 font-normal">（不能包含逗号，前后空格会自动去掉）</span>
            </span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="例如：Flutter / 状态管理 / 性能优化"
              className="w-full h-10 px-3 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary"
            />
          </label>
          <button onClick={() => { loadArticles(); setArtKw('') }} className="btn-primary h-10 shrink-0">
            选择文章{selected.length > 0 ? `（已选 ${selected.length}）` : ''}
          </button>
        </div>

        {articles.length > 0 && (
          <div className="border border-ink-200/80 rounded-md">
            <div className="p-2 border-b border-ink-200/70">
              <input
                value={artKw}
                onChange={(e) => setArtKw(e.target.value)}
                placeholder="搜索文章标题…"
                className="w-full h-8 px-2 text-sm outline-none"
              />
            </div>
            <div className="max-h-56 overflow-auto divide-y divide-ink-200/50">
              {artOptions.length === 0 && (
                <div className="p-3 text-xs text-ink-400 text-center">没有匹配的文章</div>
              )}
              {artOptions.map((a) => (
                <label key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-canvas cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(a.id)}
                    onChange={() => toggle(a.id)}
                    className="accent-primary"
                  />
                  <span className="flex-1 truncate text-ink-900">{a.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.status === 'published' ? 'bg-canvas text-ink-500' : 'bg-amber-50 text-amber-600'}`}>
                    {a.status === 'published' ? '已发布' : '草稿'}
                  </span>
                  <span className="text-xs text-ink-400 w-24 text-right">{a.category_name || '—'}</span>
                </label>
              ))}
            </div>
            {articles.length > 50 && (
              <div className="p-2 text-[11px] text-ink-400 text-center border-t border-ink-200/70">
                仅展示前 50 条，用上方搜索框定位更多文章
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-400">
            标签依附于文章存在，新增时必须先选择要打上该标签的文章。
          </p>
          <button onClick={add} disabled={saving} className="btn-primary disabled:opacity-60 shrink-0">
            添加标签
          </button>
        </div>
      </div>

      {/* 列表：标签名 / 文章数 / 操作 */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="搜索标签…"
            className="h-9 px-3 flex-1 max-w-xs border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-2 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary"
          >
            <option value="count">按文章数</option>
            <option value="name">按名称</option>
          </select>
          <span className="text-xs text-ink-400 ml-auto">
            共 {tags.length} 个标签{loading ? '（加载中…）' : ''}
          </span>
        </div>

        {shown.length === 0 && !loading ? (
          <div className="text-center text-ink-400 text-sm py-8">
            {tags.length === 0 ? '暂无标签，先在上方新增一个吧。' : '没有匹配的标签。'}
          </div>
        ) : (
          <ul className="divide-y divide-ink-200/60">
            {shown.map((t) => (
              <li key={t.name} className="py-2.5">
                {editing === t.name ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') setEditing('')
                      }}
                      autoFocus
                      className="h-9 px-2 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary w-56"
                    />
                    <button onClick={saveEdit} disabled={saving} className="text-primary text-sm hover:underline disabled:opacity-60">保存</button>
                    <button onClick={() => setEditing('')} className="text-ink-400 text-sm hover:underline">取消</button>
                    <span className="text-xs text-ink-400">改名会作用于全部 {t.count} 篇文章</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-2 py-1 rounded bg-primary-light text-primary-dark text-sm font-medium">
                      {t.name}
                    </span>
                    <span className="text-xs text-ink-400">{t.count} 篇文章</span>
                    {t.published !== t.count && (
                      <span className="text-xs text-ink-400">（其中 {t.published} 篇已发布）</span>
                    )}
                    <div className="flex-1" />
                    <Link
                      to={`/articles?tag=${encodeURIComponent(t.name)}`}
                      className="text-xs text-ink-500 hover:text-primary"
                    >
                      查看文章
                    </Link>
                    <button
                      onClick={() => { setEditing(t.name); setEditName(t.name) }}
                      className="text-primary text-sm hover:underline"
                    >
                      重命名
                    </button>
                    <button onClick={() => remove(t)} className="text-error text-sm hover:underline">删除</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
