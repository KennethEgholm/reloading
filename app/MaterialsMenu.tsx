'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Boxes, ChevronDown } from 'lucide-react'

const MATERIALS = [
  { href: '/primers', label: 'Primers', icon: '/images/primer.svg' },
  { href: '/projectiles', label: 'Projectiles', icon: '/images/projectile.svg' },
  { href: '/propellants', label: 'Propellants', icon: '/images/propellant.svg' },
  { href: '/cartridges', label: 'Cartridges', icon: '/images/cartridge.svg' },
]

export function MaterialsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Boxes size={20} />
        Materials
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-50 min-w-[12rem] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-1"
        >
          {MATERIALS.map((m) => (
            <a
              key={m.href}
              href={m.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Image src={m.icon} alt="" width={20} height={20} />
              {m.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
