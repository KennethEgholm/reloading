'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProjectileForm } from './ProjectileForm';
import { DeleteProjectileButton } from './DeleteProjectileButton';

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
  const t = useTranslations('projectiles');
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
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.brand')}</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.type')}</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.weight')}</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.caliber')}</th>
              <th className="text-right px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.amount')}</th>
              <th className="text-left px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400">{t('table.description')}</th>
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {projectiles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  {t('table.empty')}
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
                <td className="px-6 py-4 text-right font-mono font-medium">
                  {projectile.amount}
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
        title={t('form.titleEdit')}
        submitLabel={t('form.saveChanges')}
        open={!!editingProjectile}
        onOpenChange={(open) => {
          if (!open) setEditingProjectile(null);
        }}
      />
    </>
  );
}
