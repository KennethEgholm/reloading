import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getLadder } from '../actions';
import { buildLadderRows } from '@/lib/ladder';
import { DeleteLadderButton } from './DeleteLadderButton';
import { LadderEditButton } from './LadderEditButton';
import { PromoteWinnerButton } from './PromoteWinnerButton';
import { SetWinnerButton } from './SetWinnerButton';

function formatNullable(value: number | null, digits: number, dash = '—'): string {
  if (value === null) return dash;
  return value.toFixed(digits);
}

export default async function LadderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('ladders');
  const ladder = await getLadder(id);
  if (!ladder) notFound();

  const rows = buildLadderRows(ladder.recipes);
  const bestMoa = rows.reduce<number | null>(
    (best, r) => (r.bestMoa !== null && (best === null || r.bestMoa < best) ? r.bestMoa : best),
    null,
  );
  const winnerId = ladder.winningRecipeId;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link href="/recipes" className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('page.backToRecipes')}
        </Link>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{ladder.name}</h1>
          {ladder.notes && (
            <p className="text-zinc-600 dark:text-zinc-400 mt-2 whitespace-pre-line">{ladder.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/recipes/ladders/${ladder.id}/print`}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {t('page.print')}
          </Link>
          {winnerId && ladder.recipes.some((r) => r.id === winnerId) && (
            <PromoteWinnerButton
              ladderId={ladder.id}
              defaultName={ladder.name}
              winnerName={ladder.recipes.find((r) => r.id === winnerId)?.name ?? ''}
            />
          )}
          <LadderEditButton ladder={{ id: ladder.id, name: ladder.name, notes: ladder.notes }} />
          <DeleteLadderButton id={ladder.id} />
        </div>
      </div>

      {/* Shared component summary from the first member (all members share these) */}
      {rows.length > 0 && (
        <p className="text-sm text-zinc-500 mb-8">
          {t('page.membersCount', { count: rows.length })}
        </p>
      )}

      {/* Comparison table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500 dark:text-zinc-400">
                <th className="px-4 py-3 font-medium">{t('table.charge')}</th>
                <th className="px-4 py-3 font-medium">{t('table.avgMoa')}</th>
                <th className="px-4 py-3 font-medium">{t('table.bestMoa')}</th>
                <th className="px-4 py-3 font-medium">{t('table.avgVelocity')}</th>
                <th className="px-4 py-3 font-medium">{t('table.extremeSpread')}</th>
                <th className="px-4 py-3 font-medium">{t('table.stdDev')}</th>
                <th className="px-4 py-3 font-medium">{t('table.sessions')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('table.winner')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isWinner = row.recipe.id === winnerId;
                const isBest = row.bestMoa !== null && row.bestMoa === bestMoa;
                return (
                  <tr
                    key={row.recipe.id}
                    className={`border-b border-zinc-100 dark:border-zinc-800/60 ${
                      isBest ? 'bg-accent/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/recipes/${row.recipe.id}`}
                        className="text-accent hover:text-accent-hover font-medium font-mono"
                      >
                        {row.recipe.chargeGr !== null ? `${row.recipe.chargeGr} gr` : '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono">{formatNullable(row.avgMoa, 2)}</td>
                    <td className={`px-4 py-3 font-mono ${isBest ? 'font-semibold' : ''}`}>
                      {formatNullable(row.bestMoa, 2)}
                    </td>
                    <td className="px-4 py-3 font-mono">{formatNullable(row.avgVelocity, 0)}</td>
                    <td className="px-4 py-3 font-mono">{formatNullable(row.extremeSpread, 0)}</td>
                    <td className="px-4 py-3 font-mono">{formatNullable(row.avgStdDev, 1)}</td>
                    <td className="px-4 py-3 font-mono">{row.sessionCount}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <SetWinnerButton
                        ladderId={ladder.id}
                        recipeId={row.recipe.id}
                        isWinner={isWinner}
                      />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    {t('page.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {bestMoa !== null && (
        <p className="text-xs text-zinc-500 mt-3">{t('page.bestHighlighted', { moa: bestMoa.toFixed(2) })}</p>
      )}
    </div>
  );
}