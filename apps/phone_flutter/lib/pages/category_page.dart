import 'package:flutter/material.dart';

import '../models/article.dart';
import '../models/category.dart';
import '../services/blog_api.dart';
import '../theme/app_theme.dart';
import '../widgets/article_list_section.dart';
import '../widgets/blog_top_bar.dart';
import '../widgets/category_card.dart';
import '../widgets/state_views.dart';

/// 分类页：顶部 Tab（各分类 + 文章数）+ 当前分类的文章列表。
///
/// 布局与内容对齐 doc/mobile-ui/category.html：
/// hero（分类 / 文章分类 / 归档说明）→ 可横向滚动的分类 Tab →
/// 当前分类的标题、文章数、描述与文章列表。
class CategoryPage extends StatefulWidget {
  const CategoryPage({
    super.key,
    required this.onTabSelected,
    required this.onArticleTap,
    this.initialCategoryId,
  });

  final ValueChanged<int> onTabSelected;
  final void Function(Article article) onArticleTap;

  /// 从首页分类卡片跳入时预选的分类 id
  final int? initialCategoryId;

  @override
  State<CategoryPage> createState() => _CategoryPageState();
}

class _CategoryPageState extends State<CategoryPage> {
  final ScrollController _scrollController = ScrollController();

  /// 当前选中分类的文章列表 key（切换分类时重建以重新加载）
  GlobalKey<ArticleListSectionState> _listKey =
      GlobalKey<ArticleListSectionState>();

  List<Category> _categories = const [];
  bool _loading = true;
  String? _error;
  int _selected = 0;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(CategoryPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 首页再次点击分类卡片：同步切换选中项
    final target = widget.initialCategoryId;
    if (target != null && target != oldWidget.initialCategoryId) {
      _selectCategoryById(target);
    }
  }

  Future<void> _loadCategories() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await BlogApi.listCategories();
      if (!mounted) return;
      setState(() => _categories = list);
      // 若指定了预选分类，则选中之
      final target = widget.initialCategoryId;
      if (target != null) {
        _selectCategoryById(target);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _selectCategoryById(int id) {
    final index = _categories.indexWhere((c) => c.id == id);
    if (index >= 0 && index != _selected) {
      setState(() {
        _selected = index;
        // 新 key：切换分类后文章列表重新加载
        _listKey = GlobalKey<ArticleListSectionState>();
      });
    }
  }

  void _onTabTap(int index) {
    if (index == _selected) return;
    setState(() {
      _selected = index;
      _listKey = GlobalKey<ArticleListSectionState>();
    });
  }

  Category? get _currentCategory =>
      _categories.isEmpty ? null : _categories[_selected];

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait([
          _listKey.currentState?.refresh() ?? Future<void>.value(),
          _loadCategories(),
        ]);
      },
      color: AppTheme.accent,
      backgroundColor: AppTheme.bg,
      child: CustomScrollView(
        controller: _scrollController,
        slivers: [
          SliverAppBar(
            pinned: true,
            automaticallyImplyLeading: false,
            toolbarHeight: 48,
            backgroundColor: AppTheme.bg,
            surfaceTintColor: Colors.transparent,
            elevation: 0,
            scrolledUnderElevation: 0,
            flexibleSpace: BlogTopBar(
              activeIndex: 1,
              onTabSelected: widget.onTabSelected,
            ),
          ),

          // hero
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('分类',
                      style: TextStyle(
                          fontSize: 12, letterSpacing: 1.6, color: AppTheme.muted)),
                  SizedBox(height: 10),
                  Text('文章分类',
                      style: TextStyle(
                          fontSize: 26,
                          height: 1.32,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.3,
                          color: AppTheme.text)),
                  SizedBox(height: 12),
                  Text(
                    '按技术栈归档：Flutter、React、NodeJs 与 Golang。'
                    '每个分类下按发布时间由新到旧排列。',
                    style: TextStyle(fontSize: 15, height: 1.7, color: AppTheme.muted),
                  ),
                ],
              ),
            ),
          ),

          // 分类 Tab（横向滚动，对齐 .cat-nav）
          SliverToBoxAdapter(child: _buildTabBar()),

          // 当前分类面板
          SliverToBoxAdapter(child: _buildPanel()),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    if (_loading) {
      return const LoadingView(message: '正在加载分类…');
    }
    if (_error != null) {
      return ErrorView(message: '分类加载失败：$_error', onRetry: _loadCategories);
    }
    if (_categories.isEmpty) {
      return const EmptyView(message: '暂无分类');
    }
    return Container(
      margin: const EdgeInsets.only(top: 20),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppTheme.line)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: [
            for (var i = 0; i < _categories.length; i++)
              _CategoryTab(
                label: '${_categories[i].name}（${_categories[i].articleCount}）',
                active: i == _selected,
                onTap: () => _onTabTap(i),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPanel() {
    final category = _currentCategory;
    if (category == null) return const SizedBox.shrink();

    final desc = categoryDescription(category.slug);
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 面板标题：分类名 + 文章数
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  category.name,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.text,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${category.articleCount} 篇文章',
                  style: const TextStyle(fontSize: 12, color: AppTheme.muted),
                ),
              ],
            ),
          ),
          if (desc.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              child: Text(
                desc,
                style: const TextStyle(fontSize: 14, color: AppTheme.muted),
              ),
            ),
          // 当前分类文章列表（切换分类时通过 key 重建）
          ArticleListSection(
            key: _listKey,
            categoryId: category.id,
            scrollController: _scrollController,
            onArticleTap: widget.onArticleTap,
          ),
        ],
      ),
    );
  }
}

/// 单个分类 Tab：当前项文字深色 + 底部 2px 强调色下划线（对齐 .tab[aria-current]）。
class _CategoryTab extends StatelessWidget {
  const _CategoryTab({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.only(right: 14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 10, bottom: 10),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  color: active ? AppTheme.text : AppTheme.muted,
                  fontWeight: active ? FontWeight.w500 : FontWeight.w400,
                ),
              ),
            ),
            Container(
              height: 2,
              width: 24,
              color: active ? AppTheme.accent : Colors.transparent,
            ),
          ],
        ),
      ),
    );
  }
}
