'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PrimerForm } from './PrimerForm';
import { DeleteButton } from './DeleteButton';
import type { Primer } from '@/lib/types';

interface PrimersTableProps {
  primers: Primer[];
}

export function PrimersTable({ primers }: PrimersTableProps) {
  const t = useTranslations('primers');
  const [editingPrimer, setEditingPrimer] = useState<Primer | null>(null);

  const handleRowClick = (primer: Primer) => {
    setEditingPrimer(primer);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.brand')}</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.type')}</th>
              <th className="text-center px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.magnum')}</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.amount')}</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.description')}</th>
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {primers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  {t('table.empty')}
                </td>
              </tr>
            )}

            {primers.map((primer) => (
              <tr
                key={primer.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
                onClick={() => handleRowClick(primer)}
              >
                <td className="px-6 py-4 font-medium">{primer.brand}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                  {primer.type.replace('_', ' ')}
                </td>
                <td className="px-6 py-4 text-center">
                  {primer.magnum ? (
                    <span className="inline-block px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      {t('form.magnum')}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right font-mono font-medium">
                  {primer.amount}
                </td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-sm max-w-xs truncate">
                  {primer.description || '—'}
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <DeleteButton id={primer.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Single controlled edit modal */}
      <PrimerForm
        action={async (formData) => {
          if (!editingPrimer) return;
          const { updatePrimer } = await import('./actions');
          await updatePrimer(editingPrimer.id, formData);
        }}
        defaultValues={editingPrimer}
        title={t('form.titleEdit')}
        submitLabel={t('form.saveChanges')}
        open={!!editingPrimer}
        onOpenChange={(open) => {
          if (!open) setEditingPrimer(null);
        }}
      />
    </>
  );
}
