import { getTranslations } from 'next-intl/server'
import { LoadLogForm } from './LoadLogForm'
import { getLoadLogs, getRecipesForLog } from './actions'
import { LoadLogRow } from './LoadLogRow'

export default async function ReloadingLogPage({
  searchParams,
}: {
  searchParams: Promise<{ recipeId?: string }>
}) {
  const { recipeId } = await searchParams
  const t = await getTranslations('logs')

  const [logs, recipes] = await Promise.all([
    getLoadLogs(),
    getRecipesForLog(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* New Load Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">{t('page.newFormTitle')}</h2>
            <LoadLogForm recipes={recipes} defaultRecipeId={recipeId} />
          </div>
        </div>

        {/* Log History */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">{t('page.historyTitle')}</h2>

          {logs.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
              {t('page.empty')}
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: any) => (
                <LoadLogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
