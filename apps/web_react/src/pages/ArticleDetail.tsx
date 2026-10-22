import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getArticle, listArticles, listComments, createComment } from '../api/blog'
import MarkdownView from '../components/MarkdownView'
import CategoryBadge from '../components/ui/CategoryBadge'
import { useAuth } from '../context/AuthContext'
import { categoryPath } from '../lib/categorySlug'
import type { Article, Comment } from '../types/blog'

function readMinutes(s?: string): number {
  if (!s) return 1
  return Math.max(1, Math.round(s.length / 500))
}
function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function slugify(s: string): string {
  return (
    'h-' +
    s
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 80)
  )
}
function extractToc(content?: string): { id: string; text: string }[] {
  if (!content) return []
  const out: { id: string; text: string }[] = []
  const re = /^##\s+(.+?)\s*$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    out.push({ id: slugify(m[1]), text: m[1] })
  }
  return out
}

function CommentItem({ c, onReply }: { c: Comment; onReply: (id: number) => void }) {
  return (
    <div className="border-b border-ink-200/60 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary-dark">
          {(c.nickname || 'U').slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-ink-900">{c.nickname}</span>
            {c.is_author && <span className="badge bg-primary-light text-primary-dark">作者</span>}
            <span className="text-xs text-ink-400">{new Date(c.created_at).toLocaleString()}</span>
            <button onClick={() => onReply(c.id)} className="ml-auto text-xs text-ink-400 hover:text-primary">
              回复
            </button>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-ink-800">{c.content}</p>
        </div>
      </div>
    </div>
  )
}

export default function ArticleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [article, setArticle] = useState<Article | null>(null)
  const [neighbors, setNeighbors] = useState<{ prev: Article | null; next: Article | null }>({
    prev: null,
    next: null,
  })
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [activeToc, setActiveToc] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getArticle(id)
      .then((r) => setArticle(r.data))
      .catch(() => navigate('/'))
  }, [id, navigate])

  useEffect(() => {
    listArticles({ page: 1, page_size: 100 })
      .then((r) => {
        const list = r.data?.list || []
        const idx = list.findIndex((a) => String(a.id) === String(id))
        if (idx >= 0) {
          setNeighbors({
            prev: idx < list.length - 1 ? list[idx + 1] : null,
            next: idx > 0 ? list[idx - 1] : null,
          })
        }
      })
      .catch(() => {})
  }, [id])

  const loadComments = () => {
    if (!id) return
    listComments(Number(id))
      .then((r) => setComments(r.data || []))
      .catch(() => setComments([]))
  }
  useEffect(loadComments, [id])

  useEffect(() => {
    if (!article) return
    const headings = Array.from(document.querySelectorAll('.markdown-body h2'))
    if (!headings.length) return
    const onScroll = () => {
      const y = window.scrollY + 120
      let cur = (headings[0] as HTMLElement).id
      for (const h of headings) {
        if ((h as HTMLElement).offsetTop <= y) cur = (h as HTMLElement).id
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
    if (!content.trim() || !id) return
    createComment(Number(id), { content, parent_id: replyTo || undefined })
      .then(() => {
        setContent('')
        setReplyTo(null)
        loadComments()
      })
      .catch((e) => alert((e as { msg?: string }).msg || '评论失败'))
  }

  if (!article) return <div className="container-page py-16 text-center text-ink-400">加载中…</div>

  return (
    <div className="container-page py-8">
      <nav className="mb-4 text-sm text-ink-400">
        <Link to="/" className="hover:text-primary">
          首页
        </Link>
        <span className="mx-2">/</span>
        {(() => {
          const cat = article.category_id
            ? { id: article.category_id, name: article.category_name || '未分类' }
            : null
          const href = categoryPath(cat)
          const label = article.category_name || '未分类'
          return href.startsWith('/category/') ? (
            <Link to={href} className="hover:text-primary">
              {label}
            </Link>
          ) : (
            <span>{label}</span>
          )
        })()}
        <span className="mx-2">/</span>
        <span className="inline-block max-w-[60ch] align-bottom text-ink-600 line-clamp-1">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <article className="space-y-6 lg:col-span-2">
          <div className="card p-8">
            {article.cover && (
              <img
                src={article.cover}
                alt={article.title}
                className="-mx-8 -mt-8 mb-6 aspect-[16/9] w-[calc(100%+4rem)] object-cover"
              />
            )}
            <div className="mb-3 flex items-center gap-2">
              <CategoryBadge name={article.category_name} />
              {article.tags
                ?.split(/[,，]/)
                .filter(Boolean)
                .slice(0, 3)
                .map((t) => (
                  <span key={t} className="tag">
                    #{t.trim()}
                  </span>
                ))}
            </div>
            <h1 className="mb-4 text-3xl font-bold leading-tight text-ink-900">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink-200/60 pb-5 text-sm text-ink-600">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-xs font-bold text-white">
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

            <div className="mt-6">
              <MarkdownView content={article.content} />
            </div>

            {article.tags && (
              <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-ink-200/60 pt-5">
                <span className="text-sm text-ink-400">文末标签：</span>
                {article.tags
                  .split(/[,，]/)
                  .filter(Boolean)
                  .map((t) => (
                    <span key={t} className="tag">
                      #{t.trim()}
                    </span>
                  ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between text-sm text-ink-600">
              <div className="flex items-center gap-5">
                <button className="hover:text-primary">👍 点赞 {432 + (article.view_count || 0) % 100}</button>
                <button className="hover:text-primary">🔖 收藏 {184 + (article.view_count || 0) % 50}</button>
              </div>
              <div className="flex items-center gap-2 text-ink-400">
                <span>分享到:</span>
                {['复制', 'X', '微博'].map((s) => (
                  <button key={s} className="px-2 py-0.5 transition hover:text-primary">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {neighbors.prev ? (
              <Link to={`/article/${neighbors.prev.id}`} className="card group p-4 transition hover:border-primary">
                <div className="mb-1 text-xs text-ink-400">← 上一篇</div>
                <div className="line-clamp-1 text-sm font-medium text-ink-900 group-hover:text-primary">
                  {neighbors.prev.title}
                </div>
              </Link>
            ) : (
              <div />
            )}
            {neighbors.next ? (
              <Link to={`/article/${neighbors.next.id}`} className="card group p-4 text-right transition hover:border-primary">
                <div className="mb-1 text-xs text-ink-400">下一篇 →</div>
                <div className="line-clamp-1 text-sm font-medium text-ink-900 group-hover:text-primary">
                  {neighbors.next.title}
                </div>
              </Link>
            ) : (
              <div />
            )}
          </div>

          <div className="card p-6">
            <h3 className="mb-4 text-base font-semibold text-ink-900">精选评论 ({comments.length})</h3>
            {user ? (
              <div className="mb-5">
                {replyTo && (
                  <div className="mb-2 text-xs text-ink-400">
                    回复中…{' '}
                    <button onClick={() => setReplyTo(null)} className="text-primary hover:underline">
                      取消
                    </button>
                  </div>
                )}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="在这里发表你的看法…"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-ink-200/80 p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <div className="mt-2 flex justify-end">
                  <button onClick={submit} className="btn-primary">
                    发布评论
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-5 rounded-lg bg-canvas p-4 text-sm text-ink-400">
                请先{' '}
                <button onClick={() => navigate('/login')} className="text-primary hover:underline">
                  登录
                </button>{' '}
                后评论
              </div>
            )}
            {comments.length === 0 ? (
              <div className="py-6 text-center text-sm text-ink-400">暂无评论</div>
            ) : (
              <div>
                {comments.map((c) => (
                  <CommentItem key={c.id} c={c} onReply={setReplyTo} />
                ))}
              </div>
            )}
          </div>
        </article>

        <aside className="hidden lg:block">
          <div className="card sticky top-20 p-5">
            <div className="mb-3 text-base font-semibold text-ink-900">目录 (Table of Contents)</div>
            {toc.length === 0 ? (
              <div className="text-sm text-ink-400">本文无目录</div>
            ) : (
              <ol className="space-y-2 text-sm">
                {toc.map((t, i) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className={`block border-l-2 pl-3 transition ${
                        activeToc === t.id
                          ? 'border-primary font-medium text-primary'
                          : 'border-ink-200 text-ink-600 hover:border-primary/50 hover:text-primary'
                      }`}
                    >
                      <span className="mr-1.5 text-xs text-ink-400">
                        {String(i + 1).padStart(2, '0')}.
                      </span>
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
