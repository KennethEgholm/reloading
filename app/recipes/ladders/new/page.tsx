import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { LadderForm, type LadderPrefill } from '../LadderForm'

export default async function NewLadderPage({
  searchParams,
}: {
  searchParams: Promise<{ recipeId?: string }>
}) {
  const { recipeId } = await searchParams
  const t = await getTranslations('ladders')
  const [projectiles, propellants, primers, cartridges, rifles, calibers, recipe] = await Promise.all([
    prisma.projectile.findMany({ orderBy: { brand: 'asc' } }),
    prisma.propellant.findMany({ orderBy: { brand: 'asc' } }),
    prisma.primer.findMany({ orderBy: { brand: 'asc' } }),
    prisma.cartridge.findMany({ include: { caliber: true }, orderBy: { brand: 'asc' } }),
    prisma.rifle.findMany({ include: { caliber: true }, orderBy: { name: 'asc' } }),
    prisma.caliber.findMany({ orderBy: { name: 'asc' } }),
    recipeId
      ? prisma.recipe.findUnique({
          where: { id: recipeId },
          include: { caliber: { select: { name: true } } },
        })
      : Promise.resolve(null),
  ])

  const prefill: LadderPrefill | null = recipe
    ? {
        id: recipe.id,
        name: recipe.name,
        caliber: recipe.caliber.name,
        projectileId: recipe.projectileId,
        propellantId: recipe.propellantId,
        primerId: recipe.primerId,
        cartridgeId: recipe.cartridgeId,
        rifleId: recipe.rifleId,
        coal: recipe.coal,
        chargeGr: recipe.chargeGr,
      }
    : null

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <Link href="/recipes" className="text-accent hover:text-accent-hover text-sm">
          ← {t('page.backToRecipes')}
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-2">{t('page.titleNew')}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">{t('page.subtitleNew')}</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
        <LadderForm
          projectiles={projectiles.map((p) => ({ id: p.id, brand: p.brand, type: p.type, weightGr: p.weightGr }))}
          propellants={propellants}
          primers={primers}
          cartridges={cartridges}
          rifles={rifles}
          calibers={calibers}
          prefill={prefill}
        />
      </div>
    </div>
  )
}