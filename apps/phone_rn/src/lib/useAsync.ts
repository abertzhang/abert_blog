/**
 * 极简异步数据 Hook：在组件挂载或依赖变化时拉取数据，并跟踪 loading / error。
 * 内置 mounted 守卫，组件卸载后不再 setState。
 */
import { useCallback, useEffect, useRef, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fn()
      .then((res) => {
        if (active && mounted.current) setData(res)
      })
      .catch((e: unknown) => {
        if (active && mounted.current)
          setError(e instanceof Error ? e.message : '加载失败，请稍后重试')
      })
      .finally(() => {
        if (active && mounted.current) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, reload }
}
