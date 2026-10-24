import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// 底部 Tab 栏：首页 / 分类 / 关于。
///
/// 对齐 doc/mobile-ui 静态稿的 `.tabbar`：白底、顶部 1px 分隔线、
/// 等分三项、当前项为强调色加粗，最小高度 52。
class BlogBottomBar extends StatelessWidget {
  const BlogBottomBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  static const List<String> tabs = ['首页', '分类', '关于'];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.bg,
        border: Border(top: BorderSide(color: AppTheme.line)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 52,
          child: Row(
            children: List.generate(tabs.length, (i) {
              final active = i == currentIndex;
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  child: Center(
                    child: Text(
                      tabs[i],
                      style: TextStyle(
                        fontSize: 14,
                        color: active ? AppTheme.accent : AppTheme.muted,
                        fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
