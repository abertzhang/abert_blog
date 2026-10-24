/**
 * 文章详情页（与界面稿 article.html 1:1 对齐）
 * 面包屑（首页 > 分类）+ 文章头（分类/标题/元信息）+ Markdown 正文 + 标签。
 * 正文 content 为 Markdown，由 lib/markdown 渲染。
 */
import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Colors, Spacing, Typography } from '../theme'
import { useAsync } from '../lib/useAsync'
import { getArticle } from '../api/blog'
import { useNavigation } from '../navigation/navContext'
import type { Article } from '../types'
import { formatDate, readMinutes, splitTags } from '../lib/format'
import { renderMarkdown } from '../lib/markdown'
import Tag from '../components/Tag'
import { Empty, ErrorBox, Loading } from '../components/States'

export default function ArticleScreen() {
  const { articleId, goHome, openCategory } = useNavigation()
  const article = useAsync<Article>(
    () => getArticle(articleId as number),
    [articleId],
  )

  if (article.loading) return <Loading />
  if (article.error)
    return <ErrorBox message={article.error} onRetry={article.reload} />
  const a = article.data
  if (!a) return <Empty message="文章不存在" />

  const tags = splitTags(a.tags)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 面包屑 */}
      <View style={styles.breadcrumb}>
        <Text style={styles.crumb} onPress={goHome}>
          首页
        </Text>
        <Text style={styles.crumbSep}>·</Text>
        <Text style={styles.crumb} onPress={() => openCategory()}>
          {a.category_name || '分类'}
        </Text>
      </View>

      {/* 文章头 */}
      <View style={styles.postHead}>
        <Text style={styles.eyebrow}>{a.category_name}</Text>
        <Text style={styles.title}>{a.title}</Text>
        <View style={styles.metaRow}>
          {a.author_name ? (
            <Text style={styles.metaText}>{a.author_name}</Text>
          ) : null}
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{formatDate(a.published_at)}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{a.category_name}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{`${readMinutes(a.content)} 分钟阅读`}</Text>
        </View>
      </View>

      {/* 正文（Markdown） */}
      <View>{renderMarkdown(a.content || '')}</View>

      {/* 标签 */}
      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          {tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: 20,
    paddingBottom: 40,
  },
  breadcrumb: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  crumb: { fontSize: Typography.meta, color: Colors.muted },
  crumbSep: { fontSize: Typography.meta, color: Colors.muted },
  postHead: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: Typography.meta,
    letterSpacing: 1,
    color: Colors.muted,
    marginBottom: 8,
  },
  title: {
    fontSize: Typography.hero,
    lineHeight: Typography.hero * 1.32,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  metaText: { fontSize: Typography.meta, color: Colors.muted },
  dot: { fontSize: Typography.meta, color: Colors.line },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 26,
  },
})
