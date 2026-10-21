import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { listArticles } from '../api/blog'
import ArticleCard from '../components/ArticleCard'
import SectionHeader from '../components/ui/SectionHeader'
import { findCategoryBySlug } from '../lib/categorySlug'
import { useCategories } from '../lib/useCategories'

const PAGE_SIZE = 12

export default function ArticleList() {
  const params = useParams()
  const [qs] = useSearchParams()
  // 优先用路由 /category/:slug（slug 为英文，如 harmony），其次兼容旧的 ?cat=中文名
  const slugFromRoute = params.slug
  const nameFromQuery = qs.get('cat')
  const targetSlug = slugFromRoute || ''
  // 标签筛选：后台标签管理点「查看文章」会跳到 /articles?tag=xxx
  const tag = qs.get('tag') || ''

  // 共享分类缓存：后台新增/改名分类后，导航、首页右栏、这里会同时生效
  const cats = useCategories()
  const [articles, setArticles] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // slug → 分类对象（未命中时 cat 为 null，说明是无效/已删除的分类）
  // 注意：查询串 ?cat= 里可能是中文原名，findCategoryBySlug 内部已做兼容
  const cat = targetSlug
    ? findCategoryBySlug(cats, targetSlug)
    : nameFromQuery
      ? findCategoryBySlug(cats, nameFromQuery)
      : null

  // 用真实分类 id 过滤（找不到分类时 catId 为 0，即全部分类）
  const catId = cat?.id || 0
  // 列表是否已就绪：分类列表还在加载时不急着判定「分类不存在」，避免闪一下空状态
  const catsReady = cats.length > 0

  useEffect(() => {
    // 需要按分类过滤、但分类列表还没加载完时先不请求，
    // 否则会先拉一次「全部文章」再拉一次「分类文章」，首屏闪一下错误的列表
    if ((targetSlug || nameFromQuery) && !catsReady) return
    setArticles([])
    setPage(1)
    setLoading(true)
    const p = { page: 1, page_size: PAGE_SIZE }
    if (catId) p.category_id = catId
    if (tag) p.tag = tag
    listArticles(p)
      .then((r) => {
        setArticles(r.data?.list || [])
        setTotal(r.data?.total || 0)
      })
      .catch(() => { setArticles([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [catId, catsReady, tag])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    setLoading(true)
    const p = { page: next, page_size: PAGE_SIZE }
    if (catId) p.category_id = catId
    if (tag) p.tag = tag
    listArticles(p)
      .then((r) => setArticles((prev) => [...prev, ...(r.data?.list || [])]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // 标题：标签筛选优先（标签与分类不会同时出现），否则用真实分类名（如「鸿蒙」）
  const title = tag ? `标签：${tag}` : cat?.name || (targetSlug ? decodeURIComponent(targetSlug) : '') || nameFromQuery || '全部文章'
  // 副标题区分口径：标签筛选显示「N 篇带该标签的文章」
  const sub = tag ? `标签「${tag}」· 共 ${total} 篇` : `共 ${total} 篇`
  // 无效 slug：分类列表已加载但匹配不到 → 视为分类不存在
  const notFound = Boolean(targetSlug) && catsReady && !cat
  const hasMore = articles.length < total

  return (
    <div className="container-page py-8">
      <SectionHeader title={title} sub={notFound ? '' : sub} />
      {notFound ? (
        <div className="card p-8 text-center text-ink-400 text-sm">分类不存在或已删除。</div>
      ) : articles.length === 0 && !loading ? (
        <div className="card p-8 text-center text-ink-400 text-sm">{tag ? '该标签下暂无文章。' : '该分类下暂无文章。'}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((a) => <ArticleCard key={a.id} a={a} />)}
        </div>
      )}
      {hasMore && !notFound && (
        <div className="flex justify-center mt-8">
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
        <Link to="/" className="text-sm text-ink-400 hover:text-primary">← 返回首页</Link>
      </div>
    </div>
  )
}
