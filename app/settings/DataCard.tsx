'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { TranslationValues } from 'next-intl'
import { toast } from 'sonner'
import { exportInventory, previewInventoryImport, executeInventoryImport, type ImportPreview } from './dataActions'

export function DataCard() {
  const t = useTranslations('settings')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [jsonString, setJsonString] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const json = await exportInventory()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reloading-inventory-${new Date().toISOString().split('T')[0]}.json`
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
      const result = await previewInventoryImport(text)
      setJsonString(text)
      setPreview(result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'INVALID_JSON'
      const key = msg === 'NO_DATA' ? 'data.noData' : 'data.invalidFile'
      setError(t(key))
      toast.error(t(key))
    }
  }

  const handleConfirmImport = async () => {
    if (!jsonString) return
    setIsImporting(true)
    try {
      const result = await executeInventoryImport(jsonString)
      const created = result.primers.created + result.projectiles.created + result.propellants.created + result.cartridges.created
      const updated = result.primers.updated + result.projectiles.updated + result.propellants.updated + result.cartridges.updated
      toast.success(t('data.importSuccess', { created, updated }))
      setJsonString(null)
      setPreview(null)
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const totalCreated = preview ? preview.primers.created + preview.projectiles.created + preview.propellants.created + preview.cartridges.created : 0
  const totalUpdated = preview ? preview.primers.updated + preview.projectiles.updated + preview.propellants.updated + preview.cartridges.updated : 0

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold mb-1">{t('data.title')}</h2>

      <div className="space-y-4 mt-4">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{t('data.exportHint')}</p>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {isExporting ? t('data.export') + '...' : t('data.export')}
          </button>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{t('data.importHint')}</p>
          <input
            ref={fileInputRef}
            id="inventory-import"
            type="file"
            accept=".json,application/json"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-zinc-100 dark:file:bg-zinc-800"
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2" aria-live="polite">{error}</p>
          )}

          {preview && (
            <div className="mt-3 space-y-2" aria-live="polite">
              <p className="text-sm font-medium">{t('data.preview')}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <PreviewRow label={t('data.primers')} created={preview.primers.created} updated={preview.primers.updated} t={t} />
                <PreviewRow label={t('data.projectiles')} created={preview.projectiles.created} updated={preview.projectiles.updated} t={t} />
                <PreviewRow label={t('data.propellants')} created={preview.propellants.created} updated={preview.propellants.updated} t={t} />
                <PreviewRow label={t('data.cartridges')} created={preview.cartridges.created} updated={preview.cartridges.updated} t={t} />
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