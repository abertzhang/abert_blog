import { useEffect, useMemo, useState } from 'react'
import { listCategories, createCategory, updateCategory, deleteCategory } from '../../api/blog'
import SectionHeader from '../../components/ui/SectionHeader'
import { categoryStyle, sortCategories, CORE_CATEGORIES } from '../../lib/categoryColor'
import { categorySlug, suggestSlug } from '../../lib/categorySlug'
import { refreshCategories } from '../../lib/useCategories'

// 合法 slug：小写字母 / 数字 / 连字符，与后端 handler/category.go 的 slugRe 一致
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

export default function CategoryAdmin() {
  const [cats, setCats] = useState([])
  // 新增表单：两栏 —— 分类名（中文，页面显示用）+ 英文标识（slug，URL 用）
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  // 用户是否手动改过 slug：改过之后就不再跟随分类名自动填充，避免覆盖用户输入
  const [slugTouched, setSlugTouched] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', slug: '', sort: 0 })
  const [saving, setSaving] = useState(false)

  const load = () => {
    // 文章数直接用后端 /categories 返回的 article_count（SQL 聚合，全量准确）。
    // 旧实现是拉前 200 篇文章本地统计，但列表接口 pageSize 上限当时是 50、超限还会回落成 10，
    // 实际只统计到 10 篇，数量完全不对。
    listCategories()
      .then((r) => setCats(r.data || []))
      .catch(() => {})
  }
  useEffect(load, [])

  // 展示顺序与前台一致：sort 升序，「其他」固定末尾
  const sorted = useMemo(() => sortCategories(cats), [cats])

  /// 新增：名字必填，slug 必填且必须是纯 ASCII（中文名必须给出英文标识）
  const add = () => {
    const v = name.trim()
    if (!v) return alert('请填写分类名称')
    const s = slug.trim().toLowerCase()
    if (!s) return alert('请填写英文标识（slug），例如：鸿蒙 → harmony')
    if (!SLUG_RE.test(s)) return alert('英文标识只能包含小写字母、数字和连字符，例如 harmony、kotlin、c1')
    if (cats.some((c) => c.slug === s)) return alert(`英文标识 ${s} 已被占用，请换一个`)
    if (cats.some((c) => c.name === v)) return alert('分类名已存在')

    setSaving(true)
    createCategory({ name: v, slug: s })
      .then(() => {
        // 清空表单 + 刷新全站分类缓存（导航 / 首页右栏 / 分类列表页会同步出现新分类）
        setName('')
        setSlug('')
        setSlugTouched(false)
        return refreshCategories()
      })
      .then(load)
      .catch((e) => alert(e?.msg || '新增失败'))
      .finally(() => setSaving(false))
  }

  /// 保存编辑：分类名 / 英文标识 / 排序
  const saveEdit = () => {
    const v = form.name.trim()
    const s = form.slug.trim().toLowerCase()
    if (!v) return alert('请填写分类名称')
    if (!s) return alert('请填写英文标识（slug）')
    if (!SLUG_RE.test(s)) return alert('英文标识只能包含小写字母、数字和连字符')
    if (cats.some((c) => c.slug === s && c.id !== editing)) return alert(`英文标识 ${s} 已被占用`)
    if (cats.some((c) => c.name === v && c.id !== editing)) return alert('分类名已存在')

    setSaving(true)
    updateCategory(editing, { name: v, slug: s, sort: Number(form.sort) || 0 })
      .then(() => { setEditing(null); return refreshCategories() })
      .then(load)
      .catch((e) => alert(e?.msg || '保存失败'))
      .finally(() => setSaving(false))
  }

  // 删除分类：后端会把该分类下的文章统一迁移到「其他」分类，
  // 确认文案里带上真实文章数，避免用户误以为文章会一起被删掉。
  const remove = (c) => {
    if (c?.name === '其他' || c?.slug === 'other') {
      alert('「其他」是删除分类后文章的默认归处，不能删除')
      return
    }
    const n = c?.article_count ?? 0
    const tip = n > 0
      ? `确认删除分类「${c.name}」？\n该分类下的 ${n} 篇已发布文章不会丢失，将自动归入「其他」分类。`
      : `确认删除分类「${c.name}」？`
    if (!confirm(tip)) return

    setSaving(true)
    deleteCategory(c.id)
      .then((res) => {
        const moved = res?.data?.moved ?? 0
        if (moved > 0) alert(`已删除「${c.name}」，${moved} 篇文章已归入「其他」分类`)
        return refreshCategories()
      })
      .then(load)
      .catch((e) => alert(e?.msg || '删除失败'))
      .finally(() => setSaving(false))
  }

  const startEdit = (c) => {
    setEditing(c.id)
    setForm({ name: c.name || '', slug: c.slug || '', sort: c.sort || 0 })
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="分类管理" sub="Categories" />

      {/* 新增：两栏表单（分类名 + 英文标识） */}
      <div className="card p-5 max-w-3xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">
              分类名称<span className="text-error">*</span>
              <span className="text-ink-400 font-normal">（页面显示，可用中文）</span>
            </span>
            <input
              value={name}
              onChange={(e) => {
                const v = e.target.value
                setName(v)
                // 未手动改过 slug 时，跟随分类名自动建议（如 Kotlin → kotlin、鸿蒙 → harmony）
                if (!slugTouched) setSlug(suggestSlug(v))
              }}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="例如：Kotlin / 鸿蒙"
              className="w-full h-10 px-3 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-600 mb-1.5">
              英文标识 slug<span className="text-error">*</span>
              <span className="text-ink-400 font-normal">（URL 使用，全站不出现中文）</span>
            </span>
            <input
              value={slug}
              onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.trim().toLowerCase()) }}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="例如：kotlin / harmony"
              className="w-full h-10 px-3 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary font-mono"
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-400">
            {slug
              ? <>访问路径：<code className="px-1.5 py-0.5 rounded bg-canvas text-primary font-mono">/category/{slug}</code></>
              : '填写分类名后会自动建议英文标识，中文分类请务必填写（如 鸿蒙 → harmony）'}
          </p>
          <button onClick={add} disabled={saving} className="btn-primary disabled:opacity-60 shrink-0">
            添加分类
          </button>
        </div>
      </div>

      {/* 列表：名称 / slug / 路径 / 文章数 / 排序 / 操作 */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-ink-900 mb-3">
          全部分类（{sorted.length}）
          <span className="ml-2 text-xs font-normal text-ink-400">新增后导航、首页分类栏会同步出现</span>
        </h3>
        <ul className="divide-y divide-ink-200/60">
          {sorted.map((c) => {
            const s = categoryStyle(c.name)
            const isEditing = editing === c.id
            return (
              <li key={c.id} className="py-3">
                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="border rounded px-2 py-1.5 text-sm w-40"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="分类名称"
                    />
                    <input
                      className="border rounded px-2 py-1.5 text-sm w-40 font-mono"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value.trim().toLowerCase() })}
                      placeholder="slug"
                    />
                    <input
                      className="border rounded px-2 py-1.5 text-sm w-20"
                      type="number"
                      value={form.sort}
                      onChange={(e) => setForm({ ...form, sort: Number(e.target.value) || 0 })}
                      title="排序（升序，「其他」固定最后）"
                    />
                    <button onClick={saveEdit} disabled={saving} className="text-primary text-sm hover:underline disabled:opacity-60">保存</button>
                    <button onClick={() => setEditing(null)} className="text-ink-400 text-sm hover:underline">取消</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className="text-ink-900 font-medium min-w-[6rem]">{c.name}</span>
                    {CORE_CATEGORIES.includes(c.name) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-canvas text-ink-500">核心</span>
                    )}
                    <code className="text-xs px-1.5 py-0.5 rounded bg-canvas text-primary font-mono">/category/{c.slug || categorySlug(c)}</code>
                    <span className="text-xs text-ink-400">文章数 {c.article_count || 0}</span>
                    <span className="text-xs text-ink-400">排序 {c.sort || 0}</span>
                    <div className="flex-1" />
                    <button onClick={() => startEdit(c)} className="text-primary text-sm hover:underline">编辑</button>
                    <button onClick={() => remove(c)} className="text-error text-sm hover:underline">删除</button>
                  </div>
                )}
              </li>
            )
          })}
          {sorted.length === 0 && <li className="py-3 text-sm text-ink-400">暂无分类</li>}
        </ul>
      </div>
    </div>
  )
}
