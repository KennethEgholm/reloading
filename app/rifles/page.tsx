import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { createRifle } from './actions';
import { RifleForm } from './RifleForm';
import { RiflesTable } from './RiflesTable';

export default async function RiflesPage() {
  const t = await getTranslations('rifles');
  const [rifles, calibers] = await Promise.all([
    prisma.rifle.findMany({
      include: { caliber: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.caliber.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="w-full px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        <RifleForm
          action={createRifle}
          title={t('form.titleAdd')}
          submitLabel={t('form.submit')}
          calibers={calibers}
        />
      </div>

      <RiflesTable rifles={rifles} calibers={calibers} />
    </div>
  );
}
