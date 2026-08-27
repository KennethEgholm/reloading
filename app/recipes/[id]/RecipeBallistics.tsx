'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { computeRangeTable, resolveDrag, DEFAULT_SIGHT_HEIGHT_CM } from '@/lib/ballistics'
import { updateRecipeZeroDistance } from '../actions'

interface RecipeBallisticsProps {
  recipeId: string
  measuredV0: number | null
  weightGr: number
  bcG1: number | null
  bcG7: number | null
  zeroDistanceM: number | null
}

export function RecipeBallistics({
  recipeId,
  measuredV0,
  weightGr,
  bcG1,
  bcG7,
  zeroDistanceM,
}: RecipeBallisticsProps) {
  const t = useTranslations('recipes')
  const [open, setOpen] = useState(false)
  const [zero, setZero] = useState(zeroDistanceM != null ? String(zeroDistanceM) : '')
  const [sight, setSight] = useState(String(DEFAULT_SIGHT_HEIGHT_CM))
  const [isPending, startTransition] = useTransition()
  const zeroN = zero.trim() === '' ? null : Number(zero)
  const zeroValid = zeroN != null && Number.isFinite(zeroN) && zeroN > 0
  const sightN = Number(sight)
  const sightCm = Number.isFinite(sightN) && sightN > 0 ? sightN : DEFAULT_SIGHT_HEIGHT_CM
  const rows = useMemo(() => {
    if (!open) return []
    return computeRangeTable({
      measuredV0,
      weightGr,
      bcG1,
      bcG7,
      zeroDistanceM: zeroValid ? zeroN : null,
      sightHeightCm: sightCm,
    })
  }, [open, measuredV0, weightGr, bcG1, bcG7, zeroValid, zeroN, sightCm])
  const drag = resolveDrag(bcG1, bcG7)

  const saveZero = () => {
    const parsed = zero.trim() === '' ? null : Number(zero)
    if (parsed != null && (!Number.isFinite(parsed) || parsed <= 0)) return
    if (parsed === zeroDistanceM || (parsed == null && zeroDistanceM == null)) return
    startTransition(async () => {
      try {
        await updateRecipeZeroDistance(recipeId, parsed)
        toast.success(t('toast.zeroUpdated'))
      } catch {
        toast.error(t('toast.failed'))
      }
    })
  }

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
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
        <div>
          <label htmlFor="recipe-zero" className="block text-sm font-medium mb-1.5">
            {t('detail.ballistics.zeroDistance')}
          </label>
          <input
            id="recipe-zero"
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            autoComplete="off"
            value={zero}
            disabled={isPending}
            onChange={(e) => setZero(e.target.value)}
            onBlur={saveZero}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            placeholder={t('detail.ballistics.zeroPlaceholder')}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 font-mono"
          />
        </div>
        <div>
          <label htmlFor="recipe-sight" className="block text-sm font-medium mb-1.5">
            {t('detail.ballistics.sightHeight')}
          </label>
          <input
            id="recipe-sight"
            type="number"
            step="0.1"
            min="0.1"
            inputMode="decimal"
            autoComplete="off"
            value={sight}
            onChange={(e) => setSight(e.target.value)}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 font-mono"
          />
        </div>
      </div>

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
                  const isZero = zeroN != null && row.distanceM === zeroN
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
