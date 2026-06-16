'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createLoadLog } from './actions'
import { toast } from 'sonner'

interface RecipeOption {
  id: string
  name: string
  caliber: string
}

interface LoadLogFormProps {
  recipes: RecipeOption[]
  defaultRecipeId?: string
}

export function LoadLogForm({ recipes, defaultRecipeId }: LoadLogFormProps) {
  const t = useTranslations('logs')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)

    try {
      await createLoadLog(formData)
      toast.success(t('toast.saved'))
      // Optionally reset form or close modal in future
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.saveFailed')
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.recipe')}</label>
        <select
          name="recipeId"
          required
          defaultValue={defaultRecipeId}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
        >
          <option value="">{t('form.recipePlaceholder')}</option>
          {recipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.name} — {recipe.caliber}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t('form.date')}</label>
          <input
            type="date"
            name="date"
            defaultValue={today}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t('form.quantity')}</label>
          <input
            type="number"
            name="quantity"
            min="1"
            required
            defaultValue="50"
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">{t('form.notes')}</label>
        <textarea
          name="notes"
          rows={3}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
          placeholder={t('form.notesPlaceholder')}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
      >
        {isSubmitting ? t('form.saving') : t('form.submit')}
      </button>
    </form>
  )
}
