/**
 * 关于页（与界面稿 about.html 1:1 对齐）
 * 个人简介 + 技能与技术栈 + 联系方式 + 站点说明。内容为静态示例。
 */
import React from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Colors, Spacing, Typography } from '../theme'
import { SITE } from '../constants'

const SKILLS: { dt: string; dd: string }[] = [
  { dt: 'Flutter', dd: 'Dart、Riverpod / Bloc、自定义绘制与渲染管线、DevTools 性能分析' },
  { dt: 'React', dd: 'Hooks 与并发特性、状态同步、组件库设计与大型应用结构' },
  { dt: 'NodeJs', dd: 'HTTP 服务与网关、异步 IO 与事件循环、内存与性能排查' },
  { dt: 'Golang', dd: '并发模型与 context、泛型、服务可观测性与 pprof 分析' },
  { dt: '工程与工具', dd: 'TypeScript、CI 流水线、可观测性建设、性能与稳定性治理' },
]

const CONTACT: { dt: string; dd: string; href?: string }[] = [
  { dt: '邮箱', dd: SITE.email, href: `mailto:${SITE.email}` },
  { dt: 'GitHub', dd: SITE.github },
  { dt: '本站内容', dd: '长文笔记与技术复盘，不转载、不投放广告' },
]

const NOTES: string[] = [
  '内容范围：Flutter、React、NodeJs 与 Golang 四类技术文章。',
  '更新节奏：以完整长文为主，不追求高频更新。',
  '阅读体验：正文单栏排版，代码块可横向滚动，不加载任何外部资源。',
  '本站为纯静态界面稿，不包含后台、评论与订阅功能。',
]

export default function AboutScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>关于</Text>
        <Text style={styles.h1}>关于本站</Text>
        <Text style={styles.lede}>
          一个只写长文的技术博客：把一个问题的来龙去脉写清楚，而不是只给出可以复制的答案。
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.h2}>个人简介</Text>
        <Text style={styles.p}>
          我是 abert，客户端与服务端都写。日常工作集中在跨端应用的性能与架构，以及支撑它的服务端工程与可观测性建设。
        </Text>
        <Text style={styles.p}>
          这个博客用来存放那些在项目里被反复问起、但很少被完整写下来的问题：为什么这样设计、边界在哪里、当时的取舍是什么。文章尽量给出可验证的判断依据，而不是模糊的经验之谈。
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.h2}>技能与技术栈</Text>
        {SKILLS.map((s) => (
          <View key={s.dt} style={styles.fact}>
            <Text style={styles.dt}>{s.dt}</Text>
            <Text style={styles.dd}>{s.dd}</Text>
          </View>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.h2}>联系方式</Text>
        {CONTACT.map((c) => (
          <View key={c.dt} style={styles.fact}>
            <Text style={styles.dt}>{c.dt}</Text>
            {c.href ? (
              <Text
                style={[styles.dd, styles.link]}
                onPress={() => Linking.openURL(c.href as string).catch(() => {})}>
                {c.dd}
              </Text>
            ) : (
              <Text style={styles.dd}>{c.dd}</Text>
            )}
          </View>
        ))}
        <Text style={styles.note}>以上为演示占位信息，正式发布前需替换为真实联系方式。</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.h2}>站点说明</Text>
        {NOTES.map((n, i) => (
          <Text key={i} style={styles.li}>
            {`· ${n}`}
          </Text>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.screen, paddingBottom: 40 },
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
  block: { marginBottom: 32 },
  h2: {
    fontSize: Typography.title,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 14,
  },
  p: {
    fontSize: Typography.body,
    lineHeight: Typography.body * 1.7,
    color: Colors.text,
    marginBottom: 14,
  },
  fact: {
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    paddingVertical: 12,
  },
  dt: { fontSize: 15, fontWeight: '600', color: Colors.text },
  dd: { fontSize: 15, lineHeight: 15 * 1.5, color: Colors.muted, marginTop: 2 },
  link: { color: Colors.accent },
  note: { fontSize: Typography.small, color: Colors.muted, marginTop: 14 },
  li: {
    fontSize: Typography.body,
    lineHeight: Typography.body * 1.7,
    color: Colors.text,
    marginBottom: 8,
  },
})
