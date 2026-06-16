import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { createRecipe } from './actions'
import { RecipesTable } from './RecipesTable'
import { RecipeForm } from './RecipeForm'

export default async function RecipesPage() {
  const t = await getTranslations('recipes')
  const [recipes, projectiles, propellants, primers, cartridges] = await Promise.all([
    prisma.recipe.findMany({
      include: {
        projectile: true,
        propellant: true,
        primer: true,
        cartridge: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.projectile.findMany({ orderBy: { brand: 'asc' } }),
    prisma.propellant.findMany({ orderBy: { brand: 'asc' } }),
    prisma.primer.findMany({ orderBy: { brand: 'asc' } }),
    prisma.cartridge.findMany({ orderBy: { brand: 'asc' } }),
  ])

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        <RecipeForm
          action={createRecipe}
          title={t('form.titleAdd')}
          submitLabel={t('form.save')}
          projectiles={projectiles}
          propellants={propellants}
          primers={primers}
          cartridges={cartridges}
        />
      </div>

      {/* Recipes List */}
      {recipes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
          {t('page.empty')}
        </div>
      ) : (
        <RecipesTable
          recipes={recipes}
          projectiles={projectiles}
          propellants={propellants}
          primers={primers}
          cartridges={cartridges}
        />
      )}
    </div>
  )
}
