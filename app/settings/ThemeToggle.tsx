'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'theme'

// The saved theme lives in localStorage (an external store). We read it via
// useSyncExternalStore rather than syncing into state inside an effect: that
// keeps the server/first-render snapshot at 'system' (matching the pre-paint
// script in layout.tsx, so no hydration mismatch) and switches to the saved
// value right after hydration — without a synchronous setState in an effect.
const themeListeners = new Set<() => void>()

function readStoredTheme(): Theme {
  try {
    return (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'system'
  } catch {
    return 'system'
  }
}

function writeStoredTheme(value: Theme) {
  try {
    localStorage.setItem(THEME_KEY, value)
  } catch {
    // ignore storage errors (e.g. private mode)
  }
  // Notify same-tab subscribers (the storage event only fires in other tabs).
  themeListeners.forEach((l) => l())
}

function subscribeToTheme(callback: () => void) {
  themeListeners.add(callback)
  window.addEventListener('storage', callback)
  return () => {
    themeListeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

/** Resolves a theme preference to whether the dark class should be on, and applies it. */
function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

export function ThemeToggle() {
  const t = useTranslations('settings')

  const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: t('page.theme.light'), icon: Sun },
    { value: 'dark', label: t('page.theme.dark'), icon: Moon },
    { value: 'system', label: t('page.theme.system'), icon: Monitor },
  ]

  const theme = useSyncExternalStore(subscribeToTheme, readStoredTheme, () => 'system')

  // When following the system, re-apply if the OS preference changes live.
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const select = (value: Theme) => {
    writeStoredTheme(value)
    applyTheme(value)
  }

  return (
    <div className="inline-flex rounded-xl border border-zinc-300 dark:border-zinc-700 p-1 bg-white dark:bg-zinc-950">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => select(value)}
            aria-pressed={active}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
