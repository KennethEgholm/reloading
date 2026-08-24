'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProjectileForm } from './ProjectileForm';
import { DeleteProjectileButton } from './DeleteProjectileButton';
import { SortIndicator } from '../SortIndicator';
import { useSortBy } from '@/lib/useSortBy';
import type { Projectile } from '@/lib/types';

type SortKey = 'brand' | 'type' | 'weightGr' | 'caliber' | 'amount' | 'description';

interface ProjectilesTableProps {
  projectiles: Projectile[];
}

export function ProjectilesTable({ projectiles }: ProjectilesTableProps) {
  const t = useTranslations('projectiles');
  const tc = useTranslations('common');
  const [editingProjectile, setEditingProjectile] = useState<Projectile | null>(null);
  const total = projectiles.reduce((sum, p) => sum + p.amount, 0);
  const { sorted, sortKey, sortDirection, toggleSort } = useSortBy<Projectile, SortKey>(projectiles, 'brand');

  const handleRowClick = (projectile: Projectile) => {
    setEditingProjectile(projectile);
  };

  const sortableHeader = (key: SortKey, label: string, align: 'left' | 'right' | 'center' = 'left') => (
    <th
      className={`px-6 py-3 font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-200 text-${align}`}
      onClick={() => toggleSort(key)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''} ${align === 'center' ? 'justify-center w-full' : ''}`}>
        {label}
        <SortIndicator active={sortKey === key} direction={sortKey === key ? sortDirection : null} />
      </span>
    </th>
  );

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <tr>
              {sortableHeader('brand', t('table.brand'))}
              {sortableHeader('type', t('table.type'))}
              {sortableHeader('weightGr', t('table.weight'), 'right')}
              {sortableHeader('caliber', t('table.caliber'))}
              {sortableHeader('amount', t('table.amount'), 'right')}
              {sortableHeader('description', t('table.description'))}
              <th className="w-40"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  {t('table.empty')}
                </td>
              </tr>
            )}

            {sorted.map((projectile) => (
              <tr
                key={projectile.id}
                tabIndex={0}
                role="button"
                className="hover:bg-zinc-50 dark:hover:bg-zinc-950/50 cursor-pointer"
                onClick={() => handleRowClick(projectile)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(projectile);
                  }
                }}
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
          {sorted.length > 0 && (
            <tfoot className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <tr>
                <td className="px-6 py-3 font-medium">{tc('total')}</td>
                <td />
                <td />
                <td />
                <td className="px-6 py-3 text-right font-mono font-medium">{total}</td>
                <td />
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Single controlled edit modal */}
      <ProjectileForm
        action={async (formData) => {
          if (!editingProjectile) return;
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