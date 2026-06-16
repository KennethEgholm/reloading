'use client'

import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'

type Accent = 'copper' | 'brass' | 'field'

const ACCENT_KEY = 'accent'
const DEFAULT_ACCENT: Accent = 'copper'

// Swatch colors shown in the picker (the light-mode accent for each theme).
const ACCENTS: { value: Accent; swatch: string }[] = [
  { value: 'copper', swatch: '#c2410c' },
  { value: 'brass', swatch: '#b45309' },
  { value: 'field', swatch: '#4d7c0f' },
]

// Mirrors ThemeToggle: the chosen accent lives in localStorage (an external
// store) read via useSyncExternalStore, so the server/first-render snapshot
// matches the pre-paint script in layout.tsx (no hydration mismatch) and the
// stored value applies right after hydration.
const accentListeners = new Set<() => void>()

function readStoredAccent(): Accent {
  try {
    return (localStorage.getItem(ACCENT_KEY) as Accent | null) ?? DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

function writeStoredAccent(value: Accent) {
  try {
    localStorage.setItem(ACCENT_KEY, value)
  } catch {
    // ignore storage errors (e.g. private mode)
  }
  // Notify same-tab subscribers (the storage event only fires in other tabs).
  accentListeners.forEach((l) => l())
}

function subscribeToAccent(callback: () => void) {
  accentListeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    accentListeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

/** Applies the accent by setting the data-theme attribute the CSS keys off. */
function applyAccent(accent: Accent) {
  document.documentElement.setAttribute('data-theme', accent)
}

export function ThemePicker() {
  const t = useTranslations('settings')

  const accent = useSyncExternalStore(
    subscribeToAccent,
    readStoredAccent,
    () => DEFAULT_ACCENT,
  )

  const select = (value: Accent) => {
    writeStoredAccent(value)
    applyAccent(value)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ACCENTS.map(({ value, swatch }) => {
        const active = accent === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => select(value)}
            aria-pressed={active}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              active
                ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800'
                : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: swatch }}
            >
              {active && <Check size={12} className="text-white" />}
            </span>
            {t(`page.theme.accents.${value}`)}
          </button>
        )
      })}
    </div>
  )
}
