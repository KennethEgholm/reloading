import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function Overview() {
  const [primers, projectiles, propellants, recipes] = await Promise.all([
    prisma.primer.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.projectile.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.propellant.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.recipe.findMany({
      include: {
        projectile: true,
        propellant: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalPrimers = primers.reduce((sum, p) => sum + p.amount, 0);
  const totalPropellantGrams = propellants.reduce((sum, p) => sum + p.amountGr, 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <img src="/images/logo.svg" alt="Reloading Tool" className="w-12 h-12" />
          <h1 className="text-4xl font-semibold tracking-tighter">Overview</h1>
        </div>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Your reloading components and saved load recipes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Primers</div>
          <div className="text-3xl font-semibold mt-1">{primers.length} types</div>
          <div className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">{totalPrimers} pieces</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Projectiles</div>
          <div className="text-3xl font-semibold mt-1">{projectiles.length} types</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Propellants</div>
          <div className="text-3xl font-semibold mt-1">{propellants.length} types</div>
          <div className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">{totalPropellantGrams.toFixed(1)} g</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Recipes</div>
          <div className="text-3xl font-semibold mt-1">{recipes.length} saved</div>
        </div>
      </div>

      {/* Primers Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/primer.svg" alt="Primers" className="w-7 h-7" />
            <h2 className="text-2xl font-semibold">Primers</h2>
            <span className="text-sm text-zinc-500">({primers.length} types • {totalPrimers} pieces)</span>
          </div>
          <Link 
            href="/primers" 
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View full list →
          </Link>
        </div>

        {primers.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Brand</th>
                  <th className="text-left px-6 py-3 font-medium">Type</th>
                  <th className="text-center px-6 py-3 font-medium">Magnum</th>
                  <th className="text-right px-6 py-3 font-medium">Amount</th>
                  <th className="text-left px-6 py-3 font-medium">Description</th>
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
                      {primer.magnum ? 'Yes' : '—'}
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
          <p className="text-zinc-500">No primers added yet.</p>
        )}
      </div>

      {/* Projectiles Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/projectile.svg" alt="Projectiles" className="w-7 h-7" />
            <h2 className="text-2xl font-semibold">Projectiles</h2>
            <span className="text-sm text-zinc-500">({projectiles.length} types)</span>
          </div>
          <Link 
            href="/projectiles" 
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View full list →
          </Link>
        </div>

        {projectiles.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Brand</th>
                  <th className="text-left px-6 py-3 font-medium">Type</th>
                  <th className="text-right px-6 py-3 font-medium">Weight (gr)</th>
                  <th className="text-left px-6 py-3 font-medium">Caliber</th>
                  <th className="text-left px-6 py-3 font-medium">Description</th>
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
          <p className="text-zinc-500">No projectiles added yet.</p>
        )}
      </div>

      {/* Propellants Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/propellant.svg" alt="Propellants" className="w-7 h-7" />
            <h2 className="text-2xl font-semibold">Propellants</h2>
            <span className="text-sm text-zinc-500">({propellants.length} types)</span>
          </div>
          <Link 
            href="/propellants" 
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View full list →
          </Link>
        </div>

        {propellants.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Brand</th>
                  <th className="text-left px-6 py-3 font-medium">Type</th>
                  <th className="text-right px-6 py-3 font-medium">Amount (g)</th>
                  <th className="text-left px-6 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {propellants.map((prop) => (
                  <tr key={prop.id}>
                    <td className="px-6 py-3 font-medium">{prop.brand}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{prop.type}</td>
                    <td className="px-6 py-3 text-right font-mono">{prop.amountGr.toFixed(1)}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400 text-sm truncate max-w-xs">
                      {prop.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-500">No propellants added yet.</p>
        )}
      </div>

      {/* Recipes Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/images/recipe.svg" alt="Recipes" className="w-7 h-7" />
            <h2 className="text-2xl font-semibold">Recipes</h2>
            <span className="text-sm text-zinc-500">({recipes.length} saved)</span>
          </div>
          <Link 
            href="/recipes" 
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View full list →
          </Link>
        </div>

        {recipes.length > 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Name</th>
                  <th className="text-left px-6 py-3 font-medium">Caliber</th>
                  <th className="text-left px-6 py-3 font-medium">Projectile</th>
                  <th className="text-left px-6 py-3 font-medium">Propellant</th>
                  <th className="text-right px-6 py-3 font-medium">Charge</th>
                  <th className="text-right px-6 py-3 font-medium">COAL</th>
                  <th className="text-right px-6 py-3 font-medium">Calc V0</th>
                  <th className="text-right px-6 py-3 font-medium">Meas V0</th>
                  <th className="text-right px-6 py-3 font-medium">Fill %</th>
                  <th className="text-right px-6 py-3 font-medium">Possible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recipes.map((recipe) => (
                  <tr key={recipe.id}>
                    <td className="px-6 py-3 font-medium">{recipe.name}</td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-400">{recipe.caliber}</td>
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

                        // Note: primer not included in this overview query
                        const min = Math.min(fromProjectile, fromPowder);
                        const possible = min === Infinity ? null : Math.max(0, min);
                        return possible !== null ? `${possible}×` : '—';
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-500">No recipes saved yet.</p>
        )}
      </div>
    </div>
  );
}
