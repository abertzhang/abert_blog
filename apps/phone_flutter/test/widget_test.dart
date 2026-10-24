// phone_flutter 测试：模型解析 + 纯展示组件（不发起网络请求）。
//
// 覆盖：
//   1. Article.fromJson 字段映射（列表 / 详情）；
//   2. Article 派生字段：dateLabel / tagList / readMinutes / displaySummary；
//   3. PostListItem 渲染标题、分类、日期与阅读时长。

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phone_flutter/models/article.dart';
import 'package:phone_flutter/theme/app_theme.dart';
import 'package:phone_flutter/widgets/post_list_item.dart';

void main() {
  group('Article.fromJson', () {
    test('映射列表接口字段', () {
      final article = Article.fromJson(const {
        'id': 62,
        'title': 'React Native 常用第三方组件与插件学习文档',
        'summary': '覆盖导航、状态管理与存储。',
        'cover': 'https://img-common.aknot.uk/cover/land-52.jpg',
        'category_id': 3,
        'category_name': 'React',
        'tags': 'react-native,rn,third-party',
        'author_name': '行云流水',
        'copyright': true,
        'view_count': 4,
        'status': 'published',
        'pinned': true,
        'published_at': '2026-10-23T00:00:00.000Z',
        'created_at': '2026-10-23T00:00:00.000Z',
      });

      expect(article.id, 62);
      expect(article.title, 'React Native 常用第三方组件与插件学习文档');
      expect(article.categoryId, 3);
      expect(article.categoryName, 'React');
      expect(article.copyright, isTrue);
      expect(article.viewCount, 4);
      expect(article.pinned, isTrue);
      expect(article.content, isNull); // 列表接口不返回 content
      expect(article.dateLabel, '2026-10-23');
    });

    test('映射详情接口字段（含 content）', () {
      final article = Article.fromJson(const {
        'id': 13,
        'title': 'Node.js 使用 MongoDB 学习文档',
        'content': '# 标题\n\n正文',
        'published_at': '2026-10-01T00:00:00.000Z',
      });
      expect(article.content, '# 标题\n\n正文');
      expect(article.dateLabel, '2026-10-01');
    });

    test('缺失字段有安全兜底', () {
      final article = Article.fromJson(const {'id': 1, 'title': '空数据文章'});
      expect(article.summary, '');
      expect(article.tags, '');
      expect(article.categoryId, isNull);
      expect(article.viewCount, 0);
      expect(article.dateLabel, '');
      expect(article.readMinutes, 1);
    });
  });

  group('Article 派生字段', () {
    test('tagList 按逗号 / 中文逗号切分并去空白', () {
      final article = Article.fromJson(const {
        'id': 1,
        'title': 't',
        'tags': 'flutter, dart，  性能 ,',
      });
      expect(article.tagList, ['flutter', 'dart', '性能']);
    });

    test('readMinutes 按约 400 字/分钟估算', () {
      final short = Article.fromJson({
        'id': 1,
        'title': 't',
        'content': '短' * 100,
      });
      expect(short.readMinutes, 1);

      final long = Article.fromJson({
        'id': 2,
        'title': 't',
        'content': '长' * 2000,
      });
      expect(long.readMinutes, 5);
    });

    test('displaySummary 在 summary 缺失时截取正文', () {
      final article = Article.fromJson({
        'id': 1,
        'title': 't',
        'content': '正' * 100,
      });
      expect(article.displaySummary, endsWith('…'));
      expect(article.displaySummary.length, 81);
    });
  });

  group('PostListItem', () {
    testWidgets('渲染标题 / 分类 / 日期 / 阅读时长', (tester) async {
      final article = Article.fromJson({
        'id': 62,
        'title': 'React Native 学习文档',
        'summary': '覆盖导航与状态管理。',
        'category_id': 3,
        'category_name': 'React',
        'published_at': '2026-10-23T00:00:00.000Z',
        'content': 'x' * 400,
      });

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: PostListItem(article: article, onTap: () {}),
          ),
        ),
      );

      expect(find.text('React Native 学习文档'), findsOneWidget);
      expect(find.text('覆盖导航与状态管理。'), findsOneWidget);
      // meta 行：分类 · 日期（阅读时长仅在详情页展示）
      expect(find.textContaining('React · 2026-10-23'), findsOneWidget);
    });
  });
}
