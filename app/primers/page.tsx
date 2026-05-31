import { prisma } from '@/lib/prisma';
import { PrimerType } from '@prisma/client';
import { createPrimer, adjustPrimerAmount } from './actions';
import { PrimerForm } from './PrimerForm';
import { DeleteButton } from './DeleteButton';
import { AdjustAmountButton } from './AdjustAmountButton';

export default async function PrimersPage() {
  const primers = await prisma.primer.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Primers</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage your primer inventory
          </p>
        </div>

        <PrimerForm 
          action={createPrimer} 
          title="Add New Primer" 
          submitLabel="Create Primer"
        />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Brand</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Type</th>
              <th className="text-center px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Magnum</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Amount</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Description</th>
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {primers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  No primers yet. Add your first one above.
                </td>
              </tr>
            )}

            {primers.map((primer) => (
              <tr key={primer.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50">
                <td className="px-6 py-4 font-medium">{primer.brand}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                  {primer.type.replace('_', ' ')}
                </td>
                <td className="px-6 py-4 text-center">
                  {primer.magnum ? (
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      Magnum
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right font-mono">
                  <div className="flex items-center justify-end gap-2">
                    <AdjustAmountButton id={primer.id} delta={-1}>
                      −
                    </AdjustAmountButton>
                    <span className="w-10 text-right font-medium">{primer.amount}</span>
                    <AdjustAmountButton id={primer.id} delta={1}>
                      +
                    </AdjustAmountButton>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-sm max-w-xs truncate">
                  {primer.description || '—'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <PrimerForm 
                      action={async (formData) => {
                        'use server';
                        await import('./actions').then(m => m.updatePrimer(primer.id, formData));
                      }}
                      defaultValues={{
                        ...primer,
                        description: primer.description ?? undefined,
                      }}
                      title="Edit Primer"
                      submitLabel="Save Changes"
                    />
                    <DeleteButton id={primer.id} />
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
