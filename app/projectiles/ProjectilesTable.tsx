'use client';

import { useState } from 'react';
import { ProjectileForm } from './ProjectileForm';
import { DeleteProjectileButton } from './DeleteProjectileButton';
import { AdjustAmountButton } from './AdjustAmountButton';

interface ProjectilesTableProps {
  projectiles: Array<{
    id: string;
    brand: string;
    type: string | null;
    weightGr: number;
    caliber: string;
    amount: number;
    description: string | null;
  }>;
}

export function ProjectilesTable({ projectiles }: ProjectilesTableProps) {
  const [editingProjectile, setEditingProjectile] = useState<any | null>(null);

  const handleRowClick = (projectile: any) => {
    setEditingProjectile(projectile);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Brand</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Type</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Weight (gr)</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Caliber</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Amount</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">Description</th>
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {projectiles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  No projectiles yet.
                </td>
              </tr>
            )}

            {projectiles.map((projectile) => (
              <tr
                key={projectile.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
                onClick={() => handleRowClick(projectile)}
              >
                <td className="px-6 py-4 font-medium">{projectile.brand}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{projectile.type || '—'}</td>
                <td className="px-6 py-4 text-right font-mono">{projectile.weightGr}</td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{projectile.caliber}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <AdjustAmountButton id={projectile.id} delta={-1}>−</AdjustAmountButton>
                    <span className="w-10 text-right font-medium font-mono">{projectile.amount}</span>
                    <AdjustAmountButton id={projectile.id} delta={1}>+</AdjustAmountButton>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-sm max-w-xs truncate">
                  {projectile.description || '—'}
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <DeleteProjectileButton id={projectile.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Single controlled edit modal */}
      <ProjectileForm
        action={async (formData) => {
          const { updateProjectile } = await import('./actions');
          await updateProjectile(editingProjectile.id, formData);
        }}
        defaultValues={editingProjectile}
        title="Edit Projectile"
        submitLabel="Save Changes"
        open={!!editingProjectile}
        onOpenChange={(open) => {
          if (!open) setEditingProjectile(null);
        }}
      />
    </>
  );
}
