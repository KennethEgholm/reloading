'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Settings, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { InventoryMenu } from './InventoryMenu'

const LINK_CLASS =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'

export function AppNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/recipes', label: t('recipes'), icon: '/images/recipe.svg' },
    { href: '/logs', label: t('logs'), icon: '/images/log.svg' },
    { href: '/range', label: t('range'), icon: '/images/range.svg' },
    { href: '/factory-ammo', label: t('factoryAmmo'), icon: '/images/factory-ammo.svg' },
  ]

  const inventory = [
    { href: '/primers', label: t('primers'), icon: '/images/primer.svg' },
    { href: '/projectiles', label: t('projectiles'), icon: '/images/projectile.svg' },
    { href: '/propellants', label: t('propellants'), icon: '/images/propellant.svg' },
    { href: '/cartridges', label: t('cartridges'), icon: '/images/cartridge.svg' },
  ]

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="w-full px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/images/logo.svg" alt={t('home')} className="w-9 h-9" width={36} height={36} />
            <span className="font-semibold text-lg tracking-tight">{t('home')}</span>
          </Link>
          <div className="hidden lg:flex items-center gap-1 text-sm">
            <InventoryMenu />
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={LINK_CLASS}>
                <Image src={l.icon} alt="" width={20} height={20} />
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/settings"
          className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
        >
          <Settings size={20} aria-hidden="true" />
          {t('settings')}
        </Link>

        <button
          type="button"
          className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t('closeMenu') : t('openMenu')}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 space-y-1">
          {inventory.map((l) => (
            <Link key={l.href} href={l.href} className={`${LINK_CLASS} text-sm`}>
              <Image src={l.icon} alt="" width={20} height={20} />
              {l.label}
            </Link>
          ))}
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`${LINK_CLASS} text-sm`}>
              <Image src={l.icon} alt="" width={20} height={20} />
              {l.label}
            </Link>
          ))}
          <Link href="/settings" className={`${LINK_CLASS} text-sm`}>
            <Settings size={20} aria-hidden="true" />
            {t('settings')}
          </Link>
        </div>
      )}
    </nav>
  )
}
