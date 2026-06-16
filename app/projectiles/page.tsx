import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { createProjectile } from './actions';
import { ProjectileForm } from './ProjectileForm';
import { ProjectilesTable } from './ProjectilesTable';

export default async function ProjectilesPage() {
  const t = await getTranslations('projectiles');
  const projectiles = await prisma.projectile.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        <ProjectileForm
          action={createProjectile}
          title={t('form.titleAdd')}
          submitLabel={t('form.submit')}
        />
      </div>

      <ProjectilesTable projectiles={projectiles} />
    </div>
  );
}
