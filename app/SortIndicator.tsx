interface SortIndicatorProps {
  active: boolean
  direction: 'asc' | 'desc' | null
}

export function SortIndicator({ active, direction }: SortIndicatorProps) {
  if (!active || !direction) return <span className="inline-block w-3" />
  return <span className="inline-block w-3 text-zinc-400">{direction === 'asc' ? '↑' : '↓'}</span>
}