/**
 * 静态常量
 */

/** 分类 slug → 描述（后端 categories 表未返回描述，这里按设计稿补充） */
export const CATEGORY_DESC: Record<string, string> = {
  flutter: 'Dart 与 Flutter 工程的渲染、状态与性能实践。',
  react: 'React 运行时、状态同步与大型应用的工程组织。',
  nodejs: 'Node.js 运行时行为、服务端工程与线上问题排查。',
  golang: 'Go 语言特性、并发模型与服务端工程实践。',
}

/** 站点品牌信息（About 页与页脚复用） */
export const SITE = {
  brand: 'abert 博客',
  tagline: '记录 Flutter、React、NodeJs 与 Golang 的工程实践',
  email: 'hello@example.com',
  github: 'github.com/yourname',
}
