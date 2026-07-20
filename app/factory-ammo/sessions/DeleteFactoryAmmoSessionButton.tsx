'use client'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { deleteFactoryAmmoSession } from './actions'

interface DeleteFactoryAmmoSessionButtonProps {
  ammoId: string
  sessionId: string
  redirectTo?: string
}

export function DeleteFactoryAmmoSessionButton({ ammoId, sessionId, redirectTo }: DeleteFactoryAmmoSessionButtonProps) {
  const t = useTranslations('factoryAmmo')

  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 text-sm font-medium"
      onClick={async () => {
        if (!confirm(t('delete.sessionConfirm'))) return
        try {
          const result = await deleteFactoryAmmoSession(ammoId, sessionId)
          if (result.ok) {
            toast.success(t('toast.sessionDeleted'))
            if (redirectTo) window.location.href = redirectTo
          } else {
            toast.error(result.error)
          }
        } catch {
          toast.error(t('toast.deleteFailed'))
        }
      }}
    >
      {t('delete.button')}
    </button>
  )
}