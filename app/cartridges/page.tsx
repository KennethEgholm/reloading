import { prisma } from '@/lib/prisma';
import { getTranslations } from 'next-intl/server';
import { createCartridge } from './actions';
import { CartridgeForm } from './CartridgeForm';
import { CartridgesTable } from './CartridgesTable';

export default async function CartridgesPage() {
  const t = await getTranslations('cartridges');
  const [cartridges, calibers] = await Promise.all([
    prisma.cartridge.findMany({
      include: { caliber: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.caliber.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        <CartridgeForm
          action={createCartridge}
          title={t('form.titleAdd')}
          submitLabel={t('form.submit')}
          calibers={calibers}
        />
      </div>

      <CartridgesTable cartridges={cartridges} calibers={calibers} />
    </div>
  );
}
