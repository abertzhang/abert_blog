---
title: MySql（css_advanced）
create:2026-10-04
update:2026-10-07
category:other
cover:https://img-common.aknot.uk/cover/land-60.jpg
tags:[database]
summary:
keywords:[css,stylesheet,layout,flexbox,grid,animation,responsive,selector]
top:1
copyright:true
---

# CSS 进阶

> 面向已掌握基础、希望写出"现代、可维护、高性能"样式的开发者。侧重原理深度与实战模式，而非罗列 API。

---

## 目录

1. [层叠与优先级精解](#1-层叠与优先级精解)
2. [现代选择器：:is / :where / :has / :not](#2-现代选择器is--where--has--not)
3. [原生嵌套 Nesting](#3-原生嵌套-nesting)
4. [自定义属性与 @property](#4-自定义属性与-property)
5. [Flexbox 深度](#5-flexbox-深度)
6. [Grid 深度](#6-grid-深度)
7. [响应式：从媒体查询到容器查询](#7-响应式从媒体查询到容器查询)
8. [过渡与动画](#8-过渡与动画)
9. [现代颜色系统](#9-现代颜色系统)
10. [性能优化](#10-性能优化)
11. [可访问性与用户偏好](#11-可访问性与用户偏好)
12. [架构与工程化](#12-架构与工程化)
13. [实战模式库](#13-实战模式库)

---

## 1. 层叠与优先级精解

### 1.1 优先级（Specificity）计算

按 `(内联, ID, 类/属性/伪类, 元素/伪元素)` 四元组比较，逐位加权：

```
(0, 0, 0, 0)
 │  │  │  └─ 元素选择器、伪元素 ::before   → 1 分/个
 │  │  └──── 类、属性 [type]、伪类 :hover   → 10 分/个
 │  └─────── ID 选择器 #header              → 100 分/个
 └────────── 内联 style=""                  → 1000 分
```

比较时**从高位到低位**，一旦分出大小即停止。例：

```css
#nav .item a:hover   /* (0,1,2,1) */
.nav a              /* (0,0,1,1) */
a                   /* (0,0,0,1) */
```

`:is()`、`:where()`、`:not()` 的权重较特殊：
- `:where()` **权重永远为 0**，适合做"可被轻易覆盖"的 reset。
- `:is()`、`not()` 的权重取**其内部选择器中最高的那个**。

```css
:where(a, b, c) { color: red; }     /* 权重 0，随便覆盖 */
:is(#nav, .list) li { color: blue; } /* 权重按 #nav 算 = (0,1,0,1) */
```

### 1.2 `@layer`：显式控制层叠顺序

`@layer` 让你**按声明顺序**决定优先级，而非选择器权重——低层永远输给高层，无论权重多高。

```css
@layer reset, components, utilities;  /* 声明顺序即优先级：utilities > components > reset */

@layer reset {
  * { margin: 0; box-sizing: border-box; }  /* 即使权重低，也在最底层 */
}
@layer components {
  .btn { /* ... */ }
}
@layer utilities {
  .mt-4 { margin-top: 1rem; }       /* 最高优先级，设计上"工具类压制一切" */
}
```

用途：把第三方样式、reset、业务样式分层，避免 `!important` 军备竞赛。

### 1.3 `!important` 的处理

`!important` 会反转单条声明的优先级，是维护噩梦的来源。原则：
- 仅在覆盖**第三方/用户代理**样式、或无障碍兜底时谨慎使用。
- 用 `@layer` 或提高选择器权重替代它。

---

## 2. 现代选择器：`:is` / `:where` / `:has` / `:not`

### 2.1 `:has()` —— 父选择器（"匹配包含某子元素的元素"）

2023 年全面落地，被称为"十年来最重要选择器"。它让 CSS **首次能向上选择祖先**。

```css
/* 表单里只要有一个必填项为空，就给整个表单标红边框 */
form:has(input:invalid) { border-color: red; }

/* 卡片内含图片时，采用不同布局 */
.card:has(img) { grid-template-columns: 120px 1fr; }

/* 选中"后面跟着标题的段落" */
p:has(+ h2) { margin-bottom: 4px; }
```

`:has()` 还可配合逻辑组合做复杂匹配：`article:has(h2, h3):not(:has(img))`。

### 2.2 `:is()` 与 `:where()`

```css
/* 传统写法：重复冗长 */
h1 a, h2 a, h3 a { color: inherit; }

/* :is 等价，且权重取内部最高 */
:is(h1, h2, h3) a { color: inherit; }

/* :where 等价，但权重为 0（便于覆写） */
:where(h1, h2, h3) a { color: inherit; }
```

### 2.3 `:not()` 进阶

```css
/* 排除最后一项 */
li:not(:last-child) { border-bottom: 1px solid #eee; }

/* 多条件排除 */
button:not(:disabled):not(.loading) { cursor: pointer; }
```

---

## 3. 原生嵌套 Nesting

CSS 现在原生支持嵌套（无需 Sass），减少重复选择器：

```css
.card {
  border: 1px solid #ddd;
  padding: 16px;

  .title {            /* 直接嵌套 */
    font-weight: 700;

    &:hover { color: #3498db; }   /* & 指代父选择器 .card .title */
  }

  @media (min-width: 768px) {
    padding: 24px;     /* 嵌套媒体查询 */
  }
}
```

> 注意：原生嵌套对 `&` 的解析比 Sass 严格，混合逗号列表与嵌套时偶有歧义。复杂项目仍可用 Sass/Dart-Sass 预处理。

---

## 4. 自定义属性与 `@property`

### 4.1 自定义属性（CSS 变量）

```css
:root {
  --color-primary: #3498db;
  --space: 8px;
  --radius: 6px;
}
.btn {
  background: var(--color-primary);
  padding: calc(var(--space) * 2);   /* 可用 calc 运算 */
  border-radius: var(--radius, 4px); /* 第二参为兜底值 */
}
```

变量**区分大小写**，且默认**继承**给所有后代。

### 4.2 `@property`：给变量加类型与过渡

普通 `--x` 不能做过渡动画（被视为字符串）。`@property` 注册后，变量变成"有类型的属性"，可动画化：

```css
@property --progress {
  syntax: "<number>";     /* <length> | <color> | <percentage> | <angle> 等 */
  inherits: false;
  initial-value: 0;
}

.bar {
  --progress: 0;
  width: calc(var(--progress) * 100%);
  transition: --progress 1s ease;
}
.bar:hover { --progress: 1; }   /* 现在可以平滑过渡了 */
```

> 这是实现"纯 CSS 进度条 / 渐变角度动画 / 颜色插值"的关键技术。

---

## 5. Flexbox 深度

### 5.1 双轴模型

Flex 只有**主轴（main axis）**与**交叉轴（cross axis）**，方向由 `flex-direction` 决定。

```css
.container {
  display: flex;
  flex-direction: row;        /* 主轴=水平；column 时主轴=垂直 */
  justify-content: space-between; /* 主轴对齐 */
  align-items: center;        /* 交叉轴对齐 */
  flex-wrap: wrap;            /* 允许换行 */
  gap: 16px;                 /* 子项间距（取代 margin hack） */
}
```

### 5.2 `flex` 简写的真正含义

```css
/* flex: grow shrink basis */
.item { flex: 1 1 0; }   /* 等分剩余空间 */
.item { flex: 0 0 auto; }/* 不伸缩，按内容/宽 */
.item { flex: 2; }       /* = 2 1 0，占两倍空间 */
```

### 5.3 经典坑：`min-width: auto`

Flex 子项默认的 `min-width` 是 `auto`（内容最小尺寸），导致**长文本撑破布局、无法收缩换行**。

```css
.flex-item { min-width: 0; }   /* 关键！允许子项收缩到小于内容宽度 */
```

这是"flex 里文字溢出 / 不换行"的几乎唯一根因。

### 5.4 实用模式

```css
/* 垂直水平居中（一行解决） */
.center { display: flex; align-items: center; justify-content: center; }

/* 一端固定、一端撑满 */
.row { display: flex; }
.row > .fixed { flex: 0 0 120px; }
.row > .grow  { flex: 1; min-width: 0; }

/* 自动 margin 推到最右 */
.spacer { margin-left: auto; }

/* 等高卡片 */
.cards { display: flex; align-items: stretch; }  /* 默认 stretch */
```

---

## 6. Grid 深度

### 6.1 轨道与 fr 单位

```css
.grid {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;  /* 固定 + 两个等分的弹性列 */
  grid-template-rows: auto 1fr;
  gap: 20px;
}
```

`fr`（fraction）表示"剩余空间的份额"，会自动扣除固定轨道与 gap 后再分配。

### 6.2 `repeat()` 与 `minmax()` + 自适应

```css
/* 自动填充：容器能放几列就放几列，每列至少 200px、最多 1fr */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
```

这是**响应式卡片列表**最优雅的写法——无需任何媒体查询。

### 6.3 命名区域（可读性最佳）

```css
.layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
}
.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main   { grid-area: main; }
.footer { grid-area: footer; }
```

### 6.4 命名线与 `subgrid`

```css
.grid { grid-template-columns: [start] 1fr [mid] 1fr [end]; }
.item { grid-column: start / mid; }   /* 用线名定位 */

/* subgrid：子网格继承父网格的轨道，解决嵌套对齐难题 */
.card { display: grid; grid-template-rows: subgrid; grid-row: span 3; }
```

> `subgrid`（2023 起支持）让卡片内部标题/图片/footer 与外层多列严格对齐，是复杂仪表盘利器。

### 6.5 速记

```css
.card {
  place-items: center;        /* align-items + justify-items 合一 */
  place-content: center;      /* align-content + justify-content 合一 */
}
```

---

## 7. 响应式：从媒体查询到容器查询

### 7.1 媒体查询（视口级）

```css
/* 移动优先：默认小屏样式，再用 min-width 逐步增强 */
@media (min-width: 768px) { /* 平板 */ }
@media (min-width: 1024px) { /* 桌面 */ }
@media (max-width: 480px) { /* 仅小屏 */ }

/* 结合特性 */
@media (min-width: 768px) and (prefers-reduced-motion: no-preference) { }
```

### 7.2 视口单位陷阱与 `dvh`/`svh`/`lvh`

老 `vh` 在移动端包含地址栏高度，导致布局跳动。新单位：

```css
.hero { height: 100svh; }    /* small viewport：地址栏展开时的最小高度 */
.modal { height: 100dvh; }   /* dynamic viewport：随地址栏实时变化 */
```

### 7.3 容器查询（Container Queries）—— 组件级响应式

媒体查询看的是**视口**，但组件常需根据"自己容器的宽度"调整。容器查询解决此问题：

```css
.card-wrapper {
  container-type: inline-size;   /* 声明为查询容器 */
  container-name: card;
}
.card {
  /* 容器宽度 < 400px 时改变内部布局 */
  @container card (max-width: 400px) {
    flex-direction: column;
  }
}
```

> 这是 2023 年最重要的响应式革新：组件可独立适配，不再依赖页面断点，对设计系统/组件库价值巨大。

### 7.4 流式排版 `clamp()`

```css
h1 {
  /* 最小值 24px，理想值 5vw，最大值 48px，随视口平滑缩放 */
  font-size: clamp(24px, 5vw, 48px);
}
```

`clamp(min, preferred, max)` 替代大量媒体查询断点。

---

## 8. 过渡与动画

### 8.1 `transition` 逐项拆解

```css
.btn {
  transition-property: background, transform;
  transition-duration: 0.2s;
  transition-timing-function: ease;   /* 或 cubic-bezier(.4,0,.2,1) */
  transition-delay: 0s;
  /* 简写：property duration timing delay */
  transition: background 0.2s ease, transform 0.2s ease;
}
.btn:hover { background: #2980b9; transform: translateY(-2px); }
```

### 8.2 `@keyframes` 与 `animation`

```css
@keyframes spin { to { transform: rotate(360deg); } }

.loader {
  animation-name: spin;
  animation-duration: 1s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  /* 简写 */
  animation: spin 1s linear infinite;
}
```

### 8.3 性能：只动 `transform` 与 `opacity`

浏览器渲染分三步：**重排（Layout）→ 重绘（Paint）→ 合成（Composite）**。

- 改 `width`/`top`/`margin` → 触发重排，最贵。
- 改 `color`/`background` → 触发重绘。
- 改 `transform`/`opacity` → 仅合成，**走 GPU，最流畅**。

```css
/* ✅ 好：用 transform 做位移 */
.slide { transform: translateX(100px); }

/* ❌ 差：用 left 触发重排 */
.slide { left: 100px; }
```

### 8.4 缓动曲线 `cubic-bezier`

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);  /* 强减速，常用作"入场" */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

### 8.5 尊重用户偏好

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. 现代颜色系统

### 9.1 为什么用 `oklch` / `lab`

`srgb`/`hsl` 的"感知均匀性"差——同样数值跨度，某些色段变化剧烈、某些几乎看不出。`oklch`（OKLab 的极坐标）在**感知上均匀**，便于程序化生成调色板。

```css
:root {
  --brand: oklch(70% 0.15 250);   /* 亮度 饱和度 色相 */
  --brand-light: oklch(85% 0.15 250);
  --brand-dark: oklch(55% 0.15 250);
}
```

只需改亮度通道，就能得到视觉一致的深浅变体。

### 9.2 `color-mix()` 混合颜色

```css
.btn {
  background: color-mix(in oklab, var(--brand) 80%, white);
  border-color: color-mix(in oklab, var(--brand) 60%, black);
}
```

无需预定义每个状态色，运行时按主色动态派生。

### 9.3 相对颜色语法

```css
/* 取某颜色，只改其中通道 */
--hover: hsl(from var(--brand) h s calc(l - 10%));
```

---

## 10. 性能优化

### 10.1 渲染层与 `will-change`

```css
.animate { will-change: transform; }  /* 提前提升为合成层 */
```

⚠️ `will-change` 是**提示而非开关**：滥用会占用大量 GPU 内存，反而拖慢。用后即移除（或在动画元素上加、静态元素上去掉）。

### 10.2 `content-visibility: auto`

```css
.section { content-visibility: auto; contain-intrinsic-size: 500px; }
```

跳过屏外元素的渲染与布局，极大提升长列表首屏性能（类似虚拟滚动的 CSS 版）。

### 10.3 `contain` 隔离

```css
.widget { contain: layout paint; }  /* 限制重排/重绘范围，不波及其他 */
```

### 10.4 选择器性能

- 避免 `*` 与深层后代（如 `div ul li a span`）。
- 优先类选择器；少用标签后缀链。
- 现代浏览器已高度优化，重点仍是**减少不必要重排**（见 8.3）。

### 10.5 图片与背景

- 用 `image-set()` 提供 1x/2x；现代格式 `avif`/`webp`。
- 大背景图加 `background-attachment: fixed` 在移动端极卡，慎用。

---

## 11. 可访问性与用户偏好

### 11.1 深色模式

```css
:root { color-scheme: light dark; }   /* 让原生控件跟随系统 */

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --text: #eee;
  }
}
```

### 11.2 焦点可见性

```css
:focus-visible { outline: 2px solid #3498db; outline-offset: 2px; }
/* 仅键盘导航时显示焦点环，鼠标点击不显示，体验最佳 */
```

### 11.3 对比度与 `forced-colors`

```css
@media (forced-colors: active) {
  .btn { border: 1px solid ButtonText; }  /* 适配高对比度/Windows 模式 */
}
```

### 11.4 减少动效（见 8.5）

尊重 `prefers-reduced-motion` 是所有动画的必选项。

---

## 12. 架构与工程化

### 12.1 命名方法

- **BEM**：`block__element--modifier`，结构清晰、零依赖，但类名长。
- **ITCSS / SMACSS**：按"设置→工具→泛型→元素→对象→组件→主题"分层，配合 `@layer` 天然契合。

### 12.2 设计 Token 驱动

```css
:root {
  --color-brand: oklch(70% 0.15 250);
  --space-1: 4px; --space-2: 8px; --space-3: 16px;
  --radius-sm: 4px; --radius-md: 8px;
  --font-body: system-ui, sans-serif;
}
/* 组件只引用 token，换肤/换主题只需改 :root */
```

### 12.3 CSS Modules / 构建

框架（React/Vue 等）中常用 CSS Modules 实现**样式作用域隔离**，类名自动哈希：

```css
/* Button.module.css */
.primary { background: var(--color-brand); }
```

构建期被编译为 `.Button_primary__x8f2a`，避免全局污染。

### 12.4 `@scope`（新兴作用域）

原生 CSS 也在跟进组件化隔离：

```css
@scope (.card) {
  /* 仅作用于 .card 内部，且不逃逸到外部同名元素 */
  img { border-radius: 8px; }
}
```

---

## 13. 实战模式库

### 13.1 毛玻璃 / 玻璃拟态

```css
.glass {
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px);  /* Safari 前缀仍建议 */
  border: 1px solid rgba(255,255,255,0.2);
}
```

### 13.2 Tooltip（纯 CSS）

```css
.tip { position: relative; }
.tip::after {
  content: attr(data-tip);     /* 读 data 属性，无需额外 DOM */
  position: absolute; bottom: 100%; left: 50%;
  transform: translateX(-50%);
  opacity: 0; transition: opacity .2s;
  pointer-events: none;
}
.tip:hover::after { opacity: 1; }
```

### 13.3 保持宽高比

```css
.video { aspect-ratio: 16 / 9; }   /* 替代 padding-top hack */
```

### 13.4 粘性表头 / 侧栏

```css
thead th { position: sticky; top: 0; background: #fff; z-index: 2; }
.sidebar { position: sticky; top: 16px; align-self: start; }
```

### 13.5 渐变文字

```css
.gradient-text {
  background: linear-gradient(90deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

### 13.6 截断多行文本

```css
.clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;       /* 最多 3 行 */
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

---

## 总结

进阶 CSS 的核心不是"记住更多属性"，而是建立几组心智模型：

1. **层叠**：用 `@layer` 与权重规则取代 `!important`。
2. **布局**：Flex 管一维、Grid 管二维，容器查询管组件级响应式。
3. **变量**：`@property` 让 CSS 变量可动画、可派生。
4. **性能**：只动 `transform`/`opacity`，善用 `content-visibility`/`contain`。
5. **包容**：深色模式、减少动效、焦点可见，是现代产品的底线。

把这些模式内化，你写的 CSS 会从"能跑"变成"优雅、可维护、高性能"。
