'use client';

import { deleteRecipe } from './actions';
import { toast } from 'sonner';

export function DeleteRecipeButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 text-xs"
      onClick={async () => {
        if (confirm('Delete this recipe?')) {
          try {
            const result = await deleteRecipe(id);
            if (result.ok) toast.success('Recipe deleted');
            else toast.error(result.error);
          } catch (error) {
            toast.error('Failed to delete recipe');
          }
        }
      }}
    >
      Delete
    </button>
  );
}
