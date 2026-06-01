import Link from 'next/link'
import { LoadLogForm } from './LoadLogForm'
import { getLoadLogs, getRecipesForLog } from './actions'

export default async function ReloadingLogPage({
  searchParams,
}: {
  searchParams: Promise<{ recipeId?: string }>
}) {
  const { recipeId } = await searchParams

  const [logs, recipes] = await Promise.all([
    getLoadLogs(),
    getRecipesForLog(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Reloading Log</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Record every time you use a recipe to load ammunition
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* New Load Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Log New Load</h2>
            <LoadLogForm recipes={recipes} defaultRecipeId={recipeId} />
          </div>
        </div>

        {/* Log History */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Load History</h2>

          {logs.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
              No loads logged yet. Use the form on the left to record your first batch.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: any) => (
                <Link
                  key={log.id}
                  href={`/logs/${log.id}`}
                  className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-lg">{log.recipeName}</div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        {new Date(log.date).toLocaleDateString()} — {log.quantity} rounds
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {log.quantity}× loaded
                      </div>
                    </div>
                  </div>

                  {log.notes && (
                    <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3 line-clamp-2">
                      {log.notes}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
