'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PropellantForm } from './PropellantForm';
import { DeletePropellantButton } from './DeletePropellantButton';
import { SortIndicator } from '../SortIndicator';
import { useSortBy } from '@/lib/useSortBy';
import type { Propellant } from '@/lib/types';

type SortKey = 'brand' | 'type' | 'amountGr' | 'description';

interface PropellantsTableProps {
  propellants: Propellant[];
}

export function PropellantsTable({ propellants }: PropellantsTableProps) {
  const t = useTranslations('propellants');
  const tc = useTranslations('common');
  const locale = useLocale();
  const fmt0 = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);
  const [editingPropellant, setEditingPropellant] = useState<Propellant | null>(null);
  const total = propellants.reduce((sum, p) => sum + p.amountGr, 0);
  const { sorted, sortKey, sortDirection, toggleSort } = useSortBy<Propellant, SortKey>(propellants, 'brand');

  const handleRowClick = (propellant: Propellant) => {
    setEditingPropellant(propellant);
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
              {sortableHeader('amountGr', t('table.amount'), 'right')}
              {sortableHeader('description', t('table.description'))}
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  {t('table.empty')}
                </td>
              </tr>
            )}

            {sorted.map((propellant) => (
              <tr
                key={propellant.id}
                tabIndex={0}
                role="button"
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
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
                  {fmt0.format(propellant.amountGr)}
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
          {sorted.length > 0 && (
            <tfoot className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <tr>
                <td className="px-6 py-3 font-medium">{tc('total')}</td>
                <td />
                <td className="px-6 py-3 text-right font-mono font-medium">{fmt0.format(total)}</td>
                <td />
                <td />
              </tr>
            </tfoot>
          )}
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