import 'package:flutter/material.dart';

import '../models/article.dart';
import '../theme/app_theme.dart';

/// 文章列表项（首页「最新文章」/ 分类页文章列表共用）。
///
/// 对齐 doc/mobile-ui 静态稿的 `.post`：标题（16px 半粗）+
/// meta 行（分类名强调色 · 日期 · 阅读时长，12px 次要色）+ 摘要（15px），
/// 列表项之间以 1px 分隔线隔开。
class PostListItem extends StatelessWidget {
  const PostListItem({
    super.key,
    required this.article,
    required this.onTap,
    this.showDivider = true,
  });

  final Article article;
  final VoidCallback onTap;

  /// 是否显示底部分隔线（列表第一项不显示，对齐 .post:first-child）
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 标题
            Text(
              article.title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                height: 1.5,
                color: AppTheme.text,
              ),
            ),
            const SizedBox(height: 6),
            // meta：分类 · 日期 · 阅读时长
            _MetaLine(article: article),
            const SizedBox(height: 6),
            // 摘要
            if (article.displaySummary.isNotEmpty)
              Text(
                article.displaySummary,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 15, height: 1.7, color: AppTheme.text),
              ),
          ],
        ),
      ),
    );
  }
}

/// meta 行：分类名（强调色）· 发布日期。
///
/// 阅读时长仅在详情页展示：列表接口不返回正文，用摘要估算会严重偏短
/// （长文也会显示「1 分钟」），故列表项不展示该项。
class _MetaLine extends StatelessWidget {
  const _MetaLine({required this.article});

  final Article article;

  @override
  Widget build(BuildContext context) {
    final parts = <InlineSpan>[];
    if (article.categoryName.isNotEmpty) {
      parts.add(TextSpan(
        text: article.categoryName,
        style: const TextStyle(color: AppTheme.accent),
      ));
    }
    if (article.dateLabel.isNotEmpty) {
      if (parts.isNotEmpty) parts.add(const TextSpan(text: ' · '));
      parts.add(TextSpan(text: article.dateLabel));
    }

    return Text.rich(
      TextSpan(children: parts),
      style: const TextStyle(fontSize: 12, color: AppTheme.muted),
    );
  }
}

/// 带 1px 分隔线的文章列表（对齐 .post-list / .post:first-child 无边框）。
class PostList extends StatelessWidget {
  const PostList({
    super.key,
    required this.articles,
    required this.onArticleTap,
    this.padding = const EdgeInsets.symmetric(horizontal: 16),
  });

  final List<Article> articles;
  final void Function(Article article) onArticleTap;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: List.generate(articles.length, (i) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (i > 0) const Divider(height: 1, color: AppTheme.line),
              PostListItem(
                article: articles[i],
                showDivider: false,
                onTap: () => onArticleTap(articles[i]),
              ),
            ],
          );
        }),
      ),
    );
  }
}
