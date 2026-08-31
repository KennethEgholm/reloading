// Monthly activity bucketing for the Overview chart.
//
// Pure helpers: turn flat RangeLog (rounds fired) and LoadLog (rounds loaded)
// rows into the last N calendar months, computed in Europe/Copenhagen (the
// same TZ discipline as lib/format.ts) so a session logged at 23:50 local
// lands in the month the user experienced it in, regardless of server TZ.

export const ACTIVITY_MONTHS = 12
const TIME_ZONE = 'Europe/Copenhagen'

export interface ActivityInput {
  date: Date | string
  rounds: number
}

export interface MonthlyActivity {
  /** Year-month key, e.g. "2026-08". */
  key: string
  /** Bucket start (first day of month, midnight local). */
  start: Date
  fired: number
  loaded: number
}

function yearMonthKey(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(value)
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

/** Month bucket starts for the window ending with `reference`'s month (inclusive). */
export function monthWindow(reference: Date = new Date(), months: number = ACTIVITY_MONTHS): Date[] {
  const keys = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  })
    .formatToParts(reference)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type === 'year' || p.type === 'month') acc[p.type] = p.value
      return acc
    }, {})
  const year = Number(keys.year)
  const month = Number(keys.month)

  const buckets: Date[] = []
  for (let i = months - 1; i >= 0; i--) {
    // UTC-based arithmetic keeps the Date object stable; only the *key*
    // derivation cares about Copenhagen, and month starts are identical
    // in UTC and Copenhagen (offset < 1 day).
    const d = new Date(Date.UTC(year, month - 1 - i, 1))
    buckets.push(d)
  }
  return buckets
}

/**
 * Bucket fired + loaded rounds into the last `months` calendar months
 * (Europe/Copenhagen), oldest first. Rows outside the window are ignored.
 */
export function bucketMonthlyActivity(
  fired: ActivityInput[],
  loaded: ActivityInput[],
  reference: Date = new Date(),
  months: number = ACTIVITY_MONTHS,
): MonthlyActivity[] {
  const buckets = monthWindow(reference, months)
  const byKey = new Map<string, MonthlyActivity>(
    buckets.map((start) => [yearMonthKey(start), { key: yearMonthKey(start), start, fired: 0, loaded: 0 }]),
  )

  for (const row of fired) {
    const key = yearMonthKey(new Date(row.date))
    const bucket = byKey.get(key)
    if (bucket) bucket.fired += row.rounds
  }
  for (const row of loaded) {
    const key = yearMonthKey(new Date(row.date))
    const bucket = byKey.get(key)
    if (bucket) bucket.loaded += row.rounds
  }

  return buckets.map((start) => byKey.get(yearMonthKey(start))!)
}