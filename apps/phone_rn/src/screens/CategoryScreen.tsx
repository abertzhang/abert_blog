/**
 * 分类页（与界面稿 category.html 1:1 对齐）
 * 顶部 hero + 分类切换 tab（Flutter/React/NodeJs/Golang）+ 当前分类文章列表。
 * 分类 tab 切换、分类卡片点击都会聚焦对应分类；从首页卡片带入的 slug 也会定位。
 */
import React, { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Colors, Spacing, Typography } from '../theme'
import { useAsync } from '../lib/useAsync'
import { listArticles, listCategories } from '../api/blog'
import { useNavigation } from '../navigation/navContext'
import { CATEGORY_DESC } from '../constants'
import type { Category } from '../types'
import type { Article, Paginated } from '../types'
import PostCard from '../components/PostCard'
import { Empty, ErrorBox, Loading } from '../components/States'

export default function CategoryScreen() {
  const { categorySlug, openArticle, openCategory } = useNavigation()
  const cats = useAsync<Category[]>(() => listCategories(), [])
  const [activeSlug, setActiveSlug] = useState<string | null>(categorySlug ?? null)

  // 从导航带入的 slug（如首页卡片点击）或首次加载完成后默认选中第一个
  useEffect(() => {
    if (categorySlug) {
      setActiveSlug(categorySlug)
    } else if (!activeSlug && cats.data && cats.data.length > 0) {
      setActiveSlug(cats.data[0].slug ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, cats.data])

  const activeCat =
    cats.data?.find((c) => c.slug === activeSlug) ?? cats.data?.[0]

  const posts = useAsync<Paginated<Article>>(
    () =>
      activeCat
        ? listArticles({ category_id: activeCat.id })
        : Promise.resolve({ list: [], total: 0, page: 1, page_size: 12 }),
    [activeCat?.id],
  )

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>分类</Text>
        <Text style={styles.h1}>文章分类</Text>
        <Text style={styles.lede}>
          按技术栈归档：Flutter、React、NodeJs 与 Golang。每个分类下按发布时间由新到旧排列。
        </Text>
      </View>

      {cats.loading ? (
        <Loading />
      ) : cats.error ? (
        <ErrorBox message={cats.error} onRetry={cats.reload} />
      ) : (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catNav}>
            <View style={styles.catNavInner}>
              {cats.data?.map((c) => {
                const active = c.slug === activeSlug
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setActiveSlug(c.slug ?? null)}>
                    <Text style={[styles.tab, active && styles.tabActive]}>
                      {`${c.name}（${c.article_count ?? 0}）`}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>

          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.h2}>{activeCat?.name}</Text>
              <Text style={styles.panelCount}>
                {`${activeCat?.article_count ?? 0} 篇文章`}
              </Text>
            </View>
            <Text style={styles.panelDesc}>
              {CATEGORY_DESC[activeCat?.slug ?? ''] ?? ''}
            </Text>

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
              <Empty message="该分类暂无文章" />
            )}
          </View>
        </View>
      )}
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
    marginBottom: 20,
  },
  catNav: { borderBottomWidth: 1, borderBottomColor: Colors.line },
  catNavInner: { flexDirection: 'row', gap: 14, paddingVertical: 10 },
  tab: {
    fontSize: 14,
    color: Colors.muted,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { color: Colors.text, borderBottomColor: Colors.accent },
  panel: { paddingTop: 20 },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  h2: { fontSize: Typography.title, fontWeight: '600', color: Colors.text },
  panelCount: { fontSize: Typography.meta, color: Colors.muted },
  panelDesc: {
    fontSize: Typography.small,
    color: Colors.muted,
    marginBottom: 16,
  },
})
