'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CartridgeForm } from './CartridgeForm';
import { DeleteCartridgeButton } from './DeleteCartridgeButton';

interface CartridgesTableProps {
  cartridges: Array<{
    id: string;
    brand: string;
    caliber: string;
    waterCapacityGr: number | null;
    amount: number;
    description: string | null;
  }>;
}

export function CartridgesTable({ cartridges }: CartridgesTableProps) {
  const t = useTranslations('cartridges');
  const [editingCartridge, setEditingCartridge] = useState<any | null>(null);

  const handleRowClick = (cartridge: any) => {
    setEditingCartridge(cartridge);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.brand')}</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.caliber')}</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.waterCapacity')}</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.amount')}</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.description')}</th>
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {cartridges.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  {t('table.empty')}
                </td>
              </tr>
            )}

            {cartridges.map((cartridge) => (
              <tr
                key={cartridge.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
                onClick={() => handleRowClick(cartridge)}
              >
                <td className="px-6 py-4 font-medium">{cartridge.brand}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{cartridge.caliber}</td>
                <td className="px-6 py-4 text-right font-mono">
                  {cartridge.waterCapacityGr != null ? cartridge.waterCapacityGr.toFixed(1) : '—'}
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
          const { updateCartridge } = await import('./actions');
          await updateCartridge(editingCartridge.id, formData);
        }}
        defaultValues={editingCartridge}
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
