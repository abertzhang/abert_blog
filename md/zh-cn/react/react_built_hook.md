---
title: React 常用内置 Hooks 学习文档
create:2026-10-20
update:2026-10-21
category:react
cover:https://img-common.aknot.uk/cover/land-10.jpg
tags:[react,hooks,frontend,use-state,use-effect,javascript,typescript]
summary:React 常用内置 Hooks 学习文档，每个 Hook 均含基础示例与实战场景代码
keywords:[react,hooks,use-state,use-effect,use-context,frontend]
top:1
copyright:true
---

# React 常用内置 Hooks 学习文档（React 18/19 + TypeScript）

> 本文覆盖 React 核心内置 Hook（含 React 18/19 并发特性）：§1–§9 为最常用的 9 个（`useState` / `useEffect` / `useRef` / `useContext` / `useMemo` / `useCallback` / `useReducer` / `useLayoutEffect` / `useTransition`），§10–§15 为进阶 Hook（`useImperativeHandle` / `useId` / `useDeferredValue` / `useSyncExternalStore` / `useInsertionEffect` / `useDebugValue`）。
> 每个 Hook 都给出「基础示例代码」+「实际使用场景代码」，方便边学边用。示例为 TypeScript（类型标注可帮助理解 Hook 的入参/返回值形状）。

---

## 使用规则（必读）

1. **只在组件函数或自定义 Hook 的顶层调用**，不要在 `if` / 循环 / 嵌套函数里调用。
2. Hook 名必须以 `use` 开头，React 靠此识别。
3. 依赖数组要写全；遗漏依赖会出现「闭包拿到旧值」的经典 bug。

```tsx
// ❌ 错误：在条件里调用，Hook 顺序会变
if (ok) useEffect(() => { /* ... */ }, []);

// ✅ 正确：顶层调用，条件写在内部
useEffect(() => { if (ok) { /* ... */ } }, [ok]);
```

---

## 1. useState —— 简单状态

**作用**：让函数组件拥有「修改后触发重渲染」的局部状态。适合单个或少数彼此独立的值。

**基础示例代码**

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState<number>(0); // 类型可推断，<number> 可省
  return (
    <button onClick={() => setCount((c) => c + 1)}>点击了 {count} 次</button>
  );
}
```

**使用场景代码**：登录表单的受控输入（实时同步用户输入到 state）。

```tsx
function LoginForm() {
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, pwd }),
    });
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit}>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
      <input value={pwd} type="password" onChange={(e) => setPwd(e.target.value)} placeholder="密码" />
      <button type="submit" disabled={submitting}>
        {submitting ? '提交中…' : '登录'}
      </button>
    </form>
  );
}
```

> 依赖「前一个值」时用函数式更新 `setCount((c) => c + 1)`，避免闭包陷阱。

---

## 2. useEffect —— 副作用、订阅、请求

**作用**：在渲染完成后执行副作用（数据请求、事件订阅、定时器、手动改 DOM）。`return` 的清理函数用于取消订阅 / 清定时器，防止内存泄漏。

**基础示例代码**

```tsx
import { useState, useEffect } from 'react';

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id); // 卸载时清理
  }, []); // 空依赖：只在挂载时运行一次

  return <span>{now.toLocaleTimeString()}</span>;
}
```

**使用场景代码**：进入页面请求详情，并在 `id` 变化时重新请求（含竞态保护）。

```tsx
function PostDetail({ id }: { id: number }) {
  const [post, setPost] = useState<{ title: string; body: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false; // 防止快速切换 id 时旧请求覆盖新结果
    setLoading(true);
    fetch(`/api/posts/${id}`)
      .then((r) => r.json())
      .then((data) => { if (!ignore) { setPost(data); setLoading(false); } });
    return () => { ignore = true; }; // 下次渲染前/卸载时取消
  }, [id]); // 依赖 id：id 变才重新请求

  if (loading) return <p>加载中…</p>;
  return <article><h1>{post?.title}</h1><p>{post?.body}</p></article>;
}
```

> 常见依赖写法：`[]` 只跑一次；`[a, b]` 任一变化重跑；不写依赖数组则每次渲染都跑（慎用）。

---

## 3. useRef —— DOM 引用 / 可变变量（不触发渲染）

**作用**：保存一个「跨渲染持续存在、修改它**不会**触发重渲染」的可变值。常用于：绑定 DOM 节点、保存定时器 ID、记录上一次值。

**基础示例代码**

```tsx
import { useRef, useEffect } from 'react';

function FocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus(); // 挂载后自动聚焦；current 首次为 null
  }, []);

  return <input ref={inputRef} placeholder="我会自动聚焦" />;
}
```

**使用场景代码**：记录上一次渲染的值，用于对比（如「价格涨跌提示」）。

```tsx
import { useRef, useEffect, useState } from 'react';

function usePrevious<T>(value: T): T | undefined {
  const prev = useRef<T>();
  useEffect(() => {
    prev.current = value; // 渲染提交后，把当前值存进 ref
  });
  return prev.current;
}

function PriceTag({ price }: { price: number }) {
  const prevPrice = usePrevious(price);
  const changed = prevPrice !== undefined && prevPrice !== price;
  return (
    <span>
      ¥{price}
      {changed && <em>{price > (prevPrice as number) ? ' ↑涨' : ' ↓跌'}</em>}
    </span>
  );
}
```

> 与 `useState` 的区别：`useRef` 改 `.current` 不会重渲染；`useState` 才会。需要「存但不渲染」选 `useRef`。

---

## 4. useContext —— 跨组件共享数据

**作用**：在组件树中「就近读取」Provider 提供的值，省去一层层传 props。适合主题、当前用户、语言等全局数据。

**基础示例代码**

```tsx
import { createContext, useContext } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');

function Toolbar() {
  const theme = useContext(ThemeContext); // 读取最近的 Provider 值
  return <div className={theme}>工具栏</div>;
}
```

**使用场景代码**：顶层提供「当前用户」，深层组件直接读取，无需逐层传参。

```tsx
// AuthContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

type User = { name: string; id: number } | null;
const AuthContext = createContext<{ user: User; login: (n: string) => void } | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const login = (name: string) => setUser({ name, id: Date.now() });
  return <AuthContext.Provider value={{ user, login }}>{children}</AuthContext.Provider>;
}

// 自定义 Hook 封装读取，顺便做空值校验
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  return ctx;
}

// 任意深层组件
function Avatar() {
  const { user } = useAuth();
  return <span>{user ? user.name : '游客'}</span>;
}
```

> 值变化时，所有消费该 Context 的组件都会重渲染；高频变化的数据慎用 Context（可拆细或用状态库）。

---

## 5. useMemo —— 缓存计算值

**作用**：对「开销大的计算」做缓存，仅在依赖变化时重算，避免每次渲染都重算。

**基础示例代码**

```tsx
import { useMemo, useState } from 'react';

function SortedList({ list }: { list: number[] }) {
  const sorted = useMemo(() => [...list].sort((a, b) => a - b), [list]); // list 不变则不重算
  return <ul>{sorted.map((n) => <li key={n}>{n}</li>)}</ul>;
}
```

**使用场景代码**：根据关键词过滤长列表（避免每次按键全量重算）。

```tsx
function SearchList({ items }: { items: { id: number; name: string }[] }) {
  const [kw, setKw] = useState('');
  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(kw.toLowerCase())),
    [items, kw] // 只在数据或关键词变化时过滤
  );
  return (
    <>
      <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜索" />
      <ul>{filtered.map((i) => <li key={i.id}>{i.name}</li>)}</ul>
    </>
  );
}
```

> 不要滥用：只有计算确实昂贵时才用。React 19 配合 React Compiler 可自动记忆。

---

## 6. useCallback —— 缓存函数

**作用**：把函数「缓存」下来，返回稳定引用，避免因父组件重渲染而产生新函数。配合 `React.memo` 子组件可跳过无效重渲染；也适合作为 `useEffect` 的依赖。

**基础示例代码**

```tsx
import { useCallback, useState, memo } from 'react';

const Child = memo(function Child({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick}>点我</button>;
});

function Parent() {
  const [n, setN] = useState(0);
  const handle = useCallback(() => console.log('稳定引用'), []); // 引用不变
  return <><button onClick={() => setN((x) => x + 1)}>父:{n}</button><Child onClick={handle} /></>;
}
```

**使用场景代码**：把回调作为 `useEffect` 依赖，避免无限重复执行。

```tsx
function useFetchUser(id: number) {
  const [user, setUser] = useState<{ name: string } | null>(null);

  const load = useCallback(() => {
    fetch(`/api/users/${id}`).then((r) => r.json()).then(setUser);
  }, [id]); // 仅 id 变化时 load 引用才变

  useEffect(() => {
    load(); // 依赖写 [load]，不会因父组件重渲染而反复触发
  }, [load]);

  return user;
}
```

> 同 `useMemo`：仅在传给 `memo` 子组件或作为 effect 依赖时有明显收益，否则可省。

---

## 7. useReducer —— 复杂状态

**作用**：当状态有多种「动作」、彼此关联、逻辑复杂时，用 reducer 集中管理，比多个 `useState` 更清晰、可预测、易测试。

**基础示例代码**

```tsx
import { useReducer } from 'react';

type State = { count: number };
type Action = { type: 'inc' } | { type: 'dec' } | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'inc':   return { count: state.count + 1 };
    case 'dec':   return { count: state.count - 1 };
    case 'reset': return { count: 0 };
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return (
    <>
      <p>{state.count}</p>
      <button onClick={() => dispatch({ type: 'inc' })}>+</button>
      <button onClick={() => dispatch({ type: 'reset' })}>重置</button>
    </>
  );
}
```

**使用场景代码**：购物车（增 / 删 / 改数量，逻辑集中在 reducer，方便单测）。

```tsx
type CartItem = { id: number; name: string; qty: number };
type CartAction =
  | { type: 'add'; item: CartItem }
  | { type: 'remove'; id: number }
  | { type: 'setQty'; id: number; qty: number };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add':    return [...state, action.item];
    case 'remove': return state.filter((i) => i.id !== action.id);
    case 'setQty': return state.map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i));
  }
}

function useCart() {
  const [items, dispatch] = useReducer(cartReducer, []);
  const total = items.reduce((s, i) => s + i.qty, 0);
  return { items, total, dispatch };
}
```

> 经验：状态超过 2~3 个且互相影响，或同一份数据有多种更新方式，就考虑 `useReducer`。

---

## 8. useLayoutEffect —— DOM 布局同步操作

**作用**：与 `useEffect` 类似，但它在**浏览器绘制之前同步执行**。适合「先读布局、立刻改样式」以避免闪烁（如测量尺寸后定位）。SSR 中会报警告，此时应退回 `useEffect`。

**基础示例代码**

```tsx
import { useLayoutEffect, useRef, useState } from 'react';

function Measured() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (ref.current) setWidth(ref.current.offsetWidth); // 绘制前读取尺寸
  }, []);

  return <div ref={ref}>宽度 {width}px</div>;
}
```

**使用场景代码**：工具提示（tooltip）先渲染再测位置，避免闪烁跳变。

```tsx
function Tooltip({ text, targetRef }: { text: string; targetRef: React.RefObject<HTMLElement> }) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const t = targetRef.current;
    const tip = tipRef.current;
    if (t && tip) {
      const r = t.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left }); // 同步定位，无闪烁
    }
  }, [targetRef]);

  return <div ref={tipRef} style={{ position: 'fixed', ...pos }}>{text}</div>;
}
```

> 多数情况用 `useEffect` 即可；只有「读取并同步修改 DOM 布局」才需要 `useLayoutEffect`。

---

## 9. useTransition —— 优先级调度（React 18+）

**作用**：把「较慢的状态更新」标记为「过渡（transition）」，让 UI 保持可响应——紧急更新（如输入框）优先，慢更新在后台进行、可被中断。返回 `[isPending, startTransition]`。

**基础示例代码**

```tsx
import { useState, useTransition } from 'react';

function Search() {
  const [input, setInput] = useState('');
  const [list, setList] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);              // 紧急：输入框即时响应
    startTransition(() => {
      setList(heavyFilter(e.target.value)); // 非紧急：可被打断
    });
  };

  return (
    <>
      <input value={input} onChange={onChange} />
      {isPending && <span>筛选中…</span>}
      <ul>{list.map((x) => <li key={x}>{x}</li>)}</ul>
    </>
  );
}

function heavyFilter(kw: string): string[] {
  // 模拟昂贵过滤
  return Array.from({ length: 5000 }, (_, i) => `item-${i}`).filter((s) => s.includes(kw));
}
```

**使用场景代码**：切换标签页时让内容更新「可中断」，避免卡住导航交互。

```tsx
function Tabs() {
  const [tab, setTab] = useState('home');
  const [content, setContent] = useState<React.ReactNode>(null);
  const [isPending, startTransition] = useTransition();

  const select = (next: string) => {
    setTab(next); // 立即高亮当前 tab（紧急）
    startTransition(() => {
      setContent(renderTab(next)); // 渲染内容较慢，放进 transition（非紧急）
    });
  };

  return (
    <>
      <nav>
        {['home', 'profile', 'settings'].map((t) => (
          <button key={t} onClick={() => select(t)} style={{ fontWeight: tab === t ? 'bold' : 'normal' }}>
            {t}
          </button>
        ))}
      </nav>
      <section style={{ opacity: isPending ? 0.6 : 1 }}>{content}</section>
    </>
  );
}

function renderTab(tab: string): React.ReactNode {
  return <p>内容：{tab}</p>;
}
```

> `useTransition` / `useDeferredValue` 是 React 并发特性（18+ 引入，19 继续支持）。`isPending` 可用于显示「加载中」降级 UI。

---

## 10. useImperativeHandle —— 暴露命令式句柄

**作用**：与 `forwardRef` 配合，让父组件只能调用子组件「特意暴露」的方法，而不是拿到整个 DOM 实例，避免把内部实现泄漏给父组件。

**基础示例代码**

```tsx
import { forwardRef, useImperativeHandle, useRef } from 'react';

type InputHandle = { focus: () => void; clear: () => void };

const MyInput = forwardRef<InputHandle>((_, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => { if (inputRef.current) inputRef.current.value = ''; },
  }), []);
  return <input ref={inputRef} />;
});
// React 19 起也可直接把 ref 当普通 prop 传递，无需 forwardRef；
// 跨版本兼容时 forwardRef 仍可用。
```

**使用场景代码**：父组件控制子组件表单「聚焦 / 清空」。

```tsx
function Form() {
  const inputRef = useRef<InputHandle>(null);
  return (
    <>
      <MyInput ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>聚焦</button>
      <button onClick={() => inputRef.current?.clear()}>清空</button>
    </>
  );
}
```

---

## 11. useId —— 生成稳定唯一 ID

**作用**：为无障碍属性（`id` / `htmlFor` / `aria-*`）生成**跨服务端/客户端一致**的全局唯一 ID，避免 SSR 水合（hydration）不匹配。React 18 起推荐。

**基础示例代码**

```tsx
import { useId } from 'react';

function Field() {
  const id = useId(); // 如 ":r0:"
  return (
    <div>
      <label htmlFor={id}>邮箱</label>
      <input id={id} type="email" />
    </div>
  );
}
```

**使用场景代码**：一个组件同时渲染多个需要关联 `label` 的输入框（且可能多个实例同屏）。

```tsx
function TextField({ label }: { label: string }) {
  const id = useId();
  const errId = useId(); // 每个 useId 都唯一
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={errId} />
      <span id={errId} role="alert">必填</span>
    </div>
  );
}
```

> 不要用 `Math.random()` / 自增计数器（SSR 不一致）。

---

## 12. useDeferredValue —— 延迟值（React 18+）

**作用**：返回一个「延后更新的副本值」，让紧急更新（如输入框）保持灵敏，后台再慢慢用新值重渲染。与 `useTransition` 类似，但更直接地「延迟某个具体值」。

**基础示例代码**

```tsx
import { useState, useDeferredValue } from 'react';

function Search() {
  const [text, setText] = useState('');
  const deferred = useDeferredValue(text); // 延后副本
  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <Result query={deferred} />
    </>
  );
}
```

**使用场景代码**：输入即筛选大列表，输入框不卡顿，列表渲染用延迟值（可配合 `isStale` 提示「更新中」）。

```tsx
function Result({ query }: { query: string }) {
  const list = useMemo(() => heavyFilter(query), [query]); // 慢计算用延迟值
  return <ul>{list.map((x) => <li key={x}>{x}</li>)}</ul>;
}

function SearchBox() {
  const [text, setText] = useState('');
  const deferred = useDeferredValue(text);
  const isStale = text !== deferred; // 输入值已变、延迟值还没跟上
  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <Result query={deferred} />
      {isStale && <span>更新中…</span>}
    </>
  );
}
```

---

## 13. useSyncExternalStore —— 订阅外部存储（React 18+）

**作用**：安全地订阅「React 之外的可变数据源」（第三方状态库、浏览器 API、window 事件），并在并发渲染下保持一致性。这是 Redux/Zustand 等库在 React 18+ 中对接的底层 Hook。

**基础示例代码**

```tsx
import { useSyncExternalStore } from 'react';

// 最简外部 store：每秒变化的时钟
const clockStore = {
  getSnapshot: () => Date.now(),
  subscribe: (cb: () => void) => {
    const id = setInterval(cb, 1000);
    return () => clearInterval(id);
  },
};

function Clock() {
  const now = useSyncExternalStore(clockStore.subscribe, clockStore.getSnapshot);
  return <span>{new Date(now).toLocaleTimeString()}</span>;
}
```

> `getSnapshot` 返回的值必须是**稳定引用**（基本类型或缓存对象），否则会无限重渲染。

**使用场景代码**：订阅浏览器在线/离线状态（非 React 内部状态，但组件需响应）。

```tsx
function useOnlineStatus() {
  const subscribe = (cb: () => void) => {
    window.addEventListener('online', cb);
    window.addEventListener('offline', cb);
    return () => {
      window.removeEventListener('online', cb);
      window.removeEventListener('offline', cb);
    };
  };
  const getSnapshot = () => navigator.onLine;
  return useSyncExternalStore(subscribe, getSnapshot);
}

function StatusBar() {
  const online = useOnlineStatus();
  return <span style={{ color: online ? 'green' : 'red' }}>{online ? '在线' : '离线'}</span>;
}
```

---

## 14. useInsertionEffect —— 注入样式（DOM 变更前）

**作用**：在 React 对 DOM 做变更**之前**同步注入样式，专为 CSS-in-JS 库（emotion、styled-components）设计。普通业务代码几乎不需要它；用错会拖慢性能或出问题。

**基础示例代码**

```tsx
import { useInsertionEffect } from 'react';

function useCssRule(rule: string) {
  useInsertionEffect(() => {
    const style = document.createElement('style');
    style.textContent = rule;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, [rule]); // 在布局/绘制前插入，避免闪白
}

function Box() {
  useCssRule('.box{color:red}');
  return <div className="box">红色文字</div>;
}
```

**使用场景代码**：动态按主题注入全局 CSS 变量（CSS-in-JS 库典型用法）。

```tsx
function useThemeVars(theme: 'light' | 'dark') {
  useInsertionEffect(() => {
    const style = document.createElement('style');
    style.dataset.theme = theme;
    style.textContent =
      theme === 'dark'
        ? ':root{--bg:#111;--fg:#fff}'
        : ':root{--bg:#fff;--fg:#111}';
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, [theme]);
}
```

> ⚠️ 仅 CSS-in-JS 库作者该用；切勿在此 Hook 里读取 DOM 布局或订阅事件（那应该用 `useLayoutEffect` / `useEffect`）。

---

## 15. useDebugValue —— 调试自定义 Hook

**作用**：在 React DevTools 的「Hooks」面板里为自定义 Hook 显示一个有意义的标签，方便调试。不影响生产逻辑，仅开发期可见。

**基础示例代码**

```tsx
import { useState, useDebugValue } from 'react';

function useFriendStatus() {
  const [status, setStatus] = useState<'online' | 'offline'>('offline');
  useDebugValue(status === 'online' ? '🟢 在线' : '⚪ 离线'); // DevTools 中显示
  // ...实际订阅逻辑
  return status;
}
```

**使用场景代码**：给状态加「懒格式化」标签，DevTools 展开时才计算，不浪费性能。

```tsx
function useTimer() {
  const [seconds, setSeconds] = useState(0);
  // 第二个参数：懒格式化，只在 DevTools 查看时执行
  useDebugValue(seconds, (s) => `${s}s 已运行`);
  // ...useEffect 里 setInterval(() => setSeconds(s => s+1), 1000)
  return seconds;
}
```

> 仅用于自定义 Hook 的调试展示；普通组件不要用。

---

## 速查表

| Hook | 一句话作用 | 是否触发渲染 | 典型依赖 |
|---|---|---|---|
| `useState` | 简单局部状态 | ✅ 是 | — |
| `useEffect` | 副作用 / 订阅 / 请求 | 自身不改，内部可改 | 外部变量 |
| `useRef` | DOM 引用 / 可变变量 | ❌ 否 | — |
| `useContext` | 跨组件共享数据 | ✅（值变时） | — |
| `useMemo` | 缓存「计算值」 | ❌（包的是值） | 计算依赖 |
| `useCallback` | 缓存「函数」 | ❌（包的是函数） | 函数依赖 |
| `useReducer` | 复杂 / 多动作状态 | ✅ 是（dispatch） | — |
| `useLayoutEffect` | 绘制前同步改 DOM | 同 useEffect | 外部变量 |
| `useTransition` | 标记非紧急更新（18+） | ✅（isPending/状态） | — |
| `useImperativeHandle` | 暴露命令式句柄给父组件 | ❌（不直接改状态） | ref 依赖 |
| `useId` | 生成稳定唯一 ID（SSR 安全） | ❌（不直接改状态） | — |
| `useDeferredValue` | 延迟某个值（18+） | ✅（deferred 值） | — |
| `useSyncExternalStore` | 订阅外部 store（18+） | ✅（快照变） | subscribe/getSnapshot |
| `useInsertionEffect` | CSS-in-JS 注入样式 | 同 useEffect | 样式依赖 |
| `useDebugValue` | 调试自定义 Hook（DevTools） | ❌ | — |

> 记忆口诀：`state` 存值、`effect` 跑副作用、`ref` 存但不渲染、`context` 共享、`memo/callback` 防重复、`reducer` 管复杂、`layoutEffect` 同步布局、`transition`/`deferredValue` 调优先级、`id` 给唯一、`syncExternalStore` 接外部、`imperativeHandle` 暴露方法、`insertionEffect` 注样式、`debugValue` 助调试。

---

> 本文示例基于 React 18/19 与 TypeScript。实际项目中若启用 React Compiler，多数 `useMemo` / `useCallback` 可自动处理，按需使用即可。
