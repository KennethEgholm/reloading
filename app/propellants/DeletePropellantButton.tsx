'use client';

import { deletePropellant } from './actions';
import { toast } from 'sonner';

export function DeletePropellantButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 px-2 py-1 text-xs"
      onClick={async () => {
        if (confirm('Delete this propellant?')) {
          try {
            const result = await deletePropellant(id);
            if (result.ok) toast.success('Propellant deleted');
            else toast.error(result.error);
          } catch {
            toast.error('Failed to delete propellant');
          }
        }
      }}
    >
      Delete
    </button>
  );
}
