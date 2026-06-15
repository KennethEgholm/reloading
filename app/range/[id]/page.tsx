import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRangeLogById, getRecipesForRangeLog, deleteRangeLogAndRedirect } from '../actions'
import { RangeLogForm } from '../RangeLogForm'
import { DeleteRangeLogButton } from '../DeleteRangeLogButton'

export default async function RangeLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [log, recipes] = await Promise.all([
    getRangeLogById(id),
    getRecipesForRangeLog(),
  ])

  if (!log) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/range" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Range Sessions
        </Link>

        <Link
          href={`/range/new?recipeId=${log.recipe.id}`}
          className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          + Log another session
        </Link>
        <Link
          href={`/range/${id}/edit`}
          className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Edit
        </Link>
        <form action={deleteRangeLogAndRedirect.bind(null, id)}>
          <button
            type="submit"
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Delete
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        <RangeLogForm
          recipes={recipes}
          initialData={log}
          logId={log.id}
          readonly={true}
        />
      </div>
    </div>
  )
}
