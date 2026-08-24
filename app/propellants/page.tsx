import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { createPropellant } from './actions';
import { PropellantForm } from './PropellantForm';
import { PropellantsTable } from './PropellantsTable';

export default async function PropellantsPage() {
  const t = await getTranslations('propellants');
  const propellants = await prisma.propellant.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="w-full px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        <PropellantForm
          action={createPropellant}
          title={t('form.titleAdd')}
          submitLabel={t('form.submit')}
        />
      </div>

      <PropellantsTable propellants={propellants} />
    </div>
  );
}
