import 'package:flutter/material.dart';

import 'models/article.dart';
import 'models/category.dart';
import 'pages/about_page.dart';
import 'pages/article_page.dart';
import 'pages/category_page.dart';
import 'pages/home_page.dart';
import 'theme/app_theme.dart';
import 'widgets/blog_bottom_bar.dart';

/// 应用入口：abert 博客手机版。
///
/// 数据来自 apps/api_express（Express + PostgreSQL，/blog/api 前缀），
/// 界面实现参照 doc/mobile-ui 静态稿（首页 / 分类 / 关于 / 文章详情）。
void main() {
  runApp(const BlogApp());
}

class BlogApp extends StatelessWidget {
  const BlogApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'abert 博客',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const BlogHome(),
    );
  }
}

/// 根容器：持有底部 Tab 状态，三页用 IndexedStack 保留各自滚动/加载状态。
class BlogHome extends StatefulWidget {
  const BlogHome({super.key});

  @override
  State<BlogHome> createState() => _BlogHomeState();
}

class _BlogHomeState extends State<BlogHome> {
  /// 当前底部 Tab：0 首页 / 1 分类 / 2 关于
  int _tab = 0;

  /// 从首页分类卡片跳转分类页时预选的分类 id
  int? _pendingCategoryId;

  void _onTabSelected(int index) {
    setState(() => _tab = index);
  }

  void _onCategorySelected(Category category) {
    setState(() {
      _tab = 1;
      _pendingCategoryId = category.id;
    });
  }

  void _onArticleTap(Article article) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ArticlePage(articleId: article.id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: IndexedStack(
        index: _tab,
        children: [
          HomePage(
            onTabSelected: _onTabSelected,
            onCategorySelected: _onCategorySelected,
            onArticleTap: _onArticleTap,
          ),
          CategoryPage(
            key: ValueKey(_pendingCategoryId),
            initialCategoryId: _pendingCategoryId,
            onTabSelected: _onTabSelected,
            onArticleTap: _onArticleTap,
          ),
          AboutPage(onTabSelected: _onTabSelected),
        ],
      ),
      bottomNavigationBar: BlogBottomBar(
        currentIndex: _tab,
        onTap: _onTabSelected,
      ),
    );
  }
}
