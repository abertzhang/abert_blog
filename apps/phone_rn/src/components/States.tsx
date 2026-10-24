/**
 * 通用状态组件：加载中 / 错误 / 空。
 */
import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Colors, Typography } from '../theme'

export function Loading({ hint = '加载中…' }: { hint?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.accent} />
      <Text style={styles.hint}>{hint}</Text>
    </View>
  )
}

export function ErrorBox({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.error}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function Empty({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.hint}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: 10,
    fontSize: Typography.small,
    color: Colors.muted,
  },
  error: {
    fontSize: Typography.small,
    color: Colors.muted,
    textAlign: 'center',
  },
  retry: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 6,
  },
  retryText: {
    fontSize: Typography.small,
    color: Colors.accent,
  },
})
