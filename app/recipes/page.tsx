import { prisma } from '@/lib/prisma'
import { createRecipe } from './actions'
import { RecipesTable } from './RecipesTable'
import { RecipeForm } from './RecipeForm'

export default async function RecipesPage() {
  const [recipes, projectiles, propellants, primers] = await Promise.all([
    prisma.recipe.findMany({
      include: {
        projectile: true,
        propellant: true,
        primer: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.projectile.findMany({ orderBy: { brand: 'asc' } }),
    prisma.propellant.findMany({ orderBy: { brand: 'asc' } }),
    prisma.primer.findMany({ orderBy: { brand: 'asc' } }),
  ])

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Load Recipes</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Saved combinations of components
          </p>
        </div>

        <RecipeForm
          action={createRecipe}
          title="Add New Recipe"
          submitLabel="Save Recipe"
          projectiles={projectiles}
          propellants={propellants}
          primers={primers}
        />
      </div>

      {/* Recipes List */}
      {recipes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
          No recipes yet. Click "+ Add Recipe" above to create your first one.
        </div>
      ) : (
        <RecipesTable
          recipes={recipes}
          projectiles={projectiles}
          propellants={propellants}
          primers={primers}
        />
      )}
    </div>
  )
}
