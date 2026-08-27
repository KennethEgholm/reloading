'use client';

import { useTranslations } from 'next-intl';
import { deletePrimer } from './actions';
import { toast } from 'sonner';

export function DeleteButton({ id }: { id: string }) {
  const t = useTranslations('primers');

  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 text-sm font-medium"
      onClick={async () => {
        if (confirm(t('delete.confirm'))) {
          try {
            const result = await deletePrimer(id);
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
