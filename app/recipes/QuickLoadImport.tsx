'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { parseQuickLoadDat, QuickLoadParseError, type ParsedQuickLoad } from '@/lib/parseQuickLoadDat'
import type { CaliberOption } from '@/lib/types'
import { matchExistingCaliber } from '@/lib/matchCaliber'
import { importRecipeFromQuickLoad, type QuickLoadImportData } from './actions'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { CaliberField } from '../CaliberField'

interface ProjectileOption {
  id: string
  brand: string
  type: string | null
  weightGr: number
  caliber: string
}

interface PropellantOption {
  id: string
  brand: string
  type: string
}

interface QuickLoadImportProps {
  projectiles: ProjectileOption[]
  propellants: PropellantOption[]
  calibers: CaliberOption[]
}

export function QuickLoadImport({ projectiles, propellants, calibers }: QuickLoadImportProps) {
  const t = useTranslations('recipes')
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [parsed, setParsed] = useState<ParsedQuickLoad | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editable, setEditable] = useState({
    name: '',
    caliber: '',
    chargeGr: '',
    coal: '',
    calculatedV0: '',
    measuredV0: '',
    fillRate: '',
    notes: '',
  })
  const [projectileId, setProjectileId] = useState<string>('')
  const [createProjectile, setCreateProjectile] = useState(false)
  const [propellantId, setPropellantId] = useState<string>('')
  const [createPropellant, setCreatePropellant] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, isOpen)

  // Reset state on close (rather than in an isOpen effect) so reopening starts
  // clean without a setState-in-effect cascade.
  const closeModal = () => {
    setIsOpen(false)
    setParsed(null)
    setError(null)
    setEditable({ name: '', caliber: '', chargeGr: '', coal: '', calculatedV0: '', measuredV0: '', fillRate: '', notes: '' })
    setProjectileId('')
    setCreateProjectile(false)
    setPropellantId('')
    setCreatePropellant(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const matchProjectile = (p: ParsedQuickLoad) => {
    const match = projectiles.find(
      (pr) => pr.brand.toLowerCase() === p.bulletBrand.toLowerCase() &&
             (pr.type || '').toLowerCase() === p.bulletType.toLowerCase() &&
             Math.abs(pr.weightGr - p.bulletWeightGr) < 0.1 &&
             pr.caliber.toLowerCase() === p.bulletCaliber.toLowerCase()
    )
    if (match) {
      setProjectileId(match.id)
      setCreateProjectile(false)
    } else {
      setProjectileId('')
      setCreateProjectile(true)
    }
  }

  const matchPropellant = (p: ParsedQuickLoad) => {
    const match = propellants.find(
      (pr) => pr.brand.toLowerCase() === p.propellantBrand.toLowerCase() &&
             pr.type.toLowerCase() === p.propellantType.toLowerCase()
    )
    if (match) {
      setPropellantId(match.id)
      setCreatePropellant(false)
    } else {
      setPropellantId('')
      setCreatePropellant(true)
    }
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    setError(null)
    setParsed(null)
    try {
      const text = await file.text()
      const result = parseQuickLoadDat(text)
      setParsed(result)
      setEditable({
        name: result.name,
        caliber: matchExistingCaliber(result.caliber, calibers),
        chargeGr: String(result.chargeGr || ''),
        coal: String(result.coal || ''),
        calculatedV0: String(result.calculatedV0 || ''),
        measuredV0: String(result.measuredV0 || ''),
        fillRate: String(result.fillRate || ''),
        notes: result.notes,
      })
      matchProjectile(result)
      matchPropellant(result)
    } catch (e) {
      if (e instanceof QuickLoadParseError) {
        setError(t('qlImport.invalidFile'))
        toast.error(t('qlImport.invalidFile'))
      } else {
        setError(t('qlImport.invalidFile'))
        toast.error(t('qlImport.failed'))
      }
    }
  }

  const handleSave = async () => {
    if (!parsed) return
    setIsSaving(true)
    try {
      const data: QuickLoadImportData = {
        name: editable.name,
        caliber: editable.caliber,
        chargeGr: editable.chargeGr ? parseFloat(editable.chargeGr) : null,
        coal: editable.coal ? parseFloat(editable.coal) : null,
        calculatedV0: editable.calculatedV0 ? parseFloat(editable.calculatedV0) : null,
        measuredV0: editable.measuredV0 ? parseFloat(editable.measuredV0) : null,
        fillRate: editable.fillRate ? parseFloat(editable.fillRate) : null,
        notes: editable.notes || null,
        projectileId: createProjectile ? null : projectileId,
        createProjectile,
        projectileBrand: parsed.bulletBrand,
        projectileType: parsed.bulletType,
        projectileWeightGr: parsed.bulletWeightGr,
        projectileCaliber: parsed.bulletCaliber,
        propellantId: createPropellant ? null : propellantId,
        createPropellant,
        propellantBrand: parsed.propellantBrand,
        propellantType: parsed.propellantType,
      }
      await importRecipeFromQuickLoad(data)
      toast.success(t('qlImport.success'))
      closeModal()
    } catch (e) {
      toast.error(t('qlImport.failed'))
    } finally {
      setIsSaving(false)
    }
  }

  const matchedProjectile = projectiles.find((p) => p.id === projectileId)
  const matchedPropellant = propellants.find((p) => p.id === propellantId)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        {t('qlImport.button')}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ql-import-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800"
          >
            <h2 id="ql-import-title" className="text-xl font-semibold mb-4">{t('qlImport.title')}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{t('qlImport.hint')}</p>

            <input
              ref={fileInputRef}
              id="ql-dat-file"
              type="file"
              accept=".dat,.DAT"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
              className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-zinc-100 dark:file:bg-zinc-800 mb-4"
            />

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4" aria-live="polite">{error}</p>
            )}

            {parsed && (
              <div className="space-y-4" aria-live="polite">
                <p className="text-sm font-medium">{t('qlImport.preview')}</p>

                <div className="space-y-3">
                  <Field label={t('qlImport.recipeName')}>
                    <input value={editable.name} onChange={(e) => setEditable({ ...editable, name: e.target.value })} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm" />
                  </Field>
                  <Field label={t('qlImport.caliber')}>
                    <CaliberField
                      calibers={calibers}
                      value={editable.caliber}
                      onChange={(name) => setEditable({ ...editable, caliber: name })}
                      className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('qlImport.charge')}>
                      <input value={editable.chargeGr} onChange={(e) => setEditable({ ...editable, chargeGr: e.target.value })} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm font-mono" />
                    </Field>
                    <Field label={t('qlImport.coal')}>
                      <input value={editable.coal} onChange={(e) => setEditable({ ...editable, coal: e.target.value })} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm font-mono" />
                    </Field>
                    <Field label={t('qlImport.calcV0')}>
                      <input value={editable.calculatedV0} onChange={(e) => setEditable({ ...editable, calculatedV0: e.target.value })} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm font-mono" />
                    </Field>
                    <Field label={t('qlImport.measV0')}>
                      <input value={editable.measuredV0} onChange={(e) => setEditable({ ...editable, measuredV0: e.target.value })} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm font-mono" />
                    </Field>
                    <Field label={t('qlImport.fillRate')}>
                      <input value={editable.fillRate} onChange={(e) => setEditable({ ...editable, fillRate: e.target.value })} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm font-mono" />
                    </Field>
                  </div>

                  <Field label={t('qlImport.notes')}>
                    <textarea value={editable.notes} onChange={(e) => setEditable({ ...editable, notes: e.target.value })} rows={2} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm" />
                  </Field>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('qlImport.projectile')}</label>
                    {createProjectile ? (
                      <div className="space-y-2">
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          {t('qlImport.noMatch')}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {t('qlImport.newProjectile', { brand: parsed.bulletBrand, type: parsed.bulletType, weight: parsed.bulletWeightGr.toFixed(1), caliber: parsed.bulletCaliber })}
                        </p>
                        <button type="button" onClick={() => { setCreateProjectile(false); setProjectileId('') }} className="text-sm text-accent hover:text-accent-hover">
                          {t('qlImport.selectExisting')}
                        </button>
                      </div>
                    ) : (
                      <select
                        value={projectileId}
                        onChange={(e) => setProjectileId(e.target.value)}
                        className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm"
                      >
                        <option value="">{t('qlImport.selectExisting')}</option>
                        {projectiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.brand} {p.type} — {p.weightGr} gr {p.caliber}
                          </option>
                        ))}
                      </select>
                    )}
                    {matchedProjectile && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        {t('qlImport.matchFound', { name: `${matchedProjectile.brand} ${matchedProjectile.type} ${matchedProjectile.weightGr}gr` })}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t('qlImport.propellant')}</label>
                    {createPropellant ? (
                      <div className="space-y-2">
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          {t('qlImport.noMatch')}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {t('qlImport.newPropellant', { brand: parsed.propellantBrand, type: parsed.propellantType })}
                        </p>
                        <button type="button" onClick={() => { setCreatePropellant(false); setPropellantId('') }} className="text-sm text-accent hover:text-accent-hover">
                          {t('qlImport.selectExisting')}
                        </button>
                      </div>
                    ) : (
                      <select
                        value={propellantId}
                        onChange={(e) => setPropellantId(e.target.value)}
                        className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 text-sm"
                      >
                        <option value="">{t('qlImport.selectExisting')}</option>
                        {propellants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.brand} {p.type}
                          </option>
                        ))}
                      </select>
                    )}
                    {matchedPropellant && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        {t('qlImport.matchFound', { name: `${matchedPropellant.brand} ${matchedPropellant.type}` })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || (!createProjectile && !projectileId) || (!createPropellant && !propellantId)}
                    className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    {isSaving ? t('qlImport.saving') : t('qlImport.save')}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium"
                  >
                    {t('qlImport.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-400">{label}</label>
      {children}
    </div>
  )
}