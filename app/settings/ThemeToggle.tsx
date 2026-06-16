'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Sun, Moon, Monitor } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const t = useTranslations('settings')

  const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: t('page.theme.light'), icon: Sun },
    { value: 'dark', label: t('page.theme.dark'), icon: Moon },
    { value: 'system', label: t('page.theme.system'), icon: Monitor },
  ]

  /** Resolves a theme preference to whether the dark class should be on, and applies it. */
  function applyTheme(theme: Theme) {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  }

  // Default 'system' on the server / first render; corrected from localStorage on mount.
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme | null) ?? 'system'
    setTheme(saved)
  }, [])

  // When following the system, re-apply if the OS preference changes live.
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const select = (value: Theme) => {
    setTheme(value)
    try {
      localStorage.setItem('theme', value)
    } catch {
      // ignore storage errors (e.g. private mode)
    }
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
