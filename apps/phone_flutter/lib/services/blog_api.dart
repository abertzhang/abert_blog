import '../models/article.dart';
import '../models/category.dart';
import 'api_client.dart';

/// 博客接口封装。
///
/// 与 web_react 前端（src/api/blog.ts）调用同一套 /blog/api 接口，
/// 手机端按 UI 只读需要：分类、文章列表/详情、热门文章、标签。
/// 写操作（登录 / 评论 / 后台管理）暂不在手机 UI 范围内，后续需要时再补。
class BlogApi {
  BlogApi._();

  // ---------- 分类 ----------

  /// GET /categories —— 分类列表（含每个分类的已发布文章数）
  static Future<List<Category>> listCategories() async {
    final data = await ApiClient.get('/categories');
    final list = data['data'];
    if (list is! List) return const [];
    return list
        .map((e) => Category.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
  }

  // ---------- 文章 ----------

  /// GET /articles —— 文章分页列表（仅已发布），支持分类与标签过滤。
  ///
  /// 对应后端 query：page / page_size / category_id / tag。
  static Future<Paginated<Article>> listArticles({
    int page = 1,
    int pageSize = 12,
    int? categoryId,
    String? tag,
  }) async {
    final data = await ApiClient.get('/articles', query: {
      'page': '$page',
      'page_size': '$pageSize',
      'category_id': categoryId == null ? null : '$categoryId',
      'tag': tag,
    });
    return Paginated<Article>.fromJson(data, Article.fromJson);
  }

  /// GET /articles/:id —— 文章详情（含 Markdown 正文），后端会自增浏览量。
  static Future<Article> getArticle(int id) async {
    final data = await ApiClient.get('/articles/$id');
    return Article.fromJson(data);
  }

  // ---------- 热度 / 标签 ----------

  /// GET /hot —— 热门文章（按浏览量降序）。
  static Future<List<Article>> hotArticles({int limit = 10}) async {
    final data = await ApiClient.get('/hot', query: {'limit': '$limit'});
    final list = data['data'];
    if (list is! List) return const [];
    return list
        .map((e) => Article.fromJson(e as Map<String, dynamic>))
        .toList(growable: false);
  }

  /// GET /tags —— 标签列表（词频，当前 UI 预留，如标签云页可扩展）。
  static Future<List<({String word, int count})>> listTags() async {
    final data = await ApiClient.get('/tags');
    final list = data['data'];
    if (list is! List) return const [];
    return list
        .map((e) => (
              word: (e['word'] as String?) ?? '',
              count: (e['count'] as num?)?.toInt() ?? 0,
            ))
        .toList(growable: false);
  }
}
