/**
 * 底部标签栏（与界面稿 .tabbar 1:1 对齐）
 * 三个等宽标签：首页 / 分类 / 关于；当前标签 accent 高亮加粗。
 * 在所有页面（含文章详情）常驻，符合设计稿。
 */
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Colors, Typography } from '../theme'
import { TabName, useNavigation } from '../navigation/navContext'

const TABS: { key: TabName; label: string }[] = [
  { key: 'home', label: '首页' },
  { key: 'category', label: '分类' },
  { key: 'about', label: '关于' },
]

export default function BottomTabBar() {
  const { tab, navigateTab } = useNavigation()
  return (
    <View style={styles.bar}>
      {TABS.map((it) => {
        const active = tab === it.key
        return (
          <Pressable
            key={it.key}
            style={styles.tab}
            onPress={() => navigateTab(it.key)}>
            <Text style={[styles.label, active && styles.active]}>{it.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  tab: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    color: Colors.muted,
  },
  active: {
    color: Colors.accent,
    fontWeight: '600',
  },
})
