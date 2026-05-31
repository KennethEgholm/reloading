'use client';

import { useState } from 'react';
import { RecipeForm } from './RecipeForm';
import { DeleteRecipeButton } from './DeleteRecipeButton';

interface RecipesTableProps {
  recipes: any[];
  projectiles: any[];
  propellants: any[];
  primers: any[];
}

export function RecipesTable({ recipes, projectiles, propellants, primers }: RecipesTableProps) {
  const [editingRecipe, setEditingRecipe] = useState<any | null>(null);

  const handleRowClick = (recipe: any) => {
    setEditingRecipe(recipe);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-3 font-medium">Name</th>
              <th className="text-left px-6 py-3 font-medium">Caliber</th>
              <th className="text-left px-6 py-3 font-medium">Projectile</th>
              <th className="text-left px-6 py-3 font-medium">Powder</th>
              <th className="text-right px-6 py-3 font-medium">Charge</th>
              <th className="text-right px-6 py-3 font-medium">COAL</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recipes.map((recipe) => (
              <tr
                key={recipe.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
                onClick={() => handleRowClick(recipe)}
              >
                <td className="px-6 py-4 font-medium">{recipe.name}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{recipe.caliber}</td>
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
                  <DeleteRecipeButton id={recipe.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Single controlled edit modal at the root of the table */}
      <RecipeForm
        updateAction={async (id, formData) => {
          const { updateRecipe } = await import('./actions');
          await updateRecipe(id, formData);
        }}
        defaultValues={editingRecipe}
        projectiles={projectiles}
        propellants={propellants}
        primers={primers}
        open={!!editingRecipe}
        onOpenChange={(open) => {
          if (!open) handleRowClick(null);
        }}
      />
    </>
  );
}
