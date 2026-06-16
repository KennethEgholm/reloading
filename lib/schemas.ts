import { z } from 'zod'

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
