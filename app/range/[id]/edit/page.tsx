import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getRangeLogById, getRecipesForRangeLog } from '../../actions'
import { RangeLogForm } from '../../RangeLogForm'

export default async function EditRangeLogPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('range')
  const [log, recipes] = await Promise.all([
    getRangeLogById(id),
    getRecipesForRangeLog(),
  ])

  if (!log) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href={`/range/${id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          {t('edit.back')}
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('edit.title')}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          {t('edit.subtitle')}
        </p>

        <RangeLogForm
          recipes={recipes}
          initialData={log}
          logId={log.id}
        />
      </div>
    </div>
  )
}
