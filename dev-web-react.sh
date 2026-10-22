#!/bin/sh
# 运行 web_react 开发服务器。
#
# 背景：在 WorkBuddy 沙箱里 pnpm 每次都会覆盖式地重建 store / node_modules 里的软链，
# 而 FS broker 拒绝「覆盖已存在的软链」(EEXIST)，导致 `pnpm dev`/`pnpm build`
# 在 Vite 启动前就失败（报错 CODEBUDDY_BROKER_DENY ... EEXIST ...）。
# 真实本机终端没有这个 broker，`pnpm --filter @repo/web_react dev` 可直接运行，无需本脚本。
#
# 本脚本直接调用本地 vite 二进制，绕过 pnpm，等价于 `pnpm dev`，可在沙箱内正常运行。
set -e
cd "$(dirname "$0")/apps/web_react"
exec ./node_modules/.bin/vite --port 5001 --host
