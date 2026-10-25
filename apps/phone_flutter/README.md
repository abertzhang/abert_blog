# phone_flutter

abert 博客的**手机版 Flutter 客户端**：按 `doc/mobile-ui` 静态界面稿实现首页 / 分类 / 文章详情 / 关于四个页面，数据全部来自 `apps/api_express`（Express + PostgreSQL，`/blog/api` 前缀）。

## 界面稿对照

| 页面 | 界面稿 | 数据接口 |
|---|---|---|
| 首页 | `doc/mobile-ui/index.html` | `GET /articles`（最新文章，12 条/页 + 手动加载更多）、`GET /categories`（分类卡片） |
| 分类 | `doc/mobile-ui/category.html` | `GET /categories`（Tab + 文章数）、`GET /articles?category_id=`（触底自动加载） |
| 文章详情 | `doc/mobile-ui/article.html` | `GET /articles/:id`（正文 Markdown + 自动加浏览量）、同分类列表（上下篇） |
| 关于 | `doc/mobile-ui/about.html` | 静态内容 |

设计令牌（颜色 / 圆角 / 字号）对齐界面稿 CSS 变量，集中在 `lib/theme/app_theme.dart`：
背景 `#ffffff`、表面 `#f7f7f5`、正文 `#111318`、次要 `#6f7480`、分隔线 `#e6e6e3`、强调 `#14427f`、圆角 6px。

## 目录结构

```
lib/
├── main.dart                   # 入口 + 底部 Tab 根容器（IndexedStack 保活）
├── theme/app_theme.dart        # 设计令牌与 ThemeData
├── models/                     # Article / Category / 分页 / 信封（与后端字段一一对应）
├── services/
│   ├── api_client.dart         # HTTP 封装：baseUrl 解析、统一 {code,msg,data} 信封、错误抛出
│   └── blog_api.dart           # 博客接口（分类 / 文章 / 热门 / 标签）
├── widgets/                    # 顶部栏、底部 TabBar、文章列表项、分类卡片、Markdown 渲染、加载态
└── pages/                      # home / category / article / about 四个页面
```

文章正文为 Markdown（`md/zh-cn` 文档落库）：围栏代码块由 `widgets/article_markdown.dart`
单独渲染（语言标签 + 灰底卡片 + 横向滚动），其余文本交给 `flutter_markdown`。

## 运行

```bash
# 1. 先起后端（另开终端）
cd apps/api_express && pnpm dev          # http://localhost:3001/blog/api

# 2. 起 App（任选平台）
cd apps/phone_flutter
flutter pub get
flutter run                               # 选择已连接的设备 / 模拟器
```

### baseUrl 与平台差异

`ApiClient.baseUrl` 解析顺序（见 `lib/services/api_client.dart`）：

1. `--dart-define=API_BASE_URL=http://<主机IP>:3001/blog/api`（最高优先，真机 / 部署用）；
2. Android 模拟器默认 `http://10.0.2.2:3001/blog/api`（10.0.2.2 是模拟器到宿主机的回环地址）；
3. 其它平台（iOS 模拟器 / macOS / Web）默认 `http://localhost:3001/blog/api`。

> Web 端跨域：`api_express` 已在 `/blog/api` 上开启 CORS（`Access-Control-Allow-Origin: *`），
> Flutter Web 可直接请求；移动端原生请求不受同源策略约束。

## 验证

```bash
flutter analyze                    # 静态检查
flutter test                       # 8 个用例：模型解析 + 组件渲染 + 联调冒烟
flutter test test/api_smoke_test.dart   # 只跑联调冒烟：直连真实后端跑通 分类/列表/详情/热门
flutter build web --release        # 编译验证
```

> 联调冒烟放在 `test/` 而非 `tool/`：`api_client.dart` 引用了 `package:flutter/foundation.dart`（kIsWeb），
> 纯 `dart run`（VM 模式）下 `dart:ui` 不可用会编译失败，`flutter test` 的测试平台自带 dart:ui。
> 冒烟依赖真实后端在线（api_express :3001 + postgres 5433），后端未启动时该用例失败属预期。

登录 / 评论 / 后台管理接口后端已具备，但界面稿未包含对应页面，暂未实现；
后续如需，在 `services/blog_api.dart` 基础上扩展即可。
