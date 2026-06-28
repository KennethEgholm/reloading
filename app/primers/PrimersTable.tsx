'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PrimerForm } from './PrimerForm';
import { DeleteButton } from './DeleteButton';
import { SortIndicator } from '../SortIndicator';
import { useSortBy } from '@/lib/useSortBy';
import type { Primer } from '@/lib/types';

type SortKey = 'brand' | 'type' | 'magnum' | 'amount' | 'description';

interface PrimersTableProps {
  primers: Primer[];
}

export function PrimersTable({ primers }: PrimersTableProps) {
  const t = useTranslations('primers');
  const [editingPrimer, setEditingPrimer] = useState<Primer | null>(null);
  const { sorted, sortKey, sortDirection, toggleSort } = useSortBy<Primer, SortKey>(primers, 'brand');

  const handleRowClick = (primer: Primer) => {
    setEditingPrimer(primer);
  };

  const sortableHeader = (key: SortKey, label: string, align: 'left' | 'right' | 'center' = 'left') => (
    <th
      className={`px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-200 text-${align}`}
      onClick={() => toggleSort(key)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''} ${align === 'center' ? 'justify-center w-full' : ''}`}>
        {label}
        <SortIndicator active={sortKey === key} direction={sortKey === key ? sortDirection : null} />
      </span>
    </th>
  );

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              {sortableHeader('brand', t('table.brand'))}
              {sortableHeader('type', t('table.type'))}
              {sortableHeader('magnum', t('table.magnum'), 'center')}
              {sortableHeader('amount', t('table.amount'), 'right')}
              {sortableHeader('description', t('table.description'))}
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  {t('table.empty')}
                </td>
              </tr>
            )}

            {sorted.map((primer) => (
              <tr
                key={primer.id}
                tabIndex={0}
                role="button"
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer focus:outline-none"
                onClick={() => handleRowClick(primer)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(primer);
                  }
                }}
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