/**
 * Load-development ladder helpers.
 *
 * A ladder is N recipes that share every component (projectile, propellant,
 * primer, cartridge, rifle, COAL, notes) and differ only in powder charge.
 * This module holds the pure logic: charge-sequence generation and the
 * per-member statistics aggregation used by the comparison page. Both are
 * unit-tested in lib/ladder.test.ts.
 */

export const LADDER_MIN_STEPS = 2
export const LADDER_MAX_STEPS = 20

/** One generated charge step within a ladder. */
export interface LadderCharge {
  /** 1-based position within the ladder. */
  index: number
  /** Charge weight in grains, rounded to 2 dp to avoid float junk. */
  charge: number
  /** Formatted charge label, e.g. "40.5". */
  label: string
}

/**
 * Formats a charge weight for display: trims trailing zeros but keeps at most
 * 2 decimals ("40" not "40.00", "40.5" not "40.50", "40.25" stays).
 */
export function formatCharge(charge: number): string {
  return charge.toFixed(2).replace(/\.?0+$/, '')
}

/**
 * Generates the charge sequence for a ladder: start, start+step, …
 * start+(count-1)×step. Results are rounded to 2 decimals so decimal steps
 * like 0.3 do not accumulate float junk (40.0 + 0.3×3 must be 40.9, not
 * 40.89999…).
 *
 * Throws on invalid input (count out of range, zero step, non-positive
 * charges). The action layer surfaces these as localized toasts; the form
 * layer pre-validates so the user normally never sees them.
 */
export function generateCharges(
  start: number,
  step: number,
  count: number,
): LadderCharge[] {
  if (!Number.isFinite(start) || !Number.isFinite(step) || !Number.isFinite(count)) {
    throw new Error('Ladder inputs must be finite numbers')
  }
  if (!Number.isInteger(count) || count < LADDER_MIN_STEPS || count > LADDER_MAX_STEPS) {
    throw new Error(`Ladder step count must be an integer between ${LADDER_MIN_STEPS} and ${LADDER_MAX_STEPS}`)
  }
  if (step === 0) {
    throw new Error('Ladder step cannot be zero')
  }
  const round2 = (v: number) => Math.round(v * 100) / 100
  const charges: LadderCharge[] = []
  for (let i = 0; i < count; i++) {
    const charge = round2(start + step * i)
    if (charge <= 0) {
      throw new Error('Ladder charges must be greater than zero')
    }
    charges.push({ index: i + 1, charge, label: formatCharge(charge) })
  }
  return charges
}

/** Raw per-member data passed into the aggregator (all fields optional). */
export interface LadderMemberStats {
  recipeId: string
  chargeGr: number | null
  /** MOA of every accuracy group recorded for this recipe (via its sessions). */
  groupMoas: number[]
  /** velocityAvg of each linked range session (nulls excluded). */
  sessionVelocityAvgs: (number | null)[]
  /** velocityMin of each linked range session (nulls excluded). */
  sessionVelocityMins: (number | null)[]
  /** velocityMax of each linked range session (nulls excluded). */
  sessionVelocityMaxs: (number | null)[]
  /** stdDev of each linked range session (nulls excluded). */
  sessionStdDevs: (number | null)[]
  /** Number of linked range sessions. */
  sessionCount: number
}

/** Aggregated per-member row for the ladder comparison table. */
export interface LadderMemberRow {
  recipeId: string
  chargeGr: number | null
  /** Mean of group MOAs; null when the recipe has no groups. */
  avgMoa: number | null
  /** Smallest group MOA; null when the recipe has no groups. */
  bestMoa: number | null
  /** Mean of session velocityAvg values; null when no session has one. */
  avgVelocity: number | null
  /** max(velocityMax) − min(velocityMin) across sessions; null when incomplete. */
  extremeSpread: number | null
  /** Mean of session stdDev values; null when no session has one. */
  avgStdDev: number | null
  sessionCount: number
}

const round2 = (v: number) => Math.round(v * 100) / 100

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return round2(values.reduce((acc, v) => acc + v, 0) / values.length)
}

/**
 * Aggregates one member's raw stats into the comparison-table row.
 * Pure: no DB, no locale, no formatting beyond 2-dp rounding.
 */
export function aggregateLadderStats(member: LadderMemberStats): LadderMemberRow {
  const mins = member.sessionVelocityMins.filter((v): v is number => v !== null)
  const maxs = member.sessionVelocityMaxs.filter((v): v is number => v !== null)
  const extremeSpread =
    mins.length > 0 && maxs.length > 0
      ? round2(Math.max(...maxs) - Math.min(...mins))
      : null
  return {
    recipeId: member.recipeId,
    chargeGr: member.chargeGr,
    avgMoa: mean(member.groupMoas),
    bestMoa: member.groupMoas.length > 0 ? round2(Math.min(...member.groupMoas)) : null,
    avgVelocity: mean(member.sessionVelocityAvgs.filter((v): v is number => v !== null)),
    extremeSpread,
    avgStdDev: mean(member.sessionStdDevs.filter((v): v is number => v !== null)),
    sessionCount: member.sessionCount,
  }
}

/**
 * A ladder member recipe as loaded by the ladder detail query: the plain
 * recipe row plus its range sessions' velocity aggregates and group MOAs.
 * Kept structural (no Prisma import) so lib/ladder.ts stays pure and
 * unit-testable; getLadder's include shape satisfies it.
 */
export interface LadderMemberRecipe {
  id: string
  chargeGr: number | null
  ladderChargeIndex: number | null
  rangeLogs: Array<{
    velocityMin: number | null
    velocityMax: number | null
    velocityAvg: number | null
    stdDev: number | null
    groups: Array<{ moa: number }>
  }>
}

/**
 * Builds the comparison rows for the ladder detail page: each member recipe
 * paired with its aggregated stats. Pure — the detail page passes the loaded
 * ladder, the page renders the result.
 */
export function buildLadderRows<T extends LadderMemberRecipe>(recipes: T[]) {
  return recipes.map((recipe) => {
    const member: LadderMemberStats = {
      recipeId: recipe.id,
      chargeGr: recipe.chargeGr,
      groupMoas: recipe.rangeLogs.flatMap((r) => r.groups.map((g) => g.moa)),
      sessionVelocityAvgs: recipe.rangeLogs.map((r) => r.velocityAvg),
      sessionVelocityMins: recipe.rangeLogs.map((r) => r.velocityMin),
      sessionVelocityMaxs: recipe.rangeLogs.map((r) => r.velocityMax),
      sessionStdDevs: recipe.rangeLogs.map((r) => r.stdDev),
      sessionCount: recipe.rangeLogs.length,
    }
    return { recipe, ...aggregateLadderStats(member) }
  })
}