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
            await deletePropellant(id);
            toast.success('Propellant deleted');
          } catch (error) {
            toast.error('Failed to delete propellant');
          }
        }
      }}
    >
      Delete
    </button>
  );
}
