'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { WeightUnit } from '@prisma/client'
import { createFactoryAmmo, updateFactoryAmmo } from './actions'
import { CaliberField } from '../CaliberField'
import type { CaliberOption } from '@/lib/types'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

interface FactoryAmmoFormProps {
  calibers: CaliberOption[]
  initialData?: {
    id: string
    brand: string
    model: string
    caliberId: string
    caliber: { name: string }
    amount: number
    projectileWeight: number | null
    projectileWeightUnit: WeightUnit
    notes: string | null
    boxImageFilename: string | null
    roundImageFilename: string | null
  } | null
}

export function FactoryAmmoForm({ calibers, initialData }: FactoryAmmoFormProps) {
  const router = useRouter()
  const t = useTranslations('factoryAmmo')
  const isEdit = !!initialData

  const [brand, setBrand] = useState(initialData?.brand ?? '')
  const [model, setModel] = useState(initialData?.model ?? '')
  const [caliber, setCaliber] = useState(initialData?.caliber?.name ?? '')
  const [amount, setAmount] = useState(String(initialData?.amount ?? 0))
  const [projectileWeight, setProjectileWeight] = useState(
    initialData?.projectileWeight != null ? String(initialData.projectileWeight) : '',
  )
  const [projectileWeightUnit, setProjectileWeightUnit] = useState<WeightUnit>(
    initialData?.projectileWeightUnit ?? WeightUnit.GR,
  )
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [boxFile, setBoxFile] = useState<File | null>(null)
  const [roundFile, setRoundFile] = useState<File | null>(null)
  const [removeBox, setRemoveBox] = useState(false)
  const [removeRound, setRemoveRound] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const brandRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEdit) {
      const timer = setTimeout(() => {
        brandRef.current?.focus()
        brandRef.current?.select()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isEdit])

  // Keyboard: Enter to submit (except in textarea), Esc to go back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        router.back()
      } else if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null
        if (active?.tagName === 'TEXTAREA' || active?.tagName === 'BUTTON') return
        e.preventDefault()
        submit()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, model, caliber, amount, projectileWeight, projectileWeightUnit, notes, boxFile, roundFile, removeBox, removeRound])

  const handleFile = (slot: 'box' | 'round', file: File | null) => {
    if (file && file.size > MAX_IMAGE_SIZE) {
      toast.error(t('toast.photoTooLarge', { name: file.name }))
      return
    }
    if (slot === 'box') {
      setBoxFile(file)
      setRemoveBox(false)
    } else {
      setRoundFile(file)
      setRemoveRound(false)
    }
  }

  async function submit() {
    if (isSubmitting) return
    if (!brand.trim() || !model.trim() || !caliber.trim()) {
      toast.error(t('toast.fillRequired'))
      return
    }
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('brand', brand.trim())
    formData.append('model', model.trim())
    formData.append('caliber', caliber.trim())
    formData.append('amount', amount)
    formData.append('projectileWeightUnit', projectileWeightUnit)
    if (projectileWeight.trim()) formData.append('projectileWeight', projectileWeight.trim())
    if (notes.trim()) formData.append('notes', notes.trim())
    if (boxFile) formData.append('boxImage', boxFile)
    if (roundFile) formData.append('roundImage', roundFile)
    if (isEdit && removeBox) formData.append('removeBoxImage', 'true')
    if (isEdit && removeRound) formData.append('removeRoundImage', 'true')

    try {
      if (isEdit && initialData) {
        await updateFactoryAmmo(initialData.id, formData)
        toast.success(t('toast.updated'))
        router.push(`/factory-ammo/${initialData.id}`)
      } else {
        const createdId = await createFactoryAmmo(formData)
        toast.success(t('toast.created'))
        router.push(createdId ? `/factory-ammo/${createdId}` : '/factory-ammo')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.saveFailed')
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const boxPreview = boxFile
    ? URL.createObjectURL(boxFile)
    : initialData?.boxImageFilename
      ? `/uploads/factory-ammo/${initialData.boxImageFilename}`
      : null
  const roundPreview = roundFile
    ? URL.createObjectURL(roundFile)
    : initialData?.roundImageFilename
      ? `/uploads/factory-ammo/${initialData.roundImageFilename}`
      : null

  return (
    <form
      action={submit}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fa-brand" className="block text-sm font-medium mb-1.5">{t('form.brand')}</label>
          <input
            id="fa-brand"
            ref={brandRef}
            type="text"
            autoComplete="off"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder={t('form.brandPlaceholder')}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
          />
        </div>
        <div>
          <label htmlFor="fa-model" className="block text-sm font-medium mb-1.5">{t('form.model')}</label>
          <input
            id="fa-model"
            type="text"
            autoComplete="off"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={t('form.modelPlaceholder')}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fa-caliber" className="block text-sm font-medium mb-1.5">{t('form.caliber')}</label>
          <CaliberField
            id="fa-caliber"
            value={caliber}
            onChange={setCaliber}
            calibers={calibers}
          />
        </div>
        <div>
          <label htmlFor="fa-amount" className="block text-sm font-medium mb-1.5">{t('form.amount')}</label>
          <input
            id="fa-amount"
            type="number"
            min="0"
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fa-weight" className="block text-sm font-medium mb-1.5">{t('form.projectileWeight')}</label>
          <input
            id="fa-weight"
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            autoComplete="off"
            value={projectileWeight}
            onChange={(e) => setProjectileWeight(e.target.value)}
            placeholder={t('form.projectileWeightPlaceholder')}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 font-mono"
          />
        </div>
        <div>
          <label htmlFor="fa-weight-unit" className="block text-sm font-medium mb-1.5">{t('form.weightUnit')}</label>
          <select
            id="fa-weight-unit"
            value={projectileWeightUnit}
            onChange={(e) => setProjectileWeightUnit(e.target.value as WeightUnit)}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
          >
            <option value={WeightUnit.GR}>{t('form.unitGr')}</option>
            <option value={WeightUnit.G}>{t('form.unitG')}</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="fa-notes" className="block text-sm font-medium mb-1.5">{t('form.notes')}</label>
        <textarea
          id="fa-notes"
          rows={3}
          autoComplete="off"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('form.notesPlaceholder')}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
        />
      </div>

      {/* Box photo */}
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
        <label className="block text-sm font-medium mb-2">{t('form.boxPhoto')}</label>
        <p className="text-xs text-zinc-500 mb-3">{t('form.photoHint')}</p>
        <div className="flex gap-4 items-start">
          {boxPreview && !removeBox && (
            <img
              src={boxPreview}
              alt=""
              width={96}
              height={96}
              className="w-24 h-24 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700"
            />
          )}
          <div className="flex-1 space-y-2">
            <input
              type="file"
              accept="image/*"
              autoComplete="off"
              onChange={(e) => handleFile('box', e.target.files?.[0] || null)}
              className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-zinc-100 dark:file:bg-zinc-800"
            />
            {isEdit && initialData?.boxImageFilename && !boxFile && (
              <label className="flex items-center gap-2 text-sm text-red-600">
                <input
                  type="checkbox"
                  checked={removeBox}
                  onChange={(e) => setRemoveBox(e.target.checked)}
                />
                {t('form.removePhoto')}
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Round photo */}
      <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
        <label className="block text-sm font-medium mb-2">{t('form.roundPhoto')}</label>
        <p className="text-xs text-zinc-500 mb-3">{t('form.photoHint')}</p>
        <div className="flex gap-4 items-start">
          {roundPreview && !removeRound && (
            <img
              src={roundPreview}
              alt=""
              width={96}
              height={96}
              className="w-24 h-24 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700"
            />
          )}
          <div className="flex-1 space-y-2">
            <input
              type="file"
              accept="image/*"
              autoComplete="off"
              onChange={(e) => handleFile('round', e.target.files?.[0] || null)}
              className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-zinc-100 dark:file:bg-zinc-800"
            />
            {isEdit && initialData?.roundImageFilename && !roundFile && (
              <label className="flex items-center gap-2 text-sm text-red-600">
                <input
                  type="checkbox"
                  checked={removeRound}
                  onChange={(e) => setRemoveRound(e.target.checked)}
                />
                {t('form.removePhoto')}
              </label>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
      >
        {isSubmitting ? t('form.saving') : (isEdit ? t('form.saveChanges') : t('form.submit'))}
      </button>
    </form>
  )
}