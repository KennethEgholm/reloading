import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getFactoryAmmoById } from '@/app/factory-ammo/actions'
import { FactoryAmmoSessionForm } from '@/app/factory-ammo/sessions/FactoryAmmoSessionForm'

export default async function NewFactoryAmmoSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('factoryAmmo')
  const ammo = await getFactoryAmmoById(id)
  if (!ammo) notFound()

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href={`/factory-ammo/${id}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('session.new.back')}
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">{t('session.new.title')}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-2">
          {t('session.new.subtitle', { brand: ammo.brand, model: ammo.model })}
        </p>
        <p className="text-sm text-zinc-500 mb-8">
          {t('session.new.ammoLabel', { caliber: ammo.caliber.name })}
        </p>

        <FactoryAmmoSessionForm ammoId={id} />
      </div>
    </div>
  )
}