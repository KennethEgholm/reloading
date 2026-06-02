'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RecipeForm } from './RecipeForm';
import { DeleteRecipeButton } from './DeleteRecipeButton';

// Compact verdict badge for the list. Renders nothing until a check has run.
function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return <span className="text-zinc-300 dark:text-zinc-600">—</span>;

  const styles: Record<string, string> = {
    OK: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    CAUTION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    STOP: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    UNKNOWN: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  };
  const cls = styles[verdict] ?? styles.UNKNOWN;

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {verdict}
    </span>
  );
}

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
  const router = useRouter();
  const [editingRecipe, setEditingRecipe] = useState<any | null>(null);

  // Row click opens the readonly detail view; the Edit action opens the form.
  const handleRowClick = (recipe: any) => {
    router.push(`/recipes/${recipe.id}`);
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
              <th className="text-center px-6 py-3 font-medium">Check</th>
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
                <td className="px-6 py-4 font-medium">{recipe.name}</td>
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
                <td className="px-6 py-4 text-center">
                  <VerdictBadge verdict={recipe.aiVerdict} />
                </td>
                <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                  {(() => {
                    const possible = getPossibleLoads(recipe);
                    return possible !== null ? `${possible}×` : '—';
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEditingRecipe(recipe)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mr-3"
                  >
                    Edit
                  </button>
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
          if (!open) setEditingRecipe(null);
        }}
      />
    </>
  );
}
