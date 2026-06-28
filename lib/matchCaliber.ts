// Fuzzy caliber matching used ONLY when pre-selecting a caliber from an import
// (screenshot / .dat), where QuickLoad's spelling (e.g. "30-06") may differ from
// the canonical designation the user already has (".30-06 Spring"). The user can
// still override the pre-selection in the dropdown, and the server-side
// resolveCaliberId stays an exact case-insensitive find-or-create — so a name a
// user types deliberately is never silently merged.

export interface CaliberLike {
  name: string
}

// Common cartridge-designation suffixes that don't change which cartridge it is.
// Order matters: longer variants first so "Winchester" is removed before "Win".
const SUFFIXES = [
  'springfield', 'spring',
  'winchester', 'win',
  'remington', 'rem',
  'weatherby', 'wby',
  'creedmoor',
  'nato',
  'magnum', 'mag',
  'special', 'spl',
]

/**
 * Reduces a caliber designation to a comparable core: lower-cased, with the
 * common trailing brand/suffix words removed, and all non-alphanumerics dropped.
 * ".30-06 Spring" and "30-06" both become "3006"; ".308 Win" and "308" -> "308".
 */
export function normalizeCaliber(raw: string): string {
  let s = raw.toLowerCase().trim()
  // Remove suffix words wherever they appear (they're never the distinguishing part).
  for (const suf of SUFFIXES) {
    s = s.replace(new RegExp(`\\b${suf}\\b`, 'g'), ' ')
  }
  // Drop everything that isn't a letter or digit (punctuation, spaces).
  return s.replace(/[^a-z0-9]/g, '')
}

/**
 * Given an imported caliber name and the list of existing calibers, returns the
 * best existing canonical name to pre-select, or the original input when there
 * is no confident match (the caller then creates a new caliber).
 *
 * Preference order: exact case-insensitive name match, then normalized-core match.
 */
export function matchExistingCaliber(imported: string, calibers: CaliberLike[]): string {
  if (!imported.trim()) return imported

  const exact = calibers.find((c) => c.name.toLowerCase() === imported.toLowerCase())
  if (exact) return exact.name

  const target = normalizeCaliber(imported)
  if (!target) return imported

  const fuzzy = calibers.find((c) => normalizeCaliber(c.name) === target)
  return fuzzy ? fuzzy.name : imported
}
