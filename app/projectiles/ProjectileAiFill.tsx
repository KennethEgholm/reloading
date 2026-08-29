'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { projectileNeedsFill } from '@/lib/projectileAi'
import type { Projectile } from '@/lib/types'
import type { ProjectileSuggestionRow } from './actions'

type FieldKey = 'preferredTwistIn' | 'bcG1' | 'bcG7'

interface FieldRow {
  key: string
  id: string
  label: string
  field: FieldKey
  value: number
}

interface ProjectileAiFillProps {
  projectiles: Projectile[]
}

export function ProjectileAiFill({ projectiles }: ProjectileAiFillProps) {
  const t = useTranslations('projectiles')
  const missing = useMemo(() => projectiles.filter(projectileNeedsFill).length, [projectiles])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [model, setModel] = useState<string | null>(null)
  const [rows, setRows] = useState<FieldRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, open)

  const toRows = (suggestions: ProjectileSuggestionRow[]): FieldRow[] => {
    const out: FieldRow[] = []
    for (const s of suggestions) {
      const name = `${s.brand} ${s.type ?? ''} (${s.weightGr} gr ${s.caliber})`.replace(/\s+/g, ' ').trim()
      if (s.preferredTwistIn != null) {
        out.push({ key: `${s.id}:preferredTwistIn`, id: s.id, label: name, field: 'preferredTwistIn', value: s.preferredTwistIn })
      }
      if (s.bcG1 != null) {
        out.push({ key: `${s.id}:bcG1`, id: s.id, label: name, field: 'bcG1', value: s.bcG1 })
      }
      if (s.bcG7 != null) {
        out.push({ key: `${s.id}:bcG7`, id: s.id, label: name, field: 'bcG7', value: s.bcG7 })
      }
    }
    return out
  }

  const run = async () => {
    setLoading(true)
    try {
      const { suggestMissingProjectileFields } = await import('./actions')
      const result = await suggestMissingProjectileFields()
      const next = toRows(result.suggestions)
      if (next.length === 0) {
        toast.success(t('aiFill.nothingToFill'))
        return
      }
      setModel(result.model)
      setRows(next)
      setSelected(new Set(next.map((r) => r.key)))
      setOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('toast.failed'))
    } finally {
      setLoading(false)
    }
  }

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const apply = async () => {
    const chosen = rows.filter((r) => selected.has(r.key))
    if (chosen.length === 0) {
      toast.error(t('aiFill.noneSelected'))
      return
    }
    const byId = new Map<string, { id: string; preferredTwistIn: number | null; bcG1: number | null; bcG7: number | null }>()
    for (const r of chosen) {
      const cur = byId.get(r.id) ?? { id: r.id, preferredTwistIn: null, bcG1: null, bcG7: null }
      cur[r.field] = r.value
      byId.set(r.id, cur)
    }
    setApplying(true)
    try {
      const { applyProjectileSuggestions } = await import('./actions')
      const result = await applyProjectileSuggestions([...byId.values()])
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(t('aiFill.applied', { count: result.updated }))
      setOpen(false)
      setRows([])
    } catch {
      toast.error(t('toast.failed'))
    } finally {
      setApplying(false)
    }
  }

  const fieldLabel = (field: FieldKey) => {
    if (field === 'preferredTwistIn') return t('table.preferredTwist')
    if (field === 'bcG1') return t('table.bcG1')
    return t('table.bcG7')
  }

  const formatValue = (field: FieldKey, value: number) =>
    field === 'preferredTwistIn' ? `1:${value}` : String(value)

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={loading || missing === 0}
        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        {loading ? t('aiFill.running') : t('aiFill.button')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="projectile-ai-fill-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800"
          >
            <h2 id="projectile-ai-fill-title" className="text-xl font-semibold mb-2">{t('aiFill.title')}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {t('aiFill.disclaimer')}
              {model ? ` · ${model}` : ''}
            </p>

            <table className="w-full text-sm mb-6">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="w-10 py-2"></th>
                  <th className="text-left py-2 font-medium">{t('aiFill.projectile')}</th>
                  <th className="text-left py-2 font-medium">{t('aiFill.field')}</th>
                  <th className="text-right py-2 font-medium">{t('aiFill.suggested')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(r.key)}
                        onChange={() => toggle(r.key)}
                        aria-label={t('aiFill.accept')}
                      />
                    </td>
                    <td className="py-2 pr-3">{r.label}</td>
                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">{fieldLabel(r.field)}</td>
                    <td className="py-2 text-right font-mono">{formatValue(r.field, r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm"
              >
                {t('form.cancel')}
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={applying || selected.size === 0}
                className="flex-1 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {applying ? t('aiFill.applying') : t('aiFill.apply')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
