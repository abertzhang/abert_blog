import 'package:flutter/material.dart';

/// 博客应用的设计令牌与主题。
///
/// 颜色 / 圆角 / 字号全部对齐 `doc/mobile-ui` 的静态界面稿（见其 CSS 变量）：
///   --bg:#ffffff  --surface:#f7f7f5  --text:#111318  --muted:#6f7480
///   --line:#e6e6e3 --accent:#14427f  --radius:6px
/// 字体栈对齐界面稿的 --font-sans（PingFang SC / -apple-system），
/// 代码块使用等宽字体（Menlo / Consolas）。
class AppTheme {
  AppTheme._();

  // ---------- 设计令牌 ----------
  /// 页面背景（界面稿 --bg）
  static const Color bg = Color(0xFFFFFFFF);

  /// 次级表面背景，代码块 / 输入框等（界面稿 --surface）
  static const Color surface = Color(0xFFF7F7F5);

  /// 主文本色（界面稿 --text）
  static const Color text = Color(0xFF111318);

  /// 次要文本色，meta / 摘要 / 说明（界面稿 --muted）
  static const Color muted = Color(0xFF6F7480);

  /// 分隔线 / 边框色（界面稿 --line）
  static const Color line = Color(0xFFE6E6E3);

  /// 品牌强调色，链接 / 当前导航 / 分类名（界面稿 --accent）
  static const Color accent = Color(0xFF14427F);

  /// 统一圆角（界面稿 --radius:6px）
  static const double radius = 6;

  /// 正文单栏最大宽度（界面稿 .wrap max-width:480px，桌面/平板居中）
  static const double contentMaxWidth = 480;

  /// 等宽代码字体（界面稿 --font-mono）
  static const List<String> monoFontFallback = ['Menlo', 'Consolas', 'monospace'];

  // ---------- 主题 ----------
  static ThemeData get light {
    final base = ThemeData(
      // 以品牌色播种，得到协调的 Material 3 默认色板
      colorScheme: ColorScheme.fromSeed(
        seedColor: accent,
        primary: accent,
        surface: bg,
      ),
      useMaterial3: true,
    );

    return base.copyWith(
      scaffoldBackgroundColor: bg,
      canvasColor: bg,
      dividerColor: line,
      splashFactory: InkSparkle.splashFactory,

      // AppBar：白底、无阴影、底部 1px 分隔线（对齐 .app-bar）
      appBarTheme: const AppBarTheme(
        backgroundColor: bg,
        surfaceTintColor: Colors.transparent, // 去掉 M3 的 tint 染色
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: text),
        titleTextStyle: TextStyle(
          color: text,
          fontSize: 17,
          fontWeight: FontWeight.w600,
        ),
      ),

      // 文本样式：对齐界面稿 h1/h2/h3 与正文字号
      textTheme: base.textTheme.apply(
        bodyColor: text,
        displayColor: text,
      ).copyWith(
        headlineLarge: const TextStyle(
          fontSize: 26,
          height: 1.32,
          fontWeight: FontWeight.w600,
          color: text,
          letterSpacing: -0.3,
        ),
        headlineMedium: const TextStyle(
          fontSize: 20,
          height: 1.4,
          fontWeight: FontWeight.w600,
          color: text,
        ),
        titleLarge: const TextStyle(
          fontSize: 17,
          height: 1.5,
          fontWeight: FontWeight.w600,
          color: text,
        ),
        bodyLarge: const TextStyle(fontSize: 16, height: 1.7, color: text),
        bodyMedium: const TextStyle(fontSize: 15, height: 1.7, color: text),
        bodySmall: const TextStyle(fontSize: 12, height: 1.6, color: muted),
      ),

      // 卡片：细边框、6px 圆角、无阴影（对齐 .cat-card / .post 风格）
      cardTheme: CardThemeData(
        color: bg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius),
          side: const BorderSide(color: line),
        ),
      ),

      // 分割线
      dividerTheme: const DividerThemeData(
        color: line,
        thickness: 1,
        space: 1,
      ),

      // TabBar：文字 + 底部 2px 强调色下划线（对齐 .cat-nav .tab）
      tabBarTheme: const TabBarThemeData(
        labelColor: text,
        unselectedLabelColor: muted,
        labelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        unselectedLabelStyle: TextStyle(fontSize: 14),
        indicator: UnderlineTabIndicator(
          borderSide: BorderSide(color: accent, width: 2),
          insets: EdgeInsets.zero,
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: line,
        overlayColor: WidgetStatePropertyAll(Colors.transparent),
      ),

      // 进度条 / 刷新指示器用品牌色
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: accent),

      // 页脚文本等小字
      chipTheme: ChipThemeData(
        backgroundColor: bg,
        side: const BorderSide(color: line),
        labelStyle: const TextStyle(fontSize: 12, color: muted),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    );
  }
}
