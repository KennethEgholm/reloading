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
  CartridgeWithCaliber,
  CaliberOption,
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
  cartridges: CartridgeWithCaliber[];
  calibers: CaliberOption[];
}

export function RecipesTable({ recipes, projectiles, propellants, primers, cartridges, calibers }: RecipesTableProps) {
  const t = useTranslations('recipes');
  const router = useRouter();
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithRelations | null>(null);

  // Row click opens the readonly detail view; the Edit action opens the form.
  const handleRowClick = (recipe: RecipeWithRelations) => {
    router.push(`/recipes/${recipe.id}`);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-3 py-3 font-medium whitespace-nowrap">{t('table.name')}</th>
              <th className="text-left px-3 py-3 font-medium whitespace-nowrap">{t('table.caliber')}</th>
              <th className="text-left px-3 py-3 font-medium whitespace-nowrap">{t('table.projectile')}</th>
              <th className="text-left px-3 py-3 font-medium whitespace-nowrap">{t('table.powder')}</th>
              <th className="text-right px-3 py-3 font-medium whitespace-nowrap">{t('table.charge')}</th>
              <th className="text-right px-3 py-3 font-medium whitespace-nowrap">{t('table.coal')}</th>
              <th className="text-right px-3 py-3 font-medium whitespace-nowrap">{t('table.calcV0')}</th>
              <th className="text-right px-3 py-3 font-medium whitespace-nowrap">{t('table.measV0')}</th>
              <th className="text-right px-3 py-3 font-medium whitespace-nowrap">{t('table.fill')}</th>
              <th className="text-center px-3 py-3 font-medium whitespace-nowrap">{t('table.check')}</th>
              <th className="text-right px-3 py-3 font-medium whitespace-nowrap">{t('table.possible')}</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recipes.map((recipe) => (
              <tr
                key={recipe.id}
                tabIndex={0}
                role="link"
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
                onClick={() => handleRowClick(recipe)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(recipe);
                  }
                }}
              >
                <td className="px-3 py-4 font-medium whitespace-nowrap">{recipe.name}</td>
                <td className="px-3 py-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{recipe.caliber.name}</td>
                <td className="px-3 py-4 whitespace-nowrap">
                  {recipe.projectile.brand} {recipe.projectile.type} ({recipe.projectile.weightGr} gr)
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  {recipe.propellant.brand} – {recipe.propellant.type}
                </td>
                <td className="px-3 py-4 text-right font-mono whitespace-nowrap">
                  {recipe.chargeGr ? `${recipe.chargeGr} gr` : '—'}
                </td>
                <td className="px-3 py-4 text-right font-mono whitespace-nowrap">
                  {recipe.coal ? `${recipe.coal}"` : '—'}
                </td>
                <td className="px-3 py-4 text-right font-mono whitespace-nowrap">
                  {recipe.calculatedV0 ? `${recipe.calculatedV0}` : '—'}
                </td>
                <td className="px-3 py-4 text-right font-mono whitespace-nowrap">
                  {recipe.measuredV0 ? `${recipe.measuredV0}` : '—'}
                </td>
                <td className="px-3 py-4 text-right font-mono whitespace-nowrap">
                  {recipe.fillRate ? `${recipe.fillRate}` : '—'}
                </td>
                <td className="px-3 py-4 text-center">
                  <VerdictBadge verdict={recipe.aiVerdict} />
                </td>
                <td className="px-3 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  {(() => {
                    const possible = getPossibleLoads(recipe);
                    return possible !== null ? `${possible}×` : '—';
                  })()}
                </td>
                <td className="px-3 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
        calibers={calibers}
        open={!!editingRecipe}
        onOpenChange={(open) => {
          if (!open) setEditingRecipe(null);
        }}
      />
    </>
  );
}
