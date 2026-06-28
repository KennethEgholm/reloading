import { useState, useMemo, useCallback } from 'react'

type SortDirection = 'asc' | 'desc' | null

interface SortState<K extends string> {
  key: K | null
  direction: SortDirection
}

export function useSortBy<T, K extends string>(items: T[], defaultKey?: K) {
  const [sort, setSort] = useState<SortState<K>>({
    key: defaultKey ?? null,
    direction: defaultKey ? 'asc' : null,
  })

  const toggleSort = useCallback((key: K) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      if (prev.direction === 'desc') return { key: null, direction: null }
      return { key, direction: 'asc' }
    })
  }, [])

  const sorted = useMemo(() => {
    if (!sort.key || !sort.direction) return items
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      const av = getSortValue(a, sort.key!)
      const bv = getSortValue(b, sort.key!)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [items, sort.key, sort.direction])

  return { sorted, sortKey: sort.key, sortDirection: sort.direction, toggleSort }
}

function getSortValue<T>(item: T, key: string): string | number | boolean | null {
  const v = (item as Record<string, unknown>)[key]
  if (v == null) return null
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v
  return String(v)
}