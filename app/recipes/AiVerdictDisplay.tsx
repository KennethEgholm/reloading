'use client'

import { useLocale, useTranslations } from 'next-intl'
import { formatDateTime } from '@/lib/format'

// Shared rendering for an AI safety-check result + the persistent disclaimer.
// Used by both the recipe detail view (RecipeAiCheck) and the edit-mode form
// (RecipeForm) so the verdict looks identical wherever it is shown.

export interface AiVerdictData {
  verdict: string | null
  summary: string | null
  /** JSON array string OR an already-parsed string[]. */
  concerns: string | string[] | null
  model?: string | null
  checkedAt?: Date | string | null
}

function useVerdictStyles() {
  const t = useTranslations('recipes')
  const styles: Record<string, { box: string; text: string; label: string }> = {
    OK: {
      box: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
      text: 'text-emerald-800 dark:text-emerald-300',
      label: t('aiVerdict.OK'),
    },
    CAUTION: {
      box: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-300',
      label: t('aiVerdict.CAUTION'),
    },
    STOP: {
      box: 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800',
      text: 'text-red-800 dark:text-red-300',
      label: t('aiVerdict.STOP'),
    },
    UNKNOWN: {
      box: 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700',
      text: 'text-zinc-700 dark:text-zinc-300',
      label: t('aiVerdict.UNKNOWN'),
    },
  }
  return styles
}

function parseConcerns(concerns: string | string[] | null): string[] {
  if (!concerns) return []
  if (Array.isArray(concerns)) return concerns.filter((c) => typeof c === 'string')
  try {
    const parsed = JSON.parse(concerns)
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : []
  } catch {
    return []
  }
}

/** The always-visible advisory disclaimer. */
export function AiDisclaimer() {
  const t = useTranslations('recipes')
  return (
    <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
      {t('aiDisclaimer')}
    </div>
  )
}

/** Renders the verdict banner, summary, concerns, and (optionally) provenance. */
export function AiVerdictDisplay({ verdict, summary, concerns, model, checkedAt }: AiVerdictData) {
  const t = useTranslations('recipes')
  const locale = useLocale()
  const styles = useVerdictStyles()
  const style = styles[verdict ?? 'UNKNOWN'] ?? styles.UNKNOWN
  const concernList = parseConcerns(concerns)
  const checkedAtLabel = checkedAt ? formatDateTime(checkedAt, locale) : null

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border px-4 py-3 ${style.box}`}>
        <div className={`text-sm font-semibold ${style.text}`}>
          {style.label}
        </div>
        {summary && (
          <p className="text-sm mt-1.5 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{summary}</p>
        )}
      </div>

      {concernList.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-1">{t('aiVerdict.concerns')}</div>
          <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
            {concernList.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {checkedAtLabel && (
        <div className="text-xs text-zinc-500">
          {t('aiCheck.lastChecked', { date: checkedAtLabel })}
          {model && ` · `}{model && <span translate="no">{model}</span>}
        </div>
      )}
    </div>
  )
}
