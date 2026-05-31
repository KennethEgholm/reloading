'use client';

import { deletePrimer } from './actions';
import { toast } from 'sonner';

export function DeleteButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 px-2 py-1 text-xs"
      onClick={async () => {
        if (confirm('Delete this primer?')) {
          try {
            await deletePrimer(id);
            toast.success('Primer deleted');
          } catch (error) {
            toast.error('Failed to delete primer');
          }
        }
      }}
    >
      Delete
    </button>
  );
}
