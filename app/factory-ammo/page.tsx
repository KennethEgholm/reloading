import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getFactoryAmmoList } from './actions'

export default async function FactoryAmmoPage() {
  const t = await getTranslations('factoryAmmo')
  const ammos = await getFactoryAmmoList()

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        <Link
          href="/factory-ammo/new"
          className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          {t('page.addButton')}
        </Link>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">{t('page.listTitle')}</h2>

        {ammos.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            {t('page.empty')}{' '}
            <Link href="/factory-ammo/new" className="text-accent hover:text-accent-hover hover:underline">
              {t('page.addFirst')}
            </Link>
            {t('page.addFirstSuffix')}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                <tr>
                  <th className="px-3 py-3 font-medium text-zinc-600 dark:text-zinc-400 w-16"></th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.brand')}</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.model')}</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.caliber')}</th>
                  <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.weight')}</th>
                  <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.amount')}</th>
                  <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.sessions')}</th>
                  <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.latestV0')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {ammos.map((ammo) => {
                  const latest = ammo.sessions[0]
                  return (
                    <tr key={ammo.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                      <td className="px-3 py-3">
                        {ammo.boxImageFilename ? (
                          <Link href={`/factory-ammo/${ammo.id}`}>
                            <img
                              src={`/uploads/factory-ammo/${ammo.boxImageFilename}`}
                              alt=""
                              width={40}
                              height={40}
                              loading="lazy"
                              className="w-10 h-10 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                            />
                          </Link>
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700" />
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <Link href={`/factory-ammo/${ammo.id}`} className="hover:underline">
                          {ammo.brand}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{ammo.model}</td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{ammo.caliber.name}</td>
                      <td className="px-6 py-4 text-right font-mono">
                        {ammo.projectileWeight != null
                          ? `${ammo.projectileWeight} ${ammo.projectileWeightUnit === 'G' ? 'g' : 'gr'}`
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">{ammo.amount}</td>
                      <td className="px-6 py-4 text-right font-mono">{ammo.sessions.length}</td>
                      <td className="px-6 py-4 text-right font-mono">
                        {latest?.velocityAvg ? t('table.avgMps', { value: latest.velocityAvg.toFixed(0) }) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}