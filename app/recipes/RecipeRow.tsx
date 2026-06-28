'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RecipeForm } from './RecipeForm';
import { deleteRecipe } from './actions';
import { toast } from 'sonner';
import type {
  RecipeWithRelations,
  Projectile,
  Propellant,
  Primer,
  CartridgeWithCaliber,
  CaliberOption,
} from '@/lib/types';

interface RecipeRowProps {
  recipe: RecipeWithRelations;
  projectiles: Projectile[];
  propellants: Propellant[];
  primers: Primer[];
  cartridges: CartridgeWithCaliber[];
  calibers: CaliberOption[];
}

export function RecipeRow({ recipe, projectiles, propellants, primers, cartridges, calibers }: RecipeRowProps) {
  const t = useTranslations('recipes');
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
        onClick={() => setEditOpen(true)}
      >
        <td className="px-6 py-4 font-medium">{recipe.name}</td>
        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{recipe.caliber.name}</td>
        <td className="px-6 py-4">
          {recipe.projectile.brand} {recipe.projectile.type} ({recipe.projectile.weightGr} gr)
        </td>
        <td className="px-6 py-4">
          {recipe.propellant.brand} – {recipe.propellant.type}
        </td>
        <td className="px-6 py-4 text-right font-mono">
          {recipe.chargeGr ? `${recipe.chargeGr} gr` : '—'}
        </td>
        <td className="px-6 py-4 text-right font-mono">
          {recipe.coal ? `${recipe.coal}"` : '—'}
        </td>
        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (confirm(t('delete.confirm'))) {
                try {
                  const result = await deleteRecipe(recipe.id);
                  if (result.ok) toast.success(t('toast.deleted'));
                  else toast.error(result.error);
                } catch {
                  toast.error(t('toast.deleteFailed'));
                }
              }
            }}
            className="text-red-600 hover:text-red-700 text-xs"
          >
            {t('delete.button')}
          </button>
        </td>
      </tr>

      <RecipeForm
        updateAction={async (id, formData) => {
          const { updateRecipe } = await import('./actions');
          await updateRecipe(id, formData);
        }}
        defaultValues={recipe}
        projectiles={projectiles}
        propellants={propellants}
        primers={primers}
        cartridges={cartridges}
        calibers={calibers}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
