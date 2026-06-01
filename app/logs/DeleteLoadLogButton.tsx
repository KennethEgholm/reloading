'use client';

import { deleteLoadLog } from './actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function DeleteLoadLogButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors"
      onClick={async () => {
        const confirmed = confirm(
          'Delete this load log?\n\nThis will add the components back into your inventory.\nThis action cannot be undone.'
        );

        if (!confirmed) return;

        try {
          await deleteLoadLog(id);
          toast.success('Load log deleted and inventory restored');
          router.push('/logs');
          router.refresh();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete load log';
          toast.error(message);
        }
      }}
    >
      Delete Load Log
    </button>
  );
}
