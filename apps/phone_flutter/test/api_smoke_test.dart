// 后端联调冒烟测试：不走 UI，直接用 App 的 ApiClient / BlogApi 代码路径
// 请求 api_express（/blog/api），验证分类、文章列表、文章详情全链路。
//
// 为什么放在 test/ 而不是 tool/：
//   api_client.dart 引用了 package:flutter/foundation.dart（kIsWeb），
//   纯 `dart run`（VM 模式）下 dart:ui 不可用会编译失败；
//   `flutter test` 的测试平台自带 dart:ui 实现，是这类「跑 App 代码路径」脚本的正确载体。
//
// 运行方式（在 apps/phone_flutter 目录下）：
//   flutter test test/api_smoke_test.dart
// 指定其它后端地址（真机 / 部署环境）：
//   flutter test test/api_smoke_test.dart --dart-define=API_BASE_URL=http://<主机IP>:3001/blog/api
//
// ignore_for_file: avoid_print —— 本文件为联调冒烟工具，print 即预期输出方式
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_flutter/services/api_client.dart';
import 'package:phone_flutter/services/blog_api.dart';

void main() {
  // 联调依赖真实后端（api_express :3001 + postgres 5433）在线；
  // 后端未启动时本测试会失败——这是预期行为（冒烟的意义就在于发现后端不在线）。
  test('API 冒烟：分类 / 列表 / 详情 / 分类过滤 / 热门 全链路', () async {
    print('baseUrl = ${ApiClient.baseUrl}');

    // 1. 分类列表
    final categories = await BlogApi.listCategories();
    print('\n[1] 分类（${categories.length} 个）：');
    for (final c in categories) {
      print('  - #${c.id} ${c.name} (${c.slug}) sort=${c.sort} 文章数=${c.articleCount}');
    }
    expect(categories.isNotEmpty, true, reason: '分类列表不应为空');

    // 2. 文章分页列表（第一页）
    final firstPage = await BlogApi.listArticles(page: 1, pageSize: 5);
    print('\n[2] 文章列表：total=${firstPage.total} page=${firstPage.page} '
        'pageSize=${firstPage.pageSize} hasMore=${firstPage.hasMore}');
    for (final a in firstPage.list) {
      print('  - #${a.id} [${a.categoryName}] ${a.title} '
          '(${a.dateLabel}, ${a.readMinutes} 分钟, tags=${a.tagList.length})');
    }
    expect(firstPage.list.isNotEmpty, true, reason: '文章列表不应为空');

    // 3. 文章详情（含 Markdown 正文）
    final target = firstPage.list.first;
    final detail = await BlogApi.getArticle(target.id);
    print('\n[3] 文章详情 #${detail.id}：${detail.title}');
    final content = detail.content ?? '';
    print('  content 长度=${content.length}，'
        '前 60 字：${content.substring(0, content.length < 60 ? content.length : 60).replaceAll('\n', ' ')}…');
    expect(content.isNotEmpty, true, reason: '文章正文不应为空');

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
  });
}
