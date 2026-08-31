'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { deleteLadder } from '../actions';

export function DeleteLadderButton({ id }: { id: string }) {
  const t = useTranslations('ladders');

  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 text-sm font-medium"
      onClick={async () => {
        if (confirm(t('delete.confirm'))) {
          try {
            const result = await deleteLadder(id);
            if (result.ok) {
              toast.success(t('toast.deleted'));
              window.location.href = '/recipes';
            } else {
              toast.error(result.error);
            }
          } catch {
            toast.error(t('toast.deleteFailed'));
          }
        }
      }}
    >
      {t('delete.button')}
    </button>
  );
}