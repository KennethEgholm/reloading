import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getFactoryAmmoSessionById } from '@/app/factory-ammo/sessions/actions'
import { FactoryAmmoSessionForm } from '@/app/factory-ammo/sessions/FactoryAmmoSessionForm'
import { DeleteFactoryAmmoSessionButton } from '@/app/factory-ammo/sessions/DeleteFactoryAmmoSessionButton'
import { averageMoa } from '@/lib/moa'
import { formatDate } from '@/lib/format'

export default async function FactoryAmmoSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  const t = await getTranslations('factoryAmmo')
  const locale = await getLocale()
  const session = await getFactoryAmmoSessionById(id, sessionId)

  if (!session) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <Link href={`/factory-ammo/${id}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('session.detail.back')}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/factory-ammo/${id}/sessions/${sessionId}/edit`}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {t('detail.edit')}
          </Link>
          <DeleteFactoryAmmoSessionButton ammoId={id} sessionId={sessionId} redirectTo={`/factory-ammo/${id}`} />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 mb-6">
        <h1 className="font-display text-2xl font-semibold mb-1">
          {session.factoryAmmo.brand} {session.factoryAmmo.model}
        </h1>
        <p className="text-sm text-zinc-500 mb-6">
          {formatDate(session.date, locale)}
          {session.location && ` • ${session.location}`}
        </p>

        <FactoryAmmoSessionForm
          ammoId={id}
          initialData={session}
          sessionId={session.id}
          readonly
        />
      </div>

      {session.shots && session.shots.length >= 2 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 mb-6">
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
                {session.shots.map((s) => (
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

      {session.groups && session.groups.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-lg font-semibold">{t('detail.groups.title')}</h3>
            <span className="text-sm text-zinc-500">
              {(() => {
                const avg = averageMoa(session.groups.map((g) => g.moa))
                return avg !== null ? t('detail.groups.sessionAvg', { value: avg.toFixed(2) }) : null
              })()}
            </span>
          </div>
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">{t('form.groups.distance')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('form.groups.shots')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('form.groups.size')}</th>
                  <th className="text-right px-3 py-2 font-medium">MOA</th>
                  <th className="text-left px-3 py-2 font-medium">{t('form.groups.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {session.groups.map((g) => (
                  <tr key={g.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-3 py-2 font-mono">{g.distanceM} m</td>
                    <td className="px-3 py-2 font-mono">{g.shotCount}</td>
                    <td className="px-3 py-2 font-mono">{g.groupSizeMm} mm</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-medium">{g.moa.toFixed(2)}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{g.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}