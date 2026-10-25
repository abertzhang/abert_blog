// 分类数据的共享缓存与订阅 hook。
//
// 导航栏、首页右栏、分类列表页共用同一份分类数据；后台增删改后通过
// refreshCategories() 重新拉取并通知所有使用者，避免各处不一致。
'use client'

import { useEffect, useState } from 'react'
import { listCategories } from '../api/blog'
import type { Category } from '../types/blog'

let cache: Category[] | null = null
let inflight: Promise<Category[] | null> | null = null
const listeners = new Set<(next: Category[]) => void>()

function emit() {
  const next = cache || []
  listeners.forEach((fn) => fn(next))
}

function load(force = false): Promise<Category[] | null> {
  if (cache && !force) return Promise.resolve(cache)
  if (inflight) return inflight

  inflight = listCategories()
    .then((r) => {
      cache = r.data || []
      return cache
    })
    .catch(() => {
      cache = cache || []
      return cache
    })
    .finally(() => {
      inflight = null
      emit()
    })
  return inflight
}

/** 读取分类列表（共享缓存，自动同步） */
export function useCategories(): Category[] {
  const [cats, setCats] = useState<Category[]>(cache || [])

  useEffect(() => {
    const fn = (next: Category[]) => setCats([...next])
    listeners.add(fn)
    if (cache) setCats([...cache])
    else load()
    return () => {
      listeners.delete(fn)
    }
  }, [])

  return cats
}

/** 强制刷新分类缓存（后台增删改分类后调用） */
export function refreshCategories(): Promise<Category[] | null> {
  return load(true)
}
