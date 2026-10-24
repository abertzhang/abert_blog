import 'package:flutter/material.dart';

import '../models/article.dart';
import '../services/blog_api.dart';
import '../theme/app_theme.dart';
import '../widgets/article_markdown.dart';
import '../widgets/state_views.dart';

/// 文章详情页。
///
/// 布局与内容对齐 doc/mobile-ui/article.html：
/// 面包屑（首页 · 分类）→ 分类眉标 → 大标题 → meta（作者 · 日期 · 分类 · 阅读时长）
/// → Markdown 正文 → 标签行 → 上一篇 / 下一篇。
///
/// 正文从 `GET /articles/:id` 获取（后端会自增浏览量）；
/// 上下篇通过拉取同分类文章列表定位当前文章后取得。
class ArticlePage extends StatefulWidget {
  const ArticlePage({super.key, required this.articleId});

  final int articleId;

  @override
  State<ArticlePage> createState() => _ArticlePageState();
}

class _ArticlePageState extends State<ArticlePage> {
  late Future<Article> _future;

  /// 同分类文章列表（用于计算上下篇）
  List<Article> _siblings = const [];
  bool _siblingsLoaded = false;

  @override
  void initState() {
    super.initState();
    _future = _loadArticle();
  }

  Future<Article> _loadArticle() async {
    final article = await BlogApi.getArticle(widget.articleId);
    _loadSiblings(article);
    return article;
  }

  /// 拉取同分类文章（置顶优先、时间由新到旧），用于上下篇导航。
  Future<void> _loadSiblings(Article article) async {
    try {
      final p = await BlogApi.listArticles(
        page: 1,
        pageSize: 100,
        categoryId: article.categoryId,
      );
      if (!mounted) return;
      setState(() {
        _siblings = p.list;
        _siblingsLoaded = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _siblingsLoaded = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        backgroundColor: AppTheme.bg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text('abert 博客'),
        titleTextStyle: const TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: AppTheme.text,
        ),
      ),
      body: FutureBuilder<Article>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: '正在加载文章…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: '文章加载失败：${snapshot.error}',
              onRetry: () {
                setState(() => _future = _loadArticle());
              },
            );
          }
          final article = snapshot.data!;
          return _ArticleBody(
            article: article,
            siblings: _siblings,
            siblingsLoaded: _siblingsLoaded,
            onArticleTap: (target) {
              // 站内跳转：替换当前详情页栈，保持返回可回到列表
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => ArticlePage(articleId: target.id),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

/// 文章正文内容（面包屑 / 标题 / meta / Markdown / 标签 / 上下篇）。
class _ArticleBody extends StatelessWidget {
  const _ArticleBody({
    required this.article,
    required this.siblings,
    required this.siblingsLoaded,
    required this.onArticleTap,
  });

  final Article article;
  final List<Article> siblings;
  final bool siblingsLoaded;
  final void Function(Article article) onArticleTap;

  /// 同分类文章列表按「置顶优先、时间由新到旧」排序：
  /// 上一篇（更早发布）= 后一项；下一篇（更晚发布）= 前一项。
  Article? get _newerArticle {
    final index = siblings.indexWhere((a) => a.id == article.id);
    if (index <= 0) return null;
    return siblings[index - 1];
  }

  Article? get _olderArticle {
    final index = siblings.indexWhere((a) => a.id == article.id);
    if (index < 0 || index + 1 >= siblings.length) return null;
    return siblings[index + 1];
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 面包屑：首页 · 分类
          _Breadcrumb(article: article),
          const SizedBox(height: 16),

          // 分类眉标
          if (article.categoryName.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                article.categoryName,
                style: const TextStyle(
                  fontSize: 12,
                  letterSpacing: 1.6,
                  color: AppTheme.muted,
                ),
              ),
            ),

          // 大标题
          Text(
            article.title,
            style: const TextStyle(
              fontSize: 26,
              height: 1.32,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.3,
              color: AppTheme.text,
            ),
          ),
          const SizedBox(height: 12),

          // meta：作者 · 日期 · 分类 · 阅读时长（· ©）
          _ArticleMetaLine(article: article),

          // 正文
          Padding(
            padding: const EdgeInsets.only(top: 24),
            child: ArticleMarkdown(content: article.content ?? ''),
          ),

          // 标签行
          if (article.tagList.isNotEmpty) ...[
            const SizedBox(height: 26),
            _TagRow(tags: article.tagList),
          ],

          // 上下篇
          if (siblingsLoaded) ...[
            const SizedBox(height: 28),
            _Pager(
              prev: _olderArticle,
              next: _newerArticle,
              onArticleTap: onArticleTap,
            ),
          ],
        ],
      ),
    );
  }
}

/// 面包屑：首页 · 分类名（对齐 .breadcrumb）。
class _Breadcrumb extends StatelessWidget {
  const _Breadcrumb({required this.article});

  final Article article;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          const Text('首页',
              style: TextStyle(fontSize: 12, color: AppTheme.muted)),
          const Text(' · ',
              style: TextStyle(fontSize: 12, color: AppTheme.muted)),
          Text(
            article.categoryName.isEmpty ? '未分类' : article.categoryName,
            style: const TextStyle(fontSize: 12, color: AppTheme.muted),
          ),
        ],
      ),
    );
  }
}

/// 文章 meta 行：作者 · 日期 · 分类 · 约 N 分钟阅读（声明版权时附 ©）。
class _ArticleMetaLine extends StatelessWidget {
  const _ArticleMetaLine({required this.article});

  final Article article;

  @override
  Widget build(BuildContext context) {
    final parts = <String>[];
    if (article.authorName.isNotEmpty) parts.add('作者 ${article.authorName}');
    if (article.dateLabel.isNotEmpty) parts.add(article.dateLabel);
    if (article.categoryName.isNotEmpty) parts.add(article.categoryName);
    parts.add('约 ${article.readMinutes} 分钟阅读');
    if (article.copyright) parts.add('© 版权所有');

    return Text(
      parts.join(' · '),
      style: const TextStyle(fontSize: 13, color: AppTheme.muted),
    );
  }
}

/// 标签行：圆角描边小标签（对齐 .tag-row / .tag）。
class _TagRow extends StatelessWidget {
  const _TagRow({required this.tags});

  final List<String> tags;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final tag in tags)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
            decoration: BoxDecoration(
              border: Border.all(color: AppTheme.line),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              tag,
              style: const TextStyle(fontSize: 12, color: AppTheme.muted),
            ),
          ),
      ],
    );
  }
}

/// 上下篇导航（对齐 .pager）：上一篇（更新）/ 下一篇（更早），卡片式。
class _Pager extends StatelessWidget {
  const _Pager({
    required this.prev,
    required this.next,
    required this.onArticleTap,
  });

  final Article? prev;
  final Article? next;
  final void Function(Article article) onArticleTap;

  @override
  Widget build(BuildContext context) {
    if (prev == null && next == null) return const SizedBox.shrink();
    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppTheme.line)),
      ),
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        children: [
          _PagerItem(
            label: '上一篇',
            article: prev,
            onTap: onArticleTap,
          ),
          if (prev != null && next != null) const SizedBox(height: 12),
          _PagerItem(
            label: '下一篇',
            article: next,
            onTap: onArticleTap,
          ),
        ],
      ),
    );
  }
}

class _PagerItem extends StatelessWidget {
  const _PagerItem({
    required this.label,
    required this.article,
    required this.onTap,
  });

  final String label;
  final Article? article;
  final void Function(Article article) onTap;

  @override
  Widget build(BuildContext context) {
    if (article == null) return const SizedBox.shrink();
    return InkWell(
      onTap: () => onTap(article!),
      borderRadius: BorderRadius.circular(AppTheme.radius),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          border: Border.all(color: AppTheme.line),
          borderRadius: BorderRadius.circular(AppTheme.radius),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppTheme.muted),
            ),
            const SizedBox(height: 4),
            Text(
              article!.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 15,
                height: 1.5,
                color: AppTheme.text,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
