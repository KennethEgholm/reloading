'use client';

import { useTranslations } from 'next-intl';
import { deleteRecipe } from './actions';
import { toast } from 'sonner';

export function DeleteRecipeButton({ id }: { id: string }) {
  const t = useTranslations('recipes');

  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 text-xs"
      onClick={async () => {
        if (confirm(t('delete.confirm'))) {
          try {
            const result = await deleteRecipe(id);
            if (result.ok) toast.success(t('toast.deleted'));
            else toast.error(result.error);
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
