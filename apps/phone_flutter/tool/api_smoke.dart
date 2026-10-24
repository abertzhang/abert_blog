// 后端联调冒烟脚本：不走 UI，直接用 App 的 ApiClient / BlogApi 代码路径
// 请求 api_express（/blog/api），验证分类、文章列表、文章详情全链路。
//
// 运行方式（在 apps/phone_flutter 目录下）：
//   dart run tool/api_smoke.dart
// 指定其它后端地址（真机 / 部署环境）：
//   dart run tool/api_smoke.dart --dart-define=API_BASE_URL=http://<主机IP>:3001/blog/api
//
// ignore_for_file: avoid_print —— 本文件为命令行联调工具，print 即预期输出方式
import 'package:phone_flutter/services/api_client.dart';
import 'package:phone_flutter/services/blog_api.dart';

Future<void> main(List<String> args) async {
  print('baseUrl = ${ApiClient.baseUrl}');

  // 1. 分类列表
  final categories = await BlogApi.listCategories();
  print('\n[1] 分类（${categories.length} 个）：');
  for (final c in categories) {
    print('  - #${c.id} ${c.name} (${c.slug}) sort=${c.sort} 文章数=${c.articleCount}');
  }
  if (categories.isEmpty) throw StateError('分类列表为空');

  // 2. 文章分页列表（第一页）
  final firstPage = await BlogApi.listArticles(page: 1, pageSize: 5);
  print('\n[2] 文章列表：total=${firstPage.total} page=${firstPage.page} '
      'pageSize=${firstPage.pageSize} hasMore=${firstPage.hasMore}');
  for (final a in firstPage.list) {
    print('  - #${a.id} [${a.categoryName}] ${a.title} '
        '(${a.dateLabel}, ${a.readMinutes} 分钟, tags=${a.tagList.length})');
  }
  if (firstPage.list.isEmpty) throw StateError('文章列表为空');

  // 3. 文章详情（含 Markdown 正文）
  final target = firstPage.list.first;
  final detail = await BlogApi.getArticle(target.id);
  print('\n[3] 文章详情 #${detail.id}：${detail.title}');
  print('  content 长度=${detail.content?.length ?? 0}，'
      '前 60 字：${(detail.content ?? '').substring(0, detail.content!.length < 60 ? detail.content!.length : 60).replaceAll('\n', ' ')}…');
  if ((detail.content ?? '').isEmpty) throw StateError('文章正文为空');

  // 4. 按分类过滤（验证 category_id query）
  final cat = categories.first;
  final byCat = await BlogApi.listArticles(page: 1, pageSize: 3, categoryId: cat.id);
  print('\n[4] 分类「${cat.name}」文章：total=${byCat.total}，返回 ${byCat.list.length} 条');
  for (final a in byCat.list) {
    print('  - #${a.id} [${a.categoryName}] ${a.title}');
  }

  // 5. 热门文章
  final hot = await BlogApi.hotArticles(limit: 5);
  print('\n[5] 热门文章（${hot.length} 条）：');
  for (final a in hot) {
    print('  - #${a.id} ${a.title} (views=${a.viewCount})');
  }

  print('\n✅ 联调冒烟通过：后端 /blog/api 全链路正常');
}
