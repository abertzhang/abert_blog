import 'package:flutter/material.dart';

import '../models/article.dart';
import '../models/category.dart';
import '../services/blog_api.dart';
import '../theme/app_theme.dart';
import '../widgets/article_list_section.dart';
import '../widgets/blog_top_bar.dart';
import '../widgets/category_card.dart';
import '../widgets/state_views.dart';

/// 首页：hero（个人技术博客 / abert 博客 / 一句简介）
/// + 「最新文章」列表（分页 + 触底加载 + 下拉刷新）
/// + 「文章分类」卡片网格。
///
/// 布局与内容对齐 doc/mobile-ui/index.html。
class HomePage extends StatefulWidget {
  const HomePage({
    super.key,
    required this.onTabSelected,
    required this.onCategorySelected,
    required this.onArticleTap,
  });

  /// 切换底部 Tab（0 首页 / 1 分类 / 2 关于）
  final ValueChanged<int> onTabSelected;

  /// 点击分类卡片：跳到分类页并选中该分类
  final void Function(Category category) onCategorySelected;

  /// 打开文章详情
  final void Function(Article article) onArticleTap;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final ScrollController _scrollController = ScrollController();

  /// 文章列表的 key：用于触底时调用 loadMore
  final GlobalKey<ArticleListSectionState> _listKey =
      GlobalKey<ArticleListSectionState>();

  /// 分类数据（用于「文章分类」网格）
  List<Category> _categories = const [];
  bool _categoriesLoading = true;
  String? _categoriesError;

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

  Future<void> _loadCategories() async {
    setState(() {
      _categoriesLoading = true;
      _categoriesError = null;
    });
    try {
      final list = await BlogApi.listCategories();
      if (!mounted) return;
      setState(() => _categories = list);
    } catch (e) {
      if (!mounted) return;
      setState(() => _categoriesError = e.toString());
    } finally {
      if (mounted) setState(() => _categoriesLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        // 同时刷新文章列表与分类数据
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
          // 顶部栏（sticky）
          SliverAppBar(
            pinned: true,
            automaticallyImplyLeading: false,
            toolbarHeight: 48,
            backgroundColor: AppTheme.bg,
            surfaceTintColor: Colors.transparent,
            elevation: 0,
            scrolledUnderElevation: 0,
            flexibleSpace: BlogTopBar(
              activeIndex: 0,
              onTabSelected: widget.onTabSelected,
            ),
          ),

          // hero：eyebrow + 大标题 + 简介
          SliverToBoxAdapter(
            child: _ContentPadding(
              child: Padding(
                padding: const EdgeInsets.only(top: 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      '个人技术博客',
                      style: TextStyle(
                        fontSize: 12,
                        letterSpacing: 1.6,
                        color: AppTheme.muted,
                      ),
                    ),
                    SizedBox(height: 10),
                    Text(
                      'abert 博客',
                      style: TextStyle(
                        fontSize: 26,
                        height: 1.32,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.3,
                        color: AppTheme.text,
                      ),
                    ),
                    SizedBox(height: 12),
                    Text(
                      '记录 Flutter、React、NodeJs 与 Golang 的工程实践：'
                      '写清楚一次更新的代价、一段代码的边界，以及问题真正被定位的那个瞬间。',
                      style: TextStyle(fontSize: 15, height: 1.7, color: AppTheme.muted),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // 「最新文章」小节标题
          SliverToBoxAdapter(
            child: _SectionHead(
              title: '最新文章',
              actionText: '查看全部分类',
              onAction: () => widget.onTabSelected(1),
            ),
          ),

          // 文章列表（自带加载态 / 分页 / 手动加载更多）
          SliverToBoxAdapter(
            child: ArticleListSection(
              key: _listKey,
              scrollController: _scrollController,
              // 首页不自动加载：第一页 + 手动「加载更多」，
              // 避免把下方「文章分类」网格推得太深
              autoLoadMore: false,
              onArticleTap: widget.onArticleTap,
            ),
          ),

          // 「文章分类」小节标题
          SliverToBoxAdapter(
            child: _SectionHead(
              title: '文章分类',
              trailing: _categoriesLoading
                  ? null
                  : Text('共 ${_categories.length} 个分类 · '
                      '${_totalArticles()} 篇文章'),
            ),
          ),

          // 分类卡片网格（2 列）
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverToBoxAdapter(child: _buildCategoryGrid()),
          ),

          // 页脚 + 底部 TabBar 安全间距
          const SliverToBoxAdapter(child: SiteFooter()),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }

  int _totalArticles() =>
      _categories.fold(0, (sum, c) => sum + c.articleCount);

  Widget _buildCategoryGrid() {
    if (_categoriesLoading) {
      return const LoadingView(message: '正在加载分类…');
    }
    if (_categoriesError != null) {
      return ErrorView(message: '分类加载失败：$_categoriesError', onRetry: _loadCategories);
    }
    if (_categories.isEmpty) {
      return const EmptyView(message: '暂无分类');
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Wrap(
        spacing: 12,
        runSpacing: 12,
        children: [
          for (final c in _categories)
            Builder(builder: (context) {
              // 卡片宽度 = (屏宽 - 页面左右边距 32 - 卡片间距 12) / 2
              final cardWidth =
                  (MediaQuery.of(context).size.width - 32 - 12) / 2;
              return SizedBox(
                width: cardWidth,
                child: CategoryCard(
                  category: c,
                  onTap: () => widget.onCategorySelected(c),
                ),
              );
            }),
        ],
      ),
    );
  }
}

/// 小节标题：左标题 + 右动作/统计（对齐 .section-head）。
class _SectionHead extends StatelessWidget {
  const _SectionHead({required this.title, this.actionText, this.onAction, this.trailing});

  final String title;
  final String? actionText;
  final VoidCallback? onAction;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return _ContentPadding(
      child: Padding(
        padding: const EdgeInsets.only(top: 32, bottom: 18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: AppTheme.text,
              ),
            ),
            const Spacer(),
            if (trailing != null)
              DefaultTextStyle.merge(
                style: const TextStyle(fontSize: 12, color: AppTheme.muted),
                child: trailing!,
              )
            else if (actionText != null)
              GestureDetector(
                onTap: onAction,
                behavior: HitTestBehavior.opaque,
                child: Text(
                  actionText!,
                  style: const TextStyle(fontSize: 13, color: AppTheme.accent),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// 内容水平边距容器：与界面稿 .wrap 对齐（左右 16px）。
class _ContentPadding extends StatelessWidget {
  const _ContentPadding({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: child,
    );
  }
}

/// 站点页脚（对齐 .site-footer）。
class SiteFooter extends StatelessWidget {
  const SiteFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 32),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppTheme.line)),
      ),
      child: const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '© 2026 abert 博客 · Flutter · React · NodeJs · Golang',
              style: TextStyle(fontSize: 12, color: AppTheme.muted),
            ),
          ],
        ),
      ),
    );
  }
}
