// Shared AI provider helpers. Plain module (NOT "use server") so it can export
// constants and sync helpers alongside async ones, and be reused by both the
// settings connection test and the recipe safety check.
//
// Providers are assumed OpenAI-compatible (xAI/Grok is). Add provider-specific
// branches here if a non-compatible provider is added later.

export const DEFAULT_BASE_URLS: Record<string, string> = {
  grok: 'https://api.x.ai/v1',
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionParams {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  temperature?: number | null
  maxTokens?: number | null
  /** When 'json_object', asks the provider to return strict JSON. */
  responseFormat?: 'json_object'
}

/** Error kinds callers can translate into friendly, user-facing messages. */
export type AiErrorKind = 'config' | 'auth' | 'http' | 'network' | 'empty'

export class AiError extends Error {
  kind: AiErrorKind
  status?: number
  constructor(kind: AiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'AiError'
    this.kind = kind
    this.status = status
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '')
}

/**
 * Calls an OpenAI-compatible chat-completions endpoint and returns the assistant
 * message text. Throws an AiError (never a bare fetch error) so callers can map
 * the failure to a clear message.
 */
export async function chatCompletion(params: ChatCompletionParams): Promise<string> {
  const { baseUrl, apiKey, model, messages, temperature, maxTokens, responseFormat } = params

  if (!apiKey) throw new AiError('config', 'No API key configured.')
  if (!model) throw new AiError('config', 'No model configured.')
  if (!baseUrl) throw new AiError('config', 'No base URL configured.')

  const url = `${normalizeBaseUrl(baseUrl)}/chat/completions`

  const body: Record<string, unknown> = { model, messages }
  if (temperature !== null && temperature !== undefined) body.temperature = temperature
  if (maxTokens !== null && maxTokens !== undefined) body.max_tokens = maxTokens
  if (responseFormat === 'json_object') body.response_format = { type: 'json_object' }

  return postChatCompletion(url, apiKey, body)
}

export interface VisionCompletionParams {
  baseUrl: string
  apiKey: string
  /** Image-capable model id (e.g. "grok-2-vision-1212"). */
  model: string
  /** Base64-encoded image bytes (no data: prefix). */
  imageBase64: string
  /** Image MIME type, e.g. "image/png". */
  mimeType: string
  systemPrompt: string
  userPrompt: string
  temperature?: number | null
  maxTokens?: number | null
  responseFormat?: 'json_object'
}

/**
 * Calls an OpenAI-compatible chat-completions endpoint with a single image plus
 * a text prompt, using the multimodal message shape (a user message whose
 * `content` is an array of text + image_url parts). Returns the assistant
 * message text. Throws an AiError (never a bare fetch error), mirroring
 * chatCompletion.
 */
export async function visionCompletion(params: VisionCompletionParams): Promise<string> {
  const { baseUrl, apiKey, model, imageBase64, mimeType, systemPrompt, userPrompt, temperature, maxTokens, responseFormat } = params

  if (!apiKey) throw new AiError('config', 'No API key configured.')
  if (!model) throw new AiError('config', 'No vision model configured.')
  if (!baseUrl) throw new AiError('config', 'No base URL configured.')
  if (!imageBase64) throw new AiError('config', 'No image provided.')

  const url = `${normalizeBaseUrl(baseUrl)}/chat/completions`

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
  }
  if (temperature !== null && temperature !== undefined) body.temperature = temperature
  if (maxTokens !== null && maxTokens !== undefined) body.max_tokens = maxTokens
  if (responseFormat === 'json_object') body.response_format = { type: 'json_object' }

  return postChatCompletion(url, apiKey, body)
}

/**
 * Shared POST + response handling for chat/vision completions. Maps transport
 * and HTTP failures to AiError and returns the assistant message text.
 */
async function postChatCompletion(url: string, apiKey: string, body: Record<string, unknown>): Promise<string> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown error'
    throw new AiError('network', `Could not reach ${url}: ${detail}`)
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    let providerMsg = ''
    try {
      const parsed = JSON.parse(raw)
      providerMsg = typeof parsed?.error === 'string' ? parsed.error : parsed?.error?.message ?? ''
    } catch {
      providerMsg = raw
    }
    providerMsg = providerMsg.slice(0, 300).trim()

    const looksLikeBadKey =
      res.status === 401 ||
      res.status === 403 ||
      /incorrect api key|invalid api key|invalid.*token|authentication/i.test(providerMsg)

    if (looksLikeBadKey) {
      throw new AiError('auth', 'Invalid API key.', res.status)
    }
    throw new AiError(
      'http',
      providerMsg ? `AI request failed (HTTP ${res.status}): ${providerMsg}` : `AI request failed (HTTP ${res.status}).`,
      res.status,
    )
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new AiError('empty', 'AI returned an unreadable response.')
  }

  const content = (data as { choices?: { message?: { content?: string } }[] })
    ?.choices?.[0]?.message?.content
  if (!content || !content.trim()) {
    throw new AiError('empty', 'AI returned an empty response.')
  }
  return content
}

/**
 * Best-effort extraction of a JSON object from a model response that may be
 * wrapped in markdown code fences or contain surrounding prose. Returns null
 * if no parseable object is found.
 */
export function parseJsonFromModel<T = unknown>(text: string): T | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // Fall back to the first {...} block.
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T
      } catch {
        return null
      }
    }
    return null
  }
}
