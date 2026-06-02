import Link from 'next/link'
import { getRecipeById } from '../actions'

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const recipe = await getRecipeById(id)

  if (!recipe) {
    return <div className="max-w-4xl mx-auto px-6 py-10">Recipe not found.</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link href="/recipes" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Recipes
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">{recipe.name}</h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mt-1">{recipe.caliber}</p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/logs?recipeId=${recipe.id}`}
            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Log a load
          </Link>
          <Link
            href={`/range/new?recipeId=${recipe.id}`}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Log range session
          </Link>
        </div>
      </div>

      {/* Recipe Details */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Recipe Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-zinc-500">Projectile</div>
            <div className="font-medium">
              {recipe.projectile.brand} {recipe.projectile.type} ({recipe.projectile.weightGr} gr)
            </div>
          </div>
          <div>
            <div className="text-zinc-500">Propellant</div>
            <div className="font-medium">
              {recipe.propellant.brand} – {recipe.propellant.type}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">Primer</div>
            <div className="font-medium">
              {recipe.primer ? `${recipe.primer.brand} ${recipe.primer.type.replace('_', ' ')}` : '—'}
            </div>
          </div>

          <div>
            <div className="text-zinc-500">Charge</div>
            <div className="font-medium">{recipe.chargeGr ? `${recipe.chargeGr} gr` : '—'}</div>
          </div>
          <div>
            <div className="text-zinc-500">COAL</div>
            <div className="font-medium">{recipe.coal ? `${recipe.coal}"` : '—'}</div>
          </div>
          <div>
            <div className="text-zinc-500">Fill Rate</div>
            <div className="font-medium">{recipe.fillRate ? `${recipe.fillRate}%` : '—'}</div>
          </div>

          <div>
            <div className="text-zinc-500">Calculated V0</div>
            <div className="font-medium">{recipe.calculatedV0 ? `${recipe.calculatedV0} m/s` : '—'}</div>
          </div>
          <div>
            <div className="text-zinc-500">Measured V0</div>
            <div className="font-medium">{recipe.measuredV0 ? `${recipe.measuredV0} m/s` : '—'}</div>
          </div>
        </div>

        {recipe.notes && (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-zinc-500 text-sm mb-1">Notes</div>
            <p className="text-sm whitespace-pre-wrap">{recipe.notes}</p>
          </div>
        )}
      </div>

      {/* Recent Range Sessions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Range Sessions</h2>
          <Link href={`/range/new?recipeId=${recipe.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Log new session →
          </Link>
        </div>

        {recipe.rangeLogs.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
            No range sessions logged for this recipe yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recipe.rangeLogs.map((session) => (
              <Link
                key={session.id}
                href={`/range/${session.id}`}
                className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex justify-between">
                  <div>
                    <span className="font-medium">{new Date(session.date).toLocaleDateString()}</span>
                    {session.location && <span className="text-zinc-500 ml-2">• {session.location}</span>}
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {session.roundsFired} rounds
                  </div>
                </div>
                {(session.velocityAvg || session.extremeSpread) && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {session.velocityAvg && `Avg ${session.velocityAvg} m/s`}
                    {session.extremeSpread && ` • ES ${session.extremeSpread}`}
                  </div>
                )}
                {session.notes && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">
                    {session.notes}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Loading Logs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Loading Logs</h2>
          <Link href={`/logs?recipeId=${recipe.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Log new load →
          </Link>
        </div>

        {recipe.loadLogs.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
            No loads logged for this recipe yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recipe.loadLogs.map((load) => (
              <Link
                key={load.id}
                href={`/logs/${load.id}`}
                className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex justify-between">
                  <div>
                    <span className="font-medium">{new Date(load.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {load.quantity} rounds
                  </div>
                </div>
                {load.notes && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">
                    {load.notes}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
