'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { RecipeForm } from './RecipeForm';
import { DeleteRecipeButton } from './DeleteRecipeButton';
import { SortIndicator } from '../SortIndicator';
import { useSortBy } from '@/lib/useSortBy';
import { getPossibleLoads } from '@/lib/inventory';
import { formatBcSuffix, formatTwistSuffix } from '@/lib/format';
import { formatCharge } from '@/lib/ladder';
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

type RecipeRow = RecipeWithRelations & {
  projectileLabel: string;
  powderLabel: string;
  possible: number;
};

interface RecipesTableProps {
  recipes: RecipeWithRelations[];
  projectiles: Projectile[];
  propellants: Propellant[];
  primers: Primer[];
  cartridges: CartridgeWithCaliber[];
  rifles: RifleWithCaliber[];
  calibers: CaliberOption[];
}

function chargeRangeLabel(members: RecipeRow[]): string {
  const charges = members.map((m) => m.chargeGr).filter((c): c is number => c != null);
  if (charges.length === 0) return '—';
  const min = Math.min(...charges);
  const max = Math.max(...charges);
  if (min === max) return `${formatCharge(min)} gr`;
  return `${formatCharge(min)}–${formatCharge(max)} gr`;
}

export function RecipesTable({ recipes, projectiles, propellants, primers, cartridges, rifles, calibers }: RecipesTableProps) {
  const t = useTranslations('recipes');
  const router = useRouter();
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithRelations | null>(null);
  const [expandedLadders, setExpandedLadders] = useState<Set<string>>(new Set());

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

  const { standalone, groups } = useMemo(() => {
    const standalone: RecipeRow[] = [];
    const map = new Map<string, { id: string; name: string; members: RecipeRow[] }>();
    for (const recipe of rows) {
      if (!recipe.ladder) {
        standalone.push(recipe);
        continue;
      }
      const existing = map.get(recipe.ladder.id);
      if (existing) existing.members.push(recipe);
      else map.set(recipe.ladder.id, { id: recipe.ladder.id, name: recipe.ladder.name, members: [recipe] });
    }
    for (const group of map.values()) {
      group.members.sort((a, b) => (a.ladderChargeIndex ?? 999) - (b.ladderChargeIndex ?? 999));
    }
    const groups = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    return { standalone, groups };
  }, [rows]);

  const { sorted, sortKey, sortDirection, toggleSort } = useSortBy<RecipeRow, SortKey>(standalone, 'name');

  const toggleLadder = (id: string) => {
    setExpandedLadders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const renderRecipeRow = (recipe: RecipeRow, nested: boolean) => (
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
      <td className={`px-3 py-4 font-medium whitespace-nowrap ${nested ? 'pl-8' : ''}`}>
        {recipe.name}
      </td>
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
            {sorted.map((recipe) => renderRecipeRow(recipe, false))}
            {groups.map((group) => {
              const open = expandedLadders.has(group.id);
              const first = group.members[0];
              const possibles = group.members.map((m) => m.possible).filter((n) => n >= 0);
              const possible = possibles.length > 0 ? Math.min(...possibles) : -1;
              return (
                <Fragment key={group.id}>
                  <tr
                    className="bg-zinc-50/80 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-950/70 cursor-pointer"
                    onClick={() => toggleLadder(group.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleLadder(group.id);
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={open}
                  >
                    <td className="px-3 py-4 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg
                          className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-90' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.05 4.55a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.44 10 7.05 5.61a.75.75 0 0 1 0-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{group.name}</span>
                        <Link
                          href={`/recipes/ladders/${group.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                        >
                          {t('table.ladderSteps', { count: group.members.length })}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {first?.caliber.name ?? '—'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {first
                        ? `${first.projectile.brand} ${first.projectile.type} (${first.projectile.weightGr} gr${formatBcSuffix(first.projectile.bcG1, first.projectile.bcG7)}${formatTwistSuffix(first.projectile.preferredTwistIn)})`
                        : '—'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {first ? `${first.propellant.brand} – ${first.propellant.type}` : '—'}
                    </td>
                    <td className="px-3 py-4 text-right font-mono whitespace-nowrap">
                      {chargeRangeLabel(group.members)}
                    </td>
                    <td className="px-3 py-4 text-right font-mono whitespace-nowrap">
                      {first?.coal ? `${first.coal}"` : '—'}
                    </td>
                    <td className="px-3 py-4 text-right font-mono whitespace-nowrap">—</td>
                    <td className="px-3 py-4 text-right font-mono whitespace-nowrap">—</td>
                    <td className="px-3 py-4 text-right font-mono whitespace-nowrap">—</td>
                    <td className="px-3 py-4 text-center">—</td>
                    <td className="px-3 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {possible >= 0 ? `${possible}×` : '—'}
                    </td>
                    <td className="px-3 py-4" />
                  </tr>
                  {open && group.members.map((recipe) => renderRecipeRow(recipe, true))}
                </Fragment>
              );
            })}
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
