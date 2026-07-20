import { z } from 'zod'
import { PrimerType, WeightUnit } from '@prisma/client'

type Translator = (key: string) => string

/**
 * Formats a Zod safeParse error into a newline-joined message for surfacing as
 * a thrown Server Action error (rendered as a toast). Mirrors the inline format
 * already used by the range actions.
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n')
}

/**
 * Coerces an empty/whitespace-only FormData value to undefined so optional
 * numeric fields validate as "absent" rather than failing z.coerce.number()
 * (which would turn '' into 0). Use as a preprocess step on optional numbers.
 */
const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v

/**
 * Shared Zod schemas for the trust boundary in Server Actions.
 *
 * Keep these in sync with the corresponding forms. They deliberately use
 * z.coerce or raw string parsing for FormData values rather than trying to
 * share RHF schemas (RHF operates on objects; actions operate on FormData).
 *
 * Error messages are supplied by a translation function so validation failures
 * are surfaced in the user's active locale.
 */

export function createRangeLogInputSchema(t: (key: string) => string) {
  return z.object({
    date: z.string().min(1, t('range.errors.validation.dateRequired')),
    location: z.string().nullish(),
    conditions: z.string().nullish(),
    recipeId: z.string().min(1, t('range.errors.validation.recipeRequired')),
    roundsFired: z.coerce.number().int().min(1, t('range.errors.validation.roundsFiredMin')),
    velocityMin: z.coerce.number().min(0, t('range.errors.validation.velocityMinPositive')).nullish(),
    velocityMax: z.coerce.number().min(0, t('range.errors.validation.velocityMaxPositive')).nullish(),
    velocityAvg: z.coerce.number().min(0, t('range.errors.validation.velocityAvgPositive')).nullish(),
    extremeSpread: z.coerce.number().min(0, t('range.errors.validation.extremeSpreadPositive')).nullish(),
    stdDev: z.coerce.number().min(0, t('range.errors.validation.stdDevPositive')).nullish(),
    notes: z.string().nullish(),
  })
}

export type RangeLogInput = z.infer<ReturnType<typeof createRangeLogInputSchema>>

export function createRangeLogUpdateInputSchema(t: (key: string) => string) {
  const base = createRangeLogInputSchema(t)
  return base.extend({
    recipeId: z.string().nullish(),
    mainImageId: z.string().nullish(),
  })
}

export type RangeLogUpdateInput = z.infer<ReturnType<typeof createRangeLogUpdateInputSchema>>

// --- Inventory + load-log schemas (the Server Action trust boundary) ---------
//
// These re-use the granular `<entity>.form.validation.*` message keys that the
// client RHF forms already reference, so server-side errors are worded
// identically and localized. Numeric coercion replaces the previous hand-rolled
// parseFloat/parseInt + isNaN handling, which silently accepted "12abc" as 12
// and left negative amounts unguarded.

export function createCartridgeSchema(t: Translator) {
  return z.object({
    brand: z.string().trim().min(1, t('form.validation.brandRequired')),
    caliber: z.string().trim().min(1, t('form.validation.caliberRequired')),
    waterCapacityGr: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0, t('form.validation.capacityNegative')).optional(),
    ).transform((v) => v ?? null),
    amount: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0, t('form.validation.amountNegative')).default(0),
    ),
    description: z.string().nullish().transform((v) => v?.trim() || null),
  })
}

export function createProjectileSchema(t: Translator) {
  return z.object({
    brand: z.string().trim().min(1, t('form.validation.brandRequired')),
    type: z.string().trim().min(1, t('form.validation.typeRequired')),
    weightGr: z.coerce.number().positive(t('form.validation.weightPositive')),
    caliber: z.string().trim().min(1, t('form.validation.caliberRequired')),
    amount: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0, t('form.validation.amountNegative')).default(0),
    ),
    description: z.string().nullish().transform((v) => v?.trim() || null),
  })
}

export function createPrimerSchema(t: Translator) {
  return z.object({
    brand: z.string().trim().min(1, t('form.validation.brandRequired')),
    type: z.nativeEnum(PrimerType, { message: t('form.validation.typeRequired') }),
    magnum: z.preprocess((v) => v === 'on' || v === true, z.boolean()),
    amount: z.coerce.number().int().min(0, t('form.validation.amountNegative')),
    description: z.string().nullish().transform((v) => v?.trim() || null),
  })
}

export function createPropellantSchema(t: Translator) {
  return z.object({
    brand: z.string().trim().min(1, t('form.validation.brandRequired')),
    type: z.string().trim().min(1, t('form.validation.typeRequired')),
    amountGr: z.coerce.number().min(0, t('form.validation.amountNegative')),
    description: z.string().nullish().transform((v) => v?.trim() || null),
  })
}

export function createLoadLogSchema(t: Translator) {
  return z.object({
    recipeId: z.string().min(1, t('errors.recipeRequired')),
    quantity: z.coerce.number().int().min(1, t('errors.recipeRequired')),
    date: z.string().nullish(),
    notes: z.string().nullish().transform((v) => v?.trim() || null),
  })
}

/**
 * Validates the JSON `shots` array sent from the chronograph CSV importer.
 * Structural check (no translator) — errors surface as a generic toast.
 * Mirrors the parser's ≥2-shots rule and rejects non-finite / non-positive
 * velocities so a garbled client payload can never reach the DB.
 */
export const shotsSchema = z
  .array(
    z.object({
      shotIndex: z.number().int().min(1),
      velocity: z.number().finite().positive(),
    }),
  )
  .min(2)

/**
 * Validates the JSON `groups` array sent from the accuracy-groups section of
 * RangeLogForm. Each entry is one measured target group: distance in meters,
 * shot count, and extreme spread in millimeters. The server action recomputes
 * MOA from the validated values (never trusts a client-submitted `moa`).
 *
 * Unlike `shotsSchema`, an empty array IS allowed — accuracy groups are
 * optional; a session can have zero groups (e.g. a chronograph-only session).
 */
export const groupsSchema = z.array(
  z.object({
    distanceM: z.number().finite().positive(),
    shotCount: z.number().int().positive(),
    groupSizeMm: z.number().finite().min(0),
    notes: z.string().nullish().transform((v) => v?.trim() || null),
  }),
)

// ──────────────────────────────────────────────────────────────────────────
// Factory ammo schemas
//
// Factory ammo is a parallel domain to range sessions for store-bought ammo.
// The parent has no recipe/components (no snapshot machinery), and its `amount`
// is hand-edited (no transactional deduction). Sessions reuse shotsSchema +
// groupsSchema (above) and the same aggregate-recompute path as range logs.
// ──────────────────────────────────────────────────────────────────────────

export function createFactoryAmmoSchema(t: Translator) {
  return z.object({
    brand: z.string().trim().min(1, t('form.validation.brandRequired')),
    model: z.string().trim().min(1, t('form.validation.modelRequired')),
    caliber: z.string().trim().min(1, t('form.validation.caliberRequired')),
    amount: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0, t('form.validation.amountNegative')).default(0),
    ),
    projectileWeight: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0, t('form.validation.weightNegative')).optional(),
    ).transform((v) => v ?? null),
    projectileWeightUnit: z.nativeEnum(WeightUnit, { message: t('form.validation.unitRequired') }).default(WeightUnit.GR),
    notes: z.string().nullish().transform((v) => v?.trim() || null),
  })
}

export type FactoryAmmoInput = z.infer<ReturnType<typeof createFactoryAmmoSchema>>

export function createFactoryAmmoSessionSchema(t: (key: string) => string) {
  return z.object({
    date: z.string().min(1, t('errors.validation.dateRequired')),
    location: z.string().nullish(),
    conditions: z.string().nullish(),
    roundsFired: z.coerce.number().int().min(1, t('errors.validation.roundsFiredMin')),
    velocityMin: z.coerce.number().min(0, t('errors.validation.velocityMinPositive')).nullish(),
    velocityMax: z.coerce.number().min(0, t('errors.validation.velocityMaxPositive')).nullish(),
    velocityAvg: z.coerce.number().min(0, t('errors.validation.velocityAvgPositive')).nullish(),
    extremeSpread: z.coerce.number().min(0, t('errors.validation.extremeSpreadPositive')).nullish(),
    stdDev: z.coerce.number().min(0, t('errors.validation.stdDevPositive')).nullish(),
    notes: z.string().nullish(),
  })
}

export type FactoryAmmoSessionInput = z.infer<ReturnType<typeof createFactoryAmmoSessionSchema>>
