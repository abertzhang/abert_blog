import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发期将 /blog 代理到后端（:8080）
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/blog': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
