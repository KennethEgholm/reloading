'use client';

import { useTranslations } from 'next-intl';
import { deleteRifle } from './actions';
import { toast } from 'sonner';

export function DeleteRifleButton({ id }: { id: string }) {
  const t = useTranslations('rifles');

  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 text-sm font-medium"
      onClick={async () => {
        if (confirm(t('delete.confirm'))) {
          try {
            const result = await deleteRifle(id);
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
