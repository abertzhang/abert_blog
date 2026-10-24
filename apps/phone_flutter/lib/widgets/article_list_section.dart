import 'package:flutter/material.dart';

import '../models/article.dart';
import '../services/blog_api.dart';
import '../theme/app_theme.dart';
import 'post_list_item.dart';
import 'state_views.dart';

/// 文章列表区块（首页「最新文章」与分类页共用）。
///
/// 行为：
///   - 首次进入自动加载第 1 页；
///   - 下拉刷新重新加载；
///   - [autoLoadMore] 为 true 时滚动接近底部自动追加下一页（分类页长列表适用）；
///     为 false 时仅保留底部「加载更多」按钮（首页适用：避免自动加载
///     把「文章分类」网格推得太深，偏离设计稿意图）；
///   - 追加中展示「加载中」指示器，全部加载完展示「已加载全部文章」。
///
/// 注意：本组件自身不滚动（shrinkWrap 的 Column），
/// 由父页面的 CustomScrollView 统一滚动，保持单栏滚动的界面稿体验。
class ArticleListSection extends StatefulWidget {
  const ArticleListSection({
    super.key,
    required this.onArticleTap,
    this.categoryId,
    this.tag,
    this.pageSize = 12,
    this.scrollController,
    this.autoLoadMore = true,
  });

  final void Function(Article article) onArticleTap;

  /// 分类过滤（null 表示全站文章）
  final int? categoryId;

  /// 标签过滤（可选）
  final String? tag;

  final int pageSize;

  /// 父页面滚动控制器，用于触底检测
  final ScrollController? scrollController;

  /// 是否滚动触底自动加载下一页（默认 true；首页传 false）
  final bool autoLoadMore;

  @override
  State<ArticleListSection> createState() => ArticleListSectionState();
}

/// 列表区块状态（公开类：父页面通过 GlobalKey 调用 loadMore / refresh）。
class ArticleListSectionState extends State<ArticleListSection> {
  final List<Article> _items = [];
  int _page = 1;
  int _total = 0;

  /// 首次加载中
  bool _loading = true;

  /// 追加下一页中
  bool _loadingMore = false;

  /// 错误信息（null 表示无错误）
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadFirstPage();
    // 触底检测：开启自动加载时监听父级滚动，距底部 400px 以内追加下一页
    if (widget.autoLoadMore) {
      widget.scrollController?.addListener(_onScroll);
    }
  }

  @override
  void dispose() {
    widget.scrollController?.removeListener(_onScroll);
    super.dispose();
  }

  void _onScroll() {
    if (!mounted) return;
    final controller = widget.scrollController;
    if (controller == null || !controller.hasClients) return;
    final position = controller.position;
    if (position.pixels >= position.maxScrollExtent - 400) {
      loadMore();
    }
  }

  /// 下拉刷新：重新加载第一页。
  Future<void> refresh() => _loadFirstPage();

  Future<void> _loadFirstPage() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final p = await BlogApi.listArticles(
        page: 1,
        pageSize: widget.pageSize,
        categoryId: widget.categoryId,
        tag: widget.tag,
      );
      if (!mounted) return;
      setState(() {
        _items
          ..clear()
          ..addAll(p.list);
        _total = p.total;
        _page = 1;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// 追加下一页；已全部加载或正在加载时安全跳过。
  Future<void> loadMore() async {
    if (_loading || _loadingMore || _error != null) return;
    if (_items.length >= _total) return;
    setState(() => _loadingMore = true);
    try {
      final next = _page + 1;
      final p = await BlogApi.listArticles(
        page: next,
        pageSize: widget.pageSize,
        categoryId: widget.categoryId,
        tag: widget.tag,
      );
      if (!mounted) return;
      setState(() {
        _items.addAll(p.list);
        _page = next;
        _total = p.total;
      });
    } catch (_) {
      // 追加失败静默处理：保留已加载内容，用户可继续滚动重试
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const LoadingView(message: '正在加载文章…');
    }
    if (_error != null) {
      return ErrorView(message: '文章加载失败：$_error', onRetry: _loadFirstPage);
    }
    if (_items.isEmpty) {
      return const EmptyView(message: '该分类下暂无文章');
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        PostList(
          articles: _items,
          onArticleTap: widget.onArticleTap,
        ),
        _buildFooter(),
      ],
    );
  }

  Widget _buildFooter() {
    if (_loadingMore) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: Center(
          child: SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }
    if (_items.length >= _total) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: Center(
          child: Text(
            '— 已加载全部文章 —',
            style: TextStyle(fontSize: 12, color: AppTheme.muted),
          ),
        ),
      );
    }
    // 还有更多：展示手动「加载更多」按钮（触底自动加载之外的显式入口）
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: OutlinedButton(
          onPressed: loadMore,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTheme.accent,
            side: const BorderSide(color: AppTheme.line),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppTheme.radius),
            ),
          ),
          child: Text('加载更多（${_items.length}/$_total）'),
        ),
      ),
    );
  }
}
