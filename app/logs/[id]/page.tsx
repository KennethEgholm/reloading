import { notFound } from 'next/navigation'
import { getLoadLogById } from '../actions'
import Link from 'next/link'
import { DeleteLoadLogButton } from '../DeleteLoadLogButton'

export default async function LoadLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const log = await getLoadLogById(id)

  if (!log) {
    notFound()
  }

  const propellantUsedGr = log.chargeGr
    ? (log.quantity * log.chargeGr * 0.06479891).toFixed(1)
    : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/logs" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Reloading Log
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{log.recipeName}</h1>
          <div className="text-xl text-zinc-600 dark:text-zinc-400 mt-1">{log.caliber}</div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">
              {new Date(log.date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 text-lg">
              {log.quantity} rounds
            </span>
          </div>
        </div>

        {/* Recipe Snapshot at time of loading */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-zinc-700 dark:text-zinc-300">
            Recipe Snapshot (at time of loading)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">Charge</div>
              <div className="font-medium mt-1">{log.chargeGr ? `${log.chargeGr} gr` : '—'}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">COAL</div>
              <div className="font-medium mt-1">—</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">Calculated V0</div>
              <div className="font-medium mt-1">{log.calculatedV0 ? `${log.calculatedV0} m/s` : '—'}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">Measured V0</div>
              <div className="font-medium mt-1">{log.measuredV0 ? `${log.measuredV0} m/s` : '—'}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="text-zinc-500 dark:text-zinc-400">Fill Rate</div>
              <div className="font-medium mt-1">{log.fillRate ? `${log.fillRate}%` : '—'}</div>
            </div>
          </div>
        </div>

        {/* Components Used Summary */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-zinc-700 dark:text-zinc-300">
            Components Consumed in This Load
          </h2>

          <div className="space-y-3">
            {/* Projectile */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
              <div className="font-medium text-emerald-700 dark:text-emerald-300">Projectile</div>
              <div className="mt-1">
                {log.quantity} × {log.projectileBrand} {log.projectileType ? `– ${log.projectileType}` : ''} ({log.projectileWeightGr} gr)
              </div>
            </div>

            {/* Propellant */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
              <div className="font-medium text-emerald-700 dark:text-emerald-300">Propellant</div>
              <div className="mt-1">
                {log.propellantBrand} – {log.propellantType}
              </div>
              {log.chargeGr && (
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {log.quantity} × {log.chargeGr} gr = <span className="font-medium">~{propellantUsedGr} g</span> total
                </div>
              )}
            </div>

            {/* Primer */}
            {log.primerBrand && (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
                <div className="font-medium text-emerald-700 dark:text-emerald-300">Primer</div>
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
            <h2 className="text-lg font-semibold mb-3 text-zinc-700 dark:text-zinc-300">Notes</h2>
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
