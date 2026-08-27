import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { createRecipe } from './actions'
import { RecipesTable } from './RecipesTable'
import { RecipeForm } from './RecipeForm'
import { QuickLoadImport } from './QuickLoadImport'
import { QuickLoadImageImport } from './QuickLoadImageImport'
import { EmptyState } from '../EmptyState'

export default async function RecipesPage() {
  const t = await getTranslations('recipes')
  const [recipes, projectiles, propellants, primers, cartridges, calibers] = await Promise.all([
    prisma.recipe.findMany({
      include: {
        caliber: true,
        projectile: true,
        propellant: true,
        primer: true,
        cartridge: { include: { caliber: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.projectile.findMany({ orderBy: { brand: 'asc' } }),
    prisma.propellant.findMany({ orderBy: { brand: 'asc' } }),
    prisma.primer.findMany({ orderBy: { brand: 'asc' } }),
    prisma.cartridge.findMany({ include: { caliber: true }, orderBy: { brand: 'asc' } }),
    prisma.caliber.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="w-full px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <QuickLoadImageImport projectiles={projectiles} propellants={propellants} calibers={calibers} />
          <QuickLoadImport projectiles={projectiles} propellants={propellants} calibers={calibers} />
          <RecipeForm
            action={createRecipe}
            title={t('form.titleAdd')}
            submitLabel={t('form.save')}
            projectiles={projectiles}
            propellants={propellants}
            primers={primers}
            cartridges={cartridges}
            calibers={calibers}
          />
        </div>
      </div>

      {/* Recipes List */}
      {recipes.length === 0 ? (
        <EmptyState>{t('page.empty')}</EmptyState>
      ) : (
        <RecipesTable
          recipes={recipes}
          projectiles={projectiles}
          propellants={propellants}
          primers={primers}
          cartridges={cartridges}
          calibers={calibers}
        />
      )}
    </div>
  )
}
