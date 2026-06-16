// Deterministic date formatting shared by server and client.
//
// `toLocaleDateString()` with no explicit locale uses the runtime's locale,
// which differs between the server (container) and the browser — producing a
// React hydration mismatch (e.g. server "02/06/2026" vs client "6/2/2026").
// Accepting an explicit locale from the active next-intl request/hook keeps
// server-rendered text matching the client and respects the user's language.

const DEFAULT_LOCALE = 'en-GB' // DD/MM/YYYY

function resolveLocale(locale?: string): string {
  return locale || DEFAULT_LOCALE
}

/** Short numeric date, e.g. "02/06/2026". */
export function formatDate(
  value: Date | string | number,
  locale?: string
): string {
  return new Date(value).toLocaleDateString(resolveLocale(locale))
}

/** Long date with weekday and month name, e.g. "Tuesday, 2 June 2026". */
export function formatDateLong(
  value: Date | string | number,
  locale?: string
): string {
  return new Date(value).toLocaleDateString(resolveLocale(locale), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Date + time, e.g. "02/06/2026, 14:07". */
export function formatDateTime(
  value: Date | string | number,
  locale?: string
): string {
  return new Date(value).toLocaleString(resolveLocale(locale))
}
