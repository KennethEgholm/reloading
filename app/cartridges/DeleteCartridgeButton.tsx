'use client';

import { deleteCartridge } from './actions';
import { toast } from 'sonner';

export function DeleteCartridgeButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 px-2 py-1 text-xs"
      onClick={async () => {
        if (confirm('Delete this cartridge?')) {
          try {
            const result = await deleteCartridge(id);
            if (result.ok) toast.success('Cartridge deleted');
            else toast.error(result.error);
          } catch {
            toast.error('Failed to delete cartridge');
          }
        }
      }}
    >
      Delete
    </button>
  );
}
