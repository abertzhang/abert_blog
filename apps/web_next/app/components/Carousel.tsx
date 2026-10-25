'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { categoryStyle } from '../lib/categoryColor'

export interface Slide {
  image?: string
  /** 框架阶段用 CSS 渐变作占位（无需真实图片）；有 image 时优先用 image */
  gradient?: string
  category: string
  href?: string
}

// 通用轮播图：自动播放 + 悬停暂停 + 左右切换 + 圆点指示
// 图片懒渲染：只挂载当前及前后各一张
export default function Carousel({ slides = [], interval = 5000 }: { slides?: Slide[]; interval?: number }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = slides.length

  useEffect(() => {
    if (n <= 1 || paused) return
    const t = setInterval(() => setIdx((x) => (x + 1) % n), interval)
    return () => clearInterval(t)
  }, [n, paused, interval])

  useEffect(() => {
    setIdx(0)
  }, [n])

  if (!n) return null

  const go = (d: number) => setIdx((x) => (x + d + n) % n)

  const shouldRender = (i: number) => {
    if (n <= 3) return true
    const d = Math.abs(i - idx)
    return d <= 1 || d >= n - 1
  }

  return (
    <section
      className="group relative h-[320px] w-full overflow-hidden rounded-2xl bg-ink-900 shadow-card md:h-[420px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => {
        const show = shouldRender(i)
        const cls = `absolute inset-0 block transition-opacity duration-700 ${
          i === idx ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`
        const content = show ? (
          s.image ? (
            <img
              src={s.image}
              alt={s.category || `banner ${i + 1}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 h-full w-full" style={{ background: s.gradient }} />
          )
        ) : null

        return s.href ? (
          <Link key={i} href={s.href} className={cls} aria-label={s.category}>
            {content}
          </Link>
        ) : (
          <div key={i} className={cls} aria-label={s.category}>
            {content}
          </div>
        )
      })}

      {n > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="上一张"
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-xl text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/55"
          >
            ‹
          </button>
          <button
            onClick={() => go(1)}
            aria-label="下一张"
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-xl text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/55"
          >
            ›
          </button>
        </>
      )}

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
                      : `w-1.5 opacity-60 hover:bg-white/80 ${sColor.dot}`
                  }`}
                />
              )
            })
          ) : (
            <span className="rounded-full bg-black/30 px-2.5 py-1 text-xs text-white/80 backdrop-blur">
              {idx + 1} / {n}
            </span>
          )}
        </div>
      )}
    </section>
  )
}
