import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getRangeLogs } from './actions'
import { RangeLogRow } from './RangeLogRow'

export default async function RangeLogPage({
  searchParams,
}: {
  searchParams: Promise<{ recipeId?: string }>
}) {
  await searchParams
  const t = await getTranslations('range')

  const logs = await getRangeLogs()

  return (
    <div className="w-full px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        <Link
          href="/range/new"
          className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          {t('page.addButton')}
        </Link>
      </div>

      {/* Range Sessions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('page.listTitle')}</h2>

        {logs.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            {t('page.empty')}{' '}
            <Link href="/range/new" className="text-accent hover:text-accent-hover hover:underline">
              {t('page.logFirstSession')}
            </Link>
            {t('page.logFirstSuffix')}
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <RangeLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
