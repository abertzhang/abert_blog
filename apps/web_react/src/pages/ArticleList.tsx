import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { listArticles } from '../api/blog'
import ArticleCard from '../components/ArticleCard'
import SectionHeader from '../components/ui/SectionHeader'
import { findCategoryBySlug } from '../lib/categorySlug'
import { useCategories } from '../lib/useCategories'
import type { Article } from '../types/blog'

const PAGE_SIZE = 12

export default function ArticleList() {
  const params = useParams()
  const [qs] = useSearchParams()
  const slugFromRoute = params.slug
  const nameFromQuery = qs.get('cat')
  const targetSlug = slugFromRoute || ''
  const tag = qs.get('tag') || ''

  const cats = useCategories()
  const [articles, setArticles] = useState<Article[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const cat = targetSlug
    ? findCategoryBySlug(cats, targetSlug)
    : nameFromQuery
      ? findCategoryBySlug(cats, nameFromQuery)
      : null

  const catId = cat?.id || 0
  const catsReady = cats.length > 0

  useEffect(() => {
    if ((targetSlug || nameFromQuery) && !catsReady) return
    setArticles([])
    setPage(1)
    setLoading(true)
    const p: { page: number; page_size: number; category_id?: number; tag?: string } = {
      page: 1,
      page_size: PAGE_SIZE,
    }
    if (catId) p.category_id = catId
    if (tag) p.tag = tag
    listArticles(p)
      .then((r) => {
        setArticles(r.data?.list || [])
        setTotal(r.data?.total || 0)
      })
      .catch(() => {
        setArticles([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [catId, catsReady, tag])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    setLoading(true)
    const p: { page: number; page_size: number; category_id?: number; tag?: string } = {
      page: next,
      page_size: PAGE_SIZE,
    }
    if (catId) p.category_id = catId
    if (tag) p.tag = tag
    listArticles(p)
      .then((r) => setArticles((prev) => [...prev, ...(r.data?.list || [])]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const title = tag
    ? `标签：${tag}`
    : cat?.name || (targetSlug ? decodeURIComponent(targetSlug) : '') || nameFromQuery || '全部文章'
  const sub = tag ? `标签「${tag}」· 共 ${total} 篇` : `共 ${total} 篇`
  const notFound = Boolean(targetSlug) && catsReady && !cat
  const hasMore = articles.length < total

  return (
    <div className="container-page py-8">
      <SectionHeader title={title} sub={notFound ? '' : sub} />
      {notFound ? (
        <div className="card p-8 text-center text-sm text-ink-400">分类不存在或已删除。</div>
      ) : articles.length === 0 && !loading ? (
        <div className="card p-8 text-center text-sm text-ink-400">
          {tag ? '该标签下暂无文章。' : '该分类下暂无文章。'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </div>
      )}
      {hasMore && !notFound && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn-primary px-8 py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? '加载中…' : '加载更多'}
          </button>
        </div>
      )}
      <div className="mt-8 text-center">
        <Link to="/" className="text-sm text-ink-400 hover:text-primary">
          ← 返回首页
        </Link>
      </div>
    </div>
  )
}
