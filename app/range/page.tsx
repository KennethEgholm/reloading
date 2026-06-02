import Link from 'next/link'
import { getRangeLogs, getRecipesForRangeLog } from './actions'
import { RangeLogRow } from './RangeLogRow'

export default async function RangeLogPage({
  searchParams,
}: {
  searchParams: Promise<{ recipeId?: string }>
}) {
  const { recipeId } = await searchParams

  const [logs, recipes] = await Promise.all([
    getRangeLogs(),
    getRecipesForRangeLog(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Range Sessions</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Record your range sessions and target results
          </p>
        </div>

        <Link
          href="/range/new"
          className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          + Add session
        </Link>
      </div>

      {/* Range Sessions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Range Sessions</h2>

        {logs.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            No range sessions logged yet.{' '}
            <Link href="/range/new" className="text-blue-600 dark:text-blue-400 hover:underline">
              Log your first session
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log: any) => (
              <RangeLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
