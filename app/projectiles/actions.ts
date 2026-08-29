'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { createProjectileSchema, formatZodError } from '@/lib/schemas';
import { chatCompletion, parseJsonFromModel, DEFAULT_BASE_URLS, AiError } from '@/lib/ai';
import {
  projectileNeedsFill,
  fillNeeds,
  sanitizeProjectileSuggestion,
  sanitizeProjectileSuggestions,
  type ProjectileAiSuggestion,
} from '@/lib/projectileAi';
import type { DeleteResult } from '@/lib/types';

const MAX_AI_FILL = 40

const PROJECTILE_FILL_PROMPT = `You look up published catalog data for rifle/pistol projectiles (bullets).
You will receive a JSON array of projectiles that are missing some optional fields.
For each, suggest values only for the fields listed in "need".

Fields:
- preferredTwistIn: manufacturer-recommended barrel twist as inches per revolution (10 means 1:10"). Typical rifle 7–12, pistol 16–20.
- bcG1 / bcG7: published G1 / G7 ballistic coefficients (dimensionless, typically 0.2–0.7).

Rules:
- Use well-known published values for that exact brand, type, weight, and caliber when you can.
- If you are not reasonably sure, omit that field (do not guess wildly).
- Never invent a value for a field that is not in "need".
- Respond with ONLY a JSON object, no markdown:
{"suggestions":[{"id":"<id>","preferredTwistIn":10,"bcG1":0.462,"bcG7":0.237}]}
Include only keys you are filling. "suggestions" may be empty.`

function parseProjectileForm(formData: FormData, t: (key: string) => string) {
  const parsed = createProjectileSchema(t).safeParse({
    brand: formData.get('brand'),
    type: formData.get('type'),
    weightGr: formData.get('weightGr'),
    bcG1: formData.get('bcG1'),
    bcG7: formData.get('bcG7'),
    preferredTwistIn: formData.get('preferredTwistIn'),
    caliber: formData.get('caliber'),
    amount: formData.get('amount'),
    description: formData.get('description'),
  });
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return parsed.data;
}

export async function createProjectile(formData: FormData) {
  const t = await getTranslations('projectiles');
  const data = parseProjectileForm(formData, t);

  await prisma.projectile.create({ data });

  revalidatePath('/projectiles');
  revalidatePath('/');
}

export async function updateProjectile(id: string, formData: FormData) {
  const t = await getTranslations('projectiles');
  const data = parseProjectileForm(formData, t);

  await prisma.projectile.update({
    where: { id },
    data,
  });

  revalidatePath('/projectiles');
  revalidatePath('/');
}

// Returns a result object rather than throwing: Next.js redacts thrown Server
// Action error messages in production, so a user-facing reason ("used by N
// recipes") must be returned as data to survive a production build.
export async function deleteProjectile(id: string): Promise<DeleteResult> {
  const t = await getTranslations('projectiles');
  const inUse = await prisma.recipe.count({ where: { projectileId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      error: t('delete.inUse', { count: inUse }),
    };
  }

  await prisma.projectile.delete({
    where: { id },
  });

  revalidatePath('/projectiles');
  revalidatePath('/');
  return { ok: true };
}

export type ProjectileSuggestionRow = ProjectileAiSuggestion & {
  brand: string
  type: string | null
  weightGr: number
  caliber: string
}

export async function suggestMissingProjectileFields(): Promise<{
  suggestions: ProjectileSuggestionRow[]
  model: string
}> {
  const t = await getTranslations('projectiles')
  const settings = await prisma.aiSettings.findUnique({ where: { id: 'singleton' } })
  if (!settings?.apiKey || !settings.model) {
    throw new Error(t('errors.configureAi'))
  }

  const projectiles = await prisma.projectile.findMany({ orderBy: { brand: 'asc' } })
  const incomplete = projectiles.filter(projectileNeedsFill).slice(0, MAX_AI_FILL)
  if (incomplete.length === 0) {
    return { suggestions: [], model: settings.model }
  }

  const needsById = new Map(incomplete.map((p) => [p.id, fillNeeds(p)]))
  const payload = incomplete.map((p) => {
    const n = needsById.get(p.id)!
    const need: string[] = []
    if (n.needTwist) need.push('preferredTwistIn')
    if (n.needG1) need.push('bcG1')
    if (n.needG7) need.push('bcG7')
    return {
      id: p.id,
      brand: p.brand,
      type: p.type,
      weightGr: p.weightGr,
      caliber: p.caliber,
      need,
    }
  })

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
        { role: 'system', content: PROJECTILE_FILL_PROMPT },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    })
  } catch (e) {
    if (e instanceof AiError) throw new Error(e.message)
    throw e
  }

  const parsed = parseJsonFromModel(content)
  const sanitized = sanitizeProjectileSuggestions(parsed, needsById)
  const byId = new Map(incomplete.map((p) => [p.id, p]))
  const suggestions: ProjectileSuggestionRow[] = []
  for (const s of sanitized) {
    const p = byId.get(s.id)
    if (!p) continue
    suggestions.push({
      ...s,
      brand: p.brand,
      type: p.type,
      weightGr: p.weightGr,
      caliber: p.caliber,
    })
  }
  return { suggestions, model: settings.model }
}

export async function applyProjectileSuggestions(
  updates: ProjectileAiSuggestion[],
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  const t = await getTranslations('projectiles')
  if (!Array.isArray(updates) || updates.length === 0) {
    return { ok: true, updated: 0 }
  }

  const ids = updates.map((u) => u.id)
  const rows = await prisma.projectile.findMany({ where: { id: { in: ids } } })
  const byId = new Map(rows.map((r) => [r.id, r]))
  let updated = 0

  for (const u of updates) {
    const row = byId.get(u.id)
    if (!row) continue
    const needs = fillNeeds(row)
    const clean = sanitizeProjectileSuggestion(u, needs)
    if (!clean) continue
    const data: { preferredTwistIn?: number; bcG1?: number; bcG7?: number } = {}
    if (clean.preferredTwistIn != null && row.preferredTwistIn == null) data.preferredTwistIn = clean.preferredTwistIn
    if (clean.bcG1 != null && row.bcG1 == null) data.bcG1 = clean.bcG1
    if (clean.bcG7 != null && row.bcG7 == null) data.bcG7 = clean.bcG7
    if (Object.keys(data).length === 0) continue
    await prisma.projectile.update({ where: { id: row.id }, data })
    updated++
  }

  if (updated === 0) {
    return { ok: false, error: t('aiFill.noneApplied') }
  }

  revalidatePath('/projectiles')
  revalidatePath('/recipes')
  revalidatePath('/')
  return { ok: true, updated }
}
