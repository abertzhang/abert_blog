import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/blog_top_bar.dart';
import 'home_page.dart' show SiteFooter;

/// 关于页：个人简介 / 技能与技术栈 / 联系方式 / 站点说明。
///
/// 内容对齐 doc/mobile-ui/about.html（已按真实博客去掉「演示稿」措辞）。
class AboutPage extends StatelessWidget {
  const AboutPage({super.key, required this.onTabSelected});

  final ValueChanged<int> onTabSelected;

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
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
            activeIndex: 2,
            onTabSelected: onTabSelected,
          ),
        ),

        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                // hero
                Text('关于',
                    style: TextStyle(
                        fontSize: 12,
                        letterSpacing: 1.6,
                        color: AppTheme.muted)),
                SizedBox(height: 10),
                Text('关于本站',
                    style: TextStyle(
                        fontSize: 26,
                        height: 1.32,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.3,
                        color: AppTheme.text)),
                SizedBox(height: 12),
                Text(
                  '一个只写长文的技术博客：把一个问题的来龙去脉写清楚，'
                  '而不是只给出可以复制的答案。',
                  style: TextStyle(fontSize: 15, height: 1.7, color: AppTheme.muted),
                ),

                // 个人简介
                _AboutSection(
                  title: '个人简介',
                  children: [
                    Text(
                      '我是 abert，客户端与服务端都写。日常工作集中在跨端应用的性能与架构，'
                      '以及支撑它的服务端工程与可观测性建设。',
                      style: TextStyle(fontSize: 15, height: 1.7, color: AppTheme.text),
                    ),
                    SizedBox(height: 14),
                    Text(
                      '这个博客用来存放那些在项目里被反复问起、但很少被完整写下来的问题：'
                      '为什么这样设计、边界在哪里、当时的取舍是什么。'
                      '文章尽量给出可验证的判断依据，而不是模糊的经验之谈。',
                      style: TextStyle(fontSize: 15, height: 1.7, color: AppTheme.text),
                    ),
                  ],
                ),

                // 技能与技术栈
                _AboutSection(
                  title: '技能与技术栈',
                  children: [
                    _FactRow(term: 'Flutter', detail: 'Dart、Riverpod / Bloc、自定义绘制与渲染管线、DevTools 性能分析'),
                    _FactRow(term: 'React', detail: 'Hooks 与并发特性、状态同步、组件库设计与大型应用结构'),
                    _FactRow(term: 'NodeJs', detail: 'HTTP 服务与网关、异步 IO 与事件循环、内存与性能排查'),
                    _FactRow(term: 'Golang', detail: '并发模型与 context、泛型、服务可观测性与 pprof 分析'),
                    _FactRow(term: '工程与工具', detail: 'TypeScript、CI 流水线、可观测性建设、性能与稳定性治理'),
                  ],
                ),

                // 联系方式
                _AboutSection(
                  title: '联系方式',
                  children: [
                    _FactRow(term: '邮箱', detail: 'hello@example.com'),
                    _FactRow(term: 'GitHub', detail: 'github.com/yourname'),
                    _FactRow(term: '本站内容', detail: '长文笔记与技术复盘，不转载、不投放广告'),
                  ],
                ),

                // 站点说明
                _AboutSection(
                  title: '站点说明',
                  children: [
                    _Bullet(text: '内容范围：Flutter、React、NodeJs 与 Golang 四类技术文章。'),
                    _Bullet(text: '更新节奏：以完整长文为主，不追求高频更新。'),
                    _Bullet(text: '阅读体验：正文单栏排版，代码块可横向滚动，不加载任何外部资源。'),
                  ],
                ),
              ],
            ),
          ),
        ),

        const SliverToBoxAdapter(child: SiteFooter()),
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

/// 关于页小节：标题 + 内容（对齐 .about-block）。
class _AboutSection extends StatelessWidget {
  const _AboutSection({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: AppTheme.text,
            ),
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

/// 键值行：术语（半粗）+ 明细（次要色）（对齐 .fact dt/dd）。
class _FactRow extends StatelessWidget {
  const _FactRow({required this.term, required this.detail});

  final String term;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppTheme.line)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            term,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppTheme.text,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            detail,
            style: const TextStyle(fontSize: 15, height: 1.7, color: AppTheme.muted),
          ),
        ],
      ),
    );
  }
}

/// 项目符号行（对齐 .about-block ul li）。
class _Bullet extends StatelessWidget {
  const _Bullet({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 10, right: 10),
            width: 4,
            height: 4,
            decoration: const BoxDecoration(
              color: AppTheme.muted,
              shape: BoxShape.circle,
            ),
          ),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 15, height: 1.7, color: AppTheme.text),
            ),
          ),
        ],
      ),
    );
  }
}
