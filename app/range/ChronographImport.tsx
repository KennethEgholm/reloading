'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import readExcelFile from 'read-excel-file/browser'
import {
  parseChronographCsv,
  ChronoCsvError,
  computeAggregates,
  type ParsedShot,
  type ParsedChronograph,
} from '@/lib/parseChronographCsv'
import {
  parseGarminXlsxResult,
  ChronoXlsxError,
  type GarminSheet,
} from '@/lib/parseGarminXlsx'

interface ChronographImportProps {
  onParsed: (shots: ParsedShot[], aggregates: ParsedChronograph) => void
  onRemove: () => void
  isReadOnly: boolean
  existingShots?: ParsedShot[] | null
}

export function ChronographImport({
  onParsed,
  onRemove,
  isReadOnly,
  existingShots,
}: ChronographImportProps) {
  const t = useTranslations('range')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedChronograph | null>(
    existingShots && existingShots.length >= 2
      ? computeAggregates(existingShots)
      : null,
  )
  const [errorHint, setErrorHint] = useState<string | null>(null)

  const handleFile = async (file: File | null) => {
    if (!file) return
    setErrorHint(null)
    const name = file.name.toLowerCase()
    const isXlsx = name.endsWith('.xlsx')
    const isCsv = name.endsWith('.csv')
    try {
      let result: ParsedChronograph
      if (isXlsx) {
        const sheets = (await readExcelFile(file)) as GarminSheet[]
        result = parseGarminXlsxResult(sheets)
      } else if (isCsv) {
        const text = await file.text()
        result = parseChronographCsv(text)
      } else {
        toast.error(t('errors.csvParse'))
        setErrorHint(t('errors.csvParse'))
        return
      }
      setParsed(result)
      onParsed(result.shots, result)
    } catch (e) {
      setParsed(null)
      if (e instanceof ChronoCsvError) {
        const key = `errors.${e.kind === 'header' ? 'csvHeader' : e.kind === 'noShots' ? 'csvNoShots' : 'csvParse'}`
        toast.error(t(key))
        setErrorHint(t(key))
      } else if (e instanceof ChronoXlsxError) {
        const key = `errors.${e.kind === 'header' ? 'xlsxHeader' : e.kind === 'noShots' ? 'xlsxNoShots' : 'xlsxParse'}`
        toast.error(t(key))
        setErrorHint(t(key))
      } else {
        const key = isXlsx ? 'errors.xlsxParse' : 'errors.csvParse'
        toast.error(t(key))
        setErrorHint(t(key))
      }
    }
  }

  const handleRemove = () => {
    setParsed(null)
    setErrorHint(null)
    onRemove()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (isReadOnly) return null

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
      {!isReadOnly && (
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="chrono-csv" className="text-sm font-medium">{t('form.importCsv')}</label>
          <input
            id="chrono-csv"
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            autoComplete="off"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
            disabled={isReadOnly}
            className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-zinc-100 dark:file:bg-zinc-800"
          />
        </div>
      )}

      {errorHint && (
        <p aria-live="polite" className="text-sm text-red-600 dark:text-red-400">{errorHint}</p>
      )}

      {parsed && (
        <div className="space-y-2" aria-live="polite">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('form.csvParsed', { count: parsed.roundsFired })}
            </span>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-sm text-red-500 hover:text-red-600"
              >
                {t('form.removeCsv')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 text-xs">
            <Stat label={t('form.velocityMin')} value={String(parsed.velocityMin)} />
            <Stat label={t('form.velocityMax')} value={String(parsed.velocityMax)} />
            <Stat label={t('form.velocityAvg')} value={String(parsed.velocityAvg)} />
            <Stat label={t('form.velocityES')} value={parsed.extremeSpread.toFixed(1)} />
            <Stat label={t('form.velocitySD')} value={parsed.stdDev.toFixed(1)} />
          </div>

          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium">{t('form.shotTable.header')}</th>
                    <th className="text-right px-3 py-1.5 font-medium">{t('form.shotTable.velocity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.shots.map((s) => (
                    <tr key={s.shotIndex} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-1.5 font-mono">{s.shotIndex}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{s.velocity.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2">
      <div className="text-zinc-500 dark:text-zinc-400 text-[10px]">{label}</div>
      <div className="font-mono font-medium mt-0.5">{value}</div>
    </div>
  )
}