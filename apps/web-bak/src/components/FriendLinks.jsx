// 右侧栏友情链接：纵向无缝滚动列表，鼠标悬停暂停
import { useEffect, useState } from 'react'
import { listFriendLinks } from '../api/blog'
import { friendLinks as fallback } from '../data/friendLinks'

// 单个条目的实测高度：py-2(8+8) + 单行文本行高(24) + 上下边框(2) = 42px
const ITEM_H = 42
// 条目间距：ul 上的 space-y-2 = 8px
const GAP = 8
// 期望的滚动框高度（392 ≈ 完整显示 8 条：8×42 + 7×8 = 392）
// 注意：高度增大不会让滚动变慢 —— 动画平移的是整段列表（速度恒为 SPEED px/s），
// 与可视高度无关；且列表是复制两份的，平移一轮后画面完全对齐，任何高度都不会跳帧。
const DEFAULT_HEIGHT = 392
// 滚动速度（px/s）：与原实现保持一致（原为 20s 走完 446px ≈ 22px/s）
// 用「速度」而非「固定周期」定义，友链增减时观感才稳定
const SPEED = 22

export default function FriendLinks({ height = DEFAULT_HEIGHT }) {
  const [links, setLinks] = useState(fallback)
  useEffect(() => {
    listFriendLinks()
      .then((r) => {
        const d = r.data || []
        if (d.length) setLinks(d)
      })
      .catch(() => {})
  }, [])
  if (!links.length) return null
  // 复制一份用于无缝循环（动画平移 -50% 正好衔接）
  const loop = [...links, ...links]
  // 一轮循环的内容高度（即动画平移的距离）：n 个条目 + (n-1) 个间距
  const loopHeight = links.length * ITEM_H + (links.length - 1) * GAP
  // 容器高度取「期望高度」与「一轮内容高度」的较小值：
  // 友链被删减时自动收缩，避免滚动到一半露出空白（内容不够填满容器）
  const boxHeight = Math.min(height, Math.max(loopHeight, ITEM_H))
  // 周期按内容高度换算，保证速度恒定；下限 12s 防止条目极少时转得太快
  const duration = Math.max(12, Math.round(loopHeight / SPEED))
  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-ink-900 mb-3">友情链接</h3>
      <div className="group relative overflow-hidden" style={{ height: boxHeight }}>
        <style>{`@keyframes friend-scroll{from{transform:translateY(0)}to{transform:translateY(-50%)}}`}</style>
        <ul
          className="space-y-2 animate-[friend-scroll_20s_linear_infinite] group-hover:[animation-play-state:paused]"
          style={{ animationDuration: `${duration}s` }}
        >
          {loop.map((l, i) => (
            <li key={i}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-ink-200/60 hover:border-primary hover:bg-primary/5 transition"
              >
                <span className="font-medium text-ink-800 truncate">{l.name}</span>
                <span className="text-xs text-ink-400 truncate max-w-[90px] text-right">{l.desc}</span>
              </a>
            </li>
          ))}
        </ul>
        {/* 上下渐隐遮罩，强化滚动观感 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-white to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white to-transparent" />
      </div>
    </div>
  )
}
