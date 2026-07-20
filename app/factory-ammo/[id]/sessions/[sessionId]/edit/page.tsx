import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getFactoryAmmoSessionById } from '@/app/factory-ammo/sessions/actions'
import { FactoryAmmoSessionForm } from '@/app/factory-ammo/sessions/FactoryAmmoSessionForm'

export default async function EditFactoryAmmoSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  const t = await getTranslations('factoryAmmo')
  const session = await getFactoryAmmoSessionById(id, sessionId)

  if (!session) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href={`/factory-ammo/${id}/sessions/${sessionId}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('session.edit.back')}
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">{t('session.edit.title')}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          {t('session.edit.subtitle', { brand: session.factoryAmmo.brand, model: session.factoryAmmo.model })}
        </p>

        <FactoryAmmoSessionForm
          ammoId={id}
          initialData={session}
          sessionId={session.id}
        />
      </div>
    </div>
  )
}