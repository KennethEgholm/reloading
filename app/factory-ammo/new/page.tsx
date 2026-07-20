import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getCalibersForFactoryAmmo } from '../actions'
import { FactoryAmmoForm } from '../FactoryAmmoForm'

export default async function NewFactoryAmmoPage() {
  const t = await getTranslations('factoryAmmo')
  const calibers = await getCalibersForFactoryAmmo()

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/factory-ammo" className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('new.back')}
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">{t('new.title')}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          {t('new.subtitle')}
        </p>

        <FactoryAmmoForm calibers={calibers} />
      </div>
    </div>
  )
}