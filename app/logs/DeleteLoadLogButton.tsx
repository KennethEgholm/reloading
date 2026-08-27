'use client';

import { useTranslations } from 'next-intl';
import { deleteLoadLog } from './actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function DeleteLoadLogButton({ id }: { id: string }) {
  const t = useTranslations('logs');
  const router = useRouter();

  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 text-sm font-medium"
      onClick={async () => {
        const confirmed = confirm(t('delete.confirm'));

        if (!confirmed) return;

        try {
          await deleteLoadLog(id);
          toast.success(t('toast.deleted'));
          router.push('/logs');
          router.refresh();
        } catch (error) {
          const message = error instanceof Error ? error.message : t('toast.deleteFailed');
          toast.error(message);
        }
      }}
    >
      {t('delete.button')}
    </button>
  );
}
