import type { Prisma } from '@prisma/client'

// Result returned by delete Server Actions. We return a result object instead
// of throwing because Next.js redacts thrown Server Action error messages in
// production builds — returning the reason as data keeps it visible to the user.
export type DeleteResult = { ok: true } | { ok: false; error: string };

// Re-export the Prisma model types so components import domain shapes from one
// place rather than typing rows as `any`.
export type {
  Cartridge,
  Primer,
  Projectile,
  Propellant,
  Recipe,
  LoadLog,
  RangeLog,
  RangeLogImage,
} from '@prisma/client'

// A Recipe with its component relations resolved — the shape returned by the
// recipe list/detail queries (which `include` projectile/propellant/primer/
// cartridge) and consumed by RecipeRow / RecipesTable / RecipeForm.
export type RecipeWithRelations = Prisma.RecipeGetPayload<{
  include: {
    projectile: true
    propellant: true
    primer: true
    cartridge: true
  }
}>

// A RangeLog as returned by the list query (`getRangeLogs`): the recipe and
// main image are selected down to a few fields and an images count is added.
export type RangeLogListItem = Prisma.RangeLogGetPayload<{
  include: {
    recipe: { select: { id: true; name: true; caliber: true } }
    mainImage: { select: { id: true; filename: true; description: true } }
    _count: { select: { images: true } }
  }
}>

// A RangeLog as returned by the detail query (`getRangeLogById`): the full set
// of images is included plus the recipe/main-image selections. Consumed as the
// `initialData` of RangeLogForm in edit/view mode.
export type RangeLogWithImages = Prisma.RangeLogGetPayload<{
  include: {
    recipe: { select: { id: true; name: true; caliber: true } }
    mainImage: { select: { id: true; filename: true; description: true } }
    images: true
  }
}>
