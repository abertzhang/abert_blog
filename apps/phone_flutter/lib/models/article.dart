/// 文章模型。
///
/// 字段与后端 `GET /blog/api/articles`（列表）与 `GET /blog/api/articles/:id`
/// （详情，多出 content）返回一致，见 doc/web_react_api.md 第 2.3 节。
class Article {
  const Article({
    required this.id,
    required this.title,
    this.summary = '',
    this.content,
    this.cover = '',
    this.categoryId,
    this.categoryName = '',
    this.tags = '',
    this.authorName = '',
    this.copyright = false,
    this.viewCount = 0,
    this.publishedAt,
    this.createdAt,
    this.pinned = false,
  });

  final int id;
  final String title;

  /// 摘要（列表卡片展示）
  final String summary;

  /// Markdown 正文（仅详情接口返回）
  final String? content;

  /// 封面图 URL（当前文章多为公共图床随机封面，UI 以列表卡片为主，不强依赖）
  final String cover;

  final int? categoryId;

  /// 分类名称（后端冗余返回，前端直接展示）
  final String categoryName;

  /// 逗号 / 中文逗号分隔的标签串，如 "react-native,rn,third-party"
  final String tags;

  final String authorName;

  /// 是否声明版权（展示 © 标记）
  final bool copyright;

  /// 浏览量
  final int viewCount;

  /// 发布时间（ISO 8601）
  final String? publishedAt;

  /// 创建时间（ISO 8601）
  final String? createdAt;

  /// 是否置顶
  final bool pinned;

  factory Article.fromJson(Map<String, dynamic> json) {
    return Article(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: (json['title'] as String?) ?? '',
      summary: (json['summary'] as String?) ?? '',
      content: json['content'] as String?,
      cover: (json['cover'] as String?) ?? '',
      categoryId: (json['category_id'] as num?)?.toInt(),
      categoryName: (json['category_name'] as String?) ?? '',
      tags: (json['tags'] as String?) ?? '',
      authorName: (json['author_name'] as String?) ?? '',
      copyright: json['copyright'] == true,
      viewCount: (json['view_count'] as num?)?.toInt() ?? 0,
      publishedAt: json['published_at'] as String?,
      createdAt: json['created_at'] as String?,
      pinned: json['pinned'] == true,
    );
  }

  /// 日期展示（YYYY-MM-DD）；published_at 缺失时回退 created_at，再兜底空串。
  String get dateLabel {
    final raw = publishedAt ?? createdAt;
    if (raw == null || raw.isEmpty) return '';
    // ISO 串形如 2026-10-23T00:00:00.000Z，取前 10 位即可
    return raw.length >= 10 ? raw.substring(0, 10) : raw;
  }

  /// 标签列表：按逗号 / 中文逗号切分并去空白。
  List<String> get tagList => tags
      .split(RegExp(r'[,，]'))
      .map((t) => t.trim())
      .where((t) => t.isNotEmpty)
      .toList(growable: false);

  /// 阅读时长估算（分钟）：中文按约 400 字/分钟，至少 1 分钟。
  int get readMinutes {
    final text = content ?? summary;
    if (text.isEmpty) return 1;
    final minutes = (text.length / 400).ceil();
    return minutes < 1 ? 1 : minutes;
  }

  /// 列表卡片摘要兜底：summary 为空时截取正文前 80 字（对齐前端行为）。
  String get displaySummary {
    final s = summary.trim();
    if (s.isNotEmpty) return s;
    final c = (content ?? '').trim();
    if (c.isEmpty) return '';
    return c.length > 80 ? '${c.substring(0, 80)}…' : c;
  }
}

/// 分页列表响应（`GET /articles` 的 data）。
class Paginated<T> {
  const Paginated({
    required this.list,
    required this.total,
    required this.page,
    required this.pageSize,
  });

  final List<T> list;
  final int total;
  final int page;
  final int pageSize;

  bool get hasMore => page * pageSize < total;

  factory Paginated.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) itemParser,
  ) {
    final rawList = (json['list'] as List<dynamic>?) ?? const [];
    return Paginated<T>(
      list: rawList
          .map((e) => itemParser(e as Map<String, dynamic>))
          .toList(growable: false),
      total: (json['total'] as num?)?.toInt() ?? 0,
      page: (json['page'] as num?)?.toInt() ?? 1,
      pageSize: (json['page_size'] as num?)?.toInt() ?? 0,
    );
  }
}
