/**
 * 分类卡片（与界面稿 .cat-card 1:1 对齐）
 * 两列网格中的卡片：名称 + 文章数 + 描述。
 */
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Colors, Radius, Typography } from '../theme'
import type { Category } from '../types'
import { CATEGORY_DESC } from '../constants'

interface Props {
  category: Category
  onPress: (slug?: string) => void
}

export default function CategoryCard({ category, onPress }: Props) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(category.slug)}>
      <Text style={styles.name}>{category.name}</Text>
      <Text style={styles.count}>{category.article_count ?? 0} 篇文章</Text>
      <Text style={styles.desc}>
        {CATEGORY_DESC[category.slug ?? ''] ?? ''}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius,
    padding: 14,
    backgroundColor: Colors.bg,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  count: {
    fontSize: Typography.meta,
    color: Colors.muted,
    marginBottom: 8,
  },
  desc: {
    fontSize: Typography.small,
    color: Colors.muted,
    lineHeight: Typography.small * 1.5,
  },
})
