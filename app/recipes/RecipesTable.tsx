'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RecipeForm } from './RecipeForm';
import { DeleteRecipeButton } from './DeleteRecipeButton';

function getPossibleLoads(recipe: any): number | null {
  const projAmount = recipe.projectile?.amount ?? 0;
  const powderGrams = recipe.propellant?.amountGr ?? 0;
  const chargeGr = recipe.chargeGr ?? 0;

  const GRAIN_TO_GRAM = 0.06479891;

  let fromPowder = Infinity;
  if (chargeGr > 0 && powderGrams > 0) {
    const gramsPerLoad = chargeGr * GRAIN_TO_GRAM;
    fromPowder = Math.floor(powderGrams / gramsPerLoad);
  }

  const fromProjectile = projAmount;

  let fromPrimer = Infinity;
  if (recipe.primer) {
    fromPrimer = recipe.primer.amount ?? 0;
  }

  const min = Math.min(fromProjectile, fromPowder, fromPrimer);
  return min === Infinity ? null : Math.max(0, min);
}

interface RecipesTableProps {
  recipes: any[];
  projectiles: any[];
  propellants: any[];
  primers: any[];
}

export function RecipesTable({ recipes, projectiles, propellants, primers }: RecipesTableProps) {
  const [editingRecipe, setEditingRecipe] = useState<any | null>(null);

  const handleRowClick = (recipe: any) => {
    setEditingRecipe(recipe);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-3 font-medium">Name</th>
              <th className="text-left px-6 py-3 font-medium">Caliber</th>
              <th className="text-left px-6 py-3 font-medium">Projectile</th>
              <th className="text-left px-6 py-3 font-medium">Powder</th>
              <th className="text-right px-6 py-3 font-medium">Charge</th>
              <th className="text-right px-6 py-3 font-medium">COAL</th>
              <th className="text-right px-6 py-3 font-medium">Calc V0</th>
              <th className="text-right px-6 py-3 font-medium">Meas V0</th>
              <th className="text-right px-6 py-3 font-medium">Fill %</th>
              <th className="text-right px-6 py-3 font-medium">Possible</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recipes.map((recipe) => (
              <tr
                key={recipe.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
                onClick={() => handleRowClick(recipe)}
              >
                <td className="px-6 py-4 font-medium">
                  <Link href={`/recipes/${recipe.id}`} className="hover:underline">
                    {recipe.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{recipe.caliber}</td>
                <td className="px-6 py-4">
                  {recipe.projectile.brand} {recipe.projectile.type} ({recipe.projectile.weightGr} gr)
                </td>
                <td className="px-6 py-4">
                  {recipe.propellant.brand} – {recipe.propellant.type}
                </td>
                <td className="px-6 py-4 text-right font-mono">
                  {recipe.chargeGr ? `${recipe.chargeGr} gr` : '—'}
                </td>
                <td className="px-6 py-4 text-right font-mono">
                  {recipe.coal ? `${recipe.coal}"` : '—'}
                </td>
                <td className="px-6 py-4 text-right font-mono">
                  {recipe.calculatedV0 ? `${recipe.calculatedV0}` : '—'}
                </td>
                <td className="px-6 py-4 text-right font-mono">
                  {recipe.measuredV0 ? `${recipe.measuredV0}` : '—'}
                </td>
                <td className="px-6 py-4 text-right font-mono">
                  {recipe.fillRate ? `${recipe.fillRate}` : '—'}
                </td>
                <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                  {(() => {
                    const possible = getPossibleLoads(recipe);
                    return possible !== null ? `${possible}×` : '—';
                  })()}
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`/logs?recipeId=${recipe.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mr-3"
                  >
                    Log load
                  </a>
                  <a
                    href={`/range/new?recipeId=${recipe.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mr-3"
                  >
                    Log range
                  </a>
                  <DeleteRecipeButton id={recipe.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Single controlled edit modal at the root of the table */}
      <RecipeForm
        updateAction={async (id, formData) => {
          const { updateRecipe } = await import('./actions');
          await updateRecipe(id, formData);
        }}
        defaultValues={editingRecipe}
        projectiles={projectiles}
        propellants={propellants}
        primers={primers}
        open={!!editingRecipe}
        onOpenChange={(open) => {
          if (!open) handleRowClick(null);
        }}
      />
    </>
  );
}
