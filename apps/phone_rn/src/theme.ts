/**
 * 设计令牌（Design Tokens）
 *
 * 与 doc/mobile-ui 下的界面稿 1:1 对齐：
 *   - 浅色、极简、单栏排版
 *   - 主色 accent = #14427f（深蓝），line/surface 为中性灰
 *   - 圆角 6px，正文行高 1.7
 * 所有页面与组件统一从这里取色与间距，避免散落硬编码。
 */

export const Colors = {
  bg: '#ffffff',
  surface: '#f7f7f5',
  text: '#111318',
  muted: '#6f7480',
  line: '#e6e6e3',
  accent: '#14427f',
} as const

export const Typography = {
  // RN 无系统字体栈概念，使用系统默认；这里仅记录设计稿的字号映射。
  hero: 26, // h1
  title: 20, // h2 / 区块标题
  subtitle: 17, // h3
  body: 16, // 正文
  meta: 12, // 元信息 / 标签
  small: 13, // 摘要 / 说明
  code: 13, // 代码
} as const

export const Spacing = {
  screen: 16, // 页面左右内边距（设计稿 .wrap padding:0 16px）
  gap: 12,
  section: 32, // 区块纵向间距
} as const

export const Radius = 6

/** 分类 accent 文本色（设计稿中分类名用 accent 显示） */
export const CategoryColor = Colors.accent
