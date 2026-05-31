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
            await deleteProjectile(id);
            toast.success('Projectile deleted');
          } catch (error) {
            toast.error('Failed to delete projectile');
          }
        }
      }}
    >
      Delete
    </button>
  );
}
