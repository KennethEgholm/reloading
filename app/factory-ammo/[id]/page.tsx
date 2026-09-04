import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getFactoryAmmoById } from '../actions'
import { DeleteFactoryAmmoButton } from '../DeleteFactoryAmmoButton'
import { formatDate } from '@/lib/format'
import { uploadUrl } from '@/lib/uploadUrl'

export default async function FactoryAmmoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('factoryAmmo')
  const locale = await getLocale()
  const ammo = await getFactoryAmmoById(id)

  if (!ammo) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <Link href="/factory-ammo" className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('detail.back')}
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/factory-ammo/${id}/sessions/new`}
            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            {t('detail.newSession')}
          </Link>
          <Link
            href={`/factory-ammo/${id}/edit`}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {t('detail.edit')}
          </Link>
          <DeleteFactoryAmmoButton id={id} redirectTo="/factory-ammo" />
        </div>
      </div>

      {/* Ammo info card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 mb-6">
        <div className="flex flex-wrap gap-6 items-start">
          {ammo.boxImageFilename && (
            <img
              src={uploadUrl('factory-ammo', ammo.boxImageFilename)}
              alt=""
              width={128}
              height={128}
              className="w-32 h-32 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700"
            />
          )}
          {ammo.roundImageFilename && (
            <img
              src={uploadUrl('factory-ammo', ammo.roundImageFilename)}
              alt=""
              width={128}
              height={128}
              className="w-32 h-32 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700"
            />
          )}
          <div className="flex-1 min-w-[200px]">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{ammo.brand} {ammo.model}</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {ammo.caliber.name} • {t('detail.roundsOnHand', { count: ammo.amount })}
              {ammo.projectileWeight != null && ` • ${t('detail.projectileWeight', { value: ammo.projectileWeight, unit: ammo.projectileWeightUnit === 'G' ? t('form.unitG') : t('form.unitGr') })}`}
            </p>
            {ammo.notes && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 whitespace-pre-wrap">{ammo.notes}</p>
            )}
          </div>
        </div>
      </div>

      {/* Sessions list */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        <h2 className="font-display text-2xl font-semibold mb-4">{t('detail.sessionsTitle')}</h2>

        {ammo.sessions.length === 0 ? (
          <p className="text-zinc-500">
            {t('detail.noSessions')}{' '}
            <Link href={`/factory-ammo/${id}/sessions/new`} className="text-accent hover:text-accent-hover hover:underline">
              {t('detail.logFirst')}
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-3">
            {ammo.sessions.map((session) => (
              <Link
                key={session.id}
                href={`/factory-ammo/${id}/sessions/${session.id}`}
                className="block border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {formatDate(session.date, locale)}
                      {session.location && ` • ${session.location}`}
                    </div>
                    <div className="text-sm text-zinc-500 mt-1">
                      {t('detail.rounds', { count: session.roundsFired })}
                      {session.velocityAvg && ` • ${t('detail.avgV0', { value: session.velocityAvg.toFixed(0) })}`}
                      {session.extremeSpread && ` • ES ${session.extremeSpread.toFixed(0)}`}
                      {session.stdDev && ` • SD ${session.stdDev.toFixed(1)}`}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {session._count.shots > 0 && (
                      <span className="mr-3">{t('detail.shotsCount', { count: session._count.shots })}</span>
                    )}
                    {session._count.groups > 0 && (
                      <span>{t('detail.groupsCount', { count: session._count.groups })}</span>
                    )}
                  </div>
                </div>
                {session.notes && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">{session.notes}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}