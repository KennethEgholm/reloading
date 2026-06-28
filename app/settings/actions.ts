'use server'

import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const SINGLETON_ID = 'singleton'

// Module-private: a "use server" file may only export async functions, so this
// cannot be exported. The client form has its own copy of provider defaults.
const DEFAULT_BASE_URLS: Record<string, string> = {
  grok: 'https://api.x.ai/v1',
}

// Validation at the trust boundary (server action), independent of the client form.
function createAiSettingsSchema(t: (key: string) => string) {
  return z.object({
    provider: z.string().min(1, t('errors.providerRequired')),
    // Empty string means "keep the existing key" (the form sends '' when the user
    // didn't type a new key over the masked placeholder).
    apiKey: z.string().optional(),
    model: z.string().optional(),
    visionModel: z.string().optional(),
    baseUrl: z.string().url(t('errors.baseUrlInvalid')).optional().or(z.literal('')),
    temperature: z.coerce.number().min(0).max(2, t('errors.temperatureRange')).optional(),
    maxTokens: z.coerce.number().int().positive(t('errors.maxTokensPositive')).optional(),
  })
}

export async function getAiSettings() {
  return prisma.aiSettings.findUnique({ where: { id: SINGLETON_ID } })
}

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key)
  if (v === null) return undefined
  const s = (v as string).trim()
  return s === '' ? undefined : s
}

export async function saveAiSettings(formData: FormData) {
  const t = await getTranslations('settings')
  const parsed = createAiSettingsSchema(t).safeParse({
    provider: str(formData, 'provider') ?? 'grok',
    apiKey: formData.get('apiKey') === null ? undefined : (formData.get('apiKey') as string),
    model: str(formData, 'model'),
    visionModel: str(formData, 'visionModel'),
    baseUrl: str(formData, 'baseUrl'),
    temperature: str(formData, 'temperature'),
    maxTokens: str(formData, 'maxTokens'),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join('\n'))
  }

  const data = parsed.data
  const newApiKey = data.apiKey && data.apiKey.trim() !== '' ? data.apiKey.trim() : undefined

  await prisma.aiSettings.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      provider: data.provider,
      apiKey: newApiKey ?? null,
      model: data.model ?? null,
      visionModel: data.visionModel ?? null,
      baseUrl: data.baseUrl || null,
      temperature: data.temperature ?? null,
      maxTokens: data.maxTokens ?? null,
    },
    update: {
      provider: data.provider,
      // Only overwrite the key when a new one was actually entered.
      ...(newApiKey ? { apiKey: newApiKey } : {}),
      model: data.model ?? null,
      visionModel: data.visionModel ?? null,
      baseUrl: data.baseUrl || null,
      temperature: data.temperature ?? null,
      maxTokens: data.maxTokens ?? null,
    },
  })

  revalidatePath('/settings')
}

export interface TestConnectionResult {
  ok: boolean
  message: string
}

/**
 * Tests the AI provider connection using the values submitted from the form,
 * falling back to the saved API key when the user left the key field blank
 * (i.e. didn't re-type over the masked placeholder). Returns a result object
 * rather than throwing so the client can surface it via a toast.
 */
export async function testAiConnection(formData: FormData): Promise<TestConnectionResult> {
  const t = await getTranslations('settings')
  const provider = str(formData, 'provider') ?? 'grok'
  const baseUrl = str(formData, 'baseUrl') ?? DEFAULT_BASE_URLS[provider]
  let apiKey = formData.get('apiKey') ? (formData.get('apiKey') as string).trim() : ''

  if (!apiKey) {
    // Fall back to the stored key so the user can re-test after a reload.
    const saved = await prisma.aiSettings.findUnique({ where: { id: SINGLETON_ID } })
    apiKey = saved?.apiKey ?? ''
  }

  if (!apiKey) {
    return { ok: false, message: t('errors.noApiKey') }
  }
  if (!baseUrl) {
    return { ok: false, message: t('errors.noBaseUrl') }
  }

  switch (provider) {
    case 'grok':
      return testOpenAiCompatible(baseUrl, apiKey, t)
    default:
      return { ok: false, message: t('errors.providerNotSupported', { provider }) }
  }
}

// xAI (Grok) is OpenAI-compatible: GET /models with a bearer token validates the key.
async function testOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  t: Awaited<ReturnType<typeof getTranslations>>
): Promise<TestConnectionResult> {
  const url = `${baseUrl.replace(/\/$/, '')}/models`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      // Don't cache a credentials-bearing probe.
      cache: 'no-store',
    })

    if (res.ok) {
      let count: number | undefined
      try {
        const body = await res.json()
        if (Array.isArray(body?.data)) count = body.data.length
      } catch {
        // Non-JSON 2xx is still a successful auth.
      }
      return {
        ok: true,
        message: count !== undefined
          ? t('toast.testSuccess', { count })
          : t('toast.testSuccessNoCount'),
      }
    }

    // Pull the provider's own error message out of the body when present.
    // xAI returns it under `error`; OpenAI uses `error.message`.
    const raw = await res.text().catch(() => '')
    let providerMsg = ''
    try {
      const parsed = JSON.parse(raw)
      providerMsg = typeof parsed?.error === 'string' ? parsed.error : parsed?.error?.message ?? ''
    } catch {
      providerMsg = raw
    }
    providerMsg = providerMsg.slice(0, 200).trim()

    // xAI signals a bad key with 400 + "Incorrect API key" (not 401/403),
    // so key in on the message as well as the status code.
    const looksLikeBadKey =
      res.status === 401 ||
      res.status === 403 ||
      /incorrect api key|invalid api key|invalid.*token|authentication/i.test(providerMsg)

    if (looksLikeBadKey) {
      return { ok: false, message: t('errors.invalidApiKey') }
    }

    return {
      ok: false,
      message: providerMsg
        ? t('errors.requestFailed', { status: res.status, message: providerMsg })
        : t('errors.requestFailedNoMessage', { status: res.status }),
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown error'
    return { ok: false, message: t('errors.couldNotReach', { url, detail }) }
  }
}
