import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { createPrimer } from './actions';
import { PrimerForm } from './PrimerForm';
import { PrimersTable } from './PrimersTable';

export default async function PrimersPage() {
  const t = await getTranslations('primers');
  const primers = await prisma.primer.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        <PrimerForm
          action={createPrimer}
          title={t('form.titleAdd')}
          submitLabel={t('form.submit')}
        />
      </div>

      <PrimersTable primers={primers} />
    </div>
  );
}
