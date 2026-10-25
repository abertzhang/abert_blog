import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // 开发期将 /blog 代理到博客后端（apps/api_express，Express，端口 3001）。
  // 与 web_react 的 Vite proxy 行为一致；后端未启动时各页面会优雅降级为空白态。
  async rewrites() {
    return [
      {
        source: "/blog/:path*",
        destination: "http://localhost:3001/blog/:path*",
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
