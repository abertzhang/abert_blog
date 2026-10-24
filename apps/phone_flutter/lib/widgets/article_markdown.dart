import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../theme/app_theme.dart';

/// 一个内容分段：正文文本或代码块。
typedef _Segment = ({bool isCode, String text, String lang});

/// 文章正文渲染。
///
/// 文章 content 为 Markdown（来自 md/zh-cn 文档）。渲染策略：
///   - 围栏代码块 ```lang ... ``` 单独取出，用 [_CodeCard] 渲染
///     （对齐界面稿 .code-block：语言标签 + 灰底 + 细边框 + 圆角 + 横向滚动）；
///   - 其余文本交给 flutter_markdown 的 MarkdownBody，
///     样式表对齐界面稿正文排版（标题层级 / 行内 code / 引用 / 链接）。
class ArticleMarkdown extends StatelessWidget {
  const ArticleMarkdown({super.key, required this.content});

  final String content;

  @override
  Widget build(BuildContext context) {
    // 去掉与页面标题重复的首个 H1（界面稿正文从标题下的 meta 行之后开始）
    final body = _stripLeadingH1(content);
    final segments = _splitSegments(body);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final seg in segments)
          if (seg.isCode)
            _CodeCard(code: seg.text, lang: seg.lang)
          else if (seg.text.trim().isNotEmpty)
            MarkdownBody(
              data: seg.text,
              shrinkWrap: true,
              selectable: false,
              styleSheet: _markdownStyleSheet,
              onTapLink: (text, href, title) {
                // 手机端暂不做内嵌浏览器，链接交给系统处理
                if (href != null) {
                  // 由页面层通过 url_launcher 打开；此处仅占位，暂不跳转
                }
              },
            ),
      ],
    );
  }

  /// 去掉正文第一个一级标题行（与页面大标题重复）。
  static String _stripLeadingH1(String raw) {
    final trimmed = raw.replaceFirst(RegExp(r'^\s*'), '');
    final lines = trimmed.split('\n');
    if (lines.isNotEmpty && lines.first.startsWith('# ')) {
      return lines.skip(1).join('\n');
    }
    return trimmed;
  }

  /// 按围栏代码块切分正文：非代码段与代码段交替。
  static List<_Segment> _splitSegments(String raw) {
    final segments = <_Segment>[];
    final lines = raw.split('\n');
    final textBuf = StringBuffer();
    var i = 0;

    void flushText() {
      if (textBuf.isNotEmpty) {
        segments.add((isCode: false, text: textBuf.toString(), lang: ''));
        textBuf.clear();
      }
    }

    while (i < lines.length) {
      final open = RegExp(r'^```(.*)$').firstMatch(lines[i]);
      if (open != null) {
        flushText();
        final lang = (open.group(1) ?? '').trim();
        final codeBuf = StringBuffer();
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeBuf.writeln(lines[i]);
          i++;
        }
        i++; // 跳过收尾围栏
        segments.add((
          isCode: true,
          text: codeBuf.toString().trimRight(),
          lang: lang,
        ));
      } else {
        textBuf.writeln(lines[i]);
        i++;
      }
    }
    flushText();
    return segments;
  }

  /// 对齐界面稿正文排版的 Markdown 样式表。
  static final MarkdownStyleSheet _markdownStyleSheet = MarkdownStyleSheet(
    p: const TextStyle(fontSize: 15, height: 1.7, color: AppTheme.text),
    h1: const TextStyle(
        fontSize: 22, fontWeight: FontWeight.w600, height: 1.4, color: AppTheme.text),
    h2: const TextStyle(
        fontSize: 20, fontWeight: FontWeight.w600, height: 1.4, color: AppTheme.text),
    h3: const TextStyle(
        fontSize: 17, fontWeight: FontWeight.w600, height: 1.5, color: AppTheme.text),
    h4: const TextStyle(
        fontSize: 16, fontWeight: FontWeight.w600, height: 1.5, color: AppTheme.text),
    listBullet: const TextStyle(fontSize: 15, height: 1.7, color: AppTheme.text),
    // 行内 code：灰底细边框小圆角（对齐界面稿 .post-body code）
    code: TextStyle(
      fontFamily: 'Menlo',
      fontSize: 13,
      height: 1.5,
      color: AppTheme.text,
      backgroundColor: AppTheme.surface,
    ),
    // 引用：左侧 2px 强调色竖线 + 次要色文字（对齐 .post-body blockquote）
    blockquote: const TextStyle(fontSize: 15, height: 1.7, color: AppTheme.muted),
    blockquotePadding: const EdgeInsets.only(left: 16, top: 2, bottom: 2),
    blockquoteDecoration: const BoxDecoration(
      border: Border(left: BorderSide(color: AppTheme.accent, width: 2)),
    ),
    a: const TextStyle(color: AppTheme.accent, fontSize: 15, height: 1.7),
    em: const TextStyle(fontSize: 15, height: 1.7, fontStyle: FontStyle.italic, color: AppTheme.text),
    strong: const TextStyle(fontSize: 15, height: 1.7, fontWeight: FontWeight.w600, color: AppTheme.text),
    blockSpacing: 18,
    h2Padding: const EdgeInsets.only(top: 30, bottom: 12),
    h3Padding: const EdgeInsets.only(top: 24, bottom: 10),
    listIndent: 20,
  );
}

/// 代码块卡片：语言标签 + 等宽代码 + 横向滚动（对齐 .code-block）。
class _CodeCard extends StatelessWidget {
  const _CodeCard({required this.code, required this.lang});

  final String code;
  final String lang;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        border: Border.all(color: AppTheme.line),
        borderRadius: BorderRadius.circular(AppTheme.radius),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 语言标签（无语言时展示通用 text）
          if (lang.isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppTheme.line)),
              ),
              child: Text(
                lang,
                style: const TextStyle(
                  fontSize: 11,
                  letterSpacing: 0.8,
                  color: AppTheme.muted,
                ),
              ),
            ),
          // 代码区：等宽字体 + 横向滚动
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: SelectableText(
                code,
                style: const TextStyle(
                  fontFamily: 'Menlo',
                  fontSize: 13,
                  height: 1.7,
                  color: AppTheme.text,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
