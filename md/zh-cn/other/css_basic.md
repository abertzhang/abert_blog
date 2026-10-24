---
title: MySql（css_basic）
create:2026-10-04
update:2026-10-07
category:other
cover:https://img-common.aknot.uk/cover/land-14.jpg
tags:[database]
summary:
keywords:[css,stylesheet,selector,box-model,layout,basic]
top:1
copyright:true
---

# CSS 初级教程

> 面向初学者的系统学习笔记。目标：看完能独立写出结构清晰、可维护的基础样式，并理解常见布局。

---

## 目录

1. [什么是 CSS](#1-什么是-css)
2. [CSS 的发展与版本](#2-css-的发展与版本)
3. [如何引入 CSS](#3-如何引入-css)
4. [基本语法](#4-基本语法)
5. [选择器（基础）](#5-选择器基础)
6. [层叠与继承（基础）](#6-层叠与继承基础)
7. [颜色、单位与取值](#7-颜色单位与取值)
8. [文本与字体](#8-文本与字体)
9. [盒模型](#9-盒模型)
10. [背景](#10-背景)
11. [边框、圆角与阴影](#11-边框圆角与阴影)
12. [display 属性](#12-display-属性)
13. [定位 position](#13-定位-position)
14. [浮动 float（了解即可）](#14-浮动-float了解即可)
15. [列表与表格](#15-列表与表格)
16. [基础布局实战](#16-基础布局实战)
17. [调试技巧](#17-调试技巧)
18. [初学者常见坑](#18-初学者常见坑)
19. [综合示例（可直接运行的完整页面）](#19-综合示例可直接运行的完整页面)

---

## 1. 什么是 CSS

**CSS（Cascading Style Sheets，层叠样式表）** 是用来描述 HTML 文档外观和布局的语言。HTML 负责"结构"（有什么内容），CSS 负责"表现"（长什么样、放在哪）。

没有 CSS 的网页只有默认的浏览器样式；加上 CSS 后才能控制颜色、字体、间距、排版和响应式布局。

> 关键词是 **层叠（Cascading）**：当多个规则作用于同一个元素时，CSS 会按一套规则决定"最终用哪一条"——这正是后续"层叠与继承"要讲的内容。

---

## 2. CSS 的发展与版本

- **CSS1（1996）**：基础文本、颜色、字体、盒模型。
- **CSS2 / 2.1（1998 / 2011）**：定位、浮动、z-index、媒体查询雏形。
- **CSS3（2000s 至今）**：不再有单一"版本号"，而是**按模块独立演进**（Selectors、Flexbox、Grid、Transitions、Colors 等各自有版本）。这也是为什么你常看到"Flexbox 是 CSS3 的"这种说法。
- **现代 CSS（2020+）**：原生嵌套、`:has()`、容器查询、`oklch` 颜色、`@layer`、`subgrid` 等持续加入。

实际开发中不需要背版本号，只需关注"浏览器是否已支持某个特性"（可用 [caniuse.com](https://caniuse.com) 查询）。

---

## 3. 如何引入 CSS

有三种方式，优先级从高到低依次是：**行内样式 > 内部样式表 > 外部样式表**（就近原则，但 `!important` 与选择器权重会打破这个直觉，详见进阶篇）。

### 3.1 外部样式表（最推荐）

```html
<head>
  <link rel="stylesheet" href="styles.css">
</head>
```

优点：结构（HTML）与表现（CSS）分离，多个页面可共用一份样式，便于维护。

### 3.2 内部样式表

```html
<head>
  <style>
    body { background: #fff; }
  </style>
</head>
```

适合单页 demo 或临时测试，不建议用于正式项目。

### 3.3 行内样式

```html
<p style="color: red; font-size: 16px;">红色文字</p>
```

优先级最高但最难维护，仅在特定场景（如动态内联样式）使用。

---

## 4. 基本语法

```css
selector {
  property: value;   /* 一条"声明" */
  property: value;
}
```

- **选择器（selector）**：决定"哪些元素被选中"。
- **声明块（declaration block）**：`{ }` 内的一条条 `属性: 值`。
- 每条声明以 **分号 `;`** 结尾（最后一条可省略，但建议统一加）。
- 注释：`/* 这是注释 */`，CSS 没有 `//` 单行注释。

示例：

```css
h1 {
  color: #2c3e50;
  font-size: 28px;
  margin-bottom: 12px;
}
```

---

## 5. 选择器（基础）

| 类型 | 写法 | 作用 |
|---|---|---|
| 元素选择器 | `p` | 选中所有 `<p>` |
| 类选择器 | `.btn` | 选中 `class="btn"` 的元素 |
| ID 选择器 | `#header` | 选中 `id="header"` 的元素（页面应唯一） |
| 通配符 | `*` | 选中所有元素（慎用，性能差） |
| 后代选择器 | `nav a` | 选中 `nav` 内所有 `<a>`（含嵌套） |
| 子选择器 | `ul > li` | 只选中**直接子级** `<li>` |
| 相邻兄弟 | `h1 + p` | 紧跟在 `h1` 后的第一个 `p` |
| 通用兄弟 | `h1 ~ p` | `h1` 之后所有同级 `p` |
| 分组 | `h1, h2, h3` | 多个选择器共用同一组规则 |

**类 vs ID 的建议**：类可复用、权重适中，是日常主力；ID 权重过高、不可复用，样式上尽量别用 ID 选择器。

### 伪类（状态）

```css
a:hover   { color: #e74c3c; }   /* 鼠标悬停 */
a:visited { color: #999; }       /* 已访问 */
input:focus { outline: 2px solid #3498db; } /* 获得焦点 */
li:first-child  { font-weight: bold; }  /* 第一个子元素 */
li:last-child   { color: #888; }
li:nth-child(2) { background: #f5f5f5; } /* 第 2 个 */
li:nth-child(odd)  { background: #fafafa; } /* 奇数行 */
```

### 伪元素（生成内容）

```css
p::before { content: "§ "; }      /* 在元素内容前插入 */
p::after  { content: " ✦"; }      /* 在元素内容后插入 */
::selection { background: yellow; } /* 选中文本高亮 */
```

> 伪类用**单冒号** `:hover`，伪元素用**双冒号** `::before`（旧版 IE 只认单冒号，现代浏览器两者都兼容单冒号写法，但建议区分）。

---

## 6. 层叠与继承（基础）

### 层叠（Cascading）

当多条规则命中同一元素，最终样式由以下顺序决定（从低到高）：

1. 来源与重要性（`!important` 会反转优先级，但尽量少用）
2. **选择器权重（specificity）**
3. 书写顺序（权重相同时，后写的胜出）

### 继承（Inheritance）

某些属性会从父元素**自动继承**给子元素，典型如：`color`、`font-family`、`font-size`、`line-height`、`text-align`。

不继承的属性（如 `margin`、`padding`、`border`、`width`）需显式设置。

强制继承：

```css
.sidebar { font-size: inherit; }  /* 显式继承父级字号 */
```

---

## 7. 颜色、单位与取值

### 颜色写法

```css
color: red;              /* 颜色名 */
color: #ff0000;          /* 十六进制 */
color: #f00;             /* 简写（每两位相同可缩） */
color: rgb(255, 0, 0);   /* RGB */
color: rgba(255,0,0,0.5);/* 带透明度 alpha */
color: hsl(0, 100%, 50%);/* 色相/饱和度/亮度，调色更直观 */
color: hsla(0,100%,50%,0.5);
```

> 进阶篇会介绍 `oklch()`、`color-mix()` 等现代颜色函数。

### 常用单位

| 单位 | 含义 | 说明 |
|---|---|---|
| `px` | 像素 | 绝对单位，最常用 |
| `%` | 百分比 | 相对父元素 |
| `em` | 相对当前元素字体大小 | 1em = 自身 font-size |
| `rem` | 相对根元素（`<html>`）字体大小 | 推荐用于统一缩放 |
| `vw` / `vh` | 视口宽度/高度的 1% | 响应式常用 |
| `vmin` / `vmax` | 视口较小/较大边的 1% | |
| `auto` | 浏览器自动计算 | 常用于居中、撑满 |

**经验**：字号优先用 `rem`，间距可用 `rem`/`px`，全屏尺寸用 `vh`/`vw`。

---

## 8. 文本与字体

```css
body {
  font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  line-height: 1.6;          /* 行高，无单位表示字体倍数，推荐 */
  color: #333;
  text-align: left;          /* left | center | right | justify */
  letter-spacing: 0.02em;    /* 字间距 */
  word-spacing: 0.1em;
}

h1 {
  font-weight: 700;          /* 字重 100~900 或 normal/bold */
  font-style: normal;        /* italic 斜体 */
  text-decoration: none;     /* underline | line-through | none */
  text-transform: uppercase; /* 大小写转换 */
  text-shadow: 1px 1px 2px rgba(0,0,0,0.2); /* 文字阴影 */
}
```

### 字体引入（@font-face）

```css
@font-face {
  font-family: "MyFont";
  src: url("myfont.woff2") format("woff2");
  font-display: swap;        /* 先显示兜底字体，加载完再替换，避免空白 */
}
```

---

## 9. 盒模型

CSS 中**每个元素都是一个矩形盒子**，由内到外：

```
content（内容） → padding（内边距） → border（边框） → margin（外边距）
```

### 关键属性

```css
.box {
  width: 200px;
  height: 100px;
  padding: 20px;          /* 上下左右 */
  padding: 10px 20px;     /* 上下 10，左右 20 */
  border: 2px solid #333;
  margin: 30px;
  box-sizing: border-box; /* 关键！见下 */
}
```

### `box-sizing` 是重点

- `content-box`（默认）：`width` 只算 **content**，`padding`/`border` 会**额外**撑大盒子。
- `border-box`（推荐）：`width` 包含 content + padding + border，布局更可预测。

**项目级最佳实践**：全局重置为 border-box：

```css
*, *::before, *::after {
  box-sizing: border-box;
}
```

> 这是几乎所有现代 CSS 起手式的标准写法。

### 9.1 可视化示例：两种盒模型对比

把下面整段保存为 `box-demo.html` 用浏览器打开，能直观看到同样的 `width:200px` 在两种模式下真实占用的总宽度不同：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>盒模型可视化</title>
<style>
  * { box-sizing: border-box; }      /* 演示用，仅作用于本页 */
  body { font-family: system-ui, sans-serif; padding: 24px; }
  .stage { display: flex; gap: 40px; flex-wrap: wrap; }
  .box {
    width: 200px; height: 100px;
    padding: 20px;                   /* 内边距 20 */
    border: 10px solid #3498db;      /* 边框 10 */
    margin: 15px;                    /* 外边距 15 */
    background: #f1c40f;             /* 背景只铺在 padding 内 */
    color: #333; text-align: center;
  }
  .content-box { box-sizing: content-box; }
  .border-box  { box-sizing: border-box; }
</style>
</head>
<body>
  <div class="stage">
    <div class="box content-box">
      content-box<br>总宽 = 200 + 40(左右padding) + 20(左右border) = <b>260px</b>
    </div>
    <div class="box border-box">
      border-box<br>width 包含 padding/border，<b>总宽固定 200px</b>
    </div>
  </div>
</body>
</html>
```

---

## 10. 背景

```css
.box {
  background-color: #f0f0f0;
  background-image: url("bg.png");
  background-repeat: no-repeat;     /* repeat | repeat-x | repeat-y | no-repeat */
  background-position: center;      /* top left | 50% 50% | 20px 10px */
  background-size: cover;           /* cover 覆盖 | contain 完整 | 具体尺寸 */
  background-attachment: fixed;     /* 背景随滚动固定（慎用，移动端有性能问题） */

  /* 简写（顺序：color image repeat position / size attachment） */
  background: #f0f0f0 url("bg.png") no-repeat center / cover;

  /* 渐变也是 background-image */
  background: linear-gradient(135deg, #667eea, #764ba2);
  background: radial-gradient(circle, #fff, #ddd);
}
```

---

## 11. 边框、圆角与阴影

```css
.card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;          /* 圆角，50% 可做成圆形 */
  border-top: 3px solid #3498db; /* 单边边框 */

  box-shadow: 0 2px 8px rgba(0,0,0,0.1);          /* 外阴影 */
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);     /* 内阴影 */
  box-shadow: 0 2px 4px #aaa, 0 4px 8px #ccc;      /* 多重阴影 */

  /* 玻璃拟态基础（进阶会展开） */
  backdrop-filter: blur(10px);
}
```

### 圆角技巧

```css
.circle { border-radius: 50%; }                 /* 正圆 */
.pill   { border-radius: 999px; }               /* 胶囊形 */
.leaf   { border-radius: 0 20px 0 20px; }       /* 单边圆角（叶子形） */
```

### 11.1 完整示例：一张内容卡片

综合圆角、阴影、边框与圆角裁切（`overflow:hidden`），保存为 `card.html` 即可看到效果：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>卡片组件</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f5f6fa; padding: 40px; }
  .card {
    width: 280px; background: #fff; border-radius: 12px;
    border: 1px solid #ececec;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    overflow: hidden;                 /* 关键：让圆角裁切掉图片溢出 */
  }
  .card img { width: 100%; display: block; }   /* display:block 去掉图片底部空隙 */
  .card .body { padding: 16px; }
  .card h3 { margin: 0 0 8px; font-size: 18px; }
  .card p  { margin: 0; color: #666; font-size: 14px; line-height: 1.5; }
  .card .tag {
    display: inline-block; padding: 2px 10px; margin-top: 12px;
    background: #eaf3ff; color: #3498db;
    border-radius: 999px; font-size: 12px;
  }
</style>
</head>
<body>
  <div class="card">
    <img src="https://picsum.photos/280/140" alt="封面图">
    <div class="body">
      <h3>CSS 卡片示例</h3>
      <p>一张带圆角、阴影和封面的卡片，是前端最常见的 UI 单元。</p>
      <span class="tag">教程</span>
    </div>
  </div>
</body>
</html>
```

---

## 12. display 属性

`display` 决定元素如何参与布局，是 CSS 最核心的属性之一。

```css
.block   { display: block; }     /* 块级：独占一行，可设宽高（div/p/h1） */
.inline  { display: inline; }    /* 行内：不换行，宽高无效（span/a/strong） */
.inline-block { display: inline-block; } /* 行内但可设宽高（按钮、图标） */
.none    { display: none; }      /* 完全移除，不占空间（与 visibility:hidden 不同） */
```

> 现代布局主力是 `flex` 和 `grid`（见进阶篇），但理解 block/inline 是所有布局的地基。

---

## 13. 定位 position

| 值 | 行为 |
|---|---|
| `static` | 默认，按文档流排列 |
| `relative` | 相对**自身原位置**偏移，原空间保留 |
| `absolute` | 相对**最近的非 static 祖先**定位，脱离文档流 |
| `fixed` | 相对**视口**定位，滚动不移动（如悬浮按钮、顶栏） |
| `sticky` | 滚动到阈值前像 relative，之后像 fixed（吸顶导航） |

```css
.parent { position: relative; }          /* 作为子元素 absolute 的参照 */
.child  { position: absolute; top: 10px; right: 10px; }

.modal  { position: fixed; inset: 0; }   /* inset:0 = top/right/bottom/left 全 0，铺满 */

.header { position: sticky; top: 0; z-index: 10; } /* 吸顶 */
```

`z-index` 控制层叠顺序（仅对定位元素生效，数值大的在上层）。

---

## 14. 浮动 float（了解即可）

`float` 原本是为**文字环绕图片**设计的，曾被用来做多栏布局，但现在已被 Flexbox/Grid 取代。

```css
img { float: left; margin: 0 12px 12px 0; }
```

清除浮动（防止父容器高度塌陷）：

```css
.clearfix::after {
  content: "";
  display: block;
  clear: both;
}
```

> 新项目请用 Flex/Grid；float 只需能读懂老代码即可。

---

## 15. 列表与表格

### 列表

```css
ul { list-style: none; padding-left: 0; }      /* 去掉圆点，常用于导航 */
li { padding: 8px 0; }
```

### 表格

```css
table {
  border-collapse: collapse;   /* 合并边框，更紧凑 */
  width: 100%;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}
tr:nth-child(even) { background: #f9f9f9; }   /* 斑马纹 */
```

---

## 16. 基础布局实战

### 16.1 水平居中

```css
/* 块级元素固定宽度水平居中 */
.center-box {
  width: 600px;
  margin: 0 auto;          /* 左右 auto */
}

/* 行内/行内块元素 */
.parent { text-align: center; }
```

### 16.2 垂直居中（传统三件套）

```css
.parent {
  position: relative;
  height: 300px;
}
.child {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);  /* 回退自身一半 */
}
```

> 用 Flexbox 会更简单（进阶篇 1 行解决）。

### 16.3 两栏布局

```css
.layout { display: flex; }
.sidebar { width: 240px; flex-shrink: 0; }
.main    { flex: 1; }        /* 占满剩余空间 */
```

### 16.4 完整示例：带页眉/侧栏/正文/页脚的页面骨架

这是最经典的"后台/文档站"布局，保存为 `layout.html` 打开即可：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>页面骨架</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    font-family: system-ui, sans-serif;
    min-height: 100vh;            /* 至少占满一屏，footer 才能沉底 */
    display: flex; flex-direction: column;   /* 纵向：上中下 */
  }
  header { background: #2c3e50; color: #fff; padding: 16px 24px; }
  .content { flex: 1; display: flex; }       /* 中间区域横向分栏 */
  nav  { width: 200px; background: #ecf0f1; padding: 16px; }
  main { flex: 1; padding: 24px; }
  footer { background: #34495e; color: #fff; padding: 12px 24px; text-align: center; }
</style>
</head>
<body>
  <header>站点标题</header>
  <div class="content">
    <nav>侧边导航</nav>
    <main>正文内容区</main>
  </div>
  <footer>© 2026 页脚</footer>
</body>
</html>
```

> 关键点：父容器 `min-height:100vh` + `flex-direction:column`，中间 `.content` 设 `flex:1` 占满剩余高度，页脚自然沉底。

---

## 17. 调试技巧

1. **浏览器开发者工具（F12）**：
   - `Elements` 面板选中元素，右侧 `Styles` 看生效/被覆盖的样式（`删除线` = 被层叠覆盖）。
   - 可直接在面板里改值实时预览。
2. **临时高亮布局**：

   ```css
   * { outline: 1px solid red; }   /* 一眼看清每个盒子的边界 */
   ```
3. **检查是否被继承/覆盖**：看 `Computed` 面板的最终计算值。

---

## 18. 初学者常见坑

1. **样式不生效**：检查选择器是否拼错、是否被更高权重规则覆盖、是否忘记分号。
2. **`height: 100%` 无效**：父元素必须有明确高度，或改用 `100vh`。
3. **`margin` 塌陷**：相邻块级元素的上下 margin 会合并取最大值；用 `padding` 或 `overflow: hidden` 隔开。
4. **`inline` 元素设宽高无效**：改为 `inline-block` 或 `block`。
5. **中文乱码**：`<head>` 里加 `<meta charset="utf-8">`。
6. **路径错误**：`link` 的 `href` 相对当前 HTML 文件，不是相对 CSS 文件。
7. **滥用 `!important`**：它是"核武器"，会破坏层叠规则，应优先用提高选择器权重解决。

---

## 19. 综合示例（可直接运行的完整页面）

下面两个页面把前面学的选择器、盒模型、文本、背景、布局全部串起来。**每个示例都是一份独立 HTML 文件**（CSS 内嵌在 `<style>` 里），复制保存为 `.html` 双击即可在浏览器看到效果。

### 19.1 个人名片卡 `profile.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>个人名片卡</title>
<style>
  /* ---- 全局重置 + 设计变量 ---- */
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, "PingFang SC", sans-serif;
    background: linear-gradient(135deg, #667eea, #764ba2);
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;  /* 整体居中 */
  }

  /* ---- 卡片 ---- */
  .card {
    width: 320px; background: #fff; border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    overflow: hidden; text-align: center;
  }
  .card .cover { height: 90px; background: #3498db; }  /* 顶部色块 */
  .card .avatar {
    width: 88px; height: 88px; border-radius: 50%;
    border: 4px solid #fff; margin: -44px auto 12px;   /* 上移盖住色块 */
    background: #f1c40f; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 36px; font-weight: 700;
  }
  .card h2 { font-size: 20px; margin-bottom: 4px; }
  .card .role { color: #888; font-size: 14px; margin-bottom: 16px; }
  .card .bio { color: #555; font-size: 14px; line-height: 1.6; padding: 0 24px; }
  .card .actions { margin: 20px 0 24px; }
  .card .btn {
    display: inline-block; padding: 8px 20px; margin: 0 4px;
    background: #3498db; color: #fff; text-decoration: none;
    border-radius: 999px; font-size: 14px;
  }
  .card .btn.ghost { background: #ecf0f1; color: #3498db; }
</style>
</head>
<body>
  <div class="card">
    <div class="cover"></div>
    <div class="avatar">张</div>
    <h2>张三</h2>
    <div class="role">前端工程师</div>
    <p class="bio">热爱 CSS 与可访问性，喜欢把复杂布局拆成清晰的小盒子。</p>
    <div class="actions">
      <a class="btn" href="#">关注</a>
      <a class="btn ghost" href="#">私信</a>
    </div>
  </div>
</body>
</html>
```

### 19.2 简单博客首页 `blog.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>简单博客首页</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, "PingFang SC", sans-serif; color: #333; line-height: 1.7; }

  /* ---- 顶栏 ---- */
  header {
    background: #2c3e50; color: #fff;
    padding: 14px 24px; display: flex; align-items: center; justify-content: space-between;
  }
  header .logo { font-size: 20px; font-weight: 700; }
  header nav a { color: #cbd5e1; text-decoration: none; margin-left: 18px; font-size: 14px; }
  header nav a:hover { color: #fff; }

  /* ---- 正文容器 ---- */
  .container { max-width: 860px; margin: 32px auto; padding: 0 20px; }

  /* ---- 文章列表 ---- */
  .post {
    border: 1px solid #eee; border-radius: 10px; padding: 20px;
    margin-bottom: 20px; transition: box-shadow .2s;
  }
  .post:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
  .post h2 { font-size: 22px; margin-bottom: 8px; }
  .post .meta { color: #999; font-size: 13px; margin-bottom: 12px; }
  .post p { color: #555; }
  .post .more {
    display: inline-block; margin-top: 12px; color: #3498db;
    text-decoration: none; font-size: 14px; font-weight: 600;
  }

  /* ---- 页脚 ---- */
  footer {
    background: #34495e; color: #cbd5e1; text-align: center;
    padding: 20px; font-size: 13px; margin-top: 40px;
  }
</style>
</head>
<body>
  <header>
    <div class="logo">我的博客</div>
    <nav>
      <a href="#">首页</a>
      <a href="#">归档</a>
      <a href="#">关于</a>
    </nav>
  </header>

  <div class="container">
    <article class="post">
      <h2>CSS 盒模型到底怎么算宽度</h2>
      <div class="meta">2026-10-20 · 阅读 3 分钟</div>
      <p>很多人初学 CSS 都会被 width 到底包不包含 padding 搞晕。一句话：默认 content-box 不包含，border-box 包含……</p>
      <a class="more" href="#">继续阅读 →</a>
    </article>

    <article class="post">
      <h2>用 Flexbox 三行代码做垂直居中</h2>
      <div class="meta">2026-10-18 · 阅读 2 分钟</div>
      <p>垂直居中曾经是前端噩梦，有了 Flexbox 后只需要三行……</p>
      <a class="more" href="#">继续阅读 →</a>
    </article>
  </div>

  <footer>© 2026 我的博客 · 由 CSS 驱动</footer>
</body>
</html>
```

> 这两个示例刻意只用初级知识：选择器、盒模型、颜色/渐变、圆角阴影、Flex 居中、`:hover` 交互。看懂并改一改，你就已经入门了。

---

## 下一步

掌握以上内容，你已经能写出现代网页的基础样式。接下来建议学习：

- **Flexbox 与 Grid**（现代布局双引擎）
- **响应式设计**（媒体查询、相对单位）
- **过渡与动画**
- **CSS 变量与架构方法**

这些内容在《CSS 进阶》中深入展开。
