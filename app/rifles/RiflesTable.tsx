'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { RifleForm } from './RifleForm';
import { DeleteRifleButton } from './DeleteRifleButton';
import { SortIndicator } from '../SortIndicator';
import { useSortBy } from '@/lib/useSortBy';
import type { RifleWithCaliber, CaliberOption } from '@/lib/types';

type SortKey = 'name' | 'caliber.name' | 'barrelLengthMm' | 'twistIn' | 'sightHeightCm' | 'zeroDistanceM' | 'clickCmAt100m';

interface RiflesTableProps {
  rifles: RifleWithCaliber[];
  calibers: CaliberOption[];
}

export function RiflesTable({ rifles, calibers }: RiflesTableProps) {
  const t = useTranslations('rifles');
  const tc = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();
  const fmt1 = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 1 }), [locale]);
  const [editingRifle, setEditingRifle] = useState<RifleWithCaliber | null>(null);
  const { sorted, sortKey, sortDirection, toggleSort } = useSortBy<RifleWithCaliber, SortKey>(rifles, 'name');

  const handleRowClick = (rifle: RifleWithCaliber) => {
    router.push(`/rifles/${rifle.id}`);
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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              {sortableHeader('name', t('table.name'))}
              {sortableHeader('caliber.name', t('table.caliber'))}
              {sortableHeader('barrelLengthMm', t('table.barrel'), 'right')}
              {sortableHeader('twistIn', t('table.twist'), 'right')}
              {sortableHeader('sightHeightCm', t('table.sight'), 'right')}
              {sortableHeader('zeroDistanceM', t('table.zero'), 'right')}
              {sortableHeader('clickCmAt100m', t('table.click'), 'right')}
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  {t('table.empty')}
                </td>
              </tr>
            )}

            {sorted.map((rifle) => (
              <tr
                key={rifle.id}
                tabIndex={0}
                role="button"
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
                onClick={() => handleRowClick(rifle)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(rifle);
                  }
                }}
              >
                <td className="px-6 py-4 font-medium">{rifle.name}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{rifle.caliber.name}</td>
                <td className="px-6 py-4 text-right font-mono">{fmt1.format(rifle.barrelLengthMm)}</td>
                <td className="px-6 py-4 text-right font-mono">1:{fmt1.format(rifle.twistIn)}</td>
                <td className="px-6 py-4 text-right font-mono">{fmt1.format(rifle.sightHeightCm)}</td>
                <td className="px-6 py-4 text-right font-mono">{fmt1.format(rifle.zeroDistanceM)}</td>
                <td className="px-6 py-4 text-right font-mono">{fmt1.format(rifle.clickCmAt100m)}</td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setEditingRifle(rifle)}
                    className="text-sm text-accent hover:text-accent-hover hover:underline mr-3"
                  >
                    {tc('edit')}
                  </button>
                  <DeleteRifleButton id={rifle.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RifleForm
        action={async (formData) => {
          if (!editingRifle) return;
          const { updateRifle } = await import('./actions');
          await updateRifle(editingRifle.id, formData);
        }}
        defaultValues={editingRifle}
        calibers={calibers}
        title={t('form.titleEdit')}
        submitLabel={t('form.saveChanges')}
        open={!!editingRifle}
        onOpenChange={(open) => {
          if (!open) setEditingRifle(null);
        }}
      />
    </>
  );
}
