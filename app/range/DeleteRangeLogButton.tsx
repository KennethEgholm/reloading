'use client';

import { deleteRangeLog } from './actions';
import { toast } from 'sonner';

interface DeleteRangeLogButtonProps {
  id: string;
  redirectTo?: string;
}

export function DeleteRangeLogButton({ id, redirectTo }: DeleteRangeLogButtonProps) {
  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 text-sm font-medium"
      onClick={async () => {
        if (!confirm('Delete this range session and all its photos?')) return;
        try {
          const result = await deleteRangeLog(id);
          if (result.ok) {
            toast.success('Range session deleted');
            // Full page navigation avoids a transient 404 on the deleted page.
            if (redirectTo) window.location.href = redirectTo;
          } else {
            toast.error(result.error);
          }
        } catch {
          toast.error('Failed to delete range session');
        }
      }}
    >
      Delete
    </button>
  );
}
