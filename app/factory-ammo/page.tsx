import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getFactoryAmmoList } from './actions'
import { FactoryAmmoTable } from './FactoryAmmoTable'
import { EmptyState } from '../EmptyState'

export default async function FactoryAmmoPage() {
  const t = await getTranslations('factoryAmmo')
  const ammos = await getFactoryAmmoList()

  return (
    <div className="w-full px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {t('page.subtitle')}
          </p>
        </div>

        <Link
          href="/factory-ammo/new"
          className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          {t('page.addButton')}
        </Link>
      </div>

      {ammos.length === 0 ? (
        <EmptyState>
          {t('page.empty')}{' '}
          <Link href="/factory-ammo/new" className="text-accent hover:text-accent-hover hover:underline">
            {t('page.addFirst')}
          </Link>
          {t('page.addFirstSuffix')}
        </EmptyState>
      ) : (
        <FactoryAmmoTable ammos={ammos} />
      )}
    </div>
  )
}