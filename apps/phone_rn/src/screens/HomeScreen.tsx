/**
 * 首页（与界面稿 index.html 1:1 对齐）
 * Hero + 最新文章列表 + 文章分类卡片网格。
 * 数据来自 api_express（USE_MOCK=false）或内置 mock。
 */
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Colors, Spacing, Typography } from '../theme'
import { useAsync } from '../lib/useAsync'
import { listArticles, listCategories } from '../api/blog'
import { useNavigation } from '../navigation/navContext'
import type { Category } from '../types'
import type { Paginated, Article } from '../types'
import PostCard from '../components/PostCard'
import CategoryCard from '../components/CategoryCard'
import { Empty, ErrorBox, Loading } from '../components/States'

export default function HomeScreen() {
  const { openArticle, openCategory } = useNavigation()
  const cats = useAsync<Category[]>(() => listCategories(), [])
  const posts = useAsync<Paginated<Article>>(
    () => listArticles({ page: 1, page_size: 6 }),
    [],
  )

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>个人技术博客</Text>
        <Text style={styles.h1}>abert 博客</Text>
        <Text style={styles.lede}>
          记录 Flutter、React、NodeJs 与 Golang 的工程实践：写清楚一次更新的代价、一段代码的边界，以及问题真正被定位的那个瞬间。
        </Text>
      </View>

      {/* 最新文章 */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.h2}>最新文章</Text>
          <Text style={styles.more} onPress={() => openCategory()}>
            查看全部分类
          </Text>
        </View>
        {posts.loading ? (
          <Loading />
        ) : posts.error ? (
          <ErrorBox message={posts.error} onRetry={posts.reload} />
        ) : posts.data && posts.data.list.length > 0 ? (
          <View>
            {posts.data.list.map((a, idx) => (
              <PostCard
                key={a.id}
                article={a}
                first={idx === 0}
                onPress={openArticle}
              />
            ))}
          </View>
        ) : (
          <Empty message="暂无文章" />
        )}
      </View>

      {/* 文章分类 */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.h2}>文章分类</Text>
          <Text style={styles.more}>
            {`共 ${cats.data?.length ?? 0} 个分类`}
          </Text>
        </View>
        {cats.loading ? (
          <Loading />
        ) : cats.error ? (
          <ErrorBox message={cats.error} onRetry={cats.reload} />
        ) : (
          <View style={styles.catGrid}>
            {cats.data?.map((c) => (
              <View key={c.id} style={styles.catCell}>
                <CategoryCard category={c} onPress={openCategory} />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.screen },
  hero: { paddingTop: 28, paddingBottom: 4 },
  eyebrow: {
    fontSize: Typography.meta,
    letterSpacing: 1,
    color: Colors.muted,
    marginBottom: 10,
  },
  h1: {
    fontSize: Typography.hero,
    lineHeight: Typography.hero * 1.32,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  lede: {
    fontSize: Typography.small,
    lineHeight: Typography.small * 1.6,
    color: Colors.muted,
  },
  section: {
    paddingVertical: Spacing.section,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  h2: {
    fontSize: Typography.title,
    fontWeight: '600',
    color: Colors.text,
  },
  more: {
    fontSize: Typography.small,
    color: Colors.accent,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  catCell: { width: '48%', marginBottom: Spacing.gap },
})
