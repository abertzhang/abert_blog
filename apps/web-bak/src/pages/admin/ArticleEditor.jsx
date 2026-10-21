import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { adminGetArticle, createArticle, updateArticle, listCategories } from '../../api/blog'
import MarkdownView from '../../components/MarkdownView'
import { flutterCovers, harmonyCovers, golangCovers, reactCovers, rustCovers, allCovers } from '../../coverImages'

const TOOLS = [
  { k: 'B', label: '加粗', wrap: ['**', '**'] },
  { k: 'I', label: '斜体', wrap: ['*', '*'] },
  { k: 'H', label: '二级标题', wrap: ['\n## ', '\n'] },
  { k: '•', label: '无序列表', wrap: ['\n- ', '\n'] },
  { k: '1.', label: '有序列表', wrap: ['\n1. ', '\n'] },
  { k: '"', label: '引用', wrap: ['\n> ', '\n'] },
  { k: '</>', label: '行内代码', wrap: ['`', '`'] },
  { k: '```', label: '代码块', wrap: ['\n```\n', '\n```\n'] },
  { k: '🔗', label: '链接', wrap: ['[', '](https://)'] },
  { k: '🖼', label: '图片', wrap: ['![alt](', ')'] },
  { k: '⊞', label: '表格', wrap: ['\n| 列1 | 列2 |\n|---|---|\n| A | B |\n', ''] },
]

function slugify(s) { return (s || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '').slice(0, 80) }

// 网站内置封面图选择弹窗：展示 public/covers 下的内置图片，按分类切换
function CoverPickerModal({ onPick, onClose }) {
  const [tab, setTab] = useState('all')
  const pools = { all: allCovers, flutter: flutterCovers, harmony: harmonyCovers, golang: golangCovers, react: reactCovers, rust: rustCovers }
  const list = pools[tab] || allCovers
  const tabs = [
    { k: 'all', label: `全部 (${allCovers.length})` },
    { k: 'flutter', label: `Flutter (${flutterCovers.length})` },
    { k: 'harmony', label: `Harmony (${harmonyCovers.length})` },
    { k: 'golang', label: `Golang (${golangCovers.length})` },
    { k: 'react', label: `React (${reactCovers.length})` },
    { k: 'rust', label: `Rust (${rustCovers.length})` },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-200/70">
          <h3 className="text-base font-semibold text-ink-900">选择网站图片（封面库）</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-xl leading-none">×</button>
        </div>
        <div className="flex gap-2 px-5 py-3 border-b border-ink-200/70">
          {tabs.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-3 py-1.5 text-sm rounded-full transition ${
                tab === t.k ? 'bg-primary text-white' : 'bg-canvas text-ink-600 hover:bg-ink-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-5 overflow-auto">
          {list.length === 0 ? (
            <div className="text-sm text-ink-400 text-center py-10">暂无内置图片</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {list.map((src) => (
                <button
                  key={src}
                  onClick={() => onPick(src)}
                  title={src.split('/').pop()}
                  className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-ink-200/70 hover:border-primary hover:ring-2 hover:ring-primary/30 transition"
                >
                  <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ArticleEditor({ mode, id: idProp }) {
  const params = useParams()
  const id = idProp || params.id
  const navigate = useNavigate()
  const [cats, setCats] = useState([])
  const [form, setForm] = useState({
    title: '', summary: '', content: '# 在这里开始写…\n\n支持 Markdown。左侧编辑，右侧实时预览。',
    category_id: '', tags: '', status: 'published', slug: '', cover: '',
    // 文章 md 头部约定字段：发布日期、置顶权重、版权声明
    published_at: '', top: 0, copyright: false,
  })
  const [tagList, setTagList] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const fileRef = useRef(null)
  const taRef = useRef(null)

  useEffect(() => { listCategories().then((r) => setCats(r.data || [])).catch(() => {}) }, [])

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    adminGetArticle(id).then((r) => {
      const a = r.data
      setForm({
        title: a.title, summary: a.summary, content: a.content,
        category_id: a.category_id, tags: a.tags || '', status: a.status || 'published',
        slug: a.slug || '', cover: a.cover || '',
        published_at: a.published_at ? a.published_at.slice(0, 10) : '', // 仅取日期部分回填 date 输入
        top: a.top || 0, copyright: a.copyright || false,
      })
      setTagList((a.tags || '').split(/[,，]/).map((t) => t.trim()).filter(Boolean))
    }).catch(() => {})
  }, [mode, id])

  useEffect(() => {
    if (!form.slug && form.title) setForm((f) => ({ ...f, slug: slugify(f.title) }))
  }, [form.title])

  const insert = (tool) => {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const e = ta.selectionEnd
    const sel = form.content.slice(s, e)
    const [a, b] = tool.wrap
    const before = form.content.slice(0, s)
    const after = form.content.slice(e)
    const next = before + a + (sel || '文字') + b + after
    setForm({ ...form, content: next })
    requestAnimationFrame(() => {
      ta.focus()
      const pos = before.length + a.length + (sel || '文字').length
      ta.setSelectionRange(pos, pos)
    })
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (!t || tagList.includes(t)) { setTagInput(''); return }
    setTagList([...tagList, t])
    setTagInput('')
  }

  // 本地图片转 data URL 作为封面（无需后端上传接口）
  const onLocalCover = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, cover: String(reader.result) }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const save = (publish) => {
    if (!form.title.trim() || !form.category_id) { alert('请填写标题并选择分类'); return }
    setSaving(true)
    const payload = {
      ...form,
      category_id: Number(form.category_id),
      tags: tagList.join(','),
      status: publish !== undefined ? (publish ? 'published' : 'draft') : form.status,
    }
    const fn = mode === 'edit' && id ? updateArticle(id, payload) : createArticle(payload)
    fn.then(() => {
      setSaving(false)
      if (mode === 'edit') alert('已保存')
      else navigate('/admin/articles')
    }).catch((e) => { setSaving(false); alert(e.msg || '保存失败') })
  }

  // 解析文章 md 头部的 YAML frontmatter。
  // 支持的格式（与 README / HANDOFF 约定一致，key 后允许「无空格」冒号）：
  //   --- title:文章标题 date:2026-09-27 category:Flutter
  //   tags:[状态管理,插件] summary:一句话摘要 top:1 copyright:true ---
  // 包裹兼容：① --- 多行 ② --- 单行 ③ 省略 ---（首行是已知字段时自动识别头部）。
  // 日期字段：date / create / update 三者均可作为发布日期。
  // tags 支持三种写法：
  //   ① YAML 方括号数组：tags:[状态管理,插件]
  //   ② 流列表：        tags:-状态管理 -插件  或  tags:- 状态管理 - 插件
  //   ③ 逗号分隔：      tags:状态管理,插件
  const parseTags = (v) => {
    let s = String(v || '').trim()
    // 去掉 YAML 数组外壳 [ ... ]
    if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1).trim()
    let items
    if (s.startsWith('-')) {
      // YAML 流列表：-状态管理 -插件 或 - 状态管理 - 插件
      items = s.split(/\s*-\s*/).map((t) => t.trim()).filter(Boolean)
    } else {
      // 逗号（中英文）分隔：状态管理,插件 / 状态管理，插件
      items = s.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
    }
    return items.join(', ')
  }

  // 已知 frontmatter 字段名（用于「无 --- 包裹」时判断某行是否为头部字段，避免误吞正文）
  const FM_KEYS = new Set([
    'title', 'date', 'create', 'update', 'category', 'categories',
    'tags', 'tag', 'summary', 'top', 'copyright',
  ])
  const isFmKeyLine = (line) => {
    const m = line.trim().match(/^([A-Za-z_]+):/)
    return !!m && FM_KEYS.has(m[1].toLowerCase())
  }

  const parseFrontmatter = (text) => {
    let block = null
    let blockFull = null
    // ① 优先匹配 --- 包裹（多行或单行）
    const delimited = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)
      || text.match(/---[ \t]*([\s\S]*?)[ \t]*---/)
    if (delimited) {
      block = delimited[1]
      blockFull = delimited[0]
    } else {
      // ② 兜底：首行是已知头部字段时，把连续若干「已知字段行」视为头部，
      //    兼容用户直接写 `title:Gin create:...` 而省略 --- 的场景
      const lines = text.split(/\r?\n/)
      let i = 0
      while (i < lines.length && !lines[i].trim()) i++
      if (i < lines.length && isFmKeyLine(lines[i])) {
        const head = []
        while (i < lines.length && isFmKeyLine(lines[i])) { head.push(lines[i]); i++ }
        block = head.join('\n')
        blockFull = head.join('\n')
      }
    }
    if (block === null) return null

    const meta = { title: '', date: '', category: '', tags: '', summary: '', top: '', copyright: '' }
    // 在 block 中扫描所有 key: 边界，按边界切片取值——天然兼容单行/多行混排
    const keyRe = /([A-Za-z_]+):/g
    const hits = []
    let mm
    while ((mm = keyRe.exec(block)) !== null) {
      hits.push({ key: mm[1].toLowerCase(), valStart: mm.index + mm[0].length, keyStart: mm.index })
    }
    if (!hits.length) return null
    for (let i = 0; i < hits.length; i++) {
      const valStart = hits[i].valStart
      const valEnd = i + 1 < hits.length ? hits[i + 1].keyStart : block.length
      let v = block.slice(valStart, valEnd).trim().replace(/^["']|["']$/g, '')
      let k = hits[i].key
      if (k === 'tag') k = 'tags'            // 兼容别名 tag -> tags
      if (k === 'categories') k = 'category' // 兼容别名 categories -> category
      switch (k) {
        case 'title': meta.title = v; break
        case 'date':
        case 'create':   // create / update 都作为发布日期（详情页展示 published_at）
        case 'update': meta.date = v; break
        case 'category': meta.category = v; break
        case 'summary': meta.summary = v; break
        case 'top': meta.top = v; break
        case 'copyright': meta.copyright = (v === 'true' || v === '1' || v === 'yes'); break
        case 'tags': meta.tags = parseTags(v); break
        default: break
      }
    }
    // 正文 = 头部之后的内容（去掉开头空行）
    const fmIdx = text.indexOf(blockFull)
    const body = fmIdx >= 0 ? text.slice(fmIdx + blockFull.length).replace(/^\r?\n/, '') : ''
    return { meta, body }
  }

  const onUploadMd = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      const parsed = parseFrontmatter(text)
      const body = parsed ? parsed.body : text
      const fm = parsed ? parsed.meta : {}
      const title = form.title || fm.title || file.name.replace(/\.(md|markdown|txt)$/i, '')
      const category = fm.category
      const tagsStr = fm.tags || form.tags
      const patch = {
        ...form,
        title,
        content: body,
        // 头部字段：有值才覆盖，避免导入时把已有内容清空
        summary: form.summary || fm.summary,
        published_at: form.published_at || fm.date,
        top: fm.top !== '' ? Number(fm.top) || 0 : form.top,
        copyright: fm.copyright !== '' ? fm.copyright : form.copyright,
        tags: tagsStr,
      }
      setForm(patch)
      // 标签：流列表/逗号统一切分为标签数组
      if (tagsStr) setTagList(tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean))
      // 分类：与现有分类名比对，命中才自动选中（未命中保持默认，保存时归「其他」）
      if (category) {
        const hit = cats.find((c) => c.name.toLowerCase() === category.toLowerCase())
        if (hit) setForm((f) => ({ ...f, category_id: hit.id }))
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      {/* 顶部操作条 */}
      <div className="card p-4 flex items-center justify-between sticky top-16 z-10 backdrop-blur bg-white/80">
        <div className="flex items-center gap-3">
          <Link to="/admin/articles" className="text-ink-600 hover:text-primary text-sm">← 文章列表</Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-warning bg-amber-50 px-2.5 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            草稿未保存…
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn-ghost text-xs cursor-pointer">
            📤 导入 .md
            <input type="file" accept=".md,.markdown,.txt" className="hidden" onChange={onUploadMd} />
          </label>
          <button onClick={() => save(false)} className="btn-ghost text-sm" disabled={saving}>保存草稿</button>
          <button onClick={() => save(true)} className="btn-primary text-sm" disabled={saving}>
            {mode === 'edit' ? '保存修改' : '发布文章'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        {/* 左：编辑 + 预览 */}
        <div className="card overflow-hidden">
          <div className="border-b border-ink-200/70 px-3 py-2 flex items-center gap-1 flex-wrap bg-canvas/40">
            {TOOLS.map((t) => (
              <button key={t.k} onClick={() => insert(t)} title={t.label} className="w-8 h-8 rounded text-sm text-ink-600 hover:bg-primary-light hover:text-primary transition">{t.k}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[520px]">
            <textarea
              ref={taRef}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full p-5 font-mono text-sm leading-6 outline-none border-r border-ink-200/70 resize-none"
              placeholder="开始写你的 Markdown…"
            />
            <div className="p-5 overflow-auto">
              <div className="text-xs text-primary font-medium mb-2">实时预览 (Preview)</div>
              <MarkdownView content={form.content} />
            </div>
          </div>
        </div>

        {/* 右：属性 */}
        <aside className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="text-base font-semibold text-ink-900">文章属性设置</h3>

            <div>
              <label className="block text-xs text-ink-600 mb-1.5">分类 (Category)</label>
              <select className="w-full h-9 px-3 border border-ink-200/80 rounded-md text-sm bg-white" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">选择分类</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-ink-600 mb-1.5">标签 (Tags)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tagList.map((t) => (
                  <span key={t} className="badge bg-primary-light text-primary-dark inline-flex items-center gap-1">
                    {t} <button onClick={() => setTagList(tagList.filter((x) => x !== t))} className="text-primary-dark/60 hover:text-error">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 h-9 px-3 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary"
                  placeholder="添加标签…" />
                <button onClick={addTag} className="btn-ghost text-xs px-3">添加</button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-ink-600 mb-1.5">内容摘要 (Excerpt)</label>
              <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
                rows={3} className="w-full px-3 py-2 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary resize-none" />
            </div>

            {/* 文章 md 头部约定字段：发布日期 / 置顶 / 版权声明 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-ink-600 mb-1.5">发布日期 (Date)</label>
                <input type="date" value={form.published_at}
                  onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                  className="w-full h-9 px-3 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-ink-600 mb-1.5">置顶权重 (Top)</label>
                <input type="number" min="0" value={form.top}
                  onChange={(e) => setForm({ ...form, top: Number(e.target.value) || 0 })}
                  className="w-full h-9 px-3 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="copyright" checked={form.copyright}
                onChange={(e) => setForm({ ...form, copyright: e.target.checked })} />
              <label htmlFor="copyright" className="text-xs text-ink-600">声明版权（详情页显示「© 版权所有」）</label>
            </div>

            <div>
              <label className="block text-xs text-ink-600 mb-1.5">SEO 自定义链接 (Slug)</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full h-9 px-3 border border-ink-200/80 rounded-md text-sm outline-none focus:border-primary font-mono" />
            </div>

            <div>
              <label className="block text-xs text-ink-600 mb-1.5">文章封面 (Cover Image)</label>
              {form.cover ? (
                <div className="relative rounded-md overflow-hidden border border-ink-200/70">
                  <img src={form.cover} alt="cover" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => setForm((f) => ({ ...f, cover: '' }))}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center hover:bg-black/80"
                    title="移除封面"
                  >×</button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-ink-200 rounded-md p-4 text-center text-sm text-ink-400">
                  🖼 尚未设置封面
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex-1 btn-ghost text-xs py-2 border border-ink-200/80 rounded-md hover:border-primary hover:text-primary transition"
                >
                  🖼 选择网站图片
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 btn-ghost text-xs py-2 border border-ink-200/80 rounded-md hover:border-primary hover:text-primary transition"
                >
                  ⬆ 上传本地图片
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLocalCover} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-ink-600 mb-1.5">状态</label>
              <div className="flex gap-2">
                {[['published', '已发布'], ['draft', '草稿']].map(([v, l]) => (
                  <button key={v} onClick={() => setForm({ ...form, status: v })}
                    className={`px-3 py-1.5 text-xs rounded-md border ${form.status === v ? 'bg-primary-light text-primary-dark border-primary/40' : 'border-ink-200/80 text-ink-600 hover:border-primary/40'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {showPicker && (
        <CoverPickerModal
          onPick={(src) => { setForm((f) => ({ ...f, cover: src })); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
