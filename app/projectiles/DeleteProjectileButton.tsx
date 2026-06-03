'use client';

import { deleteProjectile } from './actions';
import { toast } from 'sonner';

export function DeleteProjectileButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 px-2 py-1 text-xs"
      onClick={async () => {
        if (confirm('Delete this projectile?')) {
          try {
            const result = await deleteProjectile(id);
            if (result.ok) toast.success('Projectile deleted');
            else toast.error(result.error);
          } catch {
            toast.error('Failed to delete projectile');
          }
        }
      }}
    >
      Delete
    </button>
  );
}
