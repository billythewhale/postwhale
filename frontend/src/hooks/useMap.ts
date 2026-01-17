import { useState, useCallback } from 'react'

export interface MapActions<K, V> {
  get: (key: K) => V | undefined
  has: (key: K) => boolean
  set: (key: K, value: V) => void
  delete: (key: K) => void
  clear: () => void
  entries: () => Array<[K, V]>
  keys: () => K[]
  values: () => V[]
  size: () => number
}

export function useMap<K, V>(initial?: Map<K, V> | (() => Map<K, V>)): MapActions<K, V> {
  const [map, setMap] = useState<Map<K, V>>(
    typeof initial === 'function' ? initial : initial ?? new Map()
  )

  const get = useCallback((key: K): V | undefined => map.get(key), [map])
  const has = useCallback((key: K): boolean => map.has(key), [map])

  const set = useCallback((key: K, value: V): void => {
    setMap(prev => new Map(prev).set(key, value))
  }, [])

  const deleteKey = useCallback((key: K): void => {
    setMap(prev => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }, [])

  const clear = useCallback((): void => {
    setMap(new Map())
  }, [])

  const entries = useCallback((): Array<[K, V]> => Array.from(map.entries()), [map])
  const keys = useCallback((): K[] => Array.from(map.keys()), [map])
  const values = useCallback((): V[] => Array.from(map.values()), [map])
  const size = useCallback((): number => map.size, [map])

  return {
    get,
    has,
    set,
    delete: deleteKey,
    clear,
    entries,
    keys,
    values,
    size,
  }
}
