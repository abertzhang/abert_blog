import 'package:flutter/material.dart';

import '../models/category.dart';
import '../theme/app_theme.dart';

/// 分类文案（对齐 doc/mobile-ui 静态稿首页/分类页的描述）。
const Map<String, String> kCategoryDescriptions = {
  'flutter': 'Dart 与 Flutter 工程的渲染、状态与性能实践。',
  'react': 'React 运行时、状态同步与大型应用的工程组织。',
  'nodejs': 'Node.js 运行时行为、服务端工程与线上问题排查。',
  'golang': 'Go 语言特性、并发模型与服务端工程实践。',
  'other': '暂未归类或跨栈的综合文章。',
};

/// 分类描述兜底：未知 slug 返回空串（由 UI 决定是否隐藏描述行）。
String categoryDescription(String slug) => kCategoryDescriptions[slug] ?? '';

/// 首页「文章分类」网格卡片（对齐 .cat-card）：
/// 边框卡片，名称（16px 半粗）+ 文章数（12px 次要色）+ 描述（13px 次要色）。
class CategoryCard extends StatelessWidget {
  const CategoryCard({
    super.key,
    required this.category,
    required this.onTap,
  });

  final Category category;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final desc = categoryDescription(category.slug);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppTheme.radius),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.bg,
          border: Border.all(color: AppTheme.line),
          borderRadius: BorderRadius.circular(AppTheme.radius),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              category.name,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppTheme.text,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '${category.articleCount} 篇文章',
              style: const TextStyle(fontSize: 12, color: AppTheme.muted),
            ),
            if (desc.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                desc,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, height: 1.5, color: AppTheme.muted),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
