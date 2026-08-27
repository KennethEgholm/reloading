import type { Prisma } from '@prisma/client'

// Result returned by delete Server Actions. We return a result object instead
// of throwing because Next.js redacts thrown Server Action error messages in
// production builds — returning the reason as data keeps it visible to the user.
export type DeleteResult = { ok: true } | { ok: false; error: string };

// Re-export the Prisma model types so components import domain shapes from one
// place rather than typing rows as `any`.
export type {
  Caliber,
  Cartridge,
  Primer,
  Projectile,
  Propellant,
  Recipe,
  LoadLog,
  RangeLog,
  RangeLogImage,
  FactoryAmmo,
  FactoryAmmoSession,
  FactoryAmmoShot,
  FactoryAmmoGroup,
} from '@prisma/client'

// A Cartridge with its caliber relation resolved — the shape returned by the
// cartridge list query and consumed by CartridgesTable / CartridgeForm.
export type CartridgeWithCaliber = Prisma.CartridgeGetPayload<{
  include: { caliber: true }
}>

// Minimal Caliber option passed to forms for the caliber dropdown.
export type CaliberOption = { id: string; name: string }

// A Recipe with its component relations resolved — the shape returned by the
// recipe list/detail queries (which `include` projectile/propellant/primer/
// cartridge) and consumed by RecipesTable / RecipeForm.
export type RecipeWithRelations = Prisma.RecipeGetPayload<{
  include: {
    caliber: true
    projectile: true
    propellant: true
    primer: true
    cartridge: { include: { caliber: true } }
  }
}>

// A RangeLog as returned by the list query (`getRangeLogs`): the recipe and
// main image are selected down to a few fields and an images count is added.
export type RangeLogListItem = Prisma.RangeLogGetPayload<{
  include: {
    recipe: { select: { id: true; name: true; caliber: { select: { name: true } } } }
    mainImage: { select: { id: true; filename: true; description: true } }
    _count: { select: { images: true } }
  }
}>

// A RangeLog as returned by the detail query (`getRangeLogById`): the full set
// of images is included plus the recipe/main-image selections. Consumed as the
// `initialData` of RangeLogForm in edit/view mode.
export type RangeLogWithImages = Prisma.RangeLogGetPayload<{
  include: {
    recipe: { select: { id: true; name: true; caliber: { select: { name: true } } } }
    mainImage: { select: { id: true; filename: true; description: true } }
    images: true
    shots: { orderBy: { shotIndex: 'asc' } }
    groups: { orderBy: { createdAt: 'asc' } }
  }
}>

// A FactoryAmmo row with its caliber resolved — the shape returned by the
// factory-ammo list query and consumed by FactoryAmmoTable / FactoryAmmoForm.
// Sessions are included (with shots + groups) so the detail view and the
// "latest session" aggregates on the list can render without a second round-trip.
export type FactoryAmmoWithCaliber = Prisma.FactoryAmmoGetPayload<{
  include: { caliber: true }
}>

export type FactoryAmmoListItem = Prisma.FactoryAmmoGetPayload<{
  include: {
    caliber: true
    sessions: {
      select: {
        id: true
        date: true
        velocityAvg: true
        extremeSpread: true
        stdDev: true
        roundsFired: true
      }
    }
  }
}>

// A FactoryAmmoSession as returned by the detail query: shots + groups included
// and ordered. Consumed as the `initialData` of FactoryAmmoSessionForm.
export type FactoryAmmoSessionWithChildren = Prisma.FactoryAmmoSessionGetPayload<{
  include: {
    shots: { orderBy: { shotIndex: 'asc' } }
    groups: { orderBy: { createdAt: 'asc' } }
    factoryAmmo: { select: { id: true; brand: true; model: true; caliber: { select: { name: true } } } }
  }
}>
