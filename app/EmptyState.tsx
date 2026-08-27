export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
      {children}
    </div>
  )
}
