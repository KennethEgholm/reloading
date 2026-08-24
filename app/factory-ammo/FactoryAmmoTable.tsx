'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { FactoryAmmoListItem } from '@/lib/types'

interface FactoryAmmoTableProps {
  ammos: FactoryAmmoListItem[]
}

export function FactoryAmmoTable({ ammos }: FactoryAmmoTableProps) {
  const t = useTranslations('factoryAmmo')
  const router = useRouter()

  const handleRowClick = (id: string) => {
    router.push(`/factory-ammo/${id}`)
  }

  return (
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
              <tr
                key={ammo.id}
                tabIndex={0}
                role="link"
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
                onClick={() => handleRowClick(ammo.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleRowClick(ammo.id)
                  }
                }}
              >
                <td className="px-3 py-3">
                  {ammo.boxImageFilename ? (
                    <img
                      src={`/uploads/factory-ammo/${ammo.boxImageFilename}`}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                      className="w-10 h-10 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700" />
                  )}
                </td>
                <td className="px-6 py-4 font-medium">{ammo.brand}</td>
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
  )
}
