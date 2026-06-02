import Link from 'next/link'
import { getRecipesForRangeLog } from '../actions'
import { RangeLogForm } from '../RangeLogForm'

export default async function NewRangeLogPage({
  searchParams,
}: {
  searchParams: Promise<{ recipeId?: string }>
}) {
  const { recipeId } = await searchParams
  const recipes = await getRecipesForRangeLog()

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/range" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Range Sessions
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Log New Range Session</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          Record details from your range session, including photos of targets and notes.
        </p>

        <RangeLogForm recipes={recipes} defaultRecipeId={recipeId} />
      </div>
    </div>
  )
}
