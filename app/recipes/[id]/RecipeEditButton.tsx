'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { RecipeForm } from '../RecipeForm'
import type {
  RecipeWithRelations,
  Projectile,
  Propellant,
  Primer,
  CartridgeWithCaliber,
  CaliberOption,
} from '@/lib/types'

interface RecipeEditButtonProps {
  recipe: RecipeWithRelations
  projectiles: Projectile[]
  propellants: Propellant[]
  primers: Primer[]
  cartridges: CartridgeWithCaliber[]
  calibers: CaliberOption[]
}

export function RecipeEditButton({
  recipe,
  projectiles,
  propellants,
  primers,
  cartridges,
  calibers,
}: RecipeEditButtonProps) {
  const t = useTranslations('recipes')
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        {t('detail.edit')}
      </button>
      <RecipeForm
        updateAction={async (id, formData) => {
          const { updateRecipe } = await import('../actions')
          await updateRecipe(id, formData)
        }}
        defaultValues={recipe}
        projectiles={projectiles}
        propellants={propellants}
        primers={primers}
        cartridges={cartridges}
        calibers={calibers}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
