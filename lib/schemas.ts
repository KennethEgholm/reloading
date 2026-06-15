import { z } from 'zod'

/**
 * Shared Zod schemas for the trust boundary in Server Actions.
 *
 * Keep these in sync with the corresponding forms. They deliberately use
 * z.coerce or raw string parsing for FormData values rather than trying to
 * share RHF schemas (RHF operates on objects; actions operate on FormData).
 */

export const rangeLogInputSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  location: z.string().nullish(),
  conditions: z.string().nullish(),
  recipeId: z.string().min(1, 'Recipe is required'),
  roundsFired: z.coerce.number().int().min(1, 'Rounds fired must be at least 1'),
  velocityMin: z.coerce.number().min(0).nullish(),
  velocityMax: z.coerce.number().min(0).nullish(),
  velocityAvg: z.coerce.number().min(0).nullish(),
  extremeSpread: z.coerce.number().min(0).nullish(),
  stdDev: z.coerce.number().min(0).nullish(),
  notes: z.string().nullish(),
})

export type RangeLogInput = z.infer<typeof rangeLogInputSchema>

const recipeIdRefinement = z.string().min(1).nullish()

export const rangeLogUpdateInputSchema = rangeLogInputSchema.extend({
  recipeId: recipeIdRefinement,
  mainImageId: z.string().nullish(),
})

export type RangeLogUpdateInput = z.infer<typeof rangeLogUpdateInputSchema>
