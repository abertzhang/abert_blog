import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function slugify(text) {
  const t = Array.isArray(text) ? text.join('') : String(text || '')
  return 'h-' + t.replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 80)
}

const components = {
  h1: ({ children }) => <h1 id={slugify(children)}>{children}</h1>,
  h2: ({ children }) => <h2 id={slugify(children)}>{children}</h2>,
  h3: ({ children }) => <h3 id={slugify(children)}>{children}</h3>,
  a: ({ href, children }) => (
    <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{children}</a>
  ),
}

export default function MarkdownView({ content }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}
