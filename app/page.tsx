import { prisma } from '@/lib/prisma';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { RangeLogRow } from './range/RangeLogRow';
import { LoadLogRow } from './logs/LoadLogRow';
import { getPossibleLoads } from '@/lib/inventory';

export default async function Overview() {
  const t = await getTranslations('overview');
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
  ]);

  const totalRounds = rangeSum._sum.roundsFired ?? 0;
  const totalLoaded = loadSum._sum.quantity ?? 0;

  const totalPrimers = primers.reduce((sum, p) => sum + p.amount, 0);
  const totalPropellantGrams = propellants.reduce((sum, p) => sum + p.amountGr, 0);
  const totalCases = cartridges.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-10">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('summary.rangeSessions')}</div>
          <div className="font-display text-3xl font-semibold mt-1">{t('summary.logged', { count: rangeCount })}</div>
          <div className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">{t('summary.roundsFired', { count: totalRounds })}</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('summary.loadLogs')}</div>
          <div className="font-display text-3xl font-semibold mt-1">{t('summary.loads', { count: loadCount })}</div>
          <div className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">{t('summary.roundsLoaded', { count: totalLoaded })}</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('summary.recipes')}</div>
          <div className="font-display text-3xl font-semibold mt-1">{t('summary.saved', { count: recipes.length })}</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('summary.primers')}</div>
          <div className="font-display text-3xl font-semibold mt-1">{t('summary.types', { count: primers.length })}</div>
          <div className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">{t('summary.pieces', { count: totalPrimers })}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('summary.projectiles')}</div>
          <div className="font-display text-3xl font-semibold mt-1">{t('summary.types', { count: projectiles.length })}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('summary.propellants')}</div>
          <div className="font-display text-3xl font-semibold mt-1">{t('summary.types', { count: propellants.length })}</div>
          <div className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">{t('summary.amountGrams', { count: fmt1.format(totalPropellantGrams) })}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('summary.cartridges')}</div>
          <div className="font-display text-3xl font-semibold mt-1">{t('summary.types', { count: cartridges.length })}</div>
          <div className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">{t('summary.cases', { count: totalCases })}</div>
        </div>
      </div>

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
          <p className="text-zinc-500">
            {t('sections.noRangeSessions')}{' '}
            <Link href="/range/new" className="text-accent hover:text-accent-hover hover:underline">
              {t('sections.logFirstSession')}
            </Link>
            .
          </p>
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
          <p className="text-zinc-500">{t('sections.noLoadLogs')}</p>
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
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
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
                      {recipe.projectile.brand} {recipe.projectile.type} ({recipe.projectile.weightGr} gr)
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
                    <td className="px-6 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {(() => {
                        const possible = getPossibleLoads(recipe);
                        return possible !== null ? `${possible}×` : '—';
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-500">{t('sections.noRecipes')}</p>
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
            </table>
          </div>
        ) : (
          <p className="text-zinc-500">{t('sections.noPrimers')}</p>
        )}
      </div>

      {/* Projectiles Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/projectile.svg" alt={t('sections.projectiles')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.projectiles')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.projectileSummary', { count: projectiles.length })}</span>
          </div>
          <Link
            href="/projectiles"
            className="text-sm text-accent hover:text-accent-hover hover:underline"
          >
            {t('sections.viewFullList')}
          </Link>
        </div>

        {projectiles.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.projectileTable.brand')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.projectileTable.type')}</th>
                  <th className="text-right px-6 py-3 font-medium">{t('sections.projectileTable.weight')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.projectileTable.caliber')}</th>
                  <th className="text-left px-6 py-3 font-medium">{t('sections.projectileTable.description')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {projectiles.map((proj) => (
                  <tr key={proj.id}>
                    <td className="px-6 py-3 font-medium">{proj.brand}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{proj.type || '—'}</td>
                    <td className="px-6 py-3 text-right font-mono">{proj.weightGr}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{proj.caliber}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 text-sm truncate max-w-xs">
                      {proj.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-500">{t('sections.noProjectiles')}</p>
        )}
      </div>

      {/* Propellants Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/propellant.svg" alt={t('sections.propellants')} className="w-7 h-7" width={28} height={28} loading="lazy" />
            <h2 className="font-display text-2xl font-semibold">{t('sections.propellants')}</h2>
            <span className="text-sm text-zinc-500">{t('sections.propellantSummary', { count: propellants.length })}</span>
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
                    <td className="px-6 py-3 text-right font-mono">{fmt1.format(prop.amountGr)}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 text-sm truncate max-w-xs">
                      {prop.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-500">{t('sections.noPropellants')}</p>
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
            </table>
          </div>
        ) : (
          <p className="text-zinc-500">{t('sections.noCartridges')}</p>
        )}
      </div>
        </div>
      </details>
    </div>
  );
}
