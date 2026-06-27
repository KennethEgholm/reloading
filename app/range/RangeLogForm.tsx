'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createRangeLog, updateRangeLog } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { RangeLogWithImages } from '@/lib/types'
import { ChronographImport } from './ChronographImport'
import type { ParsedShot, ParsedChronograph } from '@/lib/parseChronographCsv'

interface RecipeOption {
  id: string
  name: string
  caliber: string
}

interface RangeLogFormProps {
  recipes: RecipeOption[]
  defaultRecipeId?: string
  // Edit / View mode
  initialData?: RangeLogWithImages | null
  logId?: string
  readonly?: boolean
}

interface ImageInput {
  file: File | null
  description: string
}

// Editable view-model for an already-saved image while the form is open.
interface ExistingImage {
  id: string
  filename?: string
  description: string
  markedForDelete: boolean
  isMain: boolean
}

export function RangeLogForm({ recipes, defaultRecipeId, initialData, logId, readonly = false }: RangeLogFormProps) {
  const router = useRouter();
  const t = useTranslations('range')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!initialData
  const isReadOnly = readonly || false

  const effectiveDefaultRecipeId = defaultRecipeId || initialData?.recipe?.id || initialData?.recipeId || ''

  // For edit mode - handle existing images
  const initialExisting: ExistingImage[] = initialData?.images?.map((img) => ({
    id: img.id,
    filename: img.filename,
    description: img.description || '',
    markedForDelete: false,
    isMain: initialData?.mainImageId === img.id,
  })) || []
  if (initialExisting.length > 0 && !initialExisting.some((i) => i.isMain)) {
    initialExisting[0].isMain = true
  }
  const [existingImages, setExistingImages] = useState<ExistingImage[]>(initialExisting)

  const [images, setImages] = useState<ImageInput[]>([{ file: null, description: '' }])
  const [overlayIndex, setOverlayIndex] = useState<number | null>(null)

  const [shots, setShots] = useState<ParsedShot[] | null>(
    initialData?.shots && initialData.shots.length >= 2
      ? initialData.shots.map((s) => ({ shotIndex: s.shotIndex, velocity: s.velocity }))
      : null,
  )
  const [replaceShots, setReplaceShots] = useState(false)

  // Refs to the velocity + roundsFired inputs so a CSV parse can auto-fill them.
  const velocityMinRef = useRef<HTMLInputElement>(null)
  const velocityMaxRef = useRef<HTMLInputElement>(null)
  const velocityAvgRef = useRef<HTMLInputElement>(null)
  const extremeSpreadRef = useRef<HTMLInputElement>(null)
  const stdDevRef = useRef<HTMLInputElement>(null)
  const roundsFiredRef = useRef<HTMLInputElement>(null)

  const today = initialData?.date
    ? new Date(initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const addImageField = () => {
    setImages([...images, { file: null, description: '' }])
  }

  const removeImageField = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const toggleDeleteExisting = (id: string) => {
    setExistingImages(
      existingImages.map((img) =>
        img.id === id ? { ...img, markedForDelete: !img.markedForDelete } : img
      )
    )
  }

  const updateExistingDescription = (id: string, description: string) => {
    setExistingImages(
      existingImages.map((img) => (img.id === id ? { ...img, description } : img))
    )
  }

  const markAsMain = (id: string) => {
    setExistingImages(
      existingImages.map((img) => ({
        ...img,
        isMain: img.id === id,
      }))
    )
  }

  const handleChronoParsed = (_shots: ParsedShot[], aggregates: ParsedChronograph) => {
    setShots(_shots)
    setReplaceShots(true)
    if (velocityMinRef.current) velocityMinRef.current.value = String(aggregates.velocityMin)
    if (velocityMaxRef.current) velocityMaxRef.current.value = String(aggregates.velocityMax)
    if (velocityAvgRef.current) velocityAvgRef.current.value = String(aggregates.velocityAvg)
    if (extremeSpreadRef.current) extremeSpreadRef.current.value = aggregates.extremeSpread.toFixed(1)
    if (stdDevRef.current) stdDevRef.current.value = aggregates.stdDev.toFixed(1)
    if (roundsFiredRef.current) roundsFiredRef.current.value = String(aggregates.roundsFired)
  }

  const handleChronoRemove = () => {
    setShots(null)
    setReplaceShots(true)
  }

  // Keyboard support for photo overlay
  useEffect(() => {
    if (overlayIndex === null) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOverlayIndex(null)
      } else if (e.key === 'ArrowRight') {
        setOverlayIndex((prev) => {
          if (prev === null) return null
          const len = existingImages.length
          return (prev + 1) % len
        })
      } else if (e.key === 'ArrowLeft') {
        setOverlayIndex((prev) => {
          if (prev === null) return null
          const len = existingImages.length
          return (prev - 1 + len) % len
        })
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [overlayIndex, existingImages.length])

  // Clamp or close the overlay if the images array shrank out from under it
  // (e.g. an image was deleted). Adjusting state during render is React's
  // recommended alternative to a setState-in-effect for this case: it re-renders
  // immediately with the corrected value before anything is painted.
  if (overlayIndex !== null && (existingImages.length === 0 || overlayIndex >= existingImages.length)) {
    setOverlayIndex(null)
  }

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

  const updateImage = (index: number, field: 'file' | 'description', value: File | string | null) => {
    const newImages = [...images]
    if (field === 'file') {
      const file = value as File | null
      if (file && file.size > MAX_IMAGE_SIZE) {
        toast.error(t('toast.photoTooLarge', { name: file.name }))
        return
      }
      newImages[index].file = file
    } else {
      newImages[index].description = value as string
    }
    setImages(newImages)
  }

  async function handleSubmit(formData: FormData) {
    if (isReadOnly) return;
    setIsSubmitting(true)

    // Append image files and descriptions for new images
    images.forEach((img) => {
      if (img.file) {
        formData.append('newImages', img.file)
        formData.append('newImageDescriptions', img.description)
      }
    })

    // For edit mode: append existing image data
    if (isEdit && initialData) {
      existingImages.forEach((img: {id: string, description: string, markedForDelete?: boolean, isMain?: boolean}) => {
        formData.append('existingImageId', img.id)
        formData.append('existingImageDescription', img.description)
        if (img.markedForDelete) {
          formData.append('deleteImageId', img.id)
        }
      })

      // Send the currently marked main image (only if not also being deleted)
      const main = existingImages.find((img) => img.isMain && !img.markedForDelete)
      if (main) {
        formData.append('mainImageId', main.id)
      } else {
        formData.append('mainImageId', '')
      }
    }

    if (shots && shots.length >= 2) {
      formData.append('shots', JSON.stringify(shots))
    }
    if (replaceShots) {
      formData.append('replaceShots', 'true')
    }

    try {
      if (isEdit && logId) {
        await updateRangeLog(logId, formData)
        toast.success(t('toast.updated'))
        router.push(`/range/${logId}`);
      } else {
        await createRangeLog(formData)
        toast.success(t('toast.saved'))
        setImages([{ file: null, description: '' }])
        router.push('/range');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.saveFailed')
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeOverlay = () => setOverlayIndex(null)

  const currentOverlayImg = overlayIndex !== null ? existingImages[overlayIndex] : null

  return (
    <>
    <form action={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="range-date" className="block text-sm font-medium mb-1.5">{t('form.date')}</label>
          <input
            id="range-date"
            type="date"
            name="date"
            autoComplete="off"
            defaultValue={today}
            required
            disabled={isReadOnly}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
          />
        </div>
        <div>
          <label htmlFor="range-location" className="block text-sm font-medium mb-1.5">{t('form.location')}</label>
          <input
            id="range-location"
            type="text"
            name="location"
            autoComplete="off"
            defaultValue={initialData?.location || ''}
            placeholder={t('form.locationPlaceholder')}
            disabled={isReadOnly}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
          />
        </div>
      </div>

      <div>
        <label htmlFor="range-recipe" className="block text-sm font-medium mb-1.5">{t('form.recipe')}</label>
        {isReadOnly && !initialData?.recipe ? (
          // The linked recipe was deleted; show the frozen snapshot name instead
          // of an empty select so the session's recipe is still visible.
          <input
            id="range-recipe"
            type="text"
            disabled
            autoComplete="off"
            value={initialData?.recipeName ?? t('row.recipeDeleted')}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
          />
        ) : (
          <select
            id="range-recipe"
            name="recipeId"
            required={!isEdit || !!initialData?.recipe}
            autoComplete="off"
            defaultValue={effectiveDefaultRecipeId}
            disabled={isReadOnly}
            className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
          >
            <option value="">{t('form.recipePlaceholder')}</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.caliber}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor="range-rounds-fired" className="block text-sm font-medium mb-1.5">{t('form.roundsFired')}</label>
        <input
          id="range-rounds-fired"
          ref={roundsFiredRef}
          type="number"
          name="roundsFired"
          min="1"
          inputMode="numeric"
          required
          autoComplete="off"
          defaultValue={initialData?.roundsFired ?? "20"}
          disabled={isReadOnly}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
        />
      </div>

      <div>
        <label htmlFor="range-conditions" className="block text-sm font-medium mb-1.5">{t('form.conditions')}</label>
        <textarea
          id="range-conditions"
          name="conditions"
          rows={2}
          autoComplete="off"
          defaultValue={initialData?.conditions || ''}
          placeholder={t('form.conditionsPlaceholder')}
          disabled={isReadOnly}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
        />
      </div>

      <ChronographImport
        onParsed={handleChronoParsed}
        onRemove={handleChronoRemove}
        isReadOnly={isReadOnly}
        existingShots={shots}
      />

      {/* Chronograph Data */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label htmlFor="range-velocity-min" className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.velocityMin')}</label>
          <input id="range-velocity-min" ref={velocityMinRef} type="number" step="1" inputMode="numeric" name="velocityMin" autoComplete="off" defaultValue={initialData?.velocityMin ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
        </div>
        <div>
          <label htmlFor="range-velocity-max" className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.velocityMax')}</label>
          <input id="range-velocity-max" ref={velocityMaxRef} type="number" step="1" inputMode="numeric" name="velocityMax" autoComplete="off" defaultValue={initialData?.velocityMax ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
        </div>
        <div>
          <label htmlFor="range-velocity-avg" className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.velocityAvg')}</label>
          <input id="range-velocity-avg" ref={velocityAvgRef} type="number" step="1" inputMode="numeric" name="velocityAvg" autoComplete="off" defaultValue={initialData?.velocityAvg ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
        </div>
        <div>
          <label htmlFor="range-velocity-es" className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.velocityES')}</label>
          <input id="range-velocity-es" ref={extremeSpreadRef} type="number" step="0.1" inputMode="decimal" name="extremeSpread" autoComplete="off" defaultValue={initialData?.extremeSpread ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
        </div>
        <div>
          <label htmlFor="range-velocity-sd" className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.velocitySD')}</label>
          <input id="range-velocity-sd" ref={stdDevRef} type="number" step="0.1" inputMode="decimal" name="stdDev" autoComplete="off" defaultValue={initialData?.stdDev ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
        </div>
      </div>

      <div>
        <label htmlFor="range-notes" className="block text-sm font-medium mb-1.5">{t('form.notes')}</label>
        <textarea
          id="range-notes"
          name="notes"
          rows={3}
          autoComplete="off"
          defaultValue={initialData?.notes || ''}
          placeholder={t('form.notesPlaceholder')}
          disabled={isReadOnly}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
        />
      </div>

      {/* Existing Photos */}
      {isEdit && existingImages.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">{t('form.photos')}</label>
          <div className="space-y-3 mb-4">
            {existingImages.map((img: {id: string, filename?: string, description: string, markedForDelete?: boolean, isMain?: boolean}) => (
              <div key={img.id} className="flex gap-3 items-start border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
                {img.filename && (
                  <img
                    src={`/uploads/range-logs/${img.filename}`}
                    alt=""
                    className="w-16 h-16 object-cover rounded flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      const idx = existingImages.findIndex((x) => x.id === img.id)
                      if (idx >= 0) setOverlayIndex(idx)
                    }}
                  />
                )}
                <div className="flex-1">
                  {isReadOnly ? (
                    <div className="text-sm flex items-center gap-2">
                      {img.description || '—'}
                      {img.isMain && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">{t('form.mainThumbnail')}</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        autoComplete="off"
                        value={img.description}
                        onChange={(e) => updateExistingDescription(img.id, e.target.value)}
                        placeholder={t('form.photoDescription')}
                        className="w-full border border-zinc-300 dark:border-zinc-700 rounded px-3 py-1.5 text-sm"
                      />
                      <label className="flex items-center gap-2 mt-2 text-sm text-red-600">
                        <input
                          type="checkbox"
                          autoComplete="off"
                          checked={img.markedForDelete}
                          onChange={() => toggleDeleteExisting(img.id)}
                        />
                        {t('form.deletePhoto')}
                      </label>
                      <button
                        type="button"
                        onClick={() => markAsMain(img.id)}
                        disabled={img.markedForDelete}
                        className={`mt-1 text-xs px-2 py-0.5 rounded ${img.isMain ? 'bg-yellow-200 text-yellow-900 font-medium' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-yellow-100'} disabled:opacity-50`}
                      >
                        {img.isMain ? t('form.isMain') : t('form.setAsMain')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Images */}
      {!isReadOnly && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">{t('form.photosOptional')}</label>
            <button
              type="button"
              onClick={addImageField}
              className="text-sm text-accent hover:text-accent-hover hover:underline"
            >
              {t('form.addPhoto')}
            </button>
          </div>

        {images.map((img, index) => (
          <div key={index} className="flex gap-2 mb-2 items-start">
            <input
              type="file"
              accept="image/*"
              autoComplete="off"
              onChange={(e) => updateImage(index, 'file', e.target.files?.[0] || null)}
              className="flex-1 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-zinc-100 dark:file:bg-zinc-800"
            />
            <input
              type="text"
              autoComplete="off"
              placeholder={t('form.photoDescription')}
              value={img.description}
              onChange={(e) => updateImage(index, 'description', e.target.value)}
              className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm"
            />
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => removeImageField(index)}
                className="text-red-500 px-2"
              >
                {t('form.removePhoto')}
              </button>
            )}
          </div>
        ))}
        <p className="text-xs text-zinc-500 mt-1">{t('form.photoMaxSize')}</p>
      </div>
      )}

      {!isReadOnly && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50 mt-2"
        >
          {isSubmitting ? t('form.saving') : (isEdit ? t('form.saveChanges') : t('form.save'))}
        </button>
      )}

      {isReadOnly && logId && (
        <Link
          href={`/range/${logId}/edit`}
          className="block w-full text-center py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 mt-2"
        >
          {t('form.editSession')}
        </Link>
      )}
    </form>

    {/* Photo overlay / lightbox */}
    {overlayIndex !== null && currentOverlayImg && currentOverlayImg.filename && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
        onClick={closeOverlay}
      >
        <div
          className="relative w-full max-w-[95vw] max-h-[95vh] flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={closeOverlay}
            className="absolute -top-3 -right-3 z-10 bg-white dark:bg-zinc-900 text-black dark:text-white rounded-full w-9 h-9 flex items-center justify-center text-2xl font-bold shadow hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={t('overlay.close')}
          >
            ×
          </button>

          <img
            src={`/uploads/range-logs/${currentOverlayImg.filename}`}
            alt={currentOverlayImg.description || ''}
            className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl bg-zinc-900"
          />

          <div className="mt-3 text-center text-white max-w-2xl">
            {currentOverlayImg.description && (
              <div className="text-sm mb-1 opacity-90">{currentOverlayImg.description}</div>
            )}
            {existingImages.length > 1 && (
              <div className="text-xs opacity-60 mb-2">
                {t('overlay.counter', { current: overlayIndex + 1, total: existingImages.length })}
              </div>
            )}
          </div>

          {existingImages.length > 1 && (
            <div className="flex gap-4 mt-2">
              <button
                onClick={() => setOverlayIndex((overlayIndex - 1 + existingImages.length) % existingImages.length)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition"
              >
                {t('overlay.previous')}
              </button>
              <button
                onClick={() => setOverlayIndex((overlayIndex + 1) % existingImages.length)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition"
              >
                {t('overlay.next')}
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  )
}
