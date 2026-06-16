'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RecipeForm } from './RecipeForm';
import { DeleteRecipeButton } from './DeleteRecipeButton';
import { getPossibleLoads } from '@/lib/inventory';
import type {
  RecipeWithRelations,
  Projectile,
  Propellant,
  Primer,
  Cartridge,
} from '@/lib/types';

// Compact verdict badge for the list. Renders nothing until a check has run.
function VerdictBadge({ verdict }: { verdict: string | null }) {
  const t = useTranslations('recipes')
  if (!verdict) return <span className="text-zinc-300 dark:text-zinc-600">—</span>;

  const labels: Record<string, string> = {
    OK: t('aiVerdict.OK'),
    CAUTION: t('aiVerdict.CAUTION'),
    STOP: t('aiVerdict.STOP'),
    UNKNOWN: t('aiVerdict.UNKNOWN'),
  }

  const styles: Record<string, string> = {
    OK: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    CAUTION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    STOP: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    UNKNOWN: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  };
  const cls = styles[verdict] ?? styles.UNKNOWN;

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {labels[verdict] ?? verdict}
    </span>
  );
}

interface RecipesTableProps {
  recipes: RecipeWithRelations[];
  projectiles: Projectile[];
  propellants: Propellant[];
  primers: Primer[];
  cartridges: Cartridge[];
}

export function RecipesTable({ recipes, projectiles, propellants, primers, cartridges }: RecipesTableProps) {
  const t = useTranslations('recipes');
  const router = useRouter();
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithRelations | null>(null);

  // Row click opens the readonly detail view; the Edit action opens the form.
  const handleRowClick = (recipe: RecipeWithRelations) => {
    router.push(`/recipes/${recipe.id}`);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-3 font-medium">{t('table.name')}</th>
              <th className="text-left px-6 py-3 font-medium">{t('table.caliber')}</th>
              <th className="text-left px-6 py-3 font-medium">{t('table.projectile')}</th>
              <th className="text-left px-6 py-3 font-medium">{t('table.powder')}</th>
              <th className="text-right px-6 py-3 font-medium">{t('table.charge')}</th>
              <th className="text-right px-6 py-3 font-medium">{t('table.coal')}</th>
              <th className="text-right px-6 py-3 font-medium">{t('table.calcV0')}</th>
              <th className="text-right px-6 py-3 font-medium">{t('table.measV0')}</th>
              <th className="text-right px-6 py-3 font-medium">{t('table.fill')}</th>
              <th className="text-center px-6 py-3 font-medium">{t('table.check')}</th>
              <th className="text-right px-6 py-3 font-medium">{t('table.possible')}</th>
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
                    className="text-sm text-accent hover:text-accent-hover hover:underline mr-3"
                  >
                    {t('form.titleEdit')}
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
        cartridges={cartridges}
        open={!!editingRecipe}
        onOpenChange={(open) => {
          if (!open) setEditingRecipe(null);
        }}
      />
    </>
  );
}
