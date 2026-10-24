/**
 * 顶部应用栏（与界面稿 .app-bar 1:1 对齐）
 * 左侧品牌名，右侧 首页 / 分类 / 关于 导航；当前标签高亮并带底部 accent 下划线。
 */
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Colors, Radius, Typography } from '../theme'
import { TabName, useNavigation } from '../navigation/navContext'

const NAV_ITEMS: { key: TabName; label: string }[] = [
  { key: 'home', label: '首页' },
  { key: 'category', label: '分类' },
  { key: 'about', label: '关于' },
]

export default function AppHeader() {
  const { tab, navigateTab, goHome } = useNavigation()
  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <Pressable onPress={goHome} hitSlop={8}>
          <Text style={styles.brand}>{`abert 博客`}</Text>
        </Pressable>
        <View style={styles.nav}>
          {NAV_ITEMS.map((it) => {
            const active = tab === it.key
            return (
              <Pressable
                key={it.key}
                onPress={() => navigateTab(it.key)}
                hitSlop={8}>
                <Text style={[styles.navItem, active && styles.navActive]}>
                  {it.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  brand: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  nav: {
    flexDirection: 'row',
    gap: 16,
  },
  navItem: {
    fontSize: 14,
    color: Colors.muted,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navActive: {
    color: Colors.text,
    borderBottomColor: Colors.accent,
  },
})
