import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listArticles, hotArticles, listTags } from '../api/blog'
import SectionHeader from '../components/ui/SectionHeader'
import CategoryBadge from '../components/ui/CategoryBadge'
import Carousel from '../components/Carousel'
import ArticleCard from '../components/ArticleCard'
import FriendLinks from '../components/FriendLinks'
import { categoryStyle, sortCategories } from '../lib/categoryColor'
import { categoryPath } from '../lib/categorySlug'
import { useCategories } from '../lib/useCategories'

// 轮播图：自动扫描 src/assets/banner/ 下所有图片
// import.meta.glob 在构建期收集清单，图片随 Vite 打包进 dist，部署到远程服务器无需额外拷贝
const bannerModules = import.meta.glob('../assets/banner/*.{jpg,jpeg,png,webp}', { eager: true })

// 文件名含技术分类关键词 → 点击跳该分类；其余（风景/汽车等）为纯展示、不跳转
const CATEGORY_KEYWORDS = [
  ['harmonyos', '鸿蒙'],
  ['flutter', 'Flutter'],
  ['golang', 'Golang'],
  ['react', 'React'],
  ['rust', 'Rust'],
]

// 每次随机抽取的轮播图数量（banner 目录里图片很多，不必全部轮播）
const MAX_SLIDES = 5

// 从全部 banner 中随机抽取 MAX_SLIDES 张（Fisher-Yates 洗牌后取前 N 张），每次刷新不同
function buildSlides() {
  const list = Object.entries(bannerModules).map(([path, mod]) => {
    const file = path.split('/').pop() || ''
    const lower = file.toLowerCase()
    let category = ''
    for (const [kw, name] of CATEGORY_KEYWORDS) {
      if (lower.includes(kw)) {
        category = name
        break
      }
    }
    return {
      image: mod.default,
      category: category || file.replace(/\.(jpe?g|png|webp)$/i, ''),
      // 分类跳转统一走 /category/:slug 列表页（可翻页、总数准确），不用 /?cat=
      // slug 为英文（鸿蒙 → harmony），URL 中不出现中文
      href: category ? categoryPath(category) : '',
    }
  })
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list.slice(0, MAX_SLIDES)
}

// 词云兜底：前端聚合文章 tags；不足 3 个词时用分类名补齐（保证有内容且有大小对比）
function fallbackTags(articles, cats) {
  const count = {}
  for (const a of articles) {
    (a.tags || '').split(/[,，]/).forEach((t) => {
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

// ---------- 热门标签云（圆形螺旋词云：中心大词 + 螺旋外扩，重叠叠加出层次） ----------
// 每个词都在做「慢速漂浮」：位置缓慢漂移、旋转微摆、缩放与不透明度起伏形成景深，
// z-index 在相邻层之间缓慢换位，产生前后穿插的层次流动感。
// 运动参数全部由序号 i 确定性推导（不用 Math.random），保证每次渲染一致、动画不会重启。
function WordCloudCard({ tags }) {
  // 每个词的运动参数只计算一次：随序号确定性生成，避免重渲染导致动画重置
  const items = useMemo(() => {
    if (!tags || !tags.length) return []
    // 取最热门的若干标签，按权重降序；第 0 个放圆心（最大、最上层）
    const top = [...tags].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 30)
    const max = top[0].count
    const min = top[top.length - 1].count
    const COUNT = top.length
    const GOLDEN = 2.39996323 // 黄金角（弧度），让螺旋均匀铺开

    // 确定性伪随机：同样的 n 永远得到同样的 0~1 小数（取代 Math.random，避免闪烁与动画重启）
    // 用整数哈希（Knuth 乘法 + 异或混淆）而非 sin 大数取小数：后者在小整数输入下分布不均，
    // 会让所有词挤在方框中段，四角空着。
    const rnd = (n) => {
      let h = Math.imul(n, 2654435761) >>> 0
      h ^= h >>> 15
      h = Math.imul(h, 2246822519) >>> 0
      h ^= h >>> 13
      return ((h >>> 0) % 100000) / 100000
    }

    // ---- 方框尺寸与运动边界常量（与下方容器 style 保持一致）----
    const BOX = 280        // 方框边长（px），与容器 width/height 对应
    const HALF = BOX / 2   // 半边长
    const SAFE = 4         // 安全边距：吸收容器缩放、旋转与字重带来的溢出
    // 单轴最大行程：直接取方框边长，等于「不限幅」——词的行程只受自身允许区间约束，
    // 大词因占地方而移动范围小、小词几乎能跑遍全框，这本身就是合理的层次感。
    const MAX_SWEEP = BOX
    const PAD = 1.05       // 尺寸估算补偿：measure 是近似值，留 5% 余量防贴边裁切

    // 估算词的渲染尺寸：中文占满字宽（1.0），西文约 0.55；行高按 1.25em
    // 再乘最大缩放 1.07 与 PAD 补偿，保证任何时刻都不触碰框边
    const measure = (word, fontSize) => {
      let units = 0
      for (const ch of word) units += ch.charCodeAt(0) > 0x2e80 ? 1 : 0.55
      return {
        hw: (units * fontSize * PAD * 1.07) / 2,
        hh: (fontSize * 1.25 * PAD * 1.07) / 2,
      }
    }

    return top.map((t, i) => {
      const ratio = max === min ? 0.5 : (t.count - min) / (max - min)
      const size = 13 + ratio * 19                 // 13 ~ 32px：越热越大
      const weight = 600 + Math.round(ratio * 300) // 600 ~ 900
      const angle = i * GOLDEN
      // 静止排布：把圆螺旋按「方形边界因子 k」拉伸为方螺旋，让词铺满整个方框（含四角），
      // 而不是只占中间那块圆。k = 1 / max(|cos|, |sin|)，取值 1 ~ √2，
      // 使得同一序号的词在 45° 方向被推到角上，整体轮廓是方形而非圆形。
      const k = 1 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)), 1e-6)
      // 取 35（原 32）：让锚点更靠外圈铺开，配合不限幅的行程，整体覆盖面更大
      const R = i === 0 ? 0 : Math.sqrt(i / COUNT) * 35 // 方螺旋半边长（百分比）
      const x = 50 + Math.cos(angle) * R * k
      const y = 50 + Math.sin(angle) * R * k
      const opacity = 0.62 + ratio * 0.38          // 越热越实，小词半透明叠出层次
      const z = 100 - i                            // 大词在上层
      const rot = ((i * 47) % 13) - 6             // 确定性轻微旋转，增强手绘层叠感

      // ---- 活动范围：整个方框，而不是锚点附近的小圆 ----
      // 允许区间 = 方框内缩「半个词宽/高 + 安全边距」，因此词的任何时刻都完整落在框内，
      // 外围的词也能顺着剩余空间（含四角）游走。
      const { hw, hh } = measure(t.word, size)
      const ax = (x / 100 - 0.5) * BOX             // 锚点坐标（方框中心为原点，px）
      const ay = (y / 100 - 0.5) * BOX
      const minX = -HALF + hw + SAFE
      const maxX = HALF - hw - SAFE
      const minY = -HALF + hh + SAFE
      const maxY = HALF - hh - SAFE
      const inX = minX <= maxX                     // 词比框还宽时退化为中心对齐
      const inY = minY <= maxY
      // 锚点本身也要收进允许区间，保证「静止态」同样不出框
      const cx = inX ? Math.min(maxX, Math.max(minX, ax)) : 0
      const cy = inY ? Math.min(maxY, Math.max(minY, ay)) : 0
      // ---- 目标点：取「与锚点相对的远端」，而不是区间内纯随机 ----
      // 纯随机会出现目标点恰好挨着锚点的情况（中心大词 Flutter 只走了 23px）。
      // 取对侧远端可让每个词的行程都接近其允许区间的宽度 → 活动范围最大化。
      // 锚点在左则目标偏右，反之偏左；0.35 的带宽保留随机性，不至于全部整齐对穿。
      const far = (ra, seed) => (ra < 0.5 ? 0.65 + rnd(seed) * 0.35 : rnd(seed) * 0.35)
      const raX = inX && maxX > minX ? (cx - minX) / (maxX - minX) : 0.5
      const raY = inY && maxY > minY ? (cy - minY) / (maxY - minY) : 0.5
      const tx = inX ? minX + far(raX, i * 13 + 1) * (maxX - minX) : 0
      const ty = inY ? minY + far(raY, i * 13 + 2) * (maxY - minY) : 0
      // 行程限幅：MAX_SWEEP 已等于方框边长，实际只受允许区间约束（等价于不限幅）
      const dx = Math.max(-MAX_SWEEP, Math.min(MAX_SWEEP, tx - cx))
      const dy = Math.max(-MAX_SWEEP, Math.min(MAX_SWEEP, ty - cy))
      // 起止旋转角：在基础 rot 上下各摆动约 2.5 度
      const r0 = rot - 2.5
      const r1 = rot + 2.5
      // 起止缩放：0.97~1.07 之间起伏，景深更克制，避免大词"放大"后超出容器
      const s0 = 0.97 + rnd(i * 5 + 1) * 0.05
      const s1 = 1.02 + rnd(i * 5 + 2) * 0.05
      // 层次换位：自身层位上下浮动 8 层，仅做轻微穿插
      const z0 = z
      const z1 = Math.max(1, z + (i % 2 ? -8 : 8))
      // 远景虚化：只给 1/4 的词加极小模糊（仅 50% 时刻有 blur，0% 完全清晰）
      const useBlur = i % 4 === 0
      const b1 = useBlur ? 0.3 : 0
      // 周期：与行程联动 —— 跑得越远的词周期越长。
      // 衡量快慢的是 px/s 而非周期本身：行程本轮从 67px 放大到 110px+，
      // 若周期不变，速度会从 19px/s 反升至 21px/s（越改越快）。
      // 用 dur = 11 + 行程×0.075 + 小扰动，让平均速度落在 ~11px/s：
      // 比 5~9s 那版的 19px/s 慢约 40%，又比 9~17s 那版的 10px/s 略快。
      // 负延迟让每个词一开始就处在运动的中途，整体不同步。
      const dist = Math.hypot(dx, dy)
      const dur = 11 + dist * 0.075 + rnd(i * 7 + 1) * 3
      const delay = -rnd(i * 11 + 1) * dur

      return {
        word: t.word, count: t.count, x, y, size, weight, opacity, rot,
        style: {
          // 用收进方框后的锚点 cx/cy 定位（原点在中心，转回百分比）
          left: `${((cx / BOX + 0.5) * 100).toFixed(2)}%`,
          top: `${((cy / BOX + 0.5) * 100).toFixed(2)}%`,
          fontSize: `${size}px`,
          fontWeight: weight,
          // 回退值：系统开启「减少动态效果」或动画暂停时，仍保持定位与基础样式
          transform: `translate(-50%, -50%) rotate(${rot}deg)`,
          opacity,
          zIndex: z,
          // 供 @keyframes wc-float 读取的运动参数
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
        },
      }
    })
  }, [tags])

  if (!items.length) return null
  const COLORS = ['text-primary', 'text-sky-600', 'text-indigo-600', 'text-blue-600', 'text-cyan-600']

  return (
    <div className="card p-5">
      {/* 标题「热门标签云」已按需求移除，卡片内只保留词云本体 */}
      {/* 方框容器：边长与上面常量 BOX(280) 必须一致，改这里记得同步改 BOX。
          maxWidth 100% 保证窄屏不撑破右栏，SAFE 边距已吸收几像素的缩放误差 */}
      <div
        className="relative mx-auto overflow-hidden"
        style={{ width: 280, height: 280, maxWidth: '100%' }}
      >
        {items.map((t, i) => (
          <Link
            key={t.word}
            to={`/?q=${encodeURIComponent(t.word)}`}
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
      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center text-xl font-bold shadow-soft">
        行
      </div>
      <div className="mt-3 text-base font-semibold text-ink-900">行云流水（Abert）</div>
      <div className="text-xs text-ink-400 mt-1">全栈开发工程师 / 付费开发者</div>
      <p className="text-sm text-ink-600 mt-3 leading-6">
        热爱探究底层技术，目前深耕 Rust 系统编程、Flutter 跨端和鸿蒙 Next 应用生态架构。
      </p>
      <div className="mt-4 flex items-center justify-center gap-3 text-ink-400">
        {['GitHub', 'X', '✉', '📡'].map((s) => (
          <a key={s} href="#" className="w-8 h-8 rounded-md border border-ink-200/80 hover:border-primary hover:text-primary flex items-center justify-center text-sm transition" title={s}>
            {s}
          </a>
        ))}
      </div>
    </div>
  )
}

// ---------- 右栏：文章分类（计数） ----------
// 全部按后端 sort 升序展示（「其他」由 sortCategories 固定排在末尾），
// 不再用前端硬编码名单过滤 —— 后台新增 Kotlin 后，这里会自动出现该分类。
// 0 篇的分类同样显示（「其他」常态就是 0 篇），否则新分类没文章时入口会「消失」。
function CategoryRanking({ cats }) {
  const visible = sortCategories(cats)
  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-ink-900 mb-3">文章分类</h3>
      <ul className="space-y-2.5">
        {visible.length === 0 && <li className="text-sm text-ink-400">暂无数据</li>}
        {visible.map((c) => {
          const s = categoryStyle(c.name)
          return (
            <li key={c.id}>
              <Link to={categoryPath(c)} className="flex items-center justify-between text-sm hover:text-primary transition">
                <span className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  <span className="text-ink-800">{c.name}</span>
                </span>
                <span className="text-ink-400 font-medium">{c.count}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------- 右栏：热门文章排行 ----------
function HotRanking({ list }) {
  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-ink-900 mb-3">热门文章排行</h3>
      <ol className="space-y-2.5">
        {(list || []).slice(0, 20).map((a, i) => (
          <li key={a.id} className="flex items-start gap-2.5 text-sm">
            <span className={`shrink-0 w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${
              i === 0 ? 'bg-primary text-white' : 'bg-canvas text-ink-400'
            }`}>{String(i + 1).padStart(2, '0')}</span>
            <Link to={`/article/${a.id}`} className="text-ink-800 hover:text-primary line-clamp-2 leading-6">
              {a.title}
            </Link>
          </li>
        ))}
        {(!list || list.length === 0) && <li className="text-sm text-ink-400">暂无热门文章</li>}
      </ol>
    </div>
  )
}

// ---------- Home 主页 ----------
export default function Home() {
  const [params] = useSearchParams()
  const cat = params.get('cat')
  const q = params.get('q')
  const [articles, setArticles] = useState([])
  // 共享分类缓存：与导航、分类列表页同一份数据，后台新增分类后三处同步出现
  const cats = useCategories()
  const [hot, setHot] = useState([])
  const [tags, setTags] = useState([])

  useEffect(() => {
    hotArticles({ limit: 20 }).then((r) => setHot(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const p = { page: 1, page_size: 50 }
    if (cat) {
      const c = (cats || []).find((x) => x.name === cat)
      if (c) p.category_id = c.id
    }
    listArticles(p).then((r) => {
      let list = r.data?.list || []
      if (q) {
        const k = q.toLowerCase()
        list = list.filter((a) =>
          (a.title || '').toLowerCase().includes(k) ||
          (a.summary || '').toLowerCase().includes(k)
        )
      }
      setArticles(list)
    }).catch(() => setArticles([]))
  }, [cat, q, cats])

  // 词云数据：优先用后端 /tags 聚合（覆盖全部文章，不受分页限制）；失败则回退前端聚合
  useEffect(() => {
    let alive = true
    listTags()
      .then((r) => {
        if (!alive) return
        const data = (r.data || []).filter((t) => t.word)
        if (data.length >= 3) {
          setTags(data.slice(0, 20))
        } else {
          setTags(fallbackTags(articles, cats))
        }
      })
      .catch(() => alive && setTags(fallbackTags(articles, cats)))
    return () => { alive = false }
  }, [articles, cats])

  // 分类文章数：优先用后端 /categories 返回的 article_count（SQL 聚合，覆盖全部已发布文章）。
  // 旧实现是拿当前页文章列表 filter 计数 —— 列表最多 50 条、且首页按分类筛选时会只剩该分类，
  // 数量会严重偏小（Flutter 实际 132 篇只显示 50，切分类后其它分类甚至显示 0）。
  // 后端未返回该字段时（老版本服务端）才回退本地统计，作为兜底。
  const catCounts = useMemo(() => {
    return cats.map((c) => ({
      ...c,
      count: typeof c.article_count === 'number'
        ? c.article_count
        : articles.filter((a) => a.category_id === c.id).length,
    }))
  }, [cats, articles])

  // 首页「最新发表」只展示前 10 篇，避免页面过长；更多通过「显示更多」跳转到列表页
  const rest = articles.slice(0, 10)
  // 轮播图：从全部 banner 中随机抽 MAX_SLIDES 张
  // 用 useState 初始化器 —— 组件每次挂载（刷新页面、从文章详情等进入首页）都会重新抽取，
  // 因此每次进入 blog 都是一组新的随机 banner；组件内重渲染不会重抽，避免浏览时跳动
  const [banners] = useState(() => buildSlides())

  return (
    <div className="container-page py-8 space-y-10">
      {/* 顶部轮播图：5 张 banner 分类入口 */}
      <Carousel slides={banners} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SectionHeader
            title="最新发表"
            sub="Latest Posts"
            action={(
              <div className="flex items-center gap-3">
                <Link
                  to={cat ? categoryPath(cat) : '/articles'}
                  className="text-sm text-primary hover:underline"
                >
                  显示更多 →
                </Link>
                {cat && (
                  <Link to="/" className="text-sm text-ink-400 hover:text-primary">清除筛选 ×</Link>
                )}
              </div>
            )}
          />
          {rest.length === 0 && (
            <div className="card p-8 text-center text-ink-400 text-sm">
              暂无文章。用管理员账号 <code className="px-1.5 py-0.5 rounded bg-canvas text-primary">13123456789</code> 登录后台新建第一篇吧。
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rest.map((a) => <ArticleCard key={a.id} a={a} />)}
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
