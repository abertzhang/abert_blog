/**
 * 轻量 Markdown → React Native 渲染器
 *
 * 博客正文 content 为 Markdown（web_react 用 react-markdown 渲染），这里手写一个
 * 只覆盖本博客用到的子集的渲染器，零额外依赖、保证可编译：
 *   - 标题 # / ## / ###
 *   - 段落
 *   - 无序列表 - / * 与有序列表 1.
 *   - 引用 >
 *   - 围栏代码块 ```lang ... ```
 *   - 行内：**粗体** *斜体* `代码` [文字](链接)
 *   - 分割线 ---
 * 行内文本中出现 HTML 实体（&gt; 等）会被解码。
 */
import React from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Colors, Radius, Typography } from '../theme'

/** 解码常见 HTML 实体（正文里偶尔混入） */
function decodeEntities(s: string): string {
  return s
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/** 行内渲染：粗体 / 斜体 / 行内代码 / 链接；其余作为纯文本 */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re =
    /(\*\*([^*]+?)\*\*)|(\*([^*]+?)\*)|(`([^`]+?)`)|(\[([^\]]+?)\]\(([^)]+?)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[2] !== undefined) {
      out.push(
        <Text key={`${keyBase}-b${i}`} style={styles.bold}>
          {m[2]}
        </Text>,
      )
    } else if (m[4] !== undefined) {
      out.push(
        <Text key={`${keyBase}-i${i}`} style={styles.italic}>
          {m[4]}
        </Text>,
      )
    } else if (m[6] !== undefined) {
      out.push(
        <Text key={`${keyBase}-c${i}`} style={styles.inlineCode}>
          {m[6]}
        </Text>,
      )
    } else if (m[8] !== undefined) {
      const href = m[9] || ''
      out.push(
        <Text
          key={`${keyBase}-l${i}`}
          style={styles.link}
          onPress={() => {
            if (href.startsWith('http')) Linking.openURL(href).catch(() => {})
          }}>
          {m[8]}
        </Text>,
      )
    }
    last = re.lastIndex
    i++
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <View style={styles.codeBlock}>
      {lang ? <Text style={styles.codeLang}>{lang}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.code}>{code}</Text>
      </ScrollView>
    </View>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((it, idx) => (
        <View key={idx} style={styles.listItem}>
          <Text style={styles.bullet}>·</Text>
          <Text style={styles.listText}>{renderInline(it, `bi${idx}`)}</Text>
        </View>
      ))}
    </View>
  )
}

function OrderedList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((it, idx) => (
        <View key={idx} style={styles.listItem}>
          <Text style={styles.bullet}>{idx + 1}.</Text>
          <Text style={styles.listText}>{renderInline(it, `oi${idx}`)}</Text>
        </View>
      ))}
    </View>
  )
}

/** 主入口：把 Markdown 字符串解析为 RN 节点数组 */
export function renderMarkdown(content: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = []
  const lines = decodeEntities(content).replace(/\r\n/g, '\n').split('\n')
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // 空行
    if (line.trim() === '') {
      i++
      continue
    }

    // 围栏代码块 ```
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim()
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      i++ // 跳过结束的 ```
      blocks.push(<CodeBlock key={key++} lang={lang} code={buf.join('\n')} />)
      continue
    }

    // 标题
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const text = h[2].trim()
      blocks.push(
        <Text key={key++} style={level <= 2 ? styles.h2 : styles.h3}>
          {renderInline(text, `h${key}`)}
        </Text>,
      )
      i++
      continue
    }

    // 分割线
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<View key={key++} style={styles.hr} />)
      i++
      continue
    }

    // 引用
    if (line.trim().startsWith('>')) {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push(
        <View key={key++} style={styles.quote}>
          <Text style={styles.quoteText}>
            {renderInline(buf.join(' '), `q${key}`)}
          </Text>
        </View>,
      )
      continue
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      blocks.push(<OrderedList key={key++} items={items} />)
      continue
    }

    // 无序列表
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      blocks.push(<BulletList key={key++} items={items} />)
      continue
    }

    // 段落：聚合连续的非特殊行
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim())
    ) {
      para.push(lines[i])
      i++
    }
    blocks.push(
      <Text key={key++} style={styles.p}>
        {renderInline(para.join('\n'), `p${key}`)}
      </Text>,
    )
  }

  return blocks
}

const styles = StyleSheet.create({
  p: {
    fontSize: Typography.body,
    lineHeight: Typography.body * 1.7,
    color: Colors.text,
    marginBottom: 18,
  },
  h2: {
    fontSize: Typography.title,
    lineHeight: Typography.title * 1.4,
    color: Colors.text,
    marginTop: 30,
    marginBottom: 12,
    fontWeight: '600',
  },
  h3: {
    fontSize: Typography.subtitle,
    lineHeight: Typography.subtitle * 1.5,
    color: Colors.text,
    marginTop: 24,
    marginBottom: 10,
    fontWeight: '600',
  },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  inlineCode: {
    fontFamily: 'menlo, monospace',
    fontSize: Typography.code,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  link: { color: Colors.accent },
  list: { marginBottom: 18 },
  listItem: { flexDirection: 'row', marginBottom: 9 },
  bullet: {
    width: 18,
    fontSize: Typography.body,
    lineHeight: Typography.body * 1.7,
    color: Colors.muted,
  },
  listText: {
    flex: 1,
    fontSize: Typography.body,
    lineHeight: Typography.body * 1.7,
    color: Colors.text,
  },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
    paddingLeft: 16,
    marginBottom: 18,
  },
  quoteText: {
    fontSize: Typography.body,
    lineHeight: Typography.body * 1.7,
    color: Colors.muted,
  },
  codeBlock: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius,
    marginBottom: 20,
  },
  codeLang: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: Colors.muted,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  code: {
    fontFamily: 'menlo, monospace',
    fontSize: Typography.code,
    lineHeight: Typography.code * 1.7,
    color: Colors.text,
    padding: 14,
  },
  hr: {
    height: 1,
    backgroundColor: Colors.line,
    marginVertical: 18,
  },
})
