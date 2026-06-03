'use client'

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

const VERDICT_STYLES: Record<string, { box: string; label: string; text: string }> = {
  OK: {
    box: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-300',
    label: 'Nothing obvious looks wrong',
  },
  CAUTION: {
    box: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-300',
    label: 'Caution — verify before loading',
  },
  STOP: {
    box: 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800',
    text: 'text-red-800 dark:text-red-300',
    label: 'Stop — possible danger detected',
  },
  UNKNOWN: {
    box: 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700',
    text: 'text-zinc-700 dark:text-zinc-300',
    label: 'Inconclusive',
  },
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
  return (
    <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
      ⚠️ AI guidance only. This is not verified load data. Always cross-check charge weights and COAL
      against current published data from the powder and bullet manufacturer before loading. Never rely
      on this for safety.
    </div>
  )
}

/** Renders the verdict banner, summary, concerns, and (optionally) provenance. */
export function AiVerdictDisplay({ verdict, summary, concerns, model, checkedAt }: AiVerdictData) {
  const style = VERDICT_STYLES[verdict ?? 'UNKNOWN'] ?? VERDICT_STYLES.UNKNOWN
  const concernList = parseConcerns(concerns)
  const checkedAtLabel = checkedAt ? formatDateTime(checkedAt) : null

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border px-4 py-3 ${style.box}`}>
        <div className={`text-sm font-semibold ${style.text}`}>
          {verdict ?? 'UNKNOWN'} — {style.label}
        </div>
        {summary && (
          <p className="text-sm mt-1.5 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{summary}</p>
        )}
      </div>

      {concernList.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-1">Specific concerns</div>
          <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 space-y-1">
            {concernList.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {checkedAtLabel && (
        <div className="text-xs text-zinc-500">
          Last checked {checkedAtLabel}
          {model && ` · ${model}`}
        </div>
      )}
    </div>
  )
}
