/**
 * 文章列表项（与界面稿 .post 1:1 对齐）
 * 标题 + 元信息（分类 · 日期）+ 摘要两行截断。
 */
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Colors, Typography } from '../theme'
import type { Article } from '../types'
import { formatDate } from '../lib/format'

interface Props {
  article: Article
  onPress: (id: number) => void
  first?: boolean
}

export default function PostCard({ article, onPress, first }: Props) {
  return (
    <Pressable
      style={[styles.post, !first && styles.postBorder]}
      onPress={() => onPress(article.id)}>
      <Text style={styles.title}>{article.title}</Text>
      <View style={styles.meta}>
        {article.category_name ? (
          <Text style={styles.cat}>{article.category_name}</Text>
        ) : null}
        <Text style={styles.dot}>·</Text>
        <Text style={styles.metaText}>{formatDate(article.published_at)}</Text>
      </View>
      <Text style={styles.excerpt} numberOfLines={2}>
        {article.summary || '（暂无摘要）'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  post: {
    paddingVertical: 16,
  },
  postBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  title: {
    fontSize: Typography.subtitle,
    lineHeight: Typography.subtitle * 1.5,
    fontWeight: '600',
    color: Colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 6,
  },
  cat: {
    fontSize: Typography.meta,
    color: Colors.accent,
  },
  dot: {
    fontSize: Typography.meta,
    color: Colors.line,
  },
  metaText: {
    fontSize: Typography.meta,
    color: Colors.muted,
  },
  excerpt: {
    fontSize: Typography.body,
    lineHeight: Typography.body * 1.5,
    color: Colors.muted,
  },
})
