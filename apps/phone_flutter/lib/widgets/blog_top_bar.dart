import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// 站点顶部栏：左侧品牌「abert 博客」，右侧导航（首页 / 分类 / 关于）。
///
/// 对齐 doc/mobile-ui 静态稿的 `.app-bar`：白底、底部 1px 分隔线，
/// 当前页导航项为强调色 + 2px 下划线。
class BlogTopBar extends StatelessWidget {
  const BlogTopBar({
    super.key,
    required this.activeIndex,
    required this.onTabSelected,
  });

  /// 当前页索引：0 首页 / 1 分类 / 2 关于
  final int activeIndex;

  /// 点击导航项切换底部 Tab（由根容器 BlogHome 持有状态）
  final ValueChanged<int> onTabSelected;

  static const List<String> tabs = ['首页', '分类', '关于'];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.bg,
        border: Border(bottom: BorderSide(color: AppTheme.line)),
      ),
      child: SafeArea(
        bottom: false,
        child: Container(
          constraints: const BoxConstraints(maxWidth: AppTheme.contentMaxWidth),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          height: 48,
          child: Row(
            children: [
              // 品牌：点击回到首页
              GestureDetector(
                onTap: () => onTabSelected(0),
                child: const Text(
                  'abert 博客',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.text,
                  ),
                ),
              ),
              const Spacer(),
              // 右侧导航：当前页强调色 + 下划线
              Row(
                children: List.generate(tabs.length, (i) {
                  final active = i == activeIndex;
                  return Padding(
                    padding: const EdgeInsets.only(left: 16),
                    child: GestureDetector(
                      onTap: () => onTabSelected(i),
                      behavior: HitTestBehavior.opaque,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            tabs[i],
                            style: TextStyle(
                              fontSize: 14,
                              color: active ? AppTheme.text : AppTheme.muted,
                              fontWeight:
                                  active ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                          const SizedBox(height: 5),
                          // 占位保持对齐：非当前项用透明下划线
                          Container(
                            width: 18,
                            height: 2,
                            color: active ? AppTheme.accent : Colors.transparent,
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
