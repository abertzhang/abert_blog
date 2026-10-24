import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // web_react端口为 5001，web_next为5002
    port: 5001,
    // 端口被占用时直接报错，而不是自动顺延到 5002/5003 —— monorepo 里端口必须可预期
    strictPort: true,
    // 开发期将 /blog 代理到博客后端。本项目后端为 apps/api_express（Express，端口 3001）。
    // 后端上线前用 mock 数据也能预览，见 src/api/blog.ts 的 USE_MOCK 开关。
    proxy: {
      '/blog': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5001,
  },
})
