import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// 列表加载中的居中指示器（对齐界面稿的轻量风格：细圆圈 + 品牌色）。
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          if (message != null) ...[
            const SizedBox(height: 12),
            Text(message!, style: const TextStyle(fontSize: 13, color: AppTheme.muted)),
          ],
        ],
      ),
    );
  }
}

/// 加载失败占位：图标 + 原因 + 重试按钮。
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_rounded, size: 32, color: AppTheme.muted),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: AppTheme.muted),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: onRetry,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.accent,
                side: const BorderSide(color: AppTheme.line),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                ),
              ),
              child: const Text('重新加载'),
            ),
          ],
        ],
      ),
    );
  }
}

/// 空列表占位。
class EmptyView extends StatelessWidget {
  const EmptyView({super.key, this.message = '暂无文章'});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.article_outlined, size: 32, color: AppTheme.muted),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(fontSize: 13, color: AppTheme.muted)),
        ],
      ),
    );
  }
}
