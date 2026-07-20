'use client'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { deleteFactoryAmmo } from './actions'

interface DeleteFactoryAmmoButtonProps {
  id: string
  redirectTo?: string
}

export function DeleteFactoryAmmoButton({ id, redirectTo }: DeleteFactoryAmmoButtonProps) {
  const t = useTranslations('factoryAmmo')

  return (
    <button
      type="button"
      className="text-red-600 hover:text-red-700 text-sm font-medium"
      onClick={async () => {
        if (!confirm(t('delete.confirm'))) return
        try {
          const result = await deleteFactoryAmmo(id)
          if (result.ok) {
            toast.success(t('toast.deleted'))
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