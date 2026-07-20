'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { createFactoryAmmoSession, updateFactoryAmmoSession } from './actions'
import { ChronographImport } from '../../range/ChronographImport'
import type { ParsedShot, ParsedChronograph } from '@/lib/parseChronographCsv'
import { computeMoa } from '@/lib/moa'
import type { FactoryAmmoSessionWithChildren } from '@/lib/types'

interface FactoryAmmoSessionFormProps {
  ammoId: string
  initialData?: FactoryAmmoSessionWithChildren | null
  sessionId?: string
  readonly?: boolean
}

interface GroupInput {
  id?: string
  distanceM: string
  shotCount: string
  groupSizeMm: string
  notes: string
}

export function FactoryAmmoSessionForm({
  ammoId,
  initialData,
  sessionId,
  readonly = false,
}: FactoryAmmoSessionFormProps) {
  const router = useRouter()
  const t = useTranslations('factoryAmmo')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!initialData
  const isReadOnly = readonly

  const [shots, setShots] = useState<ParsedShot[] | null>(
    initialData?.shots && initialData.shots.length >= 2
      ? initialData.shots.map((s) => ({ shotIndex: s.shotIndex, velocity: s.velocity }))
      : null,
  )
  const [replaceShots, setReplaceShots] = useState(false)

  const [groups, setGroups] = useState<GroupInput[]>(
    initialData?.groups && initialData.groups.length > 0
      ? initialData.groups.map((g) => ({
          id: g.id,
          distanceM: String(g.distanceM),
          shotCount: String(g.shotCount),
          groupSizeMm: String(g.groupSizeMm),
          notes: g.notes || '',
        }))
      : [{ distanceM: '', shotCount: '', groupSizeMm: '', notes: '' }],
  )
  const [groupsTouched, setGroupsTouched] = useState(false)

  const velocityMinRef = useRef<HTMLInputElement>(null)
  const velocityMaxRef = useRef<HTMLInputElement>(null)
  const velocityAvgRef = useRef<HTMLInputElement>(null)
  const extremeSpreadRef = useRef<HTMLInputElement>(null)
  const stdDevRef = useRef<HTMLInputElement>(null)
  const roundsFiredRef = useRef<HTMLInputElement>(null)

  const today = initialData?.date
    ? new Date(initialData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

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

  const updateGroup = (index: number, field: keyof Omit<GroupInput, 'id'>, value: string) => {
    setGroups((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)))
    setGroupsTouched(true)
  }
  const addGroup = () => {
    setGroups((prev) => [...prev, { distanceM: '', shotCount: '', groupSizeMm: '', notes: '' }])
    setGroupsTouched(true)
  }
  const removeGroup = (index: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== index))
    setGroupsTouched(true)
  }
  const previewMoa = (g: GroupInput): number | null => {
    const d = parseFloat(g.distanceM)
    const s = parseFloat(g.groupSizeMm)
    if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(s) || s < 0) return null
    try {
      return computeMoa(s, d)
    } catch {
      return null
    }
  }

  async function handleSubmit(formData: FormData) {
    if (isReadOnly) return
    setIsSubmitting(true)

    if (shots && shots.length >= 2) {
      formData.append('shots', JSON.stringify(shots))
    }
    if (replaceShots) {
      formData.append('replaceShots', 'true')
    }

    if (groupsTouched || !isEdit) {
      const filled = groups
        .filter((g) => g.distanceM.trim() !== '' && g.groupSizeMm.trim() !== '')
        .map((g) => ({
          distanceM: parseFloat(g.distanceM),
          shotCount: parseInt(g.shotCount, 10) || 1,
          groupSizeMm: parseFloat(g.groupSizeMm),
          notes: g.notes.trim() || null,
        }))
      formData.append('groups', JSON.stringify(filled))
      if (isEdit) {
        formData.append('replaceGroups', 'true')
      }
    }

    try {
      if (isEdit && sessionId) {
        await updateFactoryAmmoSession(ammoId, sessionId, formData)
        toast.success(t('toast.sessionUpdated'))
        router.push(`/factory-ammo/${ammoId}/sessions/${sessionId}`)
      } else {
        await createFactoryAmmoSession(ammoId, formData)
        toast.success(t('toast.sessionSaved'))
        router.push(`/factory-ammo/${ammoId}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.saveFailed')
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fas-date" className="block text-sm font-medium mb-1.5">{t('form.date')}</label>
          <input
            id="fas-date"
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
          <label htmlFor="fas-location" className="block text-sm font-medium mb-1.5">{t('form.location')}</label>
          <input
            id="fas-location"
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
        <label htmlFor="fas-rounds-fired" className="block text-sm font-medium mb-1.5">{t('form.roundsFired')}</label>
        <input
          id="fas-rounds-fired"
          ref={roundsFiredRef}
          type="number"
          name="roundsFired"
          min="1"
          inputMode="numeric"
          required
          autoComplete="off"
          defaultValue={initialData?.roundsFired ?? '10'}
          disabled={isReadOnly}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
        />
      </div>

      <div>
        <label htmlFor="fas-conditions" className="block text-sm font-medium mb-1.5">{t('form.conditions')}</label>
        <textarea
          id="fas-conditions"
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
        namespace="factoryAmmo"
      />

      {/* Chronograph Data */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label htmlFor="fas-velocity-min" className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.velocityMin')}</label>
          <input id="fas-velocity-min" ref={velocityMinRef} type="number" step="1" inputMode="numeric" name="velocityMin" autoComplete="off" defaultValue={initialData?.velocityMin ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
        </div>
        <div>
          <label htmlFor="fas-velocity-max" className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.velocityMax')}</label>
          <input id="fas-velocity-max" ref={velocityMaxRef} type="number" step="1" inputMode="numeric" name="velocityMax" autoComplete="off" defaultValue={initialData?.velocityMax ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
        </div>
        <div>
          <label htmlFor="fas-velocity-avg" className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.velocityAvg')}</label>
          <input id="fas-velocity-avg" ref={velocityAvgRef} type="number" step="1" inputMode="numeric" name="velocityAvg" autoComplete="off" defaultValue={initialData?.velocityAvg ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
        </div>
        <div>
          <label htmlFor="fas-velocity-es" className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.velocityES')}</label>
          <input id="fas-velocity-es" ref={extremeSpreadRef} type="number" step="0.1" inputMode="decimal" name="extremeSpread" autoComplete="off" defaultValue={initialData?.extremeSpread ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
        </div>
        <div>
          <label htmlFor="fas-velocity-sd" className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.velocitySD')}</label>
          <input id="fas-velocity-sd" ref={stdDevRef} type="number" step="0.1" inputMode="decimal" name="stdDev" autoComplete="off" defaultValue={initialData?.stdDev ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
        </div>
      </div>

      <div>
        <label htmlFor="fas-notes" className="block text-sm font-medium mb-1.5">{t('form.notes')}</label>
        <textarea
          id="fas-notes"
          name="notes"
          rows={3}
          autoComplete="off"
          defaultValue={initialData?.notes || ''}
          placeholder={t('form.notesPlaceholder')}
          disabled={isReadOnly}
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
        />
      </div>

      {/* Accuracy groups (MOA) */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">{t('form.groups.title')}</label>
          {!isReadOnly && (
            <button
              type="button"
              onClick={addGroup}
              className="text-sm text-accent hover:text-accent-hover hover:underline"
            >
              {t('form.groups.add')}
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500 mb-3">{t('form.groups.hint')}</p>

        {isReadOnly && groups.every((g) => !g.distanceM && !g.groupSizeMm) ? (
          <p className="text-sm text-zinc-500">{t('form.groups.empty')}</p>
        ) : (
          <div className="space-y-2">
            {groups.map((g, i) => {
              const moa = previewMoa(g)
              return (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[8rem_6rem_8rem_1fr_5rem_auto] gap-2 items-start border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.groups.distance')}</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      inputMode="decimal"
                      autoComplete="off"
                      value={g.distanceM}
                      onChange={(e) => updateGroup(i, 'distanceM', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.groups.shots')}</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      inputMode="numeric"
                      autoComplete="off"
                      value={g.shotCount}
                      onChange={(e) => updateGroup(i, 'shotCount', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.groups.size')}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      inputMode="decimal"
                      autoComplete="off"
                      value={g.groupSizeMm}
                      onChange={(e) => updateGroup(i, 'groupSizeMm', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1 text-zinc-600 dark:text-zinc-400">{t('form.groups.notes')}</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={g.notes}
                      onChange={(e) => updateGroup(i, 'notes', e.target.value)}
                      disabled={isReadOnly}
                      placeholder={t('form.groups.notesPlaceholder')}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1 text-zinc-600 dark:text-zinc-400">MOA</label>
                    <div className="px-2 py-1.5 text-sm font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                      {moa !== null ? moa.toFixed(2) : '—'}
                    </div>
                  </div>
                  {!isReadOnly && groups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGroup(i)}
                      className="self-end text-red-500 px-2 py-1.5 text-sm"
                      aria-label={t('form.groups.remove')}
                    >
                      {t('form.groups.remove')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!isReadOnly && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50 mt-2"
        >
          {isSubmitting ? t('form.saving') : (isEdit ? t('form.saveChanges') : t('form.submit'))}
        </button>
      )}

      {isReadOnly && sessionId && (
        <Link
          href={`/factory-ammo/${ammoId}/sessions/${sessionId}/edit`}
          className="block w-full text-center py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 mt-2"
        >
          {t('form.editSession')}
        </Link>
      )}
    </form>
  )
}