import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getArticle, listArticles, listComments, createComment } from '../api/blog'
import MarkdownView from '../components/MarkdownView'
import CategoryBadge from '../components/ui/CategoryBadge'
import { useAuth } from '../context/AuthContext'
import { categoryPath } from '../lib/categorySlug'

// 阅读时长估算
function readMinutes(s) {
  if (!s) return 1
  return Math.max(1, Math.round(s.length / 500))
}
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 从 markdown 抽取 h2 标题作为目录
function extractToc(content) {
  if (!content) return []
  const out = []
  const re = /^##\s+(.+?)\s*$/gm
  let m
  while ((m = re.exec(content)) !== null) {
    out.push({ id: slugify(m[1]), text: m[1] })
  }
  return out
}
function slugify(s) {
  return 'h-' + s.replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 80)
}

function CommentItem({ c, onReply }) {
  return (
    <div className="py-4 border-b border-ink-200/60 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 rounded-full bg-primary-light text-primary-dark flex items-center justify-center text-sm font-bold">
          {(c.nickname || 'U').slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-ink-900">{c.nickname}</span>
            {c.is_author && <span className="badge bg-primary-light text-primary-dark">作者</span>}
            <span className="text-ink-400 text-xs">{new Date(c.created_at).toLocaleString()}</span>
            <button onClick={() => onReply(c.id)} className="ml-auto text-xs text-ink-400 hover:text-primary">回复</button>
          </div>
          <p className="mt-1 text-sm text-ink-800 leading-7 whitespace-pre-wrap">{c.content}</p>
        </div>
      </div>
    </div>
  )
}

export default function ArticleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [article, setArticle] = useState(null)
  const [neighbors, setNeighbors] = useState({ prev: null, next: null })
  const [comments, setComments] = useState([])
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [activeToc, setActiveToc] = useState(null)

  useEffect(() => {
    if (!id) return
    getArticle(id).then((r) => setArticle(r.data)).catch(() => navigate('/'))
  }, [id, navigate])

  useEffect(() => {
    listArticles({ page: 1, page_size: 100 }).then((r) => {
      const list = r.data?.list || []
      const idx = list.findIndex((a) => String(a.id) === String(id))
      if (idx >= 0) {
        setNeighbors({
          prev: idx < list.length - 1 ? list[idx + 1] : null,
          next: idx > 0 ? list[idx - 1] : null,
        })
      }
    }).catch(() => {})
  }, [id])

  const loadComments = () => {
    if (!id) return
    listComments(id).then((r) => setComments(r.data || [])).catch(() => setComments([]))
  }
  useEffect(loadComments, [id])

  // 滚动监听高亮当前目录
  useEffect(() => {
    if (!article) return
    const headings = Array.from(document.querySelectorAll('.markdown-body h2'))
    if (!headings.length) return
    const onScroll = () => {
      const y = window.scrollY + 120
      let cur = headings[0].id
      for (const h of headings) {
        if (h.offsetTop <= y) cur = h.id
        else break
      }
      setActiveToc(cur)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [article])

  const toc = useMemo(() => extractToc(article?.content), [article?.id])

  const submit = () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!content.trim()) return
    createComment(id, { content, parent_id: replyTo || undefined })
      .then(() => {
        setContent('')
        setReplyTo(null)
        loadComments()
      })
      .catch((e) => alert(e.msg || '评论失败'))
  }

  if (!article) return <div className="container-page py-16 text-center text-ink-400">加载中…</div>

  return (
    <div className="container-page py-8">
      {/* 面包屑 */}
      <nav className="text-sm text-ink-400 mb-4">
        <Link to="/" className="hover:text-primary">首页</Link>
        <span className="mx-2">/</span>
        {/* 分类面包屑统一指向 /category/:slug 列表页（可翻页、总数准确） */}
        {/* slug 为英文（鸿蒙 → harmony），URL 中不出现中文 */}
        {(() => {
          const href = categoryPath({ id: article.category_id, name: article.category_name })
          const label = article.category_name || '未分类'
          return href.startsWith('/category/')
            ? <Link to={href} className="hover:text-primary">{label}</Link>
            : <span>{label}</span>
        })()}
        <span className="mx-2">/</span>
        <span className="text-ink-600 line-clamp-1 inline-block max-w-[60ch] align-bottom">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 主区 */}
        <article className="lg:col-span-2 space-y-6">
          <div className="card p-8">
            {/* 封面图（若有） */}
            {article.cover && (
              <img
                src={article.cover}
                alt={article.title}
                className="-mx-8 -mt-8 mb-6 w-[calc(100%+4rem)] aspect-[16/9] object-cover"
              />
            )}
            {/* 标题区 */}
            <div className="flex items-center gap-2 mb-3">
              <CategoryBadge name={article.category_name} />
              {article.tags?.split(/[,，]/).filter(Boolean).slice(0, 3).map((t) => (
                <span key={t} className="tag">#{t.trim()}</span>
              ))}
            </div>
            <h1 className="text-3xl font-bold text-ink-900 leading-tight mb-4">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-600 pb-5 border-b border-ink-200/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center text-xs font-bold">
                  {(article.author_name || 'A').slice(0, 1)}
                </div>
                <span className="font-medium text-ink-900">{article.author_name || '匿名'}</span>
              </div>
              <span className="text-ink-400">发布于 {fmtDate(article.published_at || article.created_at)}</span>
              <span className="text-ink-400">·</span>
              <span className="text-ink-400">{article.copyright ? '© 版权所有' : '原创'}</span>
              <span className="ml-auto flex items-center gap-3 text-ink-400">
                <span>👁 {article.view_count?.toLocaleString?.() || 0}</span>
                <span>·</span>
                <span>{readMinutes(article.content)} min read</span>
              </span>
            </div>

            {/* 正文 */}
            <div className="mt-6">
              <MarkdownView content={article.content} />
            </div>

            {/* 文末标签 */}
            {article.tags && (
              <div className="mt-8 pt-5 border-t border-ink-200/60 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-ink-400">文末标签：</span>
                {article.tags.split(/[,，]/).filter(Boolean).map((t) => (
                  <span key={t} className="tag">#{t.trim()}</span>
                ))}
              </div>
            )}

            {/* 操作栏 */}
            <div className="mt-5 flex items-center justify-between text-sm text-ink-600">
              <div className="flex items-center gap-5">
                <button className="hover:text-primary">👍 点赞 {432 + (article.view_count || 0) % 100}</button>
                <button className="hover:text-primary">🔖 收藏 {184 + (article.view_count || 0) % 50}</button>
              </div>
              <div className="flex items-center gap-2 text-ink-400">
                <span>分享到:</span>
                {['复制', 'X', '微博'].map((s) => (
                  <button key={s} className="px-2 py-0.5 hover:text-primary transition">{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 上一篇 / 下一篇 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {neighbors.prev ? (
              <Link to={`/article/${neighbors.prev.id}`} className="card p-4 group hover:border-primary transition">
                <div className="text-xs text-ink-400 mb-1">← 上一篇</div>
                <div className="text-sm font-medium text-ink-900 line-clamp-1 group-hover:text-primary">{neighbors.prev.title}</div>
              </Link>
            ) : <div />}
            {neighbors.next ? (
              <Link to={`/article/${neighbors.next.id}`} className="card p-4 group hover:border-primary transition text-right">
                <div className="text-xs text-ink-400 mb-1">下一篇 →</div>
                <div className="text-sm font-medium text-ink-900 line-clamp-1 group-hover:text-primary">{neighbors.next.title}</div>
              </Link>
            ) : <div />}
          </div>

          {/* 评论区 */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-ink-900 mb-4">精选评论 ({comments.length})</h3>
            {user ? (
              <div className="mb-5">
                {replyTo && (
                  <div className="text-xs text-ink-400 mb-2">
                    回复中… <button onClick={() => setReplyTo(null)} className="text-primary hover:underline">取消</button>
                  </div>
                )}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="在这里发表你的看法…"
                  className="w-full border border-ink-200/80 rounded-lg p-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button onClick={submit} className="btn-primary">发布评论</button>
                </div>
              </div>
            ) : (
              <div className="mb-5 text-sm text-ink-400 bg-canvas p-4 rounded-lg">
                请先 <button onClick={() => navigate('/login')} className="text-primary hover:underline">登录</button> 后评论
              </div>
            )}
            {comments.length === 0 ? (
              <div className="text-sm text-ink-400 py-6 text-center">暂无评论</div>
            ) : (
              <div>
                {comments.map((c) => (
                  <CommentItem key={c.id} c={c} onReply={setReplyTo} />
                ))}
              </div>
            )}
          </div>
        </article>

        {/* 右栏：目录 */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 card p-5">
            <div className="text-base font-semibold text-ink-900 mb-3">目录 (Table of Contents)</div>
            {toc.length === 0 ? (
              <div className="text-sm text-ink-400">本文无目录</div>
            ) : (
              <ol className="space-y-2 text-sm">
                {toc.map((t, i) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className={`block pl-3 border-l-2 transition ${
                        activeToc === t.id
                          ? 'border-primary text-primary font-medium'
                          : 'border-ink-200 text-ink-600 hover:text-primary hover:border-primary/50'
                      }`}
                    >
                      <span className="text-xs text-ink-400 mr-1.5">{String(i + 1).padStart(2, '0')}.</span>
                      {t.text}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
