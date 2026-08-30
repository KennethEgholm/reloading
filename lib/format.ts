// Deterministic date formatting shared by server and client.
//
// `toLocaleDateString()` with no explicit locale uses the runtime's locale,
// which differs between the server (container) and the browser — producing a
// React hydration mismatch (e.g. server "02/06/2026" vs client "6/2/2026").
// Accepting an explicit locale from the active next-intl request/hook keeps
// server-rendered text matching the client and respects the user's language.
//
// The short formats (`formatDate`, `formatDateTime`) pin day/month/year order
// explicitly: the app's bare "en" locale resolves to en-US in Intl (MM/DD/YYYY),
// but this app consistently shows dates as DD/MM/YYYY regardless of locale.
// Long formats keep full locale rendering (weekday + month names).

const DEFAULT_LOCALE = 'en-GB' // DD/MM/YYYY
const TIME_ZONE = 'Europe/Copenhagen'

// The app's locales are bare subtags ("en", "da"). Intl resolves bare "en"
// to en-US (MM/DD/YYYY), so it is normalized to en-GB to keep every short
// date DD/MM/YYYY. "da" is already day-first (02.06.2026).
function resolveLocale(locale?: string): string {
  if (!locale) return DEFAULT_LOCALE
  return locale === 'en' ? 'en-GB' : locale
}

/** Short numeric date, e.g. "02/06/2026" (always DD/MM/YYYY). */
export function formatDate(
  value: Date | string | number,
  locale?: string
): string {
  return new Date(value).toLocaleDateString(resolveLocale(locale), {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Long date with weekday and month name, e.g. "Tuesday, 2 June 2026". */
export function formatDateLong(
  value: Date | string | number,
  locale?: string
): string {
  return new Date(value).toLocaleDateString(resolveLocale(locale), {
    timeZone: TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Date + time, e.g. "02/06/2026, 14:07" (date part always DD/MM/YYYY). */
export function formatDateTime(
  value: Date | string | number,
  locale?: string
): string {
  return new Date(value).toLocaleString(resolveLocale(locale), {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Compact G1/G7 label, e.g. "G1 0.462 / G7 0.237". Empty string when both are unset. */
export function formatBc(bcG1?: number | null, bcG7?: number | null): string {
  const parts: string[] = []
  if (bcG1 != null) parts.push(`G1 ${bcG1}`)
  if (bcG7 != null) parts.push(`G7 ${bcG7}`)
  return parts.join(' / ')
}

/** Leading-comma suffix for inline labels, e.g. ", G1 0.462". Empty when both unset. */
export function formatBcSuffix(bcG1?: number | null, bcG7?: number | null): string {
  const bc = formatBc(bcG1, bcG7)
  return bc ? `, ${bc}` : ''
}

/** Leading-comma twist label, e.g. ", 1:10". Empty when unset. */
export function formatTwistSuffix(twistIn?: number | null): string {
  return twistIn != null ? `, 1:${twistIn}` : ''
}
