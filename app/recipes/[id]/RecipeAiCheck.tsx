'use client'

import { useTransition } from 'react'
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
  const [isPending, startTransition] = useTransition()
  const hasResult = !!aiVerdict

  const handleRun = () => {
    startTransition(async () => {
      try {
        await runRecipeAiCheck(recipeId)
        toast.success('AI safety check complete')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'AI check failed'
        toast.error(message)
      }
    })
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AI Safety Check</h2>
        <button
          onClick={handleRun}
          disabled={isPending}
          className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Checking…' : hasResult ? 'Re-run check' : 'Run check'}
        </button>
      </div>

      <div className="mb-4">
        <AiDisclaimer />
      </div>

      {!hasResult ? (
        <p className="text-sm text-zinc-500">
          No assessment yet. Click <span className="font-medium">Run check</span> to ask the configured AI
          model to review this recipe for obvious errors or dangers.
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
  )
}
