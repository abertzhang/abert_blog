import { useEffect, useState } from 'react'
import { listFriendLinks } from '../api/blog'
import type { FriendLink } from '../types/blog'

// 单个条目的实测高度
const ITEM_H = 42
const GAP = 8
const DEFAULT_HEIGHT = 392
const SPEED = 22 // px/s

export default function FriendLinks({ height = DEFAULT_HEIGHT }: { height?: number }) {
  const [links, setLinks] = useState<FriendLink[]>([])
  useEffect(() => {
    listFriendLinks()
      .then((r) => setLinks(r.data || []))
      .catch(() => {})
  }, [])
  if (!links.length) return null

  const loop = [...links, ...links]
  const loopHeight = links.length * ITEM_H + (links.length - 1) * GAP
  const boxHeight = Math.min(height, Math.max(loopHeight, ITEM_H))
  const duration = Math.max(12, Math.round(loopHeight / SPEED))

  return (
    <div className="card p-5">
      <h3 className="mb-3 text-base font-semibold text-ink-900">友情链接</h3>
      <div className="group relative overflow-hidden" style={{ height: boxHeight }}>
        <style>{`@keyframes friend-scroll{from{transform:translateY(0)}to{transform:translateY(-50%)}}`}</style>
        <ul
          className="animate-[friend-scroll_20s_linear_infinite] space-y-2 group-hover:[animation-play-state:paused]"
          style={{ animationDuration: `${duration}s` }}
        >
          {loop.map((l, i) => (
            <li key={i}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-ink-200/60 px-3 py-2 transition hover:border-primary hover:bg-primary/5"
              >
                <span className="truncate font-medium text-ink-800">{l.name}</span>
                <span className="max-w-[90px] truncate text-right text-xs text-ink-400">{l.desc}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-white to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white to-transparent" />
      </div>
    </div>
  )
}
