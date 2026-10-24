/**
 * 应用入口
 *
 * 用 SafeAreaProvider 包裹，提供刘海/状态栏安全区；导航容器统一管理页面与标签。
 * 状态栏文字颜色随系统深浅色自动切换。
 */
import React from 'react'
import { StatusBar, useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import AppNavigator from './navigation/AppNavigator'

export default function App() {
  const isDark = useColorScheme() === 'dark'
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </SafeAreaProvider>
  )
}
