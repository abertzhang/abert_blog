/**
 * 自定义导航容器（不依赖 react-navigation，零额外依赖）
 *
 * 结构：顶部应用栏 + 内容区 + 底部标签栏。底部三标签（首页/分类/关于）常驻；
 * 点击文章列表项时，在当前标签之上叠加“文章详情”（底栏仍显示，符合设计稿）。
 *
 * 如需切换为生产级 react-navigation，只需把这里替换为 BottomTabNavigator +
 * StackNavigator，并把 useNavigation 的调用改为 useNavigation/useRoute 即可，
 * 各页面组件无需改动（接口保持一致）。
 */
import React, { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Colors } from '../theme'
import {
  NavContext,
  NavContextValue,
  TabName,
} from './navContext'
import AppHeader from '../components/AppHeader'
import BottomTabBar from '../components/BottomTabBar'
import HomeScreen from '../screens/HomeScreen'
import CategoryScreen from '../screens/CategoryScreen'
import ArticleScreen from '../screens/ArticleScreen'
import AboutScreen from '../screens/AboutScreen'

export default function AppNavigator() {
  const [tab, setTab] = useState<TabName>('home')
  const [articleId, setArticleId] = useState<number | null>(null)
  const [categorySlug, setCategorySlug] = useState<string | null>(null)

  const navigateTab = useCallback((t: TabName) => {
    setArticleId(null)
    setTab(t)
  }, [])

  const openArticle = useCallback((id: number) => {
    setArticleId(id)
  }, [])

  const goHome = useCallback(() => {
    setArticleId(null)
    setTab('home')
  }, [])

  const openCategory = useCallback((slug?: string) => {
    setArticleId(null)
    setCategorySlug(slug ?? null)
    setTab('category')
  }, [])

  const value: NavContextValue = {
    tab,
    articleId,
    categorySlug,
    navigateTab,
    openArticle,
    goHome,
    openCategory,
  }

  return (
    <NavContext.Provider value={value}>
      <View style={styles.root}>
        <AppHeader />
        <View style={styles.content}>
          {articleId != null ? (
            <ArticleScreen />
          ) : tab === 'home' ? (
            <HomeScreen />
          ) : tab === 'category' ? (
            <CategoryScreen />
          ) : (
            <AboutScreen />
          )}
        </View>
        <BottomTabBar />
      </View>
    </NavContext.Provider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1 },
})
