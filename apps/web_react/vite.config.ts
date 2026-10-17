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
  },
  preview: {
    port: 5001,
  },
})
