'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PropellantForm } from './PropellantForm';
import { DeletePropellantButton } from './DeletePropellantButton';
import type { Propellant } from '@/lib/types';

interface PropellantsTableProps {
  propellants: Propellant[];
}

export function PropellantsTable({ propellants }: PropellantsTableProps) {
  const t = useTranslations('propellants');
  const [editingPropellant, setEditingPropellant] = useState<Propellant | null>(null);

  const handleRowClick = (propellant: Propellant) => {
    setEditingPropellant(propellant);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.brand')}</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.type')}</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.amount')}</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.description')}</th>
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {propellants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  {t('table.empty')}
                </td>
              </tr>
            )}

            {propellants.map((propellant) => (
              <tr
                key={propellant.id}
                tabIndex={0}
                role="button"
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer focus:outline-none"
                onClick={() => handleRowClick(propellant)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(propellant);
                  }
                }}
              >
                <td className="px-6 py-4 font-medium">{propellant.brand}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{propellant.type}</td>
                <td className="px-6 py-4 text-right font-mono font-medium">
                  {propellant.amountGr.toFixed(1)}
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
          if (!editingPropellant) return;
          const { updatePropellant } = await import('./actions');
          await updatePropellant(editingPropellant.id, formData);
        }}
        defaultValues={editingPropellant}
        title={t('form.titleEdit')}
        submitLabel={t('form.saveChanges')}
        open={!!editingPropellant}
        onOpenChange={(open) => {
          if (!open) setEditingPropellant(null);
        }}
      />
    </>
  );
}
