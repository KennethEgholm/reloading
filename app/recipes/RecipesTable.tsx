'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RecipeForm } from './RecipeForm';
import { DeleteRecipeButton } from './DeleteRecipeButton';
import { SortIndicator } from '../SortIndicator';
import { useSortBy } from '@/lib/useSortBy';
import { getPossibleLoads } from '@/lib/inventory';
import { formatBcSuffix, formatTwistSuffix } from '@/lib/format';
import type {
  RecipeWithRelations,
  Projectile,
  Propellant,
  Primer,
  CartridgeWithCaliber,
  RifleWithCaliber,
  CaliberOption,
} from '@/lib/types';

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

type SortKey =
  | 'name'
  | 'caliber.name'
  | 'projectileLabel'
  | 'powderLabel'
  | 'chargeGr'
  | 'coal'
  | 'calculatedV0'
  | 'measuredV0'
  | 'fillRate'
  | 'aiVerdict'
  | 'possible';

interface RecipesTableProps {
  recipes: RecipeWithRelations[];
  projectiles: Projectile[];
  propellants: Propellant[];
  primers: Primer[];
  cartridges: CartridgeWithCaliber[];
  rifles: RifleWithCaliber[];
  calibers: CaliberOption[];
}

export function RecipesTable({ recipes, projectiles, propellants, primers, cartridges, rifles, calibers }: RecipesTableProps) {
  const t = useTranslations('recipes');
  const router = useRouter();
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithRelations | null>(null);

  const rows = useMemo(
    () =>
      recipes.map((recipe) => ({
        ...recipe,
        projectileLabel: `${recipe.projectile.brand} ${recipe.projectile.type ?? ''} ${recipe.projectile.weightGr}${formatBcSuffix(recipe.projectile.bcG1, recipe.projectile.bcG7)}${formatTwistSuffix(recipe.projectile.preferredTwistIn)}`,
        powderLabel: `${recipe.propellant.brand} ${recipe.propellant.type}`,
        possible: getPossibleLoads(recipe) ?? -1,
      })),
    [recipes],
  );

  const { sorted, sortKey, sortDirection, toggleSort } = useSortBy<typeof rows[number], SortKey>(rows, 'name');

  const handleRowClick = (recipe: RecipeWithRelations) => {
    router.push(`/recipes/${recipe.id}`);
  };

  const sortableHeader = (key: SortKey, label: string, align: 'left' | 'right' | 'center' = 'left') => (
    <th
      className={`px-3 py-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-200 text-${align}`}
      onClick={() => toggleSort(key)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''} ${align === 'center' ? 'justify-center w-full' : ''}`}>
        {label}
        <SortIndicator active={sortKey === key} direction={sortKey === key ? sortDirection : null} />
      </span>
    </th>
  );

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              {sortableHeader('name', t('table.name'))}
              {sortableHeader('caliber.name', t('table.caliber'))}
              {sortableHeader('projectileLabel', t('table.projectile'))}
              {sortableHeader('powderLabel', t('table.powder'))}
              {sortableHeader('chargeGr', t('table.charge'), 'right')}
              {sortableHeader('coal', t('table.coal'), 'right')}
              {sortableHeader('calculatedV0', t('table.calcV0'), 'right')}
              {sortableHeader('measuredV0', t('table.measV0'), 'right')}
              {sortableHeader('fillRate', t('table.fill'), 'right')}
              {sortableHeader('aiVerdict', t('table.check'), 'center')}
              {sortableHeader('possible', t('table.possible'), 'right')}
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sorted.map((recipe) => (
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
                  {recipe.projectile.brand} {recipe.projectile.type} ({recipe.projectile.weightGr} gr{formatBcSuffix(recipe.projectile.bcG1, recipe.projectile.bcG7)}{formatTwistSuffix(recipe.projectile.preferredTwistIn)})
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
                  {recipe.possible >= 0 ? `${recipe.possible}×` : '—'}
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
        rifles={rifles}
        calibers={calibers}
        open={!!editingRecipe}
        onOpenChange={(open) => {
          if (!open) setEditingRecipe(null);
        }}
      />
    </>
  );
}
