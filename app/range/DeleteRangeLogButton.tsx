'use client';

import { useTranslations } from 'next-intl';
import { deleteRangeLog } from './actions';
import { toast } from 'sonner';

interface DeleteRangeLogButtonProps {
  id: string;
  redirectTo?: string;
}

export function DeleteRangeLogButton({ id, redirectTo }: DeleteRangeLogButtonProps) {
  const t = useTranslations('range');

  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 text-sm font-medium"
      onClick={async () => {
        if (!confirm(t('delete.confirm'))) return;
        try {
          const result = await deleteRangeLog(id);
          if (result.ok) {
            toast.success(t('toast.deleted'));
            // Full page navigation avoids a transient 404 on the deleted page.
            if (redirectTo) window.location.href = redirectTo;
          } else {
            toast.error(result.error);
          }
        } catch {
          toast.error(t('toast.deleteFailed'));
        }
      }}
    >
      {t('delete.button')}
    </button>
  );
}
