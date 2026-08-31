import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getRecipeById } from '../../actions'
import { PrintButton } from '../../../PrintButton'
import { PrintWriteIn } from '../../../PrintWriteIn'
import { formatBcSuffix, formatTwistSuffix } from '@/lib/format'

export default async function RecipePrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations('recipes')
  const recipe = await getRecipeById(id)
  if (!recipe) notFound()

  return (
    <div className="max-w-[210mm] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8 print:hidden">
        <Link href={`/recipes/${id}`} className="text-sm text-accent hover:text-accent-hover hover:underline">
          {t('print.back')}
        </Link>
        <PrintButton>{t('detail.print')}</PrintButton>
      </div>

      <article className="bg-white text-zinc-950">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{recipe.name}</h1>
        <p className="text-lg text-zinc-600 mt-1">{recipe.caliber.name}</p>

        <div className="grid grid-cols-2 gap-8 mt-10">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">{t('detail.charge')}</div>
            <div className="font-mono font-semibold text-5xl mt-1">
              {recipe.chargeGr != null ? `${recipe.chargeGr} gr` : t('detail.none')}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">{t('detail.coal')}</div>
            <div className="font-mono font-semibold text-5xl mt-1">
              {recipe.coal != null ? `${recipe.coal}"` : t('detail.none')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-10 text-sm">
          <div>
            <div className="text-zinc-500">{t('detail.projectile')}</div>
            <div className="font-medium mt-0.5">
              {recipe.projectile.brand} {recipe.projectile.type} ({recipe.projectile.weightGr} gr{formatBcSuffix(recipe.projectile.bcG1, recipe.projectile.bcG7)}{formatTwistSuffix(recipe.projectile.preferredTwistIn)})
            </div>
          </div>
          <div>
            <div className="text-zinc-500">{t('detail.propellant')}</div>
            <div className="font-medium mt-0.5">
              {recipe.propellant.brand} – {recipe.propellant.type}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">{t('detail.primer')}</div>
            <div className="font-medium mt-0.5">
              {recipe.primer ? `${recipe.primer.brand} ${recipe.primer.type.replace('_', ' ')}` : t('detail.none')}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">{t('detail.cartridge')}</div>
            <div className="font-medium mt-0.5">
              {recipe.cartridge
                ? `${recipe.cartridge.brand} ${recipe.cartridge.caliber.name}${recipe.cartridge.waterCapacityGr != null ? ` (${recipe.cartridge.waterCapacityGr} gr H₂O)` : ''}`
                : t('detail.none')}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">{t('detail.rifle')}</div>
            <div className="font-medium mt-0.5">
              {recipe.rifle ? `${recipe.rifle.name} (${recipe.rifle.caliber.name})` : t('detail.none')}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">{t('detail.fillRate')}</div>
            <div className="font-medium font-mono mt-0.5">
              {recipe.fillRate != null ? `${recipe.fillRate}%` : t('detail.none')}
            </div>
          </div>
        </div>

        <PrintWriteIn label={t('print.measuredV0')} className="mt-12 max-w-sm" />

        {recipe.notes && (
          <div className="mt-8">
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{t('detail.notes')}</div>
            <p className="text-sm whitespace-pre-wrap">{recipe.notes}</p>
          </div>
        )}
      </article>
    </div>
  )
}
