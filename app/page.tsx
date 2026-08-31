import { prisma } from '@/lib/prisma';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { RangeLogRow } from './range/RangeLogRow';
import { LoadLogRow } from './logs/LoadLogRow';
import { getPossibleLoads } from '@/lib/inventory';
import { EmptyState } from './EmptyState';
import { formatBcSuffix, formatTwistSuffix } from '@/lib/format';
import { bucketMonthlyActivity } from '@/lib/monthlyActivity';
import { ActivityChart } from './ActivityChart';

export default async function Overview() {
  const t = await getTranslations('overview');
  const tCommon = await getTranslations('common');
  const locale = await getLocale();
  const fmt1 = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const [
    primers,
    projectiles,
    propellants,
    cartridges,
    recipes,
    recentRangeLogs,
    rangeCount,
    rangeSum,
    recentLoadLogs,
    loadCount,
    loadSum,
    factoryAmmo,
    factoryAmmoTotalRounds,
    factoryAmmoCount,
    rifles,
    rangeActivity,
    loadActivity,
  ] = await Promise.all([
    prisma.primer.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.projectile.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.propellant.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.cartridge.findMany({
      include: { caliber: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.recipe.findMany({
      include: {
        caliber: true,
        projectile: true,
        propellant: true,
        primer: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.rangeLog.findMany({
      include: {
        recipe: {
          select: { id: true, name: true, caliber: true },
        },
        mainImage: {
          select: { id: true, filename: true, description: true },
        },
        _count: {
          select: { images: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.rangeLog.count(),
    prisma.rangeLog.aggregate({ _sum: { roundsFired: true } }),
    prisma.loadLog.findMany({
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.loadLog.count(),
    prisma.loadLog.aggregate({ _sum: { quantity: true } }),
    prisma.factoryAmmo.findMany({
      include: { caliber: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.factoryAmmo.aggregate({ _sum: { amount: true } }),
    prisma.factoryAmmo.count(),
    prisma.rifle.findMany({
      include: { caliber: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.rangeLog.findMany({
      select: { date: true, roundsFired: true },
      orderBy: { date: 'desc' },
    }),
    prisma.loadLog.findMany({
      select: { date: true, quantity: true },
      orderBy: { date: 'desc' },
    }),
  ]);

  const totalRounds = rangeSum._sum.roundsFired ?? 0;
  const totalLoaded = loadSum._sum.quantity ?? 0;
  const totalFactoryAmmoRounds = factoryAmmoTotalRounds._sum.amount ?? 0;

  const totalPrimers = primers.reduce((sum, p) => sum + p.amount, 0);
  const totalProjectiles = projectiles.reduce((sum, p) => sum + p.amount, 0);
  const totalPropellantGrams = propellants.reduce((sum, p) => sum + p.amountGr, 0);
  const totalCases = cartridges.reduce((sum, c) => sum + c.amount, 0);

  const activityBuckets = bucketMonthlyActivity(
    rangeActivity.map((r) => ({ date: r.date, rounds: r.roundsFired })),
    loadActivity.map((l) => ({ date: l.date, rounds: l.quantity })),
  );
  const hasActivity = activityBuckets.some((b) => b.fired > 0 || b.loaded > 0);
  const possibleLoads = recipes
    .map((recipe) => getPossibleLoads(recipe))
    .filter((v): v is number => v !== null);
  const maxPossibleLoads = possibleLoads.length > 0 ? Math.max(...possibleLoads) : null;

  return (
    <div className="w-full px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <img src="/images/logo.svg" alt={t('title')} className="w-12 h-12" width={48} height={48} loading="lazy" />
          <h1 className="font-display text-4xl font-semibold tracking-tighter">{t('title')}</h1>
        </div>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          {t('subtitle')}
        </p>
      </div>

      {/* Hero cards: recent activity domains, whole card links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <Link
          href="/range"
          className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-accent hover:shadow-md hover:shadow-accent/10 dark:hover:border-accent transition-all"
        >
          <div className="flex items-start justify-between">
            <img src="/images/range.svg" alt="" aria-hidden="true" className="w-10 h-10 p-2 bg-accent/10 rounded-xl text-accent" width={40} height={40} loading="lazy" />
            <span className="text-zinc-300 dark:text-zinc-600 group-hover:text-accent group-hover:translate-x-0.5 transition-all" aria-hidden="true">→</span>
          </div>
          <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t('summary.rangeSessions')}</div>
          <div className="font-display text-3xl font-semibold mt-1 text-accent">{t('summary.logged', { count: rangeCount })}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 font-mono">{t('summary.roundsFired', { count: totalRounds })}</div>
        </Link>

        <Link
          href="/logs"
          className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-accent hover:shadow-md hover:shadow-accent/10 dark:hover:border-accent transition-all"
        >
          <div className="flex items-start justify-between">
            <img src="/images/log.svg" alt="" aria-hidden="true" className="w-10 h-10 p-2 bg-accent/10 rounded-xl text-accent" width={40} height={40} loading="lazy" />
            <span className="text-zinc-300 dark:text-zinc-600 group-hover:text-accent group-hover:translate-x-0.5 transition-all" aria-hidden="true">→</span>
          </div>
          <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t('summary.loadLogs')}</div>
          <div className="font-display text-3xl font-semibold mt-1 text-accent">{t('summary.loads', { count: loadCount })}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 font-mono">{t('summary.roundsLoaded', { count: totalLoaded })}</div>
        </Link>

        <Link
          href="/factory-ammo"
          className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-accent hover:shadow-md hover:shadow-accent/10 dark:hover:border-accent transition-all"
        >
          <div className="flex items-start justify-between">
            <img src="/images/factory-ammo.svg" alt="" aria-hidden="true" className="w-10 h-10 p-2 bg-accent/10 rounded-xl text-accent" width={40} height={40} loading="lazy" />
            <span className="text-zinc-300 dark:text-zinc-600 group-hover:text-accent group-hover:translate-x-0.5 transition-all" aria-hidden="true">→</span>
          </div>
          <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t('summary.factoryAmmo')}</div>
          <div className="font-display text-3xl font-semibold mt-1 text-accent">{t('summary.types', { count: factoryAmmoCount })}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 font-mono">{t('summary.roundsOnHand', { count: totalFactoryAmmoRounds })}</div>
        </Link>

        <Link
          href="/rifles"
          className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-accent hover:shadow-md hover:shadow-accent/10 dark:hover:border-accent transition-all"
        >
          <div className="flex items-start justify-between">
            <img src="/images/rifle.svg" alt="" aria-hidden="true" className="w-10 h-10 p-2 bg-accent/10 rounded-xl text-accent" width={40} height={40} loading="lazy" />
            <span className="text-zinc-300 dark:text-zinc-600 group-hover:text-accent group-hover:translate-x-0.5 transition-all" aria-hidden="true">→</span>
          </div>
          <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{t('summary.rifles')}</div>
          <div className="font-display text-3xl font-semibold mt-1 text-accent">{t('summary.rifleCount', { count: rifles.length })}</div>
        </Link>
      </div>

      {/* Inventory chips: stock at a glance */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        <Link
          href="/recipes"
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 hover:border-accent dark:hover:border-accent transition-colors"
        >
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('summary.recipes')}</div>
          <div className="font-mono text-xl font-medium mt-0.5">{recipes.length}</div>
        </Link>
        <Link
          href="/primers"
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 hover:border-accent dark:hover:border-accent transition-colors"
        >
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('summary.primers')}</div>
          <div className="font-mono text-xl font-medium mt-0.5">{totalPrimers}</div>
        </Link>
        <Link
          href="/projectiles"
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 hover:border-accent dark:hover:border-accent transition-colors"
        >
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('summary.projectiles')}</div>
          <div className="font-mono text-xl font-medium mt-0.5">{totalProjectiles}</div>
        </Link>
        <Link
          href="/propellants"
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 hover:border-accent dark:hover:border-accent transition-colors"
        >
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('summary.propellants')}</div>
          <div className="font-mono text-xl font-medium mt-0.5">{Math.round(totalPropellantGrams)}</div>
        </Link>
        <Link
          href="/cartridges"
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 hover:border-accent dark:hover:border-accent transition-colors"
        >
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('summary.cartridges')}</div>
          <div className="font-mono text-xl font-medium mt-0.5">{totalCases}</div>
        </Link>
      </div>

      {/* Monthly activity chart */}
      {hasActivity && (
        <div className="mb-10">
          <ActivityChart buckets={activityBuckets} locale={locale} />
        </div>
      )}

      {/* Range Sessions Section (recent) */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/range.svg" alt={t('sections.rangeSessions')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.rangeSessions')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.rangeSummary', { count: rangeCount, rounds: totalRounds })}</span>
          </div>
          <Link
            href="/range"
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {t('sections.viewFullList')}
          </Link>
        </div>

        {recentRangeLogs.length > 0 ? (
          <div className="space-y-4">
            {recentRangeLogs.map((log) => (
              <RangeLogRow key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <EmptyState>
            {t('sections.noRangeSessions')}{' '}
            <Link href="/range/new" className="text-accent hover:text-accent-hover hover:underline">
              {t('sections.logFirstSession')}
            </Link>
            .
          </EmptyState>
        )}
      </div>

      {/* Load Logs Section (recent) */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/log.svg" alt={t('sections.loadLogs')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.loadLogs')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.loadSummary', { count: loadCount, rounds: totalLoaded })}</span>
          </div>
          <Link
            href="/logs"
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {t('sections.viewFullList')}
          </Link>
        </div>

        {recentLoadLogs.length > 0 ? (
          <div className="space-y-4">
            {recentLoadLogs.map((log) => (
              <LoadLogRow key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <EmptyState>{t('sections.noLoadLogs')}</EmptyState>
        )}
      </div>

      {/* Factory Ammo Section (recent) */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/factory-ammo.svg" alt={t('sections.factoryAmmo')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.factoryAmmo')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.factoryAmmoSummary', { count: factoryAmmoCount, rounds: totalFactoryAmmoRounds })}</span>
          </div>
          <Link
            href="/factory-ammo"
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {t('sections.viewFullList')}
          </Link>
        </div>

        {factoryAmmo.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.factoryAmmoTable.brand')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.factoryAmmoTable.model')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.factoryAmmoTable.caliber')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.factoryAmmoTable.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {factoryAmmo.map((ammo) => (
                  <tr key={ammo.id}>
                    <td className="px-6 py-3 font-medium">
                      <Link href={`/factory-ammo/${ammo.id}`} className="hover:underline">
                        {ammo.brand}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{ammo.model}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{ammo.caliber.name}</td>
                    <td className="px-6 py-3 text-right font-mono">{ammo.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>
            {t('sections.noFactoryAmmo')}{' '}
            <Link href="/factory-ammo/new" className="text-accent hover:text-accent-hover hover:underline">
              {t('sections.addFirstFactoryAmmo')}
            </Link>
            .
          </EmptyState>
        )}
      </div>

      {/* Rifles Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/rifle.svg" alt={t('sections.rifles')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.rifles')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.rifleSummary', { count: rifles.length })}</span>
          </div>
          <Link
            href="/rifles"
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {t('sections.viewFullList')}
          </Link>
        </div>

        {rifles.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.rifleTable.name')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.rifleTable.caliber')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.rifleTable.barrel')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.rifleTable.twist')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.rifleTable.sight')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.rifleTable.zero')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.rifleTable.click')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {rifles.map((rifle) => (
                  <tr key={rifle.id}>
                    <td className="px-6 py-3 font-medium">{rifle.name}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{rifle.caliber.name}</td>
                    <td className="px-6 py-3 text-right font-mono">{fmt1.format(rifle.barrelLengthMm)}</td>
                    <td className="px-6 py-3 text-right font-mono">1:{fmt1.format(rifle.twistIn)}</td>
                    <td className="px-6 py-3 text-right font-mono">{fmt1.format(rifle.sightHeightCm)}</td>
                    <td className="px-6 py-3 text-right font-mono">{fmt1.format(rifle.zeroDistanceM)}</td>
                    <td className="px-6 py-3 text-right font-mono">{fmt1.format(rifle.clickCmAt100m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>{t('sections.noRifles')}</EmptyState>
        )}
      </div>

      {/* Recipes Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/recipe.svg" alt={t('sections.recipes')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.recipes')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.recipeSummary', { count: recipes.length })}</span>
          </div>
          <Link
            href="/recipes"
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {t('sections.viewFullList')}
          </Link>
        </div>

        {recipes.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.recipeTable.name')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.recipeTable.caliber')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.recipeTable.projectile')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.recipeTable.propellant')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.recipeTable.charge')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.recipeTable.coal')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.recipeTable.calcV0')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.recipeTable.measV0')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.recipeTable.fill')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.recipeTable.possible')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recipes.map((recipe) => (
                  <tr key={recipe.id}>
                    <td className="px-6 py-3 font-medium">{recipe.name}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{recipe.caliber.name}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">
                      {recipe.projectile.brand} {recipe.projectile.type} ({recipe.projectile.weightGr} gr{formatBcSuffix(recipe.projectile.bcG1, recipe.projectile.bcG7)}{formatTwistSuffix(recipe.projectile.preferredTwistIn)})
                    </td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">
                      {recipe.propellant.brand} – {recipe.propellant.type}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {recipe.chargeGr ? `${recipe.chargeGr} gr` : '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {recipe.coal ? `${recipe.coal}"` : '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {recipe.calculatedV0 ? `${recipe.calculatedV0}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {recipe.measuredV0 ? `${recipe.measuredV0}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {recipe.fillRate ? `${recipe.fillRate}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {(() => {
                        const possible = getPossibleLoads(recipe);
                        if (possible === null) return '—';
                        return (
                          <span className="inline-flex flex-col items-end gap-1">
                            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{possible}×</span>
                            {maxPossibleLoads !== null && possible > 0 && (
                              <span
                                aria-hidden="true"
                                className="block h-1 rounded-full bg-accent"
                                style={{ width: `${Math.max(8, Math.round((possible / maxPossibleLoads) * 48))}px` }}
                              />
                            )}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>{t('sections.noRecipes')}</EmptyState>
        )}
      </div>

      {/* Materials (collapsible: primers, projectiles, propellants) */}
      <details open className="group">
        <summary className="flex items-center gap-3 mb-4 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
          <svg
            className="w-5 h-5 text-zinc-500 transition-transform group-open:rotate-90"
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
          <h2 className="font-display text-2xl font-semibold">{t('sections.materials')}</h2>
          <span className="text-sm text-zinc-500">
            {t('sections.materialsSummary', {
              primers: primers.length,
              projectiles: projectiles.length,
              propellants: propellants.length,
              cartridges: cartridges.length,
            })}
          </span>
        </summary>

        <div className="pt-2">
      {/* Primers Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/primer.svg" alt={t('sections.primers')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.primers')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.primerSummary', { count: primers.length, pieces: totalPrimers })}</span>
          </div>
          <Link
            href="/primers"
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {t('sections.viewFullList')}
          </Link>
        </div>

        {primers.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.primerTable.brand')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.primerTable.type')}</th>
                  <th className="text-center px-6 py-3 font-medium">{t('sections.primerTable.magnum')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.primerTable.amount')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.primerTable.description')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {primers.map((primer) => (
                  <tr key={primer.id}>
                    <td className="px-6 py-3 font-medium">{primer.brand}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">
                      {primer.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {primer.magnum ? t('sections.primerTable.yes') : '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">{primer.amount}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 text-sm truncate max-w-xs">
                      {primer.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                <tr>
                  <td className="px-6 py-3 font-medium">{tCommon('total')}</td>
                  <td />
                  <td />
                  <td className="px-6 py-3 text-right font-mono font-medium">{totalPrimers}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <EmptyState>{t('sections.noPrimers')}</EmptyState>
        )}
      </div>

      {/* Projectiles Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/projectile.svg" alt={t('sections.projectiles')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.projectiles')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.projectileSummary', { count: projectiles.length, pieces: totalProjectiles })}</span>
          </div>
          <Link
            href="/projectiles"
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {t('sections.viewFullList')}
          </Link>
        </div>

        {projectiles.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.projectileTable.brand')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.projectileTable.type')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.projectileTable.weight')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.projectileTable.bcG1')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.projectileTable.bcG7')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.projectileTable.preferredTwist')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.projectileTable.caliber')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.projectileTable.amount')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.projectileTable.description')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {projectiles.map((proj) => (
                  <tr key={proj.id}>
                    <td className="px-6 py-3 font-medium">{proj.brand}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{proj.type || '—'}</td>
                    <td className="px-6 py-3 text-right font-mono">{proj.weightGr}</td>
                    <td className="px-6 py-3 text-right font-mono">{proj.bcG1 != null ? proj.bcG1 : '—'}</td>
                    <td className="px-6 py-3 text-right font-mono">{proj.bcG7 != null ? proj.bcG7 : '—'}</td>
                    <td className="px-6 py-3 text-right font-mono">{proj.preferredTwistIn != null ? `1:${proj.preferredTwistIn}` : '—'}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{proj.caliber}</td>
                    <td className="px-6 py-3 text-right font-mono">{proj.amount}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 text-sm truncate max-w-xs">
                      {proj.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                <tr>
                  <td className="px-6 py-3 font-medium">{tCommon('total')}</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td className="px-6 py-3 text-right font-mono font-medium">{totalProjectiles}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <EmptyState>{t('sections.noProjectiles')}</EmptyState>
        )}
      </div>

      {/* Propellants Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/propellant.svg" alt={t('sections.propellants')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.propellants')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.propellantSummary', { count: propellants.length, grams: Math.round(totalPropellantGrams) })}</span>
          </div>
          <Link
            href="/propellants"
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {t('sections.viewFullList')}
          </Link>
        </div>

        {propellants.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.propellantTable.brand')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.propellantTable.type')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.propellantTable.amount')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.propellantTable.description')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {propellants.map((prop) => (
                  <tr key={prop.id}>
                    <td className="px-6 py-3 font-medium">{prop.brand}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{prop.type}</td>
                    <td className="px-6 py-3 text-right font-mono">{Math.round(prop.amountGr)}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 text-sm truncate max-w-xs">
                      {prop.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                <tr>
                  <td className="px-6 py-3 font-medium">{tCommon('total')}</td>
                  <td />
                  <td className="px-6 py-3 text-right font-mono font-medium">{Math.round(totalPropellantGrams)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <EmptyState>{t('sections.noPropellants')}</EmptyState>
        )}
      </div>

      {/* Cartridges Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/cartridge.svg" alt={t('sections.cartridges')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.cartridges')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.cartridgeSummary', { count: cartridges.length, cases: totalCases })}</span>
          </div>
          <Link
            href="/cartridges"
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {t('sections.viewFullList')}
          </Link>
        </div>

        {cartridges.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.cartridgeTable.brand')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.cartridgeTable.caliber')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.cartridgeTable.waterCapacity')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.cartridgeTable.amount')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.cartridgeTable.description')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {cartridges.map((cartridge) => (
                  <tr key={cartridge.id}>
                    <td className="px-6 py-3 font-medium">{cartridge.brand}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{cartridge.caliber.name}</td>
                    <td className="px-6 py-3 text-right font-mono">
                      {cartridge.waterCapacityGr != null ? fmt1.format(cartridge.waterCapacityGr) : '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">{cartridge.amount}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 text-sm truncate max-w-xs">
                      {cartridge.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                <tr>
                  <td className="px-6 py-3 font-medium">{tCommon('total')}</td>
                  <td />
                  <td />
                  <td className="px-6 py-3 text-right font-mono font-medium">{totalCases}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <EmptyState>{t('sections.noCartridges')}</EmptyState>
        )}
      </div>
        </div>
      </details>
    </div>
  );
}
