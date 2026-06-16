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
      className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors"
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
