import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { getRifleById } from '../actions';
import { RifleEditButton } from '../RifleEditButton';
import { RangeLogRow } from '../../range/RangeLogRow';
import { EmptyState } from '../../EmptyState';
import { formatBcSuffix, formatTwistSuffix } from '@/lib/format';

export default async function RifleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('rifles');
  const locale = await getLocale();
  const fmt1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const rifle = await getRifleById(id);

  if (!rifle) notFound();

  const [recipes, rangeLogs, calibers] = await Promise.all([
    prisma.recipe.findMany({
      where: { rifleId: id },
      include: { caliber: true, projectile: true, propellant: true },
      orderBy: { name: 'asc' },
    }),
    prisma.rangeLog.findMany({
      where: { rifleId: id },
      include: {
        recipe: { select: { id: true, name: true, caliber: { select: { name: true } } } },
        mainImage: { select: { id: true, filename: true, description: true } },
        _count: { select: { images: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.caliber.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link href="/rifles" className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('detail.back')}
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{rifle.name}</h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mt-1">{rifle.caliber.name}</p>
        </div>
        <RifleEditButton rifle={rifle} calibers={calibers} />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('detail.specs')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="text-zinc-500">{t('table.barrel')}</div>
            <div className="font-medium font-mono">{fmt1.format(rifle.barrelLengthMm)}</div>
          </div>
          <div>
            <div className="text-zinc-500">{t('table.twist')}</div>
            <div className="font-medium font-mono">1:{fmt1.format(rifle.twistIn)}</div>
          </div>
          <div>
            <div className="text-zinc-500">{t('table.sight')}</div>
            <div className="font-medium font-mono">{fmt1.format(rifle.sightHeightCm)}</div>
          </div>
          <div>
            <div className="text-zinc-500">{t('table.zero')}</div>
            <div className="font-medium font-mono">{fmt1.format(rifle.zeroDistanceM)}</div>
          </div>
          <div>
            <div className="text-zinc-500">{t('table.click')}</div>
            <div className="font-medium font-mono">{fmt1.format(rifle.clickCmAt100m)}</div>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="font-display text-2xl font-semibold mb-4">{t('detail.recipes')}</h2>
        {recipes.length === 0 ? (
          <EmptyState>{t('detail.noRecipes')}</EmptyState>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">{t('detail.recipeName')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('table.caliber')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('detail.recipeProjectile')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('detail.recipeCharge')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recipes.map((recipe) => (
                  <tr key={recipe.id}>
                    <td className="px-6 py-3 font-medium">
                      <Link href={`/recipes/${recipe.id}`} className="text-accent hover:text-accent-hover hover:underline">
                        {recipe.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{recipe.caliber.name}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">
                      {recipe.projectile.brand} {recipe.projectile.type} ({recipe.projectile.weightGr} gr{formatBcSuffix(recipe.projectile.bcG1, recipe.projectile.bcG7)}{formatTwistSuffix(recipe.projectile.preferredTwistIn)})
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {recipe.chargeGr != null ? `${recipe.chargeGr} gr` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-2xl font-semibold mb-4">{t('detail.rangeSessions')}</h2>
        {rangeLogs.length === 0 ? (
          <EmptyState>{t('detail.noRangeSessions')}</EmptyState>
        ) : (
          <div className="space-y-4">
            {rangeLogs.map((log) => (
              <RangeLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
