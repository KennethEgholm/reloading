import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { getRecipeById } from '../actions'
import { RecipeAiCheck } from './RecipeAiCheck'
import { formatDate } from '@/lib/format'

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('recipes')
  const locale = await getLocale()
  const recipe = await getRecipeById(id)

  if (!recipe) {
    return <div className="max-w-4xl mx-auto px-6 py-10">{t('detail.notFound')}</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link href="/recipes" className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('detail.back')}
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{recipe.name}</h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mt-1">{recipe.caliber.name}</p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/logs?recipeId=${recipe.id}`}
            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            {t('detail.logLoad')}
          </Link>
          <Link
            href={`/range/new?recipeId=${recipe.id}`}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {t('detail.logRange')}
          </Link>
        </div>
      </div>

      {/* Recipe Details */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('detail.recipeDetails')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-zinc-500">{t('detail.projectile')}</div>
            <div className="font-medium">
              {recipe.projectile.brand} {recipe.projectile.type} ({recipe.projectile.weightGr} gr)
            </div>
          </div>
          <div>
            <div className="text-zinc-500">{t('detail.propellant')}</div>
            <div className="font-medium">
              {recipe.propellant.brand} – {recipe.propellant.type}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">{t('detail.primer')}</div>
            <div className="font-medium">
              {recipe.primer ? `${recipe.primer.brand} ${recipe.primer.type.replace('_', ' ')}` : t('detail.none')}
            </div>
          </div>

          <div>
            <div className="text-zinc-500">{t('detail.cartridge')}</div>
            <div className="font-medium">
              {recipe.cartridge
                ? `${recipe.cartridge.brand} ${recipe.cartridge.caliber}${recipe.cartridge.waterCapacityGr != null ? ` (${recipe.cartridge.waterCapacityGr} gr H₂O)` : ''}`
                : t('detail.none')}
            </div>
          </div>

          <div>
            <div className="text-zinc-500">{t('detail.charge')}</div>
            <div className="font-medium">{recipe.chargeGr ? `${recipe.chargeGr} gr` : t('detail.none')}</div>
          </div>
          <div>
            <div className="text-zinc-500">{t('detail.coal')}</div>
            <div className="font-medium">{recipe.coal ? `${recipe.coal}"` : t('detail.none')}</div>
          </div>
          <div>
            <div className="text-zinc-500">{t('detail.fillRate')}</div>
            <div className="font-medium">{recipe.fillRate ? `${recipe.fillRate}%` : t('detail.none')}</div>
          </div>

          <div>
            <div className="text-zinc-500">{t('detail.calcV0')}</div>
            <div className="font-medium">{recipe.calculatedV0 ? `${recipe.calculatedV0} m/s` : t('detail.none')}</div>
          </div>
          <div>
            <div className="text-zinc-500">{t('detail.measV0')}</div>
            <div className="font-medium">{recipe.measuredV0 ? `${recipe.measuredV0} m/s` : t('detail.none')}</div>
          </div>
        </div>

        {recipe.notes && (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="text-zinc-500 text-sm mb-1">{t('detail.notes')}</div>
            <p className="text-sm whitespace-pre-wrap">{recipe.notes}</p>
          </div>
        )}
      </div>

      {/* AI Safety Check */}
      <RecipeAiCheck
        recipeId={recipe.id}
        aiVerdict={recipe.aiVerdict}
        aiSummary={recipe.aiSummary}
        aiConcerns={recipe.aiConcerns}
        aiModel={recipe.aiModel}
        aiCheckedAt={recipe.aiCheckedAt}
      />

      {/* Recent Range Sessions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('detail.recentRangeSessions')}</h2>
          <Link href={`/range/new?recipeId=${recipe.id}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
            {t('detail.logNewSession')}
          </Link>
        </div>

        {recipe.rangeLogs.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
            {t('detail.noRangeSessions')}
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
                    <span className="font-medium">{formatDate(session.date, locale)}</span>
                    {session.location && <span className="text-zinc-500 ml-2">• {session.location}</span>}
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {t('detail.rounds', { count: session.roundsFired })}
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
          <h2 className="text-lg font-semibold">{t('detail.recentLoadLogs')}</h2>
          <Link href={`/logs?recipeId=${recipe.id}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
            {t('detail.logNewLoad')}
          </Link>
        </div>

        {recipe.loadLogs.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
            {t('detail.noLoadLogs')}
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
                    <span className="font-medium">{formatDate(load.date, locale)}</span>
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {t('detail.rounds', { count: load.quantity })}
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
