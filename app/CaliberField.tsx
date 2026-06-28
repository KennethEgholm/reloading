'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { CaliberOption } from '@/lib/types'

const ADD_NEW = '__add_new__'

interface CaliberFieldProps {
  /** Current caliber NAME (the resolver turns it into a Caliber row server-side). */
  value: string
  onChange: (name: string) => void
  calibers: CaliberOption[]
  id?: string
  describedBy?: string
  className?: string
}

/**
 * Caliber picker: a dropdown of existing calibers plus an "Add new…" choice that
 * reveals a free-text input. The committed value is always a caliber NAME string,
 * so consumers (forms, import modals) keep submitting `caliber` as text and the
 * server's resolveCaliberId find-or-creates the Caliber row. This keeps inline
 * creation working without a separate management screen.
 */
export function CaliberField({ value, onChange, calibers, id, describedBy, className }: CaliberFieldProps) {
  const t = useTranslations('calibers')

  // "Adding" mode is on when the current value isn't one of the known calibers
  // (covers a freshly-typed name and the explicit Add-new choice).
  const knownNames = calibers.map((c) => c.name)
  const [adding, setAdding] = useState(value !== '' && !knownNames.includes(value))

  const selectClass =
    className ?? 'w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950'

  if (adding) {
    return (
      <div className="space-y-2">
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('addPlaceholder')}
          className={selectClass}
        />
        {calibers.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              onChange('')
            }}
            className="text-sm text-accent hover:text-accent-hover"
          >
            {t('chooseExisting')}
          </button>
        )}
      </div>
    )
  }

  return (
    <select
      id={id}
      autoComplete="off"
      aria-describedby={describedBy}
      value={knownNames.includes(value) ? value : ''}
      onChange={(e) => {
        if (e.target.value === ADD_NEW) {
          setAdding(true)
          onChange('')
        } else {
          onChange(e.target.value)
        }
      }}
      className={selectClass}
    >
      <option value="">{t('selectPlaceholder')}</option>
      {calibers.map((c) => (
        <option key={c.id} value={c.name}>
          {c.name}
        </option>
      ))}
      <option value={ADD_NEW}>{t('addNew')}</option>
    </select>
  )
}
