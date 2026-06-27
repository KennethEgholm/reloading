import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getLoadLogById } from '../actions'
import Link from 'next/link'
import { DeleteLoadLogButton } from '../DeleteLoadLogButton'
import { formatDateLong } from '@/lib/format'
import { GRAIN_TO_GRAM } from '@/lib/inventory'

export default async function LoadLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('logs')
  const locale = await getLocale()
  const fmt1 = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const log = await getLoadLogById(id)

  if (!log) {
    notFound()
  }

  const propellantUsedGr = log.chargeGr
    ? fmt1.format(log.quantity * log.chargeGr * GRAIN_TO_GRAM)
    : ''

  // Cartridge label for the snapshot (brand + caliber + water capacity, if any).
  const cartridgeLabel = log.cartridgeBrand
    ? [
        `${log.cartridgeBrand} ${log.cartridgeCaliber ?? ''}`.trim(),
        log.cartridgeWaterCapacityGr != null ? `${log.cartridgeWaterCapacityGr} gr H₂O` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/logs" className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('detail.back')}
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{log.recipeName}</h1>
          <div className="text-xl text-zinc-600 dark:text-zinc-400 mt-1">{log.caliber}</div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">
              {formatDateLong(log.date, locale)}
            </span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 text-lg">
              {t('detail.rounds', { count: log.quantity })}
            </span>
          </div>
        </div>

        {/* Recipe Snapshot at time of loading */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-zinc-700 dark:text-zinc-300">
            {t('detail.recipeSnapshot')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">{t('detail.charge')}</div>
              <div className="font-medium mt-1">{log.chargeGr ? `${log.chargeGr} gr` : '—'}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">{t('detail.coal')}</div>
              <div className="font-medium mt-1">{log.coal ? `${log.coal} in` : '—'}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">{t('detail.calcV0')}</div>
              <div className="font-medium mt-1">{log.calculatedV0 ? `${log.calculatedV0} m/s` : '—'}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">{t('detail.measV0')}</div>
              <div className="font-medium mt-1">{log.measuredV0 ? `${log.measuredV0} m/s` : '—'}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">{t('detail.fillRate')}</div>
              <div className="font-medium mt-1">{log.fillRate ? `${log.fillRate}%` : '—'}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">{t('detail.cartridge')}</div>
              <div className="font-medium mt-1">{cartridgeLabel ?? '—'}</div>
            </div>
          </div>
        </div>

        {/* Components Used Summary */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-zinc-700 dark:text-zinc-300">
            {t('detail.componentsTitle')}
          </h2>

          <div className="space-y-3">
            {/* Projectile */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
              <div className="font-medium text-emerald-700 dark:text-emerald-300">{t('detail.projectile')}</div>
              <div className="mt-1">
                {log.quantity} × {log.projectileBrand} {log.projectileType ? `– ${log.projectileType}` : ''} ({log.projectileWeightGr} gr)
              </div>
            </div>

            {/* Propellant */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
              <div className="font-medium text-emerald-700 dark:text-emerald-300">{t('detail.propellant')}</div>
              <div className="mt-1">
                {log.propellantBrand} – {log.propellantType}
              </div>
              {log.chargeGr && (
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {t('detail.total', {
                    quantity: log.quantity,
                    chargeGr: log.chargeGr,
                    total: propellantUsedGr,
                  })}
                </div>
              )}
            </div>

            {/* Primer */}
            {log.primerBrand && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
                <div className="font-medium text-emerald-700 dark:text-emerald-300">{t('detail.primer')}</div>
                <div className="mt-1">
                  {log.quantity} × {log.primerBrand} {log.primerType?.replace('_', ' ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {log.notes && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-zinc-700 dark:text-zinc-300">{t('detail.notes')}</h2>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 whitespace-pre-wrap text-sm">
              {log.notes}
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700 flex justify-end">
          <DeleteLoadLogButton id={log.id} />
        </div>
      </div>
    </div>
  )
}
