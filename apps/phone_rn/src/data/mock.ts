/**
 * 离线 mock 数据（仅 USE_MOCK=true 时使用）
 *
 * 内容来自 doc/mobile-ui 界面稿的示例文章，用于无后端时预览界面。
 * 字段与后端 toArticle 映射一致；content 为 Markdown（与 web_react 渲染方式一致）。
 */
import type { Article, Category, Comment, FriendLink, TagCount } from '../types'

export const mockCategories: Category[] = [
  { id: 1, name: 'Flutter', slug: 'flutter', sort: 1, article_count: 3 },
  { id: 2, name: 'React', slug: 'react', sort: 2, article_count: 3 },
  { id: 3, name: 'NodeJs', slug: 'nodejs', sort: 3, article_count: 3 },
  { id: 4, name: 'Golang', slug: 'golang', sort: 4, article_count: 3 },
]

const FLUTTER_BODY = `很多人对 Flutter 的性能印象来自一句话：Widget 很轻，重建不贵。这句话是对的，但它只覆盖了整条链路的第一段。真正决定一次更新要花多少时间的，往往是你没有显式写过的那几层。

## 一次更新经历了什么

从调用 \`setState\` 到屏幕上出现新像素，中间至少经过四个阶段：构建（Build）、布局（Layout）、绘制（Paint）与合成（Composite）。每个阶段都有自己的失效范围，理解这个范围，才能判断代价落在哪里。

\`\`\`dart
class ArticleListView extends ConsumerWidget {
  const ArticleListView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final articles = ref.watch(articleListProvider);
    return articles.when(
      data: (items) => ListView.builder(
        itemCount: items.length,
        itemBuilder: (context, index) => ArticleTile(article: items[index]),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => ErrorView(error: error),
    );
  }
}
\`\`\`

上面这段代码本身没有问题，但 \`ref.watch\` 的位置决定了整棵子树的失效范围：把订阅放在列表项之外，任何一条数据变化都会重建整个列表容器。

## 为什么代价常常不在 setState

构建阶段的成本通常是可控的，因为 Widget 只是不可变的配置对象。真正昂贵的是布局与绘制：它们要处理真实的几何信息与像素。

### 布局阶段的真实开销

当一棵子树的约束发生变化，布局会沿着这棵子树自顶向下重新计算。常见的放大器有三个：

- 在滚动容器里使用无界高度的布局组件，导致每帧重新测量；
- 把频繁变化的状态订阅放在靠近根节点的位置，放大失效范围；
- 在同一帧里连续触发多次状态更新，却没有合并成一次。

> 判断性能问题的最快方式，不是读代码找可疑点，而是先让 DevTools 告诉你时间花在哪个阶段，再回到代码里找对应的那行。

## 把结论变成可执行的检查

把上面的分析整理成一套可以在每次提交前跑一遍的动作：

\`\`\`shell
flutter run --profile --trace-startup
flutter build apk --split-debug-info=build/symbols
\`\`\`

如果时间线里布局与绘制占比明显高于构建，说明问题在几何而非状态；反之则应优先检查订阅粒度与状态合并。两种情况的优化方向完全不同，先分清楚再动手，能省掉大量无效重构。`

export const mockArticles: Article[] = [
  {
    id: 101,
    title: 'Flutter 渲染管线：从 Widget 到 Layer 的完整链路',
    summary:
      '把 Build、Layout、Paint、Composite 四个阶段拆开看，理解为什么一次 setState 的代价常常不在你以为的地方。',
    cover: '',
    category_id: 1,
    category_name: 'Flutter',
    tags: 'Flutter,渲染,性能',
    author_name: 'abert',
    copyright: false,
    view_count: 128,
    published_at: '2026-08-12T00:00:00.000Z',
    created_at: '2026-08-12T00:00:00.000Z',
    status: 'published',
    pinned: false,
    content: FLUTTER_BODY,
  },
  {
    id: 102,
    title: '用 Riverpod 重构状态层：一次真实项目的取舍',
    summary:
      '从 Provider 迁移到 Riverpod 的完整过程、中途踩到的坑，以及什么时候你不该引入全局状态容器。',
    cover: '',
    category_id: 1,
    category_name: 'Flutter',
    tags: 'Flutter,Riverpod,状态管理',
    author_name: 'abert',
    published_at: '2026-09-03T00:00:00.000Z',
    status: 'published',
    content:
      '状态管理的选择从来不是“哪个库更好”，而是“你的失效范围有多大”。\n\n## 为什么迁移\n\n当组件数量过百，全局可变状态会悄悄放大每一次重建。Riverpod 把订阅粒度下沉到 Provider，让每一处消费只响应自己关心的数据。\n\n## 中途的坑\n\n- 不要把 `ref.watch` 放在过于靠近根节点的位置；\n- `autoDispose` 要按需开启，否则长期持有会抵消收益；\n- 异步数据统一用 `AsyncValue` 三态处理。\n\n> 迁移的价值不在于库本身，而在于它逼你把“谁关心这条数据”重新想清楚。',
  },
  {
    id: 103,
    title: 'Flutter 性能调优：帧率、内存与启动耗时',
    summary:
      '用 DevTools 定位掉帧与内存增长，给出一套可复用的排查顺序和几个常见的误判。',
    cover: '',
    category_id: 1,
    category_name: 'Flutter',
    tags: 'Flutter,性能,DevTools',
    author_name: 'abert',
    published_at: '2026-10-01T00:00:00.000Z',
    status: 'published',
    content:
      '性能问题最忌讳“凭感觉优化”。先量，再改。\n\n## 一套可复用的顺序\n\n1. 用 Performance 面板抓一帧，看耗时落在 Build / Layout / Paint 哪一段；\n2. 用 Memory 面板看是否持续上涨；\n3. 用 App Start 看冷启动瓶颈。\n\n常见的误判是把所有卡顿都归咎于 `setState`，而真正的瓶颈往往在布局与绘制。',
  },
  {
    id: 201,
    title: 'React 19 的并发渲染到底解决了什么问题',
    summary:
      '从时间切片到可中断渲染，说明并发特性在真实交互里带来的变化，以及它管不到的部分。',
    cover: '',
    category_id: 2,
    category_name: 'React',
    tags: 'React,并发,渲染',
    author_name: 'abert',
    published_at: '2026-08-20T00:00:00.000Z',
    status: 'published',
    content:
      '并发渲染不是“更快”，而是“更可控”。\n\n## 时间切片\n\nReact 可以把一次大更新拆成多帧执行，保证输入框等高频交互不被阻塞。\n\n## 它管不到的部分\n\n- 计算本身的开销（重算法请放到 Worker）；\n- 网络等待（交给 Suspense 与缓存）；\n- 不必要的重新渲染（仍要靠 `memo` / `useMemo`）。',
  },
  {
    id: 202,
    title: '从 useEffect 到 useSyncExternalStore：状态同步的演进',
    summary:
      'React 为什么额外提供 useSyncExternalStore，它在订阅外部数据源时解决了什么一致性问题。',
    cover: '',
    category_id: 2,
    category_name: 'React',
    tags: 'React,Hooks,状态同步',
    author_name: 'abert',
    published_at: '2026-09-11T00:00:00.000Z',
    status: 'published',
    content:
      '`useEffect` 订阅外部数据源有一个隐蔽问题：在提交之后才生效，可能出现撕裂（tearing）。\n\n```tsx\nconst value = useSyncExternalStore(subscribe, getSnapshot)\n```\n\n它在渲染期间读取快照，保证并发渲染下拿到一致的视图，是订阅“外部真相”的正确方式。',
  },
  {
    id: 203,
    title: '大型 React 应用的目录与状态边界',
    summary:
      '组件数量过百之后，目录结构与状态归属比抽象层次更能决定项目还能不能维护。',
    cover: '',
    category_id: 2,
    category_name: 'React',
    tags: 'React,工程化,架构',
    author_name: 'abert',
    published_at: '2026-10-06T00:00:00.000Z',
    status: 'published',
    content:
      '当项目变大，决定可维护性的不是“抽象有多优雅”，而是“状态归谁所有”。\n\n## 一条经验\n\n- 全局状态只放真正跨页面的数据；\n- 页面内状态尽量就近；\n- 目录按“业务域”而非“文件类型”划分。\n\n> 目录结构是你对系统边界的第一份声明。',
  },
  {
    id: 301,
    title: 'Node.js 事件循环与异步 IO 的真实行为',
    summary:
      '宏任务、微任务与阶段划分，以及为什么回调的实际执行顺序总和你预期的不同。',
    cover: '',
    category_id: 3,
    category_name: 'NodeJs',
    tags: 'NodeJs,事件循环,异步',
    author_name: 'abert',
    published_at: '2026-08-25T00:00:00.000Z',
    status: 'published',
    content:
      '事件循环是 Node.js 的心脏，但“顺序”常被误解。\n\n## 阶段划分\n\ntimers → pending → idle/prepare → poll → check → close。\n\n`Promise` 回调属于微任务，会在每个阶段之间清空，因此 `then` 总是早于下一个阶段里的 `setTimeout`。',
  },
  {
    id: 302,
    title: '用 Fastify 构建可观测的 API 服务',
    summary:
      '从日志、指标到链路追踪，把可观测性当作接口设计的一部分，而不是上线后补的补丁。',
    cover: '',
    category_id: 3,
    category_name: 'NodeJs',
    tags: 'NodeJs,Fastify,可观测性',
    author_name: 'abert',
    published_at: '2026-09-15T00:00:00.000Z',
    status: 'published',
    content:
      '可观测性不该是上线后的补丁，而应是接口设计的一部分。\n\n## 三个支柱\n\n- 结构化日志（便于检索）；\n- 指标（RED：速率、错误、时延）；\n- 链路追踪（一次请求穿越哪些服务）。\n\n把这三件事在第一个接口就接好，后面的排障成本会低一个数量级。',
  },
  {
    id: 303,
    title: 'Node.js 内存泄漏排查实战',
    summary:
      '从堆快照对比到对象增长追踪，还原一次线上内存持续上涨的完整定位过程。',
    cover: '',
    category_id: 3,
    category_name: 'NodeJs',
    tags: 'NodeJs,内存,排查',
    author_name: 'abert',
    published_at: '2026-10-10T00:00:00.000Z',
    status: 'published',
    content:
      '内存泄漏最怕“拍脑袋”。先有证据，再谈修复。\n\n## 一套动作\n\n1. 取两份间隔一段时间的堆快照；\n2. 在 DevTools 里做对比，看哪类对象持续增长；\n3. 顺着引用链找到未被释放的根。\n\n> 多数泄漏不是“忘记释放”，而是“被一个本该短命的对象意外引用”。',
  },
  {
    id: 401,
    title: 'Go 泛型实践：约束、类型推导与常见陷阱',
    summary:
      '从约束定义到类型集合，梳理泛型在业务代码里真正值得引入的位置。',
    cover: '',
    category_id: 4,
    category_name: 'Golang',
    tags: 'Golang,泛型,类型',
    author_name: 'abert',
    published_at: '2026-08-28T00:00:00.000Z',
    status: 'published',
    content:
      '泛型不是“能写就写”，而是“在重复出现的地方才值得”。\n\n```go\nfunc Map[T, U any](s []T, f func(T) U) []U {\n\tout := make([]U, len(s))\n\tfor i, v := range s {\n\t\tout[i] = f(v)\n\t}\n\treturn out\n}\n```\n\n约束用 `interface` 描述“类型集合”，比“任何类型”更可控，也更利于编译器推导。',
  },
  {
    id: 402,
    title: 'Go 并发模型：从 goroutine 到结构化并发',
    summary:
      'context、errgroup 与生命周期管理，让并发任务的退出路径重新变得可读。',
    cover: '',
    category_id: 4,
    category_name: 'Golang',
    tags: 'Golang,并发,context',
    author_name: 'abert',
    published_at: '2026-09-18T00:00:00.000Z',
    status: 'published',
    content:
      'goroutine 很便宜，但“怎么让它停下来”才是真问题。\n\n## 结构化并发\n\n用 `errgroup.WithContext` 把一组任务绑到同一个 `context`：一个失败，其余自动取消；全部完成，才继续。\n\n> 退出路径的可读性，比启动的便利性重要得多。',
  },
  {
    id: 403,
    title: 'Go 服务可观测性：pprof 与 trace 上手',
    summary:
      '用标准库工具定位 CPU 热点、阻塞与内存分配，附一套可以直接复制的接入方式。',
    cover: '',
    category_id: 4,
    category_name: 'Golang',
    tags: 'Golang,pprof,可观测性',
    author_name: 'abert',
    published_at: '2026-10-14T00:00:00.000Z',
    status: 'published',
    content:
      '标准库自带的可观测性工具，是 Go 服务排查的第一选择。\n\n## 接入\n\n```go\nimport _ "net/http/pprof"\n\n// 在独立端口暴露\n// go func() { http.ListenAndServe(":6060", nil) }()\n```\n\n之后用 `go tool pprof` 抓 CPU / heap / goroutine 剖面，定位热点与阻塞。',
  },
]

export const mockTags: TagCount[] = [
  { word: 'Flutter', count: 3 },
  { word: 'React', count: 3 },
  { word: 'NodeJs', count: 3 },
  { word: 'Golang', count: 3 },
  { word: '性能', count: 4 },
  { word: '可观测性', count: 2 },
]

export const mockFriendLinks: FriendLink[] = [
  { id: 1, name: 'React 官网', url: 'https://react.dev', desc: 'React 官方文档', enabled: true, sort: 1 },
  { id: 2, name: 'Flutter 官网', url: 'https://flutter.dev', desc: 'Flutter 官方文档', enabled: true, sort: 2 },
]

export const mockComments: Record<number, Comment[]> = {
  101: [
    { id: 1, article_id: 101, parent_id: null, nickname: '读者A', content: '讲得很清楚，终于明白为什么布局阶段更贵了。', is_author: false, created_at: '2026-08-13T08:00:00.000Z' },
  ],
}
