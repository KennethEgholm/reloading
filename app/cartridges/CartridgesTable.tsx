'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CartridgeForm } from './CartridgeForm';
import { DeleteCartridgeButton } from './DeleteCartridgeButton';
import { SortIndicator } from '../SortIndicator';
import { useSortBy } from '@/lib/useSortBy';
import type { CartridgeWithCaliber, CaliberOption } from '@/lib/types';

type SortKey = 'brand' | 'caliber.name' | 'waterCapacityGr' | 'amount' | 'description';

interface CartridgesTableProps {
  cartridges: CartridgeWithCaliber[];
  calibers: CaliberOption[];
}

export function CartridgesTable({ cartridges, calibers }: CartridgesTableProps) {
  const t = useTranslations('cartridges');
  const locale = useLocale();
  const fmt1 = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), [locale]);
  const [editingCartridge, setEditingCartridge] = useState<CartridgeWithCaliber | null>(null);
  const { sorted, sortKey, sortDirection, toggleSort } = useSortBy<CartridgeWithCaliber, SortKey>(cartridges, 'brand');

  const handleRowClick = (cartridge: CartridgeWithCaliber) => {
    setEditingCartridge(cartridge);
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
              {sortableHeader('caliber.name', t('table.caliber'))}
              {sortableHeader('waterCapacityGr', t('table.waterCapacity'), 'right')}
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

            {sorted.map((cartridge) => (
              <tr
                key={cartridge.id}
                tabIndex={0}
                role="button"
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer focus:outline-none"
                onClick={() => handleRowClick(cartridge)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(cartridge);
                  }
                }}
              >
                <td className="px-6 py-4 font-medium">{cartridge.brand}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{cartridge.caliber.name}</td>
                <td className="px-6 py-4 text-right font-mono">
                  {cartridge.waterCapacityGr != null ? fmt1.format(cartridge.waterCapacityGr) : '—'}
                </td>
                <td className="px-6 py-4 text-right font-mono font-medium">{cartridge.amount}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-sm max-w-xs truncate">
                  {cartridge.description || '—'}
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <DeleteCartridgeButton id={cartridge.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Single controlled edit modal */}
      <CartridgeForm
        action={async (formData) => {
          if (!editingCartridge) return;
          const { updateCartridge } = await import('./actions');
          await updateCartridge(editingCartridge.id, formData);
        }}
        defaultValues={editingCartridge}
        calibers={calibers}
        title={t('form.titleEdit')}
        submitLabel={t('form.saveChanges')}
        open={!!editingCartridge}
        onOpenChange={(open) => {
          if (!open) setEditingCartridge(null);
        }}
      />
    </>
  );
}