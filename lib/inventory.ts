// Pure inventory math shared across the app.

/** Grains-to-grams conversion. Propellant stock is held in grams; charges in grains. */
export const GRAIN_TO_GRAM = 0.06479891

/** Minimal shape needed to compute possible loads — a subset of a Recipe + its relations. */
export interface PossibleLoadsRecipe {
  chargeGr?: number | null
  projectile?: { amount?: number | null } | null
  propellant?: { amountGr?: number | null } | null
  primer?: { amount?: number | null } | null
}

/**
 * How many complete rounds can currently be made from on-hand inventory,
 * limited by the scarcest component: projectiles, propellant (grams ÷ charge),
 * and primer (when the recipe uses one).
 *
 * The projectile count always constrains the result (a recipe requires a
 * projectile and an absent amount defaults to 0), so in practice this returns a
 * number, not null — a present-but-exhausted component yields 0. The null
 * branch is retained defensively for the theoretical all-unconstrained case.
 */
export function getPossibleLoads(recipe: PossibleLoadsRecipe): number | null {
  const projAmount = recipe.projectile?.amount ?? 0
  const powderGrams = recipe.propellant?.amountGr ?? 0
  const chargeGr = recipe.chargeGr ?? 0

  let fromPowder = Infinity
  if (chargeGr > 0 && powderGrams > 0) {
    const gramsPerLoad = chargeGr * GRAIN_TO_GRAM
    fromPowder = Math.floor(powderGrams / gramsPerLoad)
  }

  const fromProjectile = projAmount

  let fromPrimer = Infinity
  if (recipe.primer) {
    fromPrimer = recipe.primer.amount ?? 0
  }

  const min = Math.min(fromProjectile, fromPowder, fromPrimer)
  return min === Infinity ? null : Math.max(0, min)
}
