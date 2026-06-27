import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getRangeLogById, getRecipesForRangeLog, deleteRangeLogAndRedirect } from '../actions'
import { RangeLogForm } from '../RangeLogForm'

export default async function RangeLogDetailPage({
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
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/range" className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('detail.back')}
        </Link>

        {log.recipe && (
          <Link
            href={`/range/new?recipeId=${log.recipe.id}`}
            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            {t('detail.logAnother')}
          </Link>
        )}
        <Link
          href={`/range/${id}/edit`}
          className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {t('detail.edit')}
        </Link>
        <form action={deleteRangeLogAndRedirect.bind(null, id)}>
          <button
            type="submit"
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            {t('detail.delete')}
          </button>
        </form>
      </div>

      {/* Recipe snapshot frozen at the time the session was logged. Survives
          recipe edits and deletion, so this always shows what was actually
          shot — even if log.recipe is now null. */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 mb-6">
        <h2 className="text-lg font-semibold mb-1">{t('detail.recipeSnapshot')}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          {log.recipeName || '—'}{log.caliber ? ` • ${log.caliber}` : ''}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-6">
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
            <div className="text-zinc-500 dark:text-zinc-400">{t('detail.charge')}</div>
            <div className="font-medium mt-1">{log.chargeGr ? `${log.chargeGr} gr` : '—'}</div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
            <div className="text-zinc-500 dark:text-zinc-400">{t('detail.coal')}</div>
            <div className="font-medium mt-1">{log.coal ? `${log.coal} in` : '—'}</div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
            <div className="text-zinc-500 dark:text-zinc-400">{t('detail.calcV0')}</div>
            <div className="font-medium mt-1">{log.calculatedV0 ? `${log.calculatedV0} m/s` : '—'}</div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
            <div className="text-zinc-500 dark:text-zinc-400">{t('detail.measV0')}</div>
            <div className="font-medium mt-1">{log.measuredV0 ? `${log.measuredV0} m/s` : '—'}</div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
            <div className="text-zinc-500 dark:text-zinc-400">{t('detail.fillRate')}</div>
            <div className="font-medium mt-1">{log.fillRate ? `${log.fillRate}%` : '—'}</div>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
            <span className="font-medium text-emerald-700 dark:text-emerald-300">{t('detail.projectile')}: </span>
            {[log.projectileBrand, log.projectileType].filter(Boolean).join(' ')}
            {log.projectileWeightGr ? ` — ${log.projectileWeightGr} gr` : ''}
          </div>
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
            <span className="font-medium text-emerald-700 dark:text-emerald-300">{t('detail.propellant')}: </span>
            {[log.propellantBrand, log.propellantType].filter(Boolean).join(' ')}
          </div>
          {log.primerBrand && (
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
              <span className="font-medium text-emerald-700 dark:text-emerald-300">{t('detail.primer')}: </span>
              {log.primerBrand} {log.primerType?.replace('_', ' ')}
            </div>
          )}
          {log.cartridgeBrand && (
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
              <span className="font-medium text-emerald-700 dark:text-emerald-300">{t('detail.cartridge')}: </span>
              {[log.cartridgeBrand, log.cartridgeCaliber].filter(Boolean).join(' ')}
              {log.cartridgeWaterCapacityGr != null ? ` — ${log.cartridgeWaterCapacityGr} gr H₂O` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        <RangeLogForm
          recipes={recipes}
          initialData={log}
          logId={log.id}
          readonly={true}
        />
        {log.shots && log.shots.length >= 2 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">{t('form.shotTable.title')}</h3>
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">{t('form.shotTable.header')}</th>
                    <th className="text-right px-3 py-2 font-medium">{t('form.shotTable.velocity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {log.shots.map((s) => (
                    <tr key={s.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-2 font-mono">{s.shotIndex}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.velocity.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
