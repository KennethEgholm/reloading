'use client';

import { useTranslations } from 'next-intl';
import { deleteCartridge } from './actions';
import { toast } from 'sonner';

export function DeleteCartridgeButton({ id }: { id: string }) {
  const t = useTranslations('cartridges');

  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 px-2 py-1 text-xs"
      onClick={async () => {
        if (confirm(t('delete.confirm'))) {
          try {
            const result = await deleteCartridge(id);
            if (result.ok) toast.success(t('toast.deleted'));
            else toast.error(result.error);
          } catch {
            toast.error(t('toast.failed'));
          }
        }
      }}
    >
      {t('delete.button')}
    </button>
  );
}
