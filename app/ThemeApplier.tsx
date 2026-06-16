'use client'

import { useEffect } from 'react'

/**
 * Re-applies the saved theme on every page after hydration.
 *
 * The inline script in layout.tsx sets the `.dark` class before first paint to
 * avoid a flash, but React controls the `<html>` className (font + base classes)
 * and reconciliation can drop the script-added `.dark` class after hydration.
 * The settings page happened to look right only because ThemeToggle touches the
 * class; every other page had nothing re-applying it. This component, mounted in
 * the root layout, guarantees the class is restored on all pages.
 */
export function ThemeApplier() {
  useEffect(() => {
    const apply = () => {
      try {
        const t = localStorage.getItem('theme') || 'system'
        const dark =
          t === 'dark' ||
          (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.toggle('dark', dark)
        // Accent theme is orthogonal to light/dark; re-apply it here too so it
        // survives React reconciliation of the <html> attributes after hydration.
        const accent = localStorage.getItem('accent') || 'copper'
        document.documentElement.setAttribute('data-theme', accent)
      } catch {
        // ignore (e.g. storage blocked)
      }
    }

    apply()

    // Keep in sync with the OS while in "system" mode, and with the accent
    // chosen in another tab (the storage event fires only in other tabs).
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    window.addEventListener('storage', apply)
    return () => {
      mq.removeEventListener('change', apply)
      window.removeEventListener('storage', apply)
    }
  }, [])

  return null
}
