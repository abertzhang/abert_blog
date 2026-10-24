/**
 * 运行配置
 *
 * - API_BASE_URL：后台博客接口根地址（apps/api_express，监听 :3001，统一前缀 /blog/api）。
 *   设计稿与 web_react 一致，所有接口挂在 /blog/api 下。
 * - RN 原生 fetch 不受浏览器 CORS 限制（是原生网络请求），因此无需后端开启 CORS；
 *   Android 已在 AndroidManifest 允许明文 HTTP（usesCleartextTraffic=true），iOS 模拟器靠
 *   NSAllowsLocalNetworking 已放行 localhost。
 *
 * ============================================================================
 *  真机调试怎么填（重要）
 * ============================================================================
 *  模拟器和真机的「localhost / 10.0.2.2」含义不同：
 *    - Android 模拟器：10.0.2.2 才指向宿主机，localhost 指向模拟器自己
 *    - iOS 模拟器：localhost 指向宿主机
 *    - 真机（无论 Android/iOS）：localhost 指向手机自己，10.0.2.2 无意义
 *  所以真机必须改成「开发机的可达地址」。
 *
 *  方式一 · USB 反向代理（推荐 Android，最省事）：
 *    1) 手机 USB 连电脑并开启「USB 调试」
 *    2) 终端执行：adb reverse tcp:3001 tcp:3001   （把手机的 3001 转发到电脑 3001）
 *       （Metro 的 8081 一般会被 RN 自动 reverse，若该端口不通同样执行
 *        adb reverse tcp:8081 tcp:8081）
 *    3) 把下面 USE_DEVICE_HOST 设为 true，DEVICE_HOST 填 'http://localhost:3001'
 *
 *  方式二 · 同一 WiFi 局域网：
 *    1) 查开发机局域网 IP（mac: ifconfig | grep inet；win: ipconfig）
 *    2) 把 USE_DEVICE_HOST 设为 true，DEVICE_HOST 填 'http://<电脑IP>:3001'
 *       例：'http://192.168.1.10:3001'
 *    3) 手机上摇一摇 → Dev Settings → Debug server host & port for device
 *       填 '<电脑IP>:8081'（让 Metro 也能被真机访问到）
 * ============================================================================
 */
import { Platform } from 'react-native'

// 模拟器默认地址：Android 用 10.0.2.2 指向宿主机，iOS 模拟器用 localhost。
const SIMULATOR_HOST =
  Platform.OS === 'ios' ? 'http://localhost:3001' : 'http://10.0.2.2:3001'

// 真机地址：改成你的开发机可达地址。
//   - USB 反向代理场景填 'http://localhost:3001'
//   - WiFi 局域网场景填 'http://<电脑局域网IP>:3001'
const DEVICE_HOST = 'http://192.168.1.10:3001'

// 是否使用真机地址：false = 模拟器，true = 真机。
const USE_DEVICE_HOST = false

const HOST = USE_DEVICE_HOST ? DEVICE_HOST : SIMULATOR_HOST

export const API_BASE_URL = `${HOST}/blog/api`

/**
 * 数据源开关（与 web_react 一致）：
 *   false → 走真实 api_express 后台（PostgreSQL 存储）
 *   true  → 使用内置 mock 数据，无需后端即可预览界面
 * 默认 false，按你的要求从 api_express 获取。若后端未启动，可临时改为 true 看界面。
 */
export const USE_MOCK = false

/** 请求超时（毫秒） */
export const API_TIMEOUT = 10000
