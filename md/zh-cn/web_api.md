---
title: Web API 学习文档（浏览器内置 · MDN）
create:2026-10-20
update:2026-10-21
category:web-api
tags:[web-api,javascript,mdn,browser,frontend,dom]
summary:基于 MDN 的浏览器内置 Web 平台 API 学习文档，每个 API 均配场景与示例代码
keywords:[web-api,javascript,dom,mdn,browser,frontend]
top:1
copyright:true
---

# Web API 学习文档（浏览器内置 · MDN）

> 资料来源：[MDN Web API 索引](https://developer.mozilla.org/zh-CN/docs/Web/API)
> 本文档是**学习笔记 / 速查手册**，不是 MDN 的替代品。每个 API 都给出「场景 + 可直接运行的示例代码」，并附 MDN 原文链接，方便深入学习。
>
> ⚠️ 注意：本文档讲的是**浏览器内置的 Web 平台 API**（DOM、Fetch、Storage、Canvas 等），与本项目另一份 `md/zh-cn/blog_api.md`（博客后端 HTTP 接口文档）不是一回事，请勿混淆。

---

## 目录

- [1. 什么是 Web API](#1-什么是-web-api)
- [2. 全局对象与运行环境](#2-全局对象与运行环境)
- [3. 特性检测（feature detection）](#3-特性检测feature-detection)
- [4. DOM 与文档操作](#4-dom-与文档操作)
- [5. 事件系统](#5-事件系统)
- [6. 网络与通信](#6-网络与通信)
- [7. 存储](#7-存储)
- [8. 图形与视觉](#8-图形与视觉)
- [9. 音视频与媒体](#9-音视频与媒体)
- [10. 设备与系统能力](#10-设备与系统能力)
- [11. 后台任务与多线程](#11-后台任务与多线程)
- [12. 性能与观测](#12-性能与观测)
- [13. 安全与加密](#13-安全与加密)
- [14. 文件与二进制](#14-文件与二进制)
- [15. 其它实用 API](#15-其它实用-api)
- [16. 推荐学习路径与参考](#16-推荐学习路径与参考)

---

## 1. 什么是 Web API

**Web API（Web 平台 API）** 是浏览器以 JavaScript 接口形式提供给网页的一组能力集合。它让网页不仅能展示内容，还能：

- 操作页面结构（DOM）
- 发起网络请求（Fetch）
- 读写本地存储（localStorage / IndexedDB）
- 绘图（Canvas / WebGL）
- 访问设备（摄像头、定位、通知）
- 在后台运行任务（Web Worker / Service Worker）

这些接口由 W3C / WHATWG 等标准组织定义，主流浏览器（Chrome、Firefox、Safari、Edge）实现，跨平台、跨语言（只要能跑 JS 就能用）。

> 约定：本文所有示例默认运行在浏览器主线程的 `<script>` 或现代前端框架中。带 `await` 的代码需在 `async` 函数或 `<script type="module">` 中执行。

---

## 2. 全局对象与运行环境

浏览器把所有 Web API 挂在一组**全局对象**上，无需 `import` 即可直接使用：

| 全局对象 | 作用 | 常见成员 |
|---|---|---|
| `window` | 最外层全局作用域（浏览器标签页） | 几乎所有 API 的根、`addEventListener`、`setTimeout` |
| `document` | 当前页面的 DOM 树入口 | `querySelector`、`createElement`、`cookie` |
| `navigator` | 浏览器/设备信息 | `userAgent`、`language`、`clipboard`、`geolocation` |
| `location` | 当前 URL | `href`、`search`、`reload()` |
| `history` | 会话历史 | `pushState()`、`back()` |
| `screen` | 屏幕信息 | `width`、`height` |
| `localStorage` / `sessionStorage` | 键值存储 | `getItem` / `setItem` |
| `console` | 调试输出 | `log` / `warn` / `table` |
| `fetch` | 网络请求 | 全局函数 |
| `crypto` | 加密 | `subtle`、`randomUUID()` |

**同步 vs 异步**：老 API（DOM 操作、`localStorage`）多为同步；现代 API（Fetch、IndexedDB、getUserMedia）多为 **Promise** 或**事件驱动**，避免阻塞主线程卡死页面。

```js
// 示例：从全局对象读取环境信息
console.log('浏览器语言：', navigator.language);
console.log('是否触屏：', navigator.maxTouchPoints > 0);
console.log('当前路径：', location.pathname);
console.log('屏幕分辨率：', screen.width + 'x' + screen.height);
```

---

## 3. 特性检测（feature detection）

不同浏览器对 API 的支持程度不同。**永远先检测再使用**，不要靠 UA 字符串判断。

```js
// 示例：安全使用可能不被支持的 API
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text); // 返回 Promise
  }
  // 降级方案
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}
```

> 🔗 参考：[Can I use](https://caniuse.com/) 查支持度；MDN 每个接口页底部都有「浏览器兼容性」表格。

---

## 4. DOM 与文档操作

DOM 是 Web API 的核心，把 HTML 文档表示为可操作的树结构。

### 4.1 选择元素 —— `document.querySelector` / `querySelectorAll`

**场景**：页面上有若干 `.card` 卡片，点击「高亮全部」按钮时给所有卡片加红色边框。

```html
<button id="hl">高亮全部卡片</button>
<div class="card">A</div>
<div class="card">B</div>
```

```js
const btn = document.querySelector('#hl');
const cards = document.querySelectorAll('.card'); // NodeList

btn.addEventListener('click', () => {
  cards.forEach((el) => {
    el.style.border = '2px solid red';
  });
});
console.log('找到卡片数量：', cards.length);
```

> 🔗 [MDN: Document.querySelector](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/querySelector)

### 4.2 创建与插入元素 —— `createElement` / `append`

**场景**：从接口拿到文章列表数据，动态渲染成 `<li>`。

```js
const data = [{ id: 1, title: '理解 Fetch' }, { id: 2, title: 'IndexedDB 入门' }];
const ul = document.querySelector('#list');

data.forEach((item) => {
  const li = document.createElement('li');
  li.textContent = item.title;            // 用 textContent 防止 XSS
  li.dataset.id = item.id;                // 写入 data-id 属性
  ul.append(li);
});
```

> ⚠️ 不要用 `innerHTML` 拼接用户输入，会导致 XSS。必须用 `textContent` 或先转义。

### 4.3 类名 / 数据属性 / 样式 —— `classList` / `dataset` / `style`

**场景**：切换暗色主题（在 `<body>` 上增删 `dark` 类）。

```js
const body = document.body;
// 切换
body.classList.toggle('dark');
// 判断是否存在
if (body.classList.contains('dark')) console.log('当前为暗色');
// 读取 data-* 属性
const userId = document.querySelector('#user').dataset.userId;
```

### 4.4 节点遍历 —— `closest` / `parentNode` / `children`

**场景**：在一个大列表里，点击任意子元素时找到它所属的「行」。

```js
document.querySelector('#list').addEventListener('click', (e) => {
  const row = e.target.closest('.row'); // 向上找最近的 .row
  if (!row) return;
  console.log('点击了行：', row.dataset.id);
});
```

### 4.5 监听 DOM 变化 —— `MutationObserver`

**场景**：用户通过富文本编辑器增删内容，实时统计字数。

```js
const editor = document.querySelector('#editor');
const counter = document.querySelector('#count');

const observer = new MutationObserver((mutations) => {
  counter.textContent = editor.textContent.length;
});

observer.observe(editor, {
  childList: true,   // 监听子节点增删
  subtree: true,     // 包括后代节点
  characterData: true, // 监听文本变化
});
// 不需要时停止，避免内存泄漏
// observer.disconnect();
```

> 🔗 [MDN: MutationObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/MutationObserver)

---

## 5. 事件系统

事件是浏览器「通知你发生了什么」的机制：点击、输入、网络返回、动画帧等。

### 5.1 绑定与事件对象 —— `addEventListener`

**场景**：提交表单时阻止默认刷新行为，改为前端校验。

```js
const form = document.querySelector('#login-form');
form.addEventListener('submit', (e) => {
  e.preventDefault(); // 阻止页面跳转
  const name = new FormData(form).get('username');
  if (!name) {
    e.target.querySelector('.err').textContent = '请输入用户名';
    return;
  }
  console.log('提交：', name);
});
```

### 5.2 事件委托（event delegation）

**场景**：一个 1000 行的表格，不必给每行绑事件，只需在父容器上监听一次。

```js
document.querySelector('#table').addEventListener('click', (e) => {
  const cell = e.target.closest('td');
  if (cell) console.log('点到单元格：', cell.textContent);
});
```

> 事件会「冒泡」——子元素触发的事件会一路向上传到父元素，委托正是利用这一点。

### 5.3 自定义事件 —— `CustomEvent`

**场景**：购物车模块加完商品后，通知顶部角标刷新，模块间解耦。

```js
// 购物车模块
document.dispatchEvent(new CustomEvent('cart:add', { detail: { id: 42, qty: 1 } }));

// 角标模块（独立监听）
document.addEventListener('cart:add', (e) => {
  console.log('新增商品：', e.detail.id);
  badge.textContent = Number(badge.textContent) + e.detail.qty;
});
```

### 5.4 指针事件 —— `PointerEvent`

**场景**：实现一个可拖拽的滑块（同时支持鼠标和触屏）。

```js
const slider = document.querySelector('#slider');
slider.addEventListener('pointerdown', (e) => {
  slider.setPointerCapture(e.pointerId); // 拖出元素也能继续接收事件
  slider.addEventListener('pointermove', onMove);
});
function onMove(e) {
  console.log('指针位置 x：', e.clientX);
}
slider.addEventListener('pointerup', () => {
  slider.removeEventListener('pointermove', onMove);
});
```

### 5.5 键盘事件 —— `KeyboardEvent`

**场景**：按下 `Ctrl/Cmd + K` 打开搜索框。

```js
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openSearch();
  }
});
```

---

## 6. 网络与通信

### 6.1 Fetch API（最常用）

**场景 A：GET 请求并解析 JSON。**

```js
async function getPosts() {
  const res = await fetch('/api/posts');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json(); // 解析 JSON
  return data;
}
```

**场景 B：POST 提交 JSON，并带鉴权头。**

```js
async function createPost(payload, token) {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}
```

**场景 C：给请求加超时（Fetch 原生没有 timeout）。**

```js
function fetchWithTimeout(url, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}
```

**场景 D：上传文件（用 FormData，自动带 boundary）。**

```js
async function upload(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  return res.json();
}
```

> ⚠️ `fetch` 只在**网络错误**时 reject；HTTP 404/500 仍会 resolve，必须手动判断 `res.ok`。
> 🔗 [MDN: Fetch API](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API)

### 6.2 XMLHttpRequest（了解即可，旧项目兼容用）

**场景**：需要监听**上传进度**时，XHR 比 Fetch 更方便（Fetch 上传进度支持较新）。

```js
function uploadXHR(file, onProgress) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/upload');
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) onProgress(e.loaded / e.total);
  };
  const fd = new FormData();
  fd.append('file', file);
  xhr.send(fd);
}
```

### 6.3 构造请求体 / 查询串 —— `FormData` / `URLSearchParams`

**场景**：把表单转为查询字符串拼到 URL。

```js
const params = new URLSearchParams({ page: '1', keyword: 'web api', sort: 'desc' });
console.log(params.toString()); // page=1&keyword=web+api&sort=desc
fetch('/search?' + params);
```

### 6.4 解析 URL —— `URL` / `URL.canParse`

**场景**：从当前页面提取域名和路径参数。

```js
const url = new URL('https://example.com/blog?id=101&ref=home');
console.log(url.hostname); // example.com
console.log(url.searchParams.get('id')); // 101

// 安全地判断字符串是否为合法 URL
if (URL.canParse('not a url')) { /* ... */ }
```

### 6.5 WebSocket（全双工实时通信）

**场景**：聊天室，建立连接后服务器可主动推送消息。

```js
const ws = new WebSocket('wss://example.com/chat');

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'join', room: 'general' }));
});
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  console.log('收到：', msg.text);
});
ws.addEventListener('close', () => console.log('连接关闭'));
// 关闭：ws.close();
```

### 6.6 服务器推送事件 —— `EventSource` / SSE

**场景**：股票行情、通知流，服务器单向持续推送（比 WebSocket 轻量）。

```js
const es = new EventSource('/api/stream');
es.addEventListener('message', (e) => {
  console.log('推送数据：', e.data);
});
es.addEventListener('price', (e) => { // 自定义事件类型
  console.log('价格更新：', e.data);
});
// 关闭：es.close();
```

### 6.7 页面卸载上报 —— `navigator.sendBeacon`

**场景**：用户关闭/跳转页面时，可靠地把统计上报，且不影响页面卸载速度。

```js
window.addEventListener('pagehide', () => {
  const data = JSON.stringify({ event: 'leave', t: Date.now() });
  navigator.sendBeacon('/api/log', data); // 同步发出，不阻塞
});
```

---

## 7. 存储

### 7.1 localStorage / sessionStorage

- `localStorage`：持久保存，关闭浏览器仍在（同源共享，约 5MB）。
- `sessionStorage`：仅当前标签页会话，关页即清。

**场景**：记住用户选择的主题，下次打开自动应用。

```js
// 保存
localStorage.setItem('theme', 'dark');
// 读取
const theme = localStorage.getItem('theme') || 'light';
document.body.classList.toggle('dark', theme === 'dark');
// 删除
// localStorage.removeItem('theme');
```

> ⚠️ 只能存字符串。对象要 `JSON.stringify` / `JSON.parse`。**不要存敏感信息（密码、token）**。

### 7.2 Cookie（通过 `document.cookie`）

**场景**：读取页面可见的 cookie（注意 `HttpOnly` 的 cookie JS 读不到）。

```js
// 写入（前端只能写非 HttpOnly 的）
document.cookie = 'theme=dark; path=/; max-age=86400; SameSite=Lax';
// 读取（返回整串，需自己解析）
const cookies = Object.fromEntries(
  document.cookie.split('; ').map((c) => c.split('='))
);
console.log(cookies.theme);
```

### 7.3 IndexedDB（结构化大数据离线存储）

**场景**：把接口返回的文章列表缓存到本地，断网也能读。返回一个 Promise 封装。

```js
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('blog', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('posts', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function cachePosts(posts) {
  const db = await openDB();
  const tx = db.transaction('posts', 'readwrite');
  posts.forEach((p) => tx.objectStore('posts').put(p));
  return tx.done; // 事务完成 Promise（原生需包一层）
}

async function getCached(id) {
  const db = await openDB();
  return new Promise((resolve) => {
    const req = db.transaction('posts').objectStore('posts').get(id);
    req.onsuccess = () => resolve(req.result);
  });
}
```

> IndexedDB 是事务型、异步、能存任意结构化数据（包括 Blob/File），容量远大于 localStorage。现代项目可用 [idb](https://github.com/jakearchibald/idb) 这个轻量 Promise 封装。
> 🔗 [MDN: IndexedDB API](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)

### 7.4 Cache Storage（配合 Service Worker 缓存资源）

**场景**：Service Worker 中把首页静态资源缓存，实现离线打开。

```js
// 在 service worker 文件内
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('v1').then((c) => c.addAll(['/', '/app.css', '/app.js']))
  );
});
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
```

---

## 8. 图形与视觉

### 8.1 Canvas 2D

**场景**：画一个实时时钟，或实现手写签名板。

```html
<canvas id="cv" width="300" height="150"></canvas>
```

```js
const cv = document.querySelector('#cv');
const ctx = cv.getContext('2d'); // 2D 绘图上下文

// 画一个红色矩形
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 50);

// 画文字
ctx.fillStyle = '#000';
ctx.font = '20px sans-serif';
ctx.fillText('Hello Canvas', 20, 100);
```

**签名板核心（监听指针画线）：**

```js
const ctx = cv.getContext('2d');
cv.addEventListener('pointerdown', (e) => ctx.beginPath());
cv.addEventListener('pointermove', (e) => {
  if (e.buttons !== 1) return;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
});
```

> 🔗 [MDN: Canvas API](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)

### 8.2 OffscreenCanvas（在 Worker 中画图）

**场景**：把繁重的绘图放到 Web Worker，主线程不卡。

```js
// 主线程
const off = new OffscreenCanvas(200, 200);
const worker = new Worker('render.js');
worker.postMessage({ canvas: off }, [off]);

// render.js（Worker 内）
onmessage = (e) => {
  const ctx = e.data.canvas.getContext('2d');
  ctx.fillRect(0, 0, 200, 200);
};
```

### 8.3 SVG（作为 DOM 操作）

**场景**：动态修改一个饼图的某个扇区颜色。

```js
const slice = document.querySelector('#slice-1');
slice.setAttribute('fill', '#09f'); // SVG 属性用 setAttribute
```

### 8.4 WebGL / WebGPU（简介）

**场景**：做 3D 游戏、三维数据可视化或 GPU 加速计算时，Canvas 2D 性能不够，需要直接使用 GPU。

- `WebGLRenderingContext`：浏览器内的 OpenGL ES，适合 3D 游戏、数据可视化。
- `GPU`（WebGPU）：新一代图形与计算 API，性能更强，正逐步普及。

```js
const gl = cv.getContext('webgl'); // 或 'webgpu'
if (gl) console.log('支持 WebGL');
```

---

## 9. 音视频与媒体

### 9.1 HTMLMediaElement

**场景**：自定义一个「播放/暂停」按钮控制 `<video>`。

```js
const video = document.querySelector('video');
document.querySelector('#toggle').addEventListener('click', () => {
  if (video.paused) video.play(); else video.pause();
});
// 监听播放进度
video.addEventListener('timeupdate', () => {
  console.log('进度：', video.currentTime);
});
```

### 9.2 Web Audio API

**场景**：播放一段提示音，并实时可视化波形。

```js
const ctx = new AudioContext();
const osc = ctx.createOscillator(); // 振荡器
const gain = ctx.createGain();      // 音量
osc.connect(gain).connect(ctx.destination);
osc.frequency.value = 440; // A4 音
gain.gain.value = 0.1;
osc.start();
setTimeout(() => osc.stop(), 500);
```

> 🔗 [MDN: Web Audio API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API)

### 9.3 调用摄像头 / 麦克风 —— `getUserMedia`

**场景**：视频通话前预览本地摄像头。

```js
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  document.querySelector('video').srcObject = stream;
}
// 记得在用户手势（点击）后调用，且需 HTTPS 环境
```

### 9.4 录制媒体 —— `MediaRecorder`

**场景**：把摄像头画面录成 WebM 文件供下载。

```js
async function record() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    console.log('录制完成：', url);
  };
  rec.start();
  setTimeout(() => rec.stop(), 5000); // 录 5 秒
}
```

---

## 10. 设备与系统能力

### 10.1 Geolocation（定位）

**场景**：地图类应用获取用户当前坐标。

```js
navigator.geolocation.getCurrentPosition(
  (pos) => {
    console.log('纬度：', pos.coords.latitude, '经度：', pos.coords.longitude);
  },
  (err) => console.error('定位失败：', err.message),
  { enableHighAccuracy: true, timeout: 5000 }
);
```

### 10.2 Notification（桌面通知）

**场景**：后台任务完成，提醒用户（需先请求权限）。

```js
async function notify(title, body) {
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}
```

### 10.3 Clipboard API（剪贴板）

**场景**：点击「复制邀请码」按钮。

```js
async function copy(code) {
  await navigator.clipboard.writeText(code);
  console.log('已复制：', code);
}
// 读取剪贴板（同样需用户手势 + HTTPS）
// const text = await navigator.clipboard.readText();
```

### 10.4 Fullscreen API（全屏）

**场景**：视频播放器进入全屏。

```js
document.querySelector('#fs').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.querySelector('video').requestFullscreen();
});
```

### 10.5 Page Visibility（页面可见性）

**场景**：用户切到别的标签页时暂停视频/动画，回来再恢复，省电。

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) video.pause();
  else video.play();
});
```

### 10.6 Screen Orientation（屏幕方向）

**场景**：横屏游戏时锁定为横屏。

```js
// 锁定（需全屏或 PWA 环境）
screen.orientation.lock('landscape').catch((e) => console.warn(e));
// 监听变化
screen.orientation.addEventListener('change', () => {
  console.log('当前方向：', screen.orientation.type);
});
```

### 10.7 Vibration（振动）

**场景**：收到消息时手机振动一下（仅支持的移动设备）。

```js
if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // 震-停-震
```

> ⚠️ Battery Status API 已废弃，请勿使用。

---

## 11. 后台任务与多线程

### 11.1 Web Workers（不阻塞 UI 的计算）

**场景**：在前端做大数据排序/加密，放到 Worker 避免页面卡死。

```js
// 主线程
const worker = new Worker('compute.js');
worker.postMessage({ nums: [5, 3, 8, 1] });
worker.onmessage = (e) => console.log('结果：', e.data);

// compute.js（Worker 内，没有 DOM！）
onmessage = (e) => {
  const sorted = e.data.nums.sort((a, b) => a - b);
  postMessage(sorted);
};
```

> ⚠️ Worker 里**没有 `window` / `document`**，只能通过 `postMessage` 通信。

### 11.2 Service Worker（离线 / PWA 核心，简介）

**场景**：让网页像 App 一样离线可用、接收推送。本质是「介于网页和网络之间的代理脚本」。

```js
// 注册（在主线程，需 HTTPS）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
// sw.js 见上文 §7.4 Cache Storage 示例
```

### 11.3 BroadcastChannel（多标签页通信）

**场景**：用户在标签页 A 退出登录，标签页 B 也立即登出。

```js
// 两个标签页都用同一个频道名
const ch = new BroadcastChannel('auth');
ch.postMessage({ type: 'logout' });

ch.addEventListener('message', (e) => {
  if (e.data.type === 'logout') location.reload();
});
```

### 11.4 Channel Messaging（iframe 与父窗口通信）

**场景**：父页面和嵌入的第三方 iframe 安全传递消息。

```js
// 父页面
const { port1, port2 } = new MessageChannel();
iframe.contentWindow.postMessage('init', '*', [port2]);
port1.onmessage = (e) => console.log('来自 iframe：', e.data);
```

---

## 12. 性能与观测

### 12.1 Performance API（精确计时）

**场景**：测量一段业务逻辑耗时（比 `Date.now()` 精度高且不受系统时间影响）。

```js
const t0 = performance.now();
doHeavyWork();
const t1 = performance.now();
console.log('耗时：', (t1 - t0).toFixed(2), 'ms');
```

### 12.2 PerformanceObserver（异步观测指标）

**场景**：监听「长任务」（阻塞主线程 >50ms），定位卡顿。

```js
const obs = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn('长任务：', entry.duration, 'ms');
  }
});
obs.observe({ entryTypes: ['longtask'] });
```

### 12.3 IntersectionObserver（元素可见性）

**场景 A：图片懒加载——进入视口才加载。**

```js
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src; // 真实地址存在 data-src
      io.unobserve(img);         // 加载后停止观察
    }
  }
}, { rootMargin: '100px' });
document.querySelectorAll('img[data-src]').forEach((img) => io.observe(img));
```

**场景 B：无限滚动——滚到底部自动加载下一页。**

```js
const sentinel = document.querySelector('#sentinel'); // 列表底部占位元素
const io2 = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) loadNextPage();
});
io2.observe(sentinel);
```

> 🔗 [MDN: IntersectionObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API)

### 12.4 ResizeObserver（元素尺寸变化）

**场景**：容器大小改变时重新布局图表，避免监听全局 resize。

```js
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    console.log('新尺寸：', entry.contentRect.width);
    redrawChart(entry.contentRect.width);
  }
});
ro.observe(document.querySelector('#chart'));
```

### 12.5 Navigation Timing（页面加载性能）

**场景**：上报首屏加载耗时。

```js
window.addEventListener('load', () => {
  const nav = performance.getEntriesByType('navigation')[0];
  console.log('DOM 就绪：', nav.domContentLoadedEventEnd, 'ms');
  console.log('完全加载：', nav.loadEventEnd, 'ms');
});
```

---

## 13. 安全与加密

### 13.1 Web Crypto API（`crypto.subtle`）

**场景 A：计算字符串的 SHA-256 摘要（前端校验文件完整性）。**

```js
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
sha256('hello').then((h) => console.log(h)); // 2cf24dba...
```

**场景 B：AES-GCM 对称加密一段数据。**

```js
async function encrypt(text, password) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  // 实际使用需 PBKDF2 派生 + 随机 IV，此处仅展示对称加密骨架
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(16), iterations: 100000, hash: 'SHA-256' },
    key, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(text)
  );
  return ct;
}
```

> ⚠️ `crypto.subtle` 只在**安全上下文（HTTPS 或 localhost）**可用。
> 🔗 [MDN: Web Crypto API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Crypto_API)

### 13.2 Permissions API（查询权限状态）

**场景**：在未弹窗打扰用户前，先知道摄像头权限状态。

```js
const status = await navigator.permissions.query({ name: 'camera' });
console.log('摄像头权限：', status.state); // granted / denied / prompt
status.addEventListener('change', () => console.log('权限变了'));
```

### 13.3 Credential Management（简介）

**场景**：让浏览器记住密码、支持一键登录（WebAuthn 无密码登录的基础）。

```js
// 阻止浏览器默认保存提示，改为受控调用
if (navigator.credentials) {
  const cred = await navigator.credentials.get({ password: true, mediation: 'optional' });
  if (cred) console.log('自动填充账号：', cred.id);
}
```

---

## 14. 文件与二进制

### 14.1 Blob / File / FileReader（读取本地文件）

**场景 A：用户选择图片后预览。**

```js
document.querySelector('#file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file); // 生成临时预览地址
  document.querySelector('#preview').src = url;
  // 用完释放：URL.revokeObjectURL(url)
});
```

**场景 B：把文本/数据导出为可下载文件。**

```js
function download(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 14.2 File System Access API（用户选文件保存）

**场景**：富文本编辑器「保存到本地文件」。比 `<a download>` 体验更好（可选已有文件覆盖）。

```js
async function saveFile(content) {
  const handle = await window.showSaveFilePicker({ suggestedName: 'note.txt' });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}
```

> ⚠️ 该 API 目前主要在 Chromium 系浏览器支持，需做特性检测与降级。

---

## 15. 其它实用 API

### 15.1 History API（SPA 路由基础）

**场景**：单页应用切换「页面」但不刷新（改变 URL + 监听返回键）。

```js
document.querySelector('#about').addEventListener('click', () => {
  history.pushState({ page: 'about' }, '', '/about');
  renderAbout();
});
window.addEventListener('popstate', (e) => {
  console.log('返回到：', e.state);
});
```

### 15.2 Drag and Drop（拖拽上传）

**场景**：把文件拖进区框即上传。

```js
const drop = document.querySelector('#drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = [...e.dataTransfer.files];
  uploadAll(files);
});
```

### 15.3 View Transitions API（页面过渡动画）

**场景**：SPA 切换内容时加上原生过渡动画（Chrome 111+）。

```js
function navigate(render) {
  if (!document.startViewTransition) { render(); return; }
  document.startViewTransition(render);
}
```

### 15.4 Popover API（原生弹出层）

**场景**：点击按钮弹出菜单/提示，无需手写定位与焦点管理。

```html
<button popovertarget="menu">菜单</button>
<div id="menu" popover>弹出的内容</div>
```

### 15.5 Intl（国际化格式化）

**场景**：按用户地区格式化货币 / 日期（不用自己拼）。

```js
const price = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
  .format(1234.5); // ¥1,234.50

const date = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' })
  .format(new Date()); // 2026年10月20日
```

### 15.6 structuredClone（深拷贝）

**场景**：复制一个含嵌套对象的配置，避免互相影响。

```js
const a = { list: [1, 2], meta: { tag: 'x' } };
const b = structuredClone(a); // 比 JSON.parse(JSON.stringify) 支持更多类型（Date/Map/Set）
b.meta.tag = 'y';
console.log(a.meta.tag); // 仍是 'x'
```

### 15.7 requestAnimationFrame / requestIdleCallback（调度）

**场景 A：平滑动画（与屏幕刷新率同步，约 60fps）。**

```js
function animate(t) {
  // 更新位置...
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

**场景 B：把非紧急任务放到浏览器空闲时执行。**

```js
requestIdleCallback(() => {
  prefetchLowPriorityData();
});
```

### 15.8 matchMedia（响应式 JS 逻辑）

**场景**：根据「是否暗色模式 / 是否窄屏」执行不同 JS 逻辑（与 CSS 媒体查询对应）。

```js
const mq = window.matchMedia('(prefers-color-scheme: dark)');
if (mq.matches) enableDark();
mq.addEventListener('change', (e) => e.matches ? enableDark() : disableDark());
```

---

## 16. 推荐学习路径与参考

**建议顺序**（从高频到进阶）：

1. DOM 选择 / 事件 → 这是一切的基础
2. Fetch + 异步（Promise/async-await）→ 前后端联调必备
3. localStorage / Fetch 错误处理 → 实际项目立刻用得上
4. Canvas / IntersectionObserver → 做交互与性能优化
5. Web Storage + Service Worker → 离线 PWA
6. Web Crypto / Permissions → 安全相关
7. WebGL / WebGPU / Web Audio → 图形音视频专项

**通用最佳实践**：

- ✅ 多用 Promise / async-await，少用回调
- ✅ 访问可能不支持的 API 前先做特性检测
- ✅ 涉及用户输入用 `textContent`，警惕 XSS
- ✅ 不再需要的 Observer / Worker / 事件监听记得 `disconnect()` / `terminate()` / `removeEventListener()`，防止内存泄漏
- ✅ 涉及摄像头、定位、剪贴板、加密等敏感能力，必须在 **HTTPS 或 localhost** 下、且经**用户手势触发**

**官方参考**：

- Web API 总索引：<https://developer.mozilla.org/zh-CN/docs/Web/API>
- 学习区（含教程）：<https://developer.mozilla.org/zh-CN/docs/Web/API#%E6%96%87%E6%A1%A3>
- 浏览器兼容查询：<https://caniuse.com/>
- Web 标准规范：<https://www.w3.org/TR/> / <https://html.spec.whatwg.org/>

---

> 本文档整理自 MDN Web API 索引及公开标准，示例均为浏览器端 JavaScript。随着标准演进，部分 API（如 Battery、WebSQL）可能废弃，请以 MDN 最新页面为准。
