'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { TranslationValues } from 'next-intl'
import { toast } from 'sonner'
import {
  exportInventory,
  previewInventoryImport,
  executeInventoryImport,
  exportRecipes,
  previewRecipesImport,
  executeRecipesImport,
  exportLoadLogs,
  previewLoadLogsImport,
  executeLoadLogsImport,
  exportRangeLogs,
  previewRangeLogsImport,
  executeRangeLogsImport,
  exportFactoryAmmo,
  previewFactoryAmmoImport,
  executeFactoryAmmoImport,
  exportEverything,
  type ImportPreview,
  type RecipesImportPreview,
  type LoadLogsImportPreview,
  type RangeLogsImportPreview,
  type FactoryAmmoImportPreview,
} from './dataActions'

type DataType = 'inventory' | 'recipes' | 'loadLogs' | 'rangeLogs' | 'factoryAmmo' | 'everything'

const EXPORTERS: Record<Exclude<DataType, 'everything'>, () => Promise<string>> = {
  inventory: exportInventory,
  recipes: exportRecipes,
  loadLogs: exportLoadLogs,
  rangeLogs: exportRangeLogs,
  factoryAmmo: exportFactoryAmmo,
}

const FILE_PREFIX: Record<Exclude<DataType, 'everything'>, string> = {
  inventory: 'reloading-inventory',
  recipes: 'reloading-recipes',
  loadLogs: 'reloading-loadlogs',
  rangeLogs: 'reloading-rangelogs',
  factoryAmmo: 'reloading-factoryammo',
}

const PREVIEWERS: Record<Exclude<DataType, 'everything'>, (s: string) => Promise<unknown>> = {
  inventory: previewInventoryImport,
  recipes: previewRecipesImport,
  loadLogs: previewLoadLogsImport,
  rangeLogs: previewRangeLogsImport,
  factoryAmmo: previewFactoryAmmoImport,
}

const EXECUTORS: Record<Exclude<DataType, 'everything'>, (s: string) => Promise<unknown>> = {
  inventory: executeInventoryImport,
  recipes: executeRecipesImport,
  loadLogs: executeLoadLogsImport,
  rangeLogs: executeRangeLogsImport,
  factoryAmmo: executeFactoryAmmoImport,
}

export function DataCard() {
  const t = useTranslations('settings')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importType, setImportType] = useState<Exclude<DataType, 'everything'> | null>(null)
  const [jsonString, setJsonString] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreview | RecipesImportPreview | LoadLogsImportPreview | RangeLogsImportPreview | FactoryAmmoImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (type: DataType) => {
    setIsExporting(true)
    try {
      const json = type === 'everything' ? await exportEverything() : await EXPORTERS[type]()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const prefix = type === 'everything' ? 'reloading-full' : FILE_PREFIX[type]
      a.download = `${prefix}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(t('data.export'))
    } catch {
      toast.error(t('data.export'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = async (file: File | null) => {
    if (!file) return
    setError(null)
    setPreview(null)
    setJsonString(null)
    try {
      const text = await file.text()
      // Auto-detect type from file content, then route to the right previewer.
      const detected = detectType(text)
      if (!detected) {
        throw new Error('INVALID_FORMAT')
      }
      const result = await PREVIEWERS[detected](text)
      setImportType(detected)
      setJsonString(text)
      setPreview(result as ImportPreview | RecipesImportPreview | LoadLogsImportPreview | RangeLogsImportPreview | FactoryAmmoImportPreview)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'INVALID_JSON'
      const key = msg === 'NO_DATA' ? 'data.noData' : 'data.invalidFile'
      setError(t(key))
      toast.error(t(key))
    }
  }

  const handleConfirmImport = async () => {
    if (!jsonString || !importType) return
    setIsImporting(true)
    try {
      const result = await EXECUTORS[importType](jsonString)
      const { created, updated } = sumPreview(result as Record<string, { created: number; updated: number }>)
      toast.success(t('data.importSuccess', { created, updated }))
      setJsonString(null)
      setPreview(null)
      setImportType(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      toast.error(t('data.importFailed', { error: msg }))
    } finally {
      setIsImporting(false)
    }
  }

  const handleCancelImport = () => {
    setJsonString(null)
    setPreview(null)
    setError(null)
    setImportType(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold mb-1">{t('data.title')}</h2>

      <div className="space-y-4 mt-4">
        {/* Export section */}
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{t('data.exportHint')}</p>
          <div className="flex flex-wrap gap-2">
            <ExportButton label={t('data.exportInventory')} onClick={() => handleExport('inventory')} disabled={isExporting} />
            <ExportButton label={t('data.exportRecipes')} onClick={() => handleExport('recipes')} disabled={isExporting} />
            <ExportButton label={t('data.exportLoadLogs')} onClick={() => handleExport('loadLogs')} disabled={isExporting} />
            <ExportButton label={t('data.exportRangeLogs')} onClick={() => handleExport('rangeLogs')} disabled={isExporting} />
            <ExportButton label={t('data.exportFactoryAmmo')} onClick={() => handleExport('factoryAmmo')} disabled={isExporting} />
            <ExportButton label={t('data.exportEverything')} onClick={() => handleExport('everything')} disabled={isExporting} />
          </div>
        </div>

        {/* Import section */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{t('data.importHint')}</p>
          <input
            ref={fileInputRef}
            id="data-import"
            type="file"
            accept=".json,application/json"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-zinc-100 dark:file:bg-zinc-800"
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" aria-live="polite">{error}</p>
          )}

          {preview && importType && (
            <div className="mt-3 space-y-2" aria-live="polite">
              <p className="text-sm font-medium">
                {t('data.preview')} — {t(`data.${importType === 'loadLogs' ? 'loadLogs' : importType === 'rangeLogs' ? 'rangeLogs' : importType === 'factoryAmmo' ? 'factoryAmmo' : importType}`)}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {previewRows(preview, t)}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {isImporting ? '...' : t('data.confirm')}
                </button>
                <button
                  type="button"
                  onClick={handleCancelImport}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium"
                >
                  {t('data.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ExportButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
    >
      {label}
    </button>
  )
}

function previewRows(
  preview: ImportPreview | RecipesImportPreview | LoadLogsImportPreview | RangeLogsImportPreview | FactoryAmmoImportPreview,
  t: (k: string, opts?: TranslationValues) => string,
) {
  const rows: React.ReactNode[] = []
  if ('primers' in preview) {
    rows.push(<PreviewRow key="pr" label={t('data.primers')} created={preview.primers.created} updated={preview.primers.updated} t={t} />)
    rows.push(<PreviewRow key="pj" label={t('data.projectiles')} created={preview.projectiles.created} updated={preview.projectiles.updated} t={t} />)
    rows.push(<PreviewRow key="pp" label={t('data.propellants')} created={preview.propellants.created} updated={preview.propellants.updated} t={t} />)
    rows.push(<PreviewRow key="pc" label={t('data.cartridges')} created={preview.cartridges.created} updated={preview.cartridges.updated} t={t} />)
  } else if ('recipes' in preview) {
    rows.push(<PreviewRow key="rc" label={t('data.recipes')} created={preview.recipes.created} updated={preview.recipes.updated} t={t} />)
  } else if ('loadLogs' in preview) {
    rows.push(<PreviewRow key="ll" label={t('data.loadLogs')} created={preview.loadLogs.created} updated={preview.loadLogs.updated} t={t} />)
  } else if ('rangeLogs' in preview) {
    rows.push(<PreviewRow key="rl" label={t('data.rangeLogs')} created={preview.rangeLogs.created} updated={preview.rangeLogs.updated} t={t} />)
  } else if ('factoryAmmo' in preview) {
    rows.push(<PreviewRow key="fa" label={t('data.factoryAmmo')} created={preview.factoryAmmo.created} updated={preview.factoryAmmo.updated} t={t} />)
  }
  return rows
}

function sumPreview(p: Record<string, { created: number; updated: number }>): { created: number; updated: number } {
  let created = 0, updated = 0
  for (const k of Object.keys(p)) {
    created += p[k].created
    updated += p[k].updated
  }
  return { created, updated }
}

function detectType(text: string): Exclude<DataType, 'everything'> | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return null
    if (Array.isArray(parsed.recipes)) return 'recipes'
    if (Array.isArray(parsed.loadLogs)) return 'loadLogs'
    if (Array.isArray(parsed.rangeLogs)) return 'rangeLogs'
    if (Array.isArray(parsed.factoryAmmo)) return 'factoryAmmo'
    if (Array.isArray(parsed.primers) || Array.isArray(parsed.projectiles) || Array.isArray(parsed.propellants) || Array.isArray(parsed.cartridges)) return 'inventory'
    return null
  } catch {
    return null
  }
}

function PreviewRow({ label, created, updated, t }: { label: string; created: number; updated: number; t: (k: string, opts?: TranslationValues) => string }) {
  return (
    <div className="flex items-center justify-between border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2">
      <span>{label}</span>
      <span className="text-xs text-zinc-500">
        {created > 0 && t('data.created', { count: created })} {updated > 0 && t('data.updated', { count: updated })}
      </span>
    </div>
  )
}