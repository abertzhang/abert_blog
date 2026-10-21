/// 分类数据的共享缓存与订阅 hook
///
/// 背景：导航栏、首页右栏、分类列表页都要用分类数据。如果每个组件各自请求
/// /categories，同一屏会重复发好几次；更麻烦的是——后台新增 / 改名 / 删除分类后，
/// 只有「当前这个组件」会刷新，其它页面还停留在旧数据，于是出现
/// 「后台加了 Kotlin，导航栏里有、首页右栏却没有」这种不一致。
///
/// 因此这里用模块级缓存 + 订阅做单一数据源：
///   useCategories()     任意组件读取分类列表（自动加载、变更自动同步）
///   refreshCategories() 后台增删改后调用，重新拉取并通知所有使用者
///
/// 与 context 的区别：context 需要包 Provider，且只对子组件生效；
/// 这里是一份模块级状态，跨路由、跨组件树都能共享，接入成本更低。
import { useEffect, useState } from 'react'
import { listCategories } from '../api/blog'

/// @type {Array|null} 已加载的分类列表；null 表示尚未加载过
let cache = null
/// @type {Promise|null} 进行中的请求，用于合并并发调用（避免同时发多个相同请求）
let inflight = null
/// @type {Set<Function>} 订阅者（各组件注册的 setState 回调）
const listeners = new Set()

/// 通知所有订阅者：缓存已更新
function emit() {
  const next = cache || []
  listeners.forEach((fn) => fn(next))
}

/// 加载分类数据
/// @param {boolean} force true 表示忽略缓存强制重新拉取（后台改完数据后调用）
/// @returns {Promise} 完成后缓存已就绪
function load(force = false) {
  if (cache && !force) return Promise.resolve(cache)
  // 已有请求在飞：直接复用，避免并发重复请求
  if (inflight) return inflight

  inflight = listCategories()
    .then((r) => { cache = r.data || [] })
    .catch(() => { cache = cache || [] }) // 请求失败时保留旧数据，不清空
    .finally(() => {
      inflight = null
      emit()
    })
  return inflight
}

/// 读取分类列表（共享缓存，自动同步）
/// @returns {Array} 分类列表（含 id / name / slug / sort / article_count）
export function useCategories() {
  const [cats, setCats] = useState(cache || [])

  useEffect(() => {
    const fn = (next) => setCats([...next])
    listeners.add(fn)
    // 已有缓存则立即同步一次（可能是在组件挂载后才加载完的）
    if (cache) setCats([...cache])
    else load()
    return () => { listeners.delete(fn) }
  }, [])

  return cats
}

/// 强制刷新分类缓存（后台增删改分类后调用）
/// @returns {Promise} 可用于在保存后等待刷新完成
export function refreshCategories() {
  return load(true)
}
