'use client';

import { useState } from 'react';
import { PropellantForm } from './PropellantForm';
import { DeletePropellantButton } from './DeletePropellantButton';
import { AdjustAmountButton } from './AdjustAmountButton';

interface PropellantsTableProps {
  propellants: Array<{
    id: string;
    brand: string;
    type: string;
    amountGr: number;
    description: string | null;
  }>;
}

export function PropellantsTable({ propellants }: PropellantsTableProps) {
  const [editingPropellant, setEditingPropellant] = useState<any | null>(null);

  const handleRowClick = (propellant: any) => {
    setEditingPropellant(propellant);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Brand</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Type</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Amount (g)</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Description</th>
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {propellants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  No propellants yet.
                </td>
              </tr>
            )}

            {propellants.map((propellant) => (
              <tr
                key={propellant.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
                onClick={() => handleRowClick(propellant)}
              >
                <td className="px-6 py-4 font-medium">{propellant.brand}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{propellant.type}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <AdjustAmountButton id={propellant.id} delta={-1}>−</AdjustAmountButton>
                    <span className="w-16 text-right font-medium font-mono">{propellant.amountGr.toFixed(1)}</span>
                    <AdjustAmountButton id={propellant.id} delta={1}>+</AdjustAmountButton>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-sm max-w-xs truncate">
                  {propellant.description || '—'}
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <DeletePropellantButton id={propellant.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Single controlled edit modal */}
      <PropellantForm
        action={async (formData) => {
          const { updatePropellant } = await import('./actions');
          await updatePropellant(editingPropellant.id, formData);
        }}
        defaultValues={editingPropellant}
        title="Edit Propellant"
        submitLabel="Save Changes"
        open={!!editingPropellant}
        onOpenChange={(open) => {
          if (!open) setEditingPropellant(null);
        }}
      />
    </>
  );
}
