'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { runRecipeAiCheck } from '../actions'
import { AiVerdictDisplay, AiDisclaimer } from '../AiVerdictDisplay'

interface RecipeAiCheckProps {
  recipeId: string
  aiVerdict: string | null
  aiSummary: string | null
  aiConcerns: string | null // JSON array string
  aiModel: string | null
  aiCheckedAt: Date | string | null
}

export function RecipeAiCheck({
  recipeId,
  aiVerdict,
  aiSummary,
  aiConcerns,
  aiModel,
  aiCheckedAt,
}: RecipeAiCheckProps) {
  const t = useTranslations('recipes')
  const [isPending, startTransition] = useTransition()
  const hasResult = !!aiVerdict

  const handleRun = () => {
    startTransition(async () => {
      try {
        await runRecipeAiCheck(recipeId)
        toast.success(t('toast.aiCheckComplete'))
      } catch (error) {
        const message = error instanceof Error ? error.message : t('toast.aiCheckFailed')
        toast.error(message)
      }
    })
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8">
      <details className="group">
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
          <h2 className="text-lg font-semibold">{t('aiCheck.title')}</h2>
          {hasResult && (
            <span className={`ml-auto inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
              aiVerdict === 'OK' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
              : aiVerdict === 'CAUTION' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
              : aiVerdict === 'STOP' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
            }`}>
              {aiVerdict}
            </span>
          )}
        </summary>

        <div className="mt-4">
          <div className="flex items-center justify-end mb-4">
            <button
              onClick={handleRun}
              disabled={isPending}
              className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isPending ? t('aiCheck.checking') : hasResult ? t('aiCheck.reRun') : t('aiCheck.run')}
            </button>
          </div>

          <div className="mb-4">
            <AiDisclaimer />
          </div>

          {!hasResult ? (
            <p className="text-sm text-zinc-500">
              {t.rich('aiCheck.noAssessment', {
                runCheck: (chunks) => <span className="font-medium">{chunks}</span>,
              })}
            </p>
          ) : (
            <AiVerdictDisplay
              verdict={aiVerdict}
              summary={aiSummary}
              concerns={aiConcerns}
              model={aiModel}
              checkedAt={aiCheckedAt}
            />
          )}
        </div>
      </details>
    </div>
  )
}
