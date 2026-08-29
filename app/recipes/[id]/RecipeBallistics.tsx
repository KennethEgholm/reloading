'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { computeRangeTable, resolveDrag } from '@/lib/ballistics'

interface RecipeBallisticsProps {
  measuredV0: number | null
  weightGr: number
  bcG1: number | null
  bcG7: number | null
  zeroDistanceM: number | null
  sightHeightCm: number | null
  clickCmAt100m: number | null
  rifleName: string | null
}

export function RecipeBallistics({
  measuredV0,
  weightGr,
  bcG1,
  bcG7,
  zeroDistanceM,
  sightHeightCm,
  clickCmAt100m,
  rifleName,
}: RecipeBallisticsProps) {
  const t = useTranslations('recipes')
  const [open, setOpen] = useState(false)
  const rows = useMemo(() => {
    if (!open) return []
    return computeRangeTable({
      measuredV0,
      weightGr,
      bcG1,
      bcG7,
      zeroDistanceM,
      sightHeightCm,
      clickCmAt100m,
    })
  }, [open, measuredV0, weightGr, bcG1, bcG7, zeroDistanceM, sightHeightCm, clickCmAt100m])
  const drag = resolveDrag(bcG1, bcG7)

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8">
      <details className="group" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="flex items-center gap-2 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
          <svg
            className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M7.05 4.55a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.44 10 7.05 5.61a.75.75 0 0 1 0-1.06z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="text-lg font-semibold">{t('detail.ballistics.title')}</h2>
        </summary>

        <div className="mt-4">
      <p className="text-sm text-zinc-500 mb-4">
        {rifleName && sightHeightCm != null && zeroDistanceM != null && clickCmAt100m != null
          ? t('detail.ballistics.fromRifle', {
              rifle: rifleName,
              zero: zeroDistanceM,
              sight: sightHeightCm,
              click: clickCmAt100m,
            })
          : t('detail.ballistics.noRifle')}
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{t('detail.ballistics.missing')}</p>
      ) : (
        <>
          <p className="text-sm text-zinc-500 mb-4">
            {t('detail.ballistics.subtitle', { model: drag!.model })}
          </p>
          <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">{t('detail.ballistics.distance')}</th>
                  <th className="text-right px-3 py-2 font-medium">{t('detail.ballistics.velocity')}</th>
                  <th className="text-right px-3 py-2 font-medium">{t('detail.ballistics.energy')}</th>
                  <th className="text-right px-3 py-2 font-medium">{t('detail.ballistics.drop')}</th>
                  <th className="text-right px-3 py-2 font-medium">{t('detail.ballistics.clicks')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {rows.map((row) => {
                  const isZero = zeroDistanceM != null && row.distanceM === zeroDistanceM
                  return (
                    <tr key={row.distanceM} className={isZero ? 'bg-accent/10' : undefined}>
                      <td className="px-3 py-2 font-mono">{row.distanceM} m</td>
                      <td className="px-3 py-2 text-right font-mono">{row.velocityMs}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.energyJ}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {row.dropCm == null ? '—' : row.dropCm.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {row.clicks == null ? '—' : row.clicks}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
        </div>
      </details>
    </div>
  )
}
