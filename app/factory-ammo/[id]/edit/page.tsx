import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getFactoryAmmoById, getCalibersForFactoryAmmo } from '@/app/factory-ammo/actions'
import { FactoryAmmoForm } from '@/app/factory-ammo/FactoryAmmoForm'

export default async function EditFactoryAmmoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('factoryAmmo')
  const [ammo, calibers] = await Promise.all([
    getFactoryAmmoById(id),
    getCalibersForFactoryAmmo(),
  ])

  if (!ammo) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href={`/factory-ammo/${id}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('edit.back')}
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">{t('edit.title')}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          {t('edit.subtitle')}
        </p>

        <FactoryAmmoForm
          calibers={calibers}
          initialData={{
            id: ammo.id,
            brand: ammo.brand,
            model: ammo.model,
            caliberId: ammo.caliberId,
            caliber: { name: ammo.caliber.name },
            amount: ammo.amount,
            projectileWeight: ammo.projectileWeight,
            projectileWeightUnit: ammo.projectileWeightUnit,
            notes: ammo.notes,
            boxImageFilename: ammo.boxImageFilename,
            roundImageFilename: ammo.roundImageFilename,
          }}
        />
      </div>
    </div>
  )
}