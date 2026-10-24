const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 *
 * 【pnpm monorepo 适配】
 * 默认配置只监视 projectRoot（apps/phone_rn）。
 * 但 pnpm workspace（node-linker=hoisted）下，本目录 node_modules 里的包
 * 都是指向 monorepo 根 node_modules/.pnpm/<pkg>/... 的软链，真身不在
 * projectRoot 监视范围内 → Metro 解析软链到 realpath 后找不到文件，
 * 报「Unable to resolve module @babel/runtime/helpers/...」。
 *
 * 修法（RN 官方 monorepo 指南）：
 *  1. watchFolders 加上 monorepo 根，让监视树覆盖 .pnpm 里的真身；
 *  2. resolver.nodeModulesPaths 显式列出 app 与根两级 node_modules，
 *     保证「从 app 顶层解析 → 找到软链 → 落到真身」链路完整。
 */
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
