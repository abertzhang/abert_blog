/**
 * 标签胶囊（与界面稿 .tag 1:1 对齐）
 */
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Colors, Typography } from '../theme'

export default function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tag: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 12,
  },
  tagText: {
    fontSize: Typography.meta,
    color: Colors.muted,
  },
})
