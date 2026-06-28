'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { chatCompletion, visionCompletion, parseJsonFromModel, DEFAULT_BASE_URLS, AiError } from '@/lib/ai'
import { getImageMimeType } from '@/lib/imageType'
import { resolveCaliberId } from '@/lib/resolveCaliber'
import type { ParsedQuickLoad } from '@/lib/parseQuickLoadDat'
import type { DeleteResult } from '@/lib/types'

const MAX_IMPORT_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

export async function createRecipe(formData: FormData) {
  const t = await getTranslations('recipes')
  const name = formData.get('name') as string
  const caliber = formData.get('caliber') as string
  const projectileId = formData.get('projectileId') as string
  const propellantId = formData.get('propellantId') as string
  const primerId = (formData.get('primerId') as string) || null
  const cartridgeId = (formData.get('cartridgeId') as string) || null
  const chargeGr = formData.get('chargeGr') ? parseFloat(formData.get('chargeGr') as string) : null
  const coal = formData.get('coal') ? parseFloat(formData.get('coal') as string) : null
  const calculatedV0 = formData.get('calculatedV0') ? parseFloat(formData.get('calculatedV0') as string) : null
  const measuredV0 = formData.get('measuredV0') ? parseFloat(formData.get('measuredV0') as string) : null
  const fillRate = formData.get('fillRate') ? parseFloat(formData.get('fillRate') as string) : null
  const notes = (formData.get('notes') as string) || null

  if (!name || !caliber || !projectileId || !propellantId) {
    throw new Error(t('errors.requiredForCheck'))
  }

  const caliberId = await resolveCaliberId(caliber, t('errors.requiredForCheck'))

  await prisma.recipe.create({
    data: {
      name,
      caliberId,
      projectileId,
      propellantId,
      primerId,
      cartridgeId,
      chargeGr,
      coal,
      calculatedV0,
      measuredV0,
      fillRate,
      notes,
    },
  })

  revalidatePath('/recipes')
}

export interface QuickLoadImportData {
  name: string
  caliber: string
  chargeGr: number | null
  coal: number | null
  calculatedV0: number | null
  measuredV0: number | null
  fillRate: number | null
  notes: string | null
  projectileId: string | null
  createProjectile: boolean
  projectileBrand: string
  projectileType: string
  projectileWeightGr: number
  projectileCaliber: string
  propellantId: string | null
  createPropellant: boolean
  propellantBrand: string
  propellantType: string
}

export async function importRecipeFromQuickLoad(data: QuickLoadImportData) {
  const t = await getTranslations('recipes')

  if (!data.name || !data.caliber) {
    throw new Error(t('errors.requiredForCheck'))
  }

  let projectileId = data.projectileId
  if (data.createProjectile && !projectileId) {
    if (!data.projectileBrand || !data.projectileCaliber || !data.projectileWeightGr) {
      throw new Error(t('errors.requiredForCheck'))
    }
    const created = await prisma.projectile.create({
      data: {
        brand: data.projectileBrand,
        type: data.projectileType || null,
        weightGr: data.projectileWeightGr,
        caliber: data.projectileCaliber,
        amount: 0,
      },
    })
    projectileId = created.id
  }

  if (!projectileId) {
    throw new Error(t('errors.requiredForCheck'))
  }

  let propellantId = data.propellantId
  if (data.createPropellant && !propellantId) {
    if (!data.propellantBrand) {
      throw new Error(t('errors.requiredForCheck'))
    }
    const created = await prisma.propellant.create({
      data: {
        brand: data.propellantBrand,
        type: data.propellantType || '',
        amountGr: 0,
      },
    })
    propellantId = created.id
  }

  if (!propellantId) {
    throw new Error(t('errors.requiredForCheck'))
  }

  const caliberId = await resolveCaliberId(data.caliber, t('errors.requiredForCheck'))

  await prisma.recipe.create({
    data: {
      name: data.name,
      caliberId,
      projectileId,
      propellantId,
      chargeGr: data.chargeGr,
      coal: data.coal,
      calculatedV0: data.calculatedV0,
      measuredV0: data.measuredV0,
      fillRate: data.fillRate,
      notes: data.notes,
    },
  })

  revalidatePath('/recipes')
  revalidatePath('/projectiles')
  revalidatePath('/propellants')
  revalidatePath('/')
}

const QL_EXTRACT_SYSTEM_PROMPT = `You are a data-extraction assistant reading a screenshot of the QuickLoad internal-ballistics software showing a single load.
Extract the load's values and respond with ONLY a JSON object (no markdown, no prose) of EXACTLY this shape:
{"name": string, "caliber": string, "bulletBrand": string, "bulletType": string, "bulletWeightGr": number, "bulletCaliber": string, "propellantBrand": string, "propellantType": string, "chargeGr": number, "coal": number, "calculatedV0": number|null, "measuredV0": number|null, "fillRate": number|null, "notes": string}

Field guidance:
- caliber: the cartridge designation, e.g. ".308 Win" or ".30-06 Spring".
- bulletBrand/bulletType: the projectile maker and model, e.g. brand "Sierra", type "MatchKing". bulletWeightGr in grains. bulletCaliber is the bullet diameter, e.g. ".308".
- propellantBrand/propellantType: e.g. brand "Vihtavuori", type "N140". chargeGr is the powder charge in grains.
- coal: cartridge overall length in inches.
- calculatedV0: the computed muzzle velocity in m/s (QuickLoad's predicted V0). measuredV0: only if a measured velocity is shown, else null.
- fillRate: percent case fill / loading density (a number like 95), else null.
- name: a short human label for the load; if none is visible, build one like "<caliber> <bulletWeightGr>gr <bulletBrand>".
- notes: any extra free text worth keeping, else an empty string.

Rules: Use null (for the nullable fields) or 0 / empty string when a value is NOT visible in the screenshot. NEVER invent or guess values that aren't shown. Numbers must be plain JSON numbers (no units, no quotes).`

function toNum(v: unknown): number {
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (!isNaN(n)) return n
  }
  return 0
}

function toNullableNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = toNum(v)
  return n === 0 ? null : n
}

function toStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Extracts a QuickLoad recipe from an uploaded screenshot using a vision-capable
 * model. The image is sent to the model in-memory and never stored. Returns a
 * ParsedQuickLoad for the preview/confirm step (does NOT persist anything).
 * Throws Error with a user-friendly, translated message (callers surface it as
 * a toast).
 */
export async function extractQuickLoadFromImage(formData: FormData): Promise<ParsedQuickLoad> {
  const t = await getTranslations('recipes')

  const file = formData.get('image')
  if (!(file instanceof File) || file.size === 0) {
    throw new Error(t('qlImageImport.errors.noImage'))
  }
  if (file.size > MAX_IMPORT_IMAGE_SIZE) {
    throw new Error(t('qlImageImport.errors.tooLarge'))
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const mimeType = getImageMimeType(buffer)
  if (!mimeType) {
    throw new Error(t('qlImageImport.errors.notImage'))
  }

  const settings = await prisma.aiSettings.findUnique({ where: { id: 'singleton' } })
  if (!settings?.apiKey) {
    throw new Error(t('errors.configureAi'))
  }
  // No fallback to the text model: a non-vision model can't read the screenshot,
  // so require an explicit vision model and tell the user how to set one.
  if (!settings.visionModel) {
    throw new Error(t('qlImageImport.errors.noVisionModel'))
  }

  const baseUrl = settings.baseUrl || DEFAULT_BASE_URLS[settings.provider] || ''

  let content: string
  try {
    content = await visionCompletion({
      baseUrl,
      apiKey: settings.apiKey,
      model: settings.visionModel,
      imageBase64: buffer.toString('base64'),
      mimeType,
      systemPrompt: QL_EXTRACT_SYSTEM_PROMPT,
      userPrompt: 'Extract the load data from this QuickLoad screenshot.',
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      responseFormat: 'json_object',
    })
  } catch (e) {
    if (e instanceof AiError) throw new Error(e.message)
    throw e
  }

  const parsed = parseJsonFromModel<Record<string, unknown>>(content)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(t('qlImageImport.errors.unreadable'))
  }

  const caliber = toStr(parsed.caliber)
  const bulletBrand = toStr(parsed.bulletBrand)
  const bulletType = toStr(parsed.bulletType)
  const bulletWeightGr = toNum(parsed.bulletWeightGr)
  const name = toStr(parsed.name) || `${caliber} ${bulletBrand} ${bulletType}`.trim() || 'Imported recipe'

  return {
    name,
    caliber,
    bulletBrand,
    bulletType,
    bulletWeightGr,
    bulletCaliber: toStr(parsed.bulletCaliber),
    propellantBrand: toStr(parsed.propellantBrand),
    propellantType: toStr(parsed.propellantType),
    chargeGr: toNum(parsed.chargeGr),
    coal: toNum(parsed.coal),
    calculatedV0: toNullableNum(parsed.calculatedV0),
    measuredV0: toNullableNum(parsed.measuredV0),
    fillRate: toNullableNum(parsed.fillRate),
    notes: toStr(parsed.notes),
  }
}

// Returns a result object (see DeleteResult) because Next.js redacts thrown
// Server Action error messages in production builds. Both RangeLog and LoadLog
// reference Recipe through a nullable, ON DELETE SET NULL foreign key, so
// deleting a recipe simply nulls those pointers — the frozen snapshot stored
// on each log preserves the historical record. No in-use guard is needed (this
// mirrors how LoadLog was already unguarded).
export async function deleteRecipe(id: string): Promise<DeleteResult> {
  await prisma.recipe.delete({ where: { id } })
  revalidatePath('/recipes')
  revalidatePath('/range')
  revalidatePath('/logs')
  revalidatePath('/')
  return { ok: true }
}

export async function updateRecipe(id: string, formData: FormData) {
  const t = await getTranslations('recipes')
  const name = formData.get('name') as string
  const caliber = formData.get('caliber') as string
  const projectileId = formData.get('projectileId') as string
  const propellantId = formData.get('propellantId') as string
  const primerId = (formData.get('primerId') as string) || null
  const cartridgeId = (formData.get('cartridgeId') as string) || null
  const chargeGr = formData.get('chargeGr') ? parseFloat(formData.get('chargeGr') as string) : null
  const coal = formData.get('coal') ? parseFloat(formData.get('coal') as string) : null
  const calculatedV0 = formData.get('calculatedV0') ? parseFloat(formData.get('calculatedV0') as string) : null
  const measuredV0 = formData.get('measuredV0') ? parseFloat(formData.get('measuredV0') as string) : null
  const fillRate = formData.get('fillRate') ? parseFloat(formData.get('fillRate') as string) : null
  const notes = (formData.get('notes') as string) || null

  if (!name || !caliber || !projectileId || !propellantId) {
    throw new Error(t('errors.requiredForCheck'))
  }

  const caliberId = await resolveCaliberId(caliber, t('errors.requiredForCheck'))

  await prisma.recipe.update({
    where: { id },
    data: {
      name,
      caliberId,
      projectileId,
      propellantId,
      primerId,
      cartridgeId,
      chargeGr,
      coal,
      calculatedV0,
      measuredV0,
      fillRate,
      notes,
    },
  })

  revalidatePath('/recipes')
}

export async function getRecipeById(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: {
      caliber: true,
      projectile: true,
      propellant: true,
      primer: true,
      cartridge: { include: { caliber: true } },
      loadLogs: {
        orderBy: { date: 'desc' },
        take: 5,
      },
      rangeLogs: {
        orderBy: { date: 'desc' },
        take: 5,
        include: {
          images: {
            take: 1,
          },
        },
      },
    },
  })
}

const AI_CHECK_SYSTEM_PROMPT = `You are a firearms reloading safety assistant. You will be given the data for a single handloaded cartridge "recipe". Assess it for obvious danger or data-entry errors — for example: a powder charge weight that is implausible (far too high or too low) for the given powder, bullet weight, and caliber; a primer size that is mismatched to the cartridge; an implausible cartridge overall length (COAL) for the caliber; or a muzzle velocity that is physically unreasonable for the load.

Important constraints:
- You do NOT have access to official published load data. NEVER declare a load definitively "safe". The best you can do is say nothing obvious looks wrong, while deferring to published manufacturer data.
- If critical data is missing (e.g. no charge weight), say so as a concern.
- Be specific and concise. Do not invent exact published load values.

Respond with ONLY a JSON object, no markdown, of exactly this shape:
{"verdict": "OK" | "CAUTION" | "STOP", "summary": "<one or two sentence overall assessment>", "concerns": ["<specific concern>", ...]}
Use "STOP" only when something looks clearly dangerous. Use "CAUTION" for plausible-but-verify or missing-data cases. Use "OK" when nothing obvious looks wrong (still deferring to published data). "concerns" may be an empty array.`

export interface AiAssessment {
  verdict: string
  summary: string
  concerns: string[]
}

// Plain values describing a recipe to assess. Components are pre-resolved to
// brand/type so this helper works for both a saved recipe and unsaved form input.
interface RecipeAssessmentInput {
  name: string
  caliber: string
  projectileBrand: string
  projectileType: string | null
  projectileWeightGr: number
  propellantBrand: string
  propellantType: string
  primerBrand?: string | null
  primerType?: string | null
  primerMagnum?: boolean
  cartridgeBrand?: string | null
  cartridgeCaliber?: string | null
  cartridgeWaterCapacityGr?: number | null
  chargeGr?: number | null
  coal?: number | null
  calculatedV0?: number | null
  measuredV0?: number | null
  fillRate?: number | null
  notes?: string | null
}

/**
 * Calls the configured model to assess a recipe and returns the parsed verdict.
 * Pure with respect to the database — does not persist. Throws Error with a
 * user-friendly message (callers surface it as a toast).
 */
async function assessRecipeData(input: RecipeAssessmentInput, t: Awaited<ReturnType<typeof getTranslations>>): Promise<AiAssessment & { model: string }> {
  const settings = await prisma.aiSettings.findUnique({ where: { id: 'singleton' } })

  if (!settings?.apiKey || !settings.model) {
    throw new Error(t('errors.configureAi'))
  }

  // Build a compact description including ONLY fields that hold data. Empty/unset
  // fields are omitted entirely (rather than sent as "not specified") so the model
  // doesn't treat placeholder zeros — e.g. an un-measured 0 m/s velocity or 0%
  // fill rate — as real data-entry errors. Required fields are always present.
  const lines: string[] = [
    `Name: ${input.name}`,
    `Caliber: ${input.caliber}`,
    `Projectile: ${[input.projectileBrand, input.projectileType].filter(Boolean).join(' ')} — ${input.projectileWeightGr} gr`,
    `Propellant: ${[input.propellantBrand, input.propellantType].filter(Boolean).join(' ')}`,
  ]

  if (input.primerBrand) {
    lines.push(`Primer: ${input.primerBrand} ${input.primerType ?? ''}${input.primerMagnum ? ' (magnum)' : ''}`.trim())
  }
  if (input.cartridgeBrand) {
    const cap = input.cartridgeWaterCapacityGr ? `, ${input.cartridgeWaterCapacityGr} gr H2O capacity` : ''
    lines.push(`Case/cartridge: ${input.cartridgeBrand}${input.cartridgeCaliber ? ` ${input.cartridgeCaliber}` : ''}${cap}`)
  }
  // Optional numeric fields: treat both null and 0 as "no data" — 0 is never a
  // legitimate value for any of these, so it means the field was left unset.
  if (input.chargeGr) lines.push(`Powder charge: ${input.chargeGr} gr`)
  if (input.coal) lines.push(`COAL: ${input.coal} in`)
  if (input.calculatedV0) lines.push(`Calculated V0: ${input.calculatedV0} m/s`)
  if (input.measuredV0) lines.push(`Measured V0: ${input.measuredV0} m/s`)
  if (input.fillRate) lines.push(`Fill rate: ${input.fillRate}%`)
  if (input.notes && input.notes.trim()) lines.push(`Notes: ${input.notes}`)

  const userPrompt = `Assess this handload recipe:\n\n${lines.join('\n')}`

  const baseUrl = settings.baseUrl || DEFAULT_BASE_URLS[settings.provider] || ''

  let content: string
  try {
    content = await chatCompletion({
      baseUrl,
      apiKey: settings.apiKey,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      responseFormat: 'json_object',
      messages: [
        { role: 'system', content: AI_CHECK_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    })
  } catch (e) {
    if (e instanceof AiError) throw new Error(e.message)
    throw e
  }

  // Defensive parse: fall back to UNKNOWN rather than failing the request.
  const parsed = parseJsonFromModel<Partial<AiAssessment>>(content)

  let verdict = 'UNKNOWN'
  let summary = content.slice(0, 2000)
  let concerns: string[] = []

  if (parsed && typeof parsed === 'object') {
    const v = String(parsed.verdict ?? '').toUpperCase()
    verdict = ['OK', 'CAUTION', 'STOP'].includes(v) ? v : 'UNKNOWN'
    if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
      summary = parsed.summary.trim()
    }
    if (Array.isArray(parsed.concerns)) {
      concerns = parsed.concerns.filter((c): c is string => typeof c === 'string' && c.trim() !== '')
    }
  }

  return { verdict, summary, concerns, model: settings.model }
}

async function persistAssessment(recipeId: string, result: AiAssessment & { model: string }) {
  await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      aiVerdict: result.verdict,
      aiSummary: result.summary,
      aiConcerns: JSON.stringify(result.concerns),
      aiModel: result.model,
      aiCheckedAt: new Date(),
    },
  })
}

/**
 * Runs an AI assessment of a SAVED recipe (by id) and persists the result.
 * Used by the recipe detail view button.
 */
export async function runRecipeAiCheck(recipeId: string) {
  const t = await getTranslations('recipes')
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { caliber: true, projectile: true, propellant: true, primer: true, cartridge: { include: { caliber: true } } },
  })

  if (!recipe) {
    throw new Error(t('errors.recipeNotFound'))
  }

  const result = await assessRecipeData({
    name: recipe.name,
    caliber: recipe.caliber.name,
    projectileBrand: recipe.projectile.brand,
    projectileType: recipe.projectile.type,
    projectileWeightGr: recipe.projectile.weightGr,
    propellantBrand: recipe.propellant.brand,
    propellantType: recipe.propellant.type,
    primerBrand: recipe.primer?.brand ?? null,
    primerType: recipe.primer?.type ?? null,
    primerMagnum: recipe.primer?.magnum ?? false,
    cartridgeBrand: recipe.cartridge?.brand ?? null,
    cartridgeCaliber: recipe.cartridge?.caliber?.name ?? null,
    cartridgeWaterCapacityGr: recipe.cartridge?.waterCapacityGr ?? null,
    chargeGr: recipe.chargeGr,
    coal: recipe.coal,
    calculatedV0: recipe.calculatedV0,
    measuredV0: recipe.measuredV0,
    fillRate: recipe.fillRate,
    notes: recipe.notes,
  }, t)

  await persistAssessment(recipeId, result)
  revalidatePath(`/recipes/${recipeId}`)
}

// Input from the edit form — component IDs + the currently-typed field values.
export interface RecipeAiCheckInput {
  recipeId?: string // present when editing an existing recipe
  name: string
  caliber: string
  projectileId: string
  propellantId: string
  primerId?: string | null
  cartridgeId?: string | null
  chargeGr?: number | null
  coal?: number | null
  calculatedV0?: number | null
  measuredV0?: number | null
  fillRate?: number | null
  notes?: string | null
}

export interface RecipeAiCheckResult extends AiAssessment {
  model: string
  /** true if the verdict was saved onto the recipe (only when form matches saved data). */
  persisted: boolean
}

/**
 * Runs an AI assessment of the values currently in the edit form (which may be
 * unsaved). Resolves the selected components by id. The result is persisted onto
 * the recipe ONLY when every assessed field already matches what is saved — so a
 * stored verdict never describes data that isn't actually saved yet.
 */
export async function runRecipeAiCheckOnInput(input: RecipeAiCheckInput): Promise<RecipeAiCheckResult> {
  const t = await getTranslations('recipes')
  if (!input.name?.trim() || !input.caliber?.trim() || !input.projectileId || !input.propellantId) {
    throw new Error(t('errors.requiredForCheck'))
  }

  const [projectile, propellant, primer, cartridge] = await Promise.all([
    prisma.projectile.findUnique({ where: { id: input.projectileId } }),
    prisma.propellant.findUnique({ where: { id: input.propellantId } }),
    input.primerId ? prisma.primer.findUnique({ where: { id: input.primerId } }) : Promise.resolve(null),
    input.cartridgeId ? prisma.cartridge.findUnique({ where: { id: input.cartridgeId }, include: { caliber: true } }) : Promise.resolve(null),
  ])

  if (!projectile) throw new Error(t('errors.projectileNotFound'))
  if (!propellant) throw new Error(t('errors.propellantNotFound'))

  const result = await assessRecipeData({
    name: input.name,
    caliber: input.caliber,
    projectileBrand: projectile.brand,
    projectileType: projectile.type,
    projectileWeightGr: projectile.weightGr,
    propellantBrand: propellant.brand,
    propellantType: propellant.type,
    primerBrand: primer?.brand ?? null,
    primerType: primer?.type ?? null,
    primerMagnum: primer?.magnum ?? false,
    cartridgeBrand: cartridge?.brand ?? null,
    cartridgeCaliber: cartridge?.caliber?.name ?? null,
    cartridgeWaterCapacityGr: cartridge?.waterCapacityGr ?? null,
    chargeGr: input.chargeGr,
    coal: input.coal,
    calculatedV0: input.calculatedV0,
    measuredV0: input.measuredV0,
    fillRate: input.fillRate,
    notes: input.notes,
  }, t)

  // Persist only when the form values match the saved recipe, so the stored
  // verdict always reflects saved data.
  let persisted = false
  if (input.recipeId) {
    const saved = await prisma.recipe.findUnique({ where: { id: input.recipeId }, include: { caliber: true } })
    if (saved && recipeMatchesInput(saved, input)) {
      await persistAssessment(input.recipeId, result)
      revalidatePath(`/recipes/${input.recipeId}`)
      persisted = true
    }
  }

  return { ...result, persisted }
}

// Normalizes a nullable/zero numeric to null so "0", 0, "", null all compare equal.
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) || n === 0 ? null : n
}

function recipeMatchesInput(
  saved: {
    name: string
    caliber: { name: string }
    projectileId: string
    propellantId: string
    primerId: string | null
    cartridgeId: string | null
    chargeGr: number | null
    coal: number | null
    calculatedV0: number | null
    measuredV0: number | null
    fillRate: number | null
    notes: string | null
  },
  input: RecipeAiCheckInput,
): boolean {
  return (
    saved.name === input.name.trim() &&
    // Caliber is matched case-insensitively to mirror resolveCaliberId's dedup,
    // so re-checking right after a save (where the form holds the typed name and
    // the recipe holds the canonical Caliber) still counts as "matches saved".
    saved.caliber.name.toLowerCase() === input.caliber.trim().toLowerCase() &&
    saved.projectileId === input.projectileId &&
    saved.propellantId === input.propellantId &&
    (saved.primerId ?? '') === (input.primerId ?? '') &&
    (saved.cartridgeId ?? '') === (input.cartridgeId ?? '') &&
    num(saved.chargeGr) === num(input.chargeGr) &&
    num(saved.coal) === num(input.coal) &&
    num(saved.calculatedV0) === num(input.calculatedV0) &&
    num(saved.measuredV0) === num(input.measuredV0) &&
    num(saved.fillRate) === num(input.fillRate) &&
    (saved.notes ?? '').trim() === (input.notes ?? '').trim()
  )
}
