/// 分类模型。
///
/// 字段与后端 `GET /blog/api/categories` 返回一致：
/// { id, name, slug, sort, article_count }（article_count 为已发布文章数）。
class Category {
  const Category({
    required this.id,
    required this.name,
    required this.slug,
    required this.sort,
    required this.articleCount,
  });

  final int id;
  final String name;

  /// 英文 slug：flutter / react / nodejs / golang / other
  final String slug;

  /// 排序权重，升序展示，「其他」固定 99 排最后
  final int sort;

  /// 该分类下已发布文章数
  final int articleCount;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: (json['name'] as String?) ?? '',
      slug: (json['slug'] as String?) ?? '',
      sort: (json['sort'] as num?)?.toInt() ?? 0,
      articleCount: (json['article_count'] as num?)?.toInt() ?? 0,
    );
  }
}
