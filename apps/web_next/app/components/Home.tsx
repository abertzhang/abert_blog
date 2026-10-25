'use client'

import { Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { listArticles, hotArticles, listTags, getBanners } from '../api/blog'
import SectionHeader from './ui/SectionHeader'
import Carousel, { type Slide } from './Carousel'
import ArticleCard from './ArticleCard'
import FriendLinks from './FriendLinks'
import { categoryStyle, sortCategories } from '../lib/categoryColor'
import { categoryPath } from '../lib/categorySlug'
import { useCategories } from '../lib/useCategories'
import type { Article, Category, TagCount } from '../types/blog'

// 轮播图：框架阶段用渐变占位（无需真实 banner 图片）。
// 每个分类给一张渐变 slide，点击跳转到对应分类列表页。
const SLIDE_GRADIENTS: Record<string, string> = {
  Flutter: 'linear-gradient(135deg,#0D9488,#0F766E)',
  NodeJs: 'linear-gradient(135deg,#16A34A,#15803D)',
  Golang: 'linear-gradient(135deg,#4F46E5,#3730A3)',
  React: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
  其他: 'linear-gradient(135deg,#475569,#1E293B)',
}
const CATEGORY_ORDER = ['Flutter', 'NodeJs', 'React', 'Golang', '其他']
const MAX_SLIDES = 5

function buildSlides(cats: Category[]): Slide[] {
  const names = (cats.length ? cats : CATEGORY_ORDER.map((name) => ({ name } as Category)))
    .map((c) => c.name)
    .filter(Boolean)
  // 去重 + 取前 MAX_SLIDES 个
  const unique = Array.from(new Set(names)).slice(0, MAX_SLIDES)
  return unique.map((name) => ({
    category: name,
    gradient: SLIDE_GRADIENTS[name] || SLIDE_GRADIENTS['其他'],
    href: categoryPath(name),
  }))
}

// 词云兜底：前端聚合文章 tags；不足 3 个词时用分类名补齐（保证有内容且有大小对比）
function fallbackTags(articles: Article[], cats: Category[]): TagCount[] {
  const count: Record<string, number> = {}
  for (const a of articles) {
    ;(a.tags || '')
      .split(/[,，]/)
      .forEach((t) => {
        const k = t.trim()
        if (k) count[k] = (count[k] || 0) + 1
      })
  }
  if (Object.keys(count).filter(Boolean).length < 3) {
    for (const c of cats) {
      if (!c.name) continue
      const n = articles.filter((a) => a.category_id === c.id).length
      count[c.name] = Math.max(count[c.name] || 0, n)
    }
  }
  return Object.entries(count)
    .map(([word, c]) => ({ word, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}

// ---------- 热门标签云（圆形螺旋词云） ----------
function WordCloudCard({ tags }: { tags: TagCount[] }) {
  const items = useMemo(() => {
    if (!tags || !tags.length) return []
    const top = [...tags].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 30)
    const max = top[0].count
    const min = top[top.length - 1].count
    const COUNT = top.length
    const GOLDEN = 2.39996323

    const rnd = (n: number) => {
      let h = Math.imul(n, 2654435761) >>> 0
      h ^= h >>> 15
      h = Math.imul(h, 2246822519) >>> 0
      h ^= h >>> 13
      return ((h >>> 0) % 100000) / 100000
    }

    const BOX = 280
    const HALF = BOX / 2
    const SAFE = 4
    const MAX_SWEEP = BOX
    const PAD = 1.05

    const measure = (word: string, fontSize: number) => {
      let units = 0
      for (const ch of word) units += ch.charCodeAt(0) > 0x2e80 ? 1 : 0.55
      return {
        hw: (units * fontSize * PAD * 1.07) / 2,
        hh: (fontSize * 1.25 * PAD * 1.07) / 2,
      }
    }

    return top.map((t, i) => {
      const ratio = max === min ? 0.5 : (t.count - min) / (max - min)
      const size = 13 + ratio * 19
      const weight = 600 + Math.round(ratio * 300)
      const angle = i * GOLDEN
      const k = 1 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)), 1e-6)
      const R = i === 0 ? 0 : Math.sqrt(i / COUNT) * 35
      const x = 50 + Math.cos(angle) * R * k
      const y = 50 + Math.sin(angle) * R * k
      const opacity = 0.62 + ratio * 0.38
      const z = 100 - i
      const rot = ((i * 47) % 13) - 6

      const { hw, hh } = measure(t.word, size)
      const ax = (x / 100 - 0.5) * BOX
      const ay = (y / 100 - 0.5) * BOX
      const minX = -HALF + hw + SAFE
      const maxX = HALF - hw - SAFE
      const minY = -HALF + hh + SAFE
      const maxY = HALF - hh - SAFE
      const inX = minX <= maxX
      const inY = minY <= maxY
      const cx = inX ? Math.min(maxX, Math.max(minX, ax)) : 0
      const cy = inY ? Math.min(maxY, Math.max(minY, ay)) : 0
      const far = (ra: number, seed: number) => (ra < 0.5 ? 0.65 + rnd(seed) * 0.35 : rnd(seed) * 0.35)
      const raX = inX && maxX > minX ? (cx - minX) / (maxX - minX) : 0.5
      const raY = inY && maxY > minY ? (cy - minY) / (maxY - minY) : 0.5
      const tx = inX ? minX + far(raX, i * 13 + 1) * (maxX - minX) : 0
      const ty = inY ? minY + far(raY, i * 13 + 2) * (maxY - minY) : 0
      const dx = Math.max(-MAX_SWEEP, Math.min(MAX_SWEEP, tx - cx))
      const dy = Math.max(-MAX_SWEEP, Math.min(MAX_SWEEP, ty - cy))
      const r0 = rot - 2.5
      const r1 = rot + 2.5
      const s0 = 0.97 + rnd(i * 5 + 1) * 0.05
      const s1 = 1.02 + rnd(i * 5 + 2) * 0.05
      const z0 = z
      const z1 = Math.max(1, z + (i % 2 ? -8 : 8))
      const useBlur = i % 4 === 0
      const b1 = useBlur ? 0.3 : 0
      const dist = Math.hypot(dx, dy)
      const dur = 11 + dist * 0.075 + rnd(i * 7 + 1) * 3
      const delay = -rnd(i * 11 + 1) * dur

      // 词云需要注入大量 CSS 自定义属性（--dx / --dy / --r0 ...），
      // 用 `& Record<\`--${string}\`, string | number>` 放宽类型以通过严格检查。
      const style: CSSProperties & Record<`--${string}`, string | number> = {
        left: `${((cx / BOX + 0.5) * 100).toFixed(2)}%`,
        top: `${((cy / BOX + 0.5) * 100).toFixed(2)}%`,
        fontSize: `${size}px`,
        fontWeight: weight,
        transform: `translate(-50%, -50%) rotate(${rot}deg)`,
        opacity,
        zIndex: z,
        '--dx': `${dx.toFixed(2)}px`,
        '--dy': `${dy.toFixed(2)}px`,
        '--r0': `${r0.toFixed(2)}deg`,
        '--r1': `${r1.toFixed(2)}deg`,
        '--s0': s0.toFixed(3),
        '--s1': s1.toFixed(3),
        '--ob': opacity.toFixed(3),
        '--z0': z0,
        '--z1': z1,
        '--b1': `${b1}px`,
        animation: `wc-float ${dur.toFixed(2)}s ease-in-out ${delay.toFixed(2)}s infinite`,
      }
      return {
        word: t.word,
        count: t.count,
        style,
      }
    })
  }, [tags])

  if (!items.length) return null
  const COLORS = ['text-primary', 'text-sky-600', 'text-indigo-600', 'text-blue-600', 'text-cyan-600']

  return (
    <div className="card p-5">
      <div
        className="relative mx-auto overflow-hidden"
        style={{ width: 280, height: 280, maxWidth: '100%' }}
      >
        {items.map((t, i) => (
          <Link
            key={t.word}
            href={`/?q=${encodeURIComponent(t.word)}`}
            title={`${t.word}（${t.count} 篇）`}
            className={`wc-item absolute whitespace-nowrap leading-none ${COLORS[i % COLORS.length]}`}
            style={t.style}
          >
            {t.word}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ---------- 右栏：作者卡 ----------
function AuthorCard() {
  return (
    <div className="card p-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-xl font-bold text-white shadow-soft">
        行
      </div>
      <div className="mt-3 text-base font-semibold text-ink-900">行云流水（Abert）</div>
      <div className="mt-1 text-xs text-ink-400">全栈开发工程师 / 付费开发者</div>
      <p className="mt-3 text-sm leading-6 text-ink-600">
        热爱探究底层技术，目前深耕 Flutter 跨端、React 前端与 NodeJs 服务端，并用 Golang 打磨后端高并发基建。
      </p>
      <div className="mt-4 flex items-center justify-center gap-3 text-ink-400">
        {['GitHub', 'X', '✉', '📡'].map((s) => (
          <a
            key={s}
            href="#"
            title={s}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-200/80 text-sm transition hover:border-primary hover:text-primary"
          >
            {s}
          </a>
        ))}
      </div>
    </div>
  )
}

// ---------- 右栏：文章分类（计数） ----------
function CategoryRanking({ cats }: { cats: Category[] }) {
  const visible = sortCategories(cats)
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-base font-semibold text-ink-900">文章分类</h3>
      <ul className="space-y-2.5">
        {visible.length === 0 && <li className="text-sm text-ink-400">暂无数据</li>}
        {visible.map((c) => {
          const s = categoryStyle(c.name)
          return (
            <li key={c.id}>
              <Link href={categoryPath(c)} className="flex items-center justify-between text-sm transition hover:text-primary">
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  <span className="text-ink-800">{c.name}</span>
                </span>
                <span className="font-medium text-ink-400">{c.article_count ?? 0}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------- 右栏：热门文章排行 ----------
function HotRanking({ list }: { list: Article[] }) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-base font-semibold text-ink-900">热门文章排行</h3>
      <ol className="space-y-2.5">
        {(list || []).slice(0, 20).map((a, i) => (
          <li key={a.id} className="flex items-start gap-2.5 text-sm">
            <span
              className={`w-5 h-5 shrink-0 rounded text-xs flex items-center justify-center font-bold ${
                i === 0 ? 'bg-primary text-white' : 'bg-canvas text-ink-400'
              }`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <Link href={`/article/${a.id}`} className="leading-6 text-ink-800 line-clamp-2 hover:text-primary">
              {a.title}
            </Link>
          </li>
        ))}
        {(!list || list.length === 0) && <li className="text-sm text-ink-400">暂无热门文章</li>}
      </ol>
    </div>
  )
}

// ---------- Home 主页（内部组件，使用 useSearchParams，需在 Suspense 内） ----------
function HomeInner() {
  const params = useSearchParams()
  const cat = params.get('cat')
  const q = params.get('q')
  const [articles, setArticles] = useState<Article[]>([])
  const cats = useCategories()
  const [hot, setHot] = useState<Article[]>([])
  const [tags, setTags] = useState<TagCount[]>([])
  // 轮播图：先用分类渐变占位（即时可见），接口返回真实封面图后替换
  const [banners, setBanners] = useState<Slide[]>(() => buildSlides(cats))

  useEffect(() => {
    getBanners(5)
      .then((r) => {
        const data = (r.data || []).filter((b) => b.image)
        if (data.length) setBanners(data as Slide[])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    hotArticles({ limit: 20 })
      .then((r) => setHot(r.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const p: { page: number; page_size: number; category_id?: number } = { page: 1, page_size: 50 }
    if (cat) {
      const c = (cats || []).find((x) => x.name === cat)
      if (c) p.category_id = c.id ?? 0
    }
    listArticles(p)
      .then((r) => {
        let list = r.data?.list || []
        if (q) {
          const k = q.toLowerCase()
          list = list.filter(
            (a) => (a.title || '').toLowerCase().includes(k) || (a.summary || '').toLowerCase().includes(k),
          )
        }
        setArticles(list)
      })
      .catch(() => setArticles([]))
  }, [cat, q, cats])

  useEffect(() => {
    let alive = true
    listTags()
      .then((r) => {
        if (!alive) return
        const data = (r.data || []).filter((t) => t.word)
        if (data.length >= 3) setTags(data.slice(0, 20))
        else setTags(fallbackTags(articles, cats))
      })
      .catch(() => alive && setTags(fallbackTags(articles, cats)))
    return () => {
      alive = false
    }
  }, [articles, cats])

  const catCounts = useMemo(
    () =>
      cats.map((c) => ({
        ...c,
        count: typeof c.article_count === 'number' ? c.article_count : articles.filter((a) => a.category_id === c.id).length,
      })),
    [cats, articles],
  )

  const rest = articles.slice(0, 10)

  return (
    <div className="container-page space-y-10 py-8">
      <Carousel slides={banners} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader
            title="最新发表"
            sub="Latest Posts"
            action={
              <div className="flex items-center gap-3">
                <Link href={cat ? categoryPath(cat) : '/articles'} className="text-sm text-primary hover:underline">
                  显示更多 →
                </Link>
                {cat && (
                  <Link href="/" className="text-sm text-ink-400 hover:text-primary">
                    清除筛选 ×
                  </Link>
                )}
              </div>
            }
          />
          {rest.length === 0 && (
            <div className="card p-8 text-center text-sm text-ink-400">
              暂无文章。用管理员账号 <code className="rounded bg-canvas px-1.5 py-0.5 text-primary">13123456789</code> 登录后台新建第一篇吧。
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {rest.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        </div>
        <aside className="space-y-6">
          <AuthorCard />
          <CategoryRanking cats={catCounts} />
          {tags.length > 0 && <WordCloudCard tags={tags} />}
          <HotRanking list={hot} />
          <FriendLinks />
        </aside>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={<div className="container-page py-16 text-center text-ink-400">加载中…</div>}
    >
      <HomeInner />
    </Suspense>
  )
}
