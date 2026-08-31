import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { formatCharge } from '@/lib/ladder'
import { formatBcSuffix, formatTwistSuffix } from '@/lib/format'
import { PrintButton } from '../../../../PrintButton'

export default async function LadderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('ladders')
  const tRecipes = await getTranslations('recipes')
  const ladder = await prisma.ladder.findUnique({
    where: { id },
    include: {
      recipes: {
        include: {
          caliber: true,
          projectile: true,
          propellant: true,
          primer: true,
          cartridge: { include: { caliber: true } },
          rifle: { include: { caliber: true } },
        },
        orderBy: { ladderChargeIndex: 'asc' },
      },
    },
  })
  if (!ladder) notFound()

  const members = [...ladder.recipes].sort((a, b) => {
    if (a.ladderChargeIndex === null && b.ladderChargeIndex === null) return 0
    if (a.ladderChargeIndex === null) return 1
    if (b.ladderChargeIndex === null) return -1
    return a.ladderChargeIndex - b.ladderChargeIndex
  })
  const first = members[0]

  return (
    <div className="max-w-[210mm] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8 print:hidden">
        <Link href={`/recipes/ladders/${id}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('print.back')}
        </Link>
        <PrintButton>{t('page.print')}</PrintButton>
      </div>

      <article className="bg-white text-zinc-950">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{ladder.name}</h1>
        {ladder.notes && (
          <p className="text-sm text-zinc-600 mt-2 whitespace-pre-line">{ladder.notes}</p>
        )}

        {first && (
          <div className="mt-6 text-sm grid grid-cols-2 gap-x-6 gap-y-2">
            <div>
              <span className="text-zinc-500">{tRecipes('table.caliber')}: </span>
              <span className="font-medium">{first.caliber.name}</span>
            </div>
            <div>
              <span className="text-zinc-500">{tRecipes('detail.projectile')}: </span>
              <span className="font-medium">
                {first.projectile.brand} {first.projectile.type} ({first.projectile.weightGr} gr{formatBcSuffix(first.projectile.bcG1, first.projectile.bcG7)}{formatTwistSuffix(first.projectile.preferredTwistIn)})
              </span>
            </div>
            <div>
              <span className="text-zinc-500">{tRecipes('detail.propellant')}: </span>
              <span className="font-medium">{first.propellant.brand} – {first.propellant.type}</span>
            </div>
            <div>
              <span className="text-zinc-500">{tRecipes('detail.primer')}: </span>
              <span className="font-medium">
                {first.primer ? `${first.primer.brand} ${first.primer.type.replace('_', ' ')}` : tRecipes('detail.none')}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">{tRecipes('detail.cartridge')}: </span>
              <span className="font-medium">
                {first.cartridge ? `${first.cartridge.brand} – ${first.cartridge.caliber.name}` : tRecipes('detail.none')}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">{tRecipes('detail.rifle')}: </span>
              <span className="font-medium">
                {first.rifle ? `${first.rifle.name} – ${first.rifle.caliber.name}` : tRecipes('detail.none')}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">{tRecipes('detail.coal')}: </span>
              <span className="font-medium font-mono">{first.coal != null ? `${first.coal}"` : tRecipes('detail.none')}</span>
            </div>
          </div>
        )}

        <table className="w-full text-sm mt-8">
          <thead>
            <tr className="text-left text-zinc-500 border-b-2 border-zinc-900">
              <th className="py-2 pr-3 font-medium w-8">{t('print.step')}</th>
              <th className="py-2 pr-3 font-medium">{t('table.charge')}</th>
              <th className="py-2 pr-3 font-medium">{t('print.measuredV0')}</th>
              <th className="py-2 pr-3 font-medium">{t('print.groupMm')}</th>
              <th className="py-2 font-medium">{t('print.notes')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((recipe) => (
              <tr key={recipe.id} className="border-b border-zinc-300">
                <td className="py-3 pr-3 font-mono text-zinc-500">
                  {recipe.ladderChargeIndex ?? '—'}
                </td>
                <td className="py-3 pr-3 font-mono font-medium whitespace-nowrap">
                  {recipe.chargeGr != null ? `${formatCharge(recipe.chargeGr)} gr` : '—'}
                  {recipe.id === ladder.winningRecipeId ? (
                    <span className="ml-2 text-xs font-sans font-semibold">{t('table.winnerBadge')}</span>
                  ) : null}
                </td>
                <td className="py-3 pr-3">
                  <div className="border-b-2 border-zinc-900 h-7 min-w-[5rem]" />
                </td>
                <td className="py-3 pr-3">
                  <div className="border-b-2 border-zinc-900 h-7 min-w-[4rem]" />
                </td>
                <td className="py-3">
                  <div className="border-b-2 border-zinc-900 h-7" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  )
}
