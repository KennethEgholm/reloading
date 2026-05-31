import { prisma } from '@/lib/prisma';
import { createPropellant } from './actions';
import { PropellantForm } from './PropellantForm';
import { DeletePropellantButton } from './DeletePropellantButton';
import { AdjustAmountButton } from './AdjustAmountButton';

export default async function PropellantsPage() {
  const propellants = await prisma.propellant.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Propellants</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage your powder inventory (amount in grams)
          </p>
        </div>

        <PropellantForm 
          action={createPropellant} 
          title="Add New Propellant" 
          submitLabel="Create Propellant"
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Brand</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Type</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Amount (g)</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Description</th>
              <th className="w-44"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {propellants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  No propellants yet. Add your first one above.
                </td>
              </tr>
            )}

            {propellants.map((propellant) => (
              <tr key={propellant.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                <td className="px-6 py-4 font-medium">{propellant.brand}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{propellant.type}</td>
                <td className="px-6 py-4 text-right font-mono">
                  <div className="flex items-center justify-end gap-2">
                    <AdjustAmountButton id={propellant.id} delta={-100}>
                      −100
                    </AdjustAmountButton>
                    <span className="w-16 text-right font-medium">{propellant.amountGr.toFixed(1)}</span>
                    <AdjustAmountButton id={propellant.id} delta={100}>
                      +100
                    </AdjustAmountButton>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-sm max-w-xs truncate">
                  {propellant.description || '—'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <PropellantForm 
                      action={async (formData) => {
                        'use server';
                        await import('./actions').then(m => m.updatePropellant(propellant.id, formData));
                      }}
                      defaultValues={{
                        ...propellant,
                        description: propellant.description ?? undefined,
                      }}
                      title="Edit Propellant"
                      submitLabel="Save Changes"
                    />
                    <DeletePropellantButton id={propellant.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
