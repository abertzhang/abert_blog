import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryStyle } from '../lib/categoryColor'

// 通用轮播图：接受 slides（{ image, category, href }）
// 自动播放 + 悬停暂停 + 左右切换 + 圆点指示
// 图片懒渲染：只挂载当前及前后各一张，避免图片多时首屏同时加载全部
export default function Carousel({ slides = [], interval = 5000 }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = slides.length

  useEffect(() => {
    if (n <= 1 || paused) return
    const t = setInterval(() => setIdx((x) => (x + 1) % n), interval)
    return () => clearInterval(t)
  }, [n, paused, interval])

  useEffect(() => { setIdx(0) }, [n])

  if (!n) return null

  const go = (d) => setIdx((x) => (x + d + n) % n)

  const shouldRender = (i) => {
    if (n <= 3) return true
    const d = Math.abs(i - idx)
    return d <= 1 || d >= n - 1 // 当前、前后各一张（含首尾环绕）
  }

  return (
    <section
      className="relative w-full h-[320px] md:h-[420px] rounded-2xl overflow-hidden group shadow-card bg-ink-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => {
        const show = shouldRender(i)
        const cls = `absolute inset-0 block transition-opacity duration-700 ${
          i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`
        const content = show ? (
          <img
            src={s.image}
            alt={s.category || `banner ${i + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null

        return s.href ? (
          <Link key={s.image} to={s.href} className={cls} aria-label={s.category}>
            {content}
          </Link>
        ) : (
          <div key={s.image} className={cls} aria-label={s.category}>
            {content}
          </div>
        )
      })}

      {/* 左右箭头 */}
      {n > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="上一张"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/55 text-white text-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          >
            ‹
          </button>
          <button
            onClick={() => go(1)}
            aria-label="下一张"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/55 text-white text-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          >
            ›
          </button>
        </>
      )}

      {/* 圆点指示 */}
      {n > 1 && (
        <div className="absolute bottom-4 right-6 z-10 flex items-center gap-1.5">
          {slides.length <= 12 ? (
            slides.map((s, i) => {
              const sColor = categoryStyle(s.category)
              return (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`第 ${i + 1} 张：${s.category}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx
                      ? 'w-6 bg-white'
                      : `w-1.5 hover:bg-white/80 ${sColor.dot} opacity-60`
                  }`}
                />
              )
            })
          ) : (
            <span className="text-xs text-white/80 bg-black/30 rounded-full px-2.5 py-1 backdrop-blur">
              {idx + 1} / {n}
            </span>
          )}
        </div>
      )}
    </section>
  )
}
