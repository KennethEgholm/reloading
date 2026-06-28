import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { visionCompletion, AiError } from './ai'

function okResponse(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const BASE = {
  baseUrl: 'https://api.x.ai/v1',
  apiKey: 'test-key',
  model: 'grok-2-vision-1212',
  imageBase64: 'AAAA',
  mimeType: 'image/png',
  systemPrompt: 'system',
  userPrompt: 'extract',
}

describe('visionCompletion', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts an OpenAI-compatible multimodal payload with an image_url data URL', async () => {
    const fetchMock = vi.fn((..._args: [string, RequestInit?]) => Promise.resolve(okResponse('{"caliber":".308"}')))
    vi.stubGlobal('fetch', fetchMock)

    const out = await visionCompletion({ ...BASE, responseFormat: 'json_object' })

    expect(out).toBe('{"caliber":".308"}')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.x.ai/v1/chat/completions')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('grok-2-vision-1212')
    expect(body.response_format).toEqual({ type: 'json_object' })
    // system message first, then a user message whose content is an array
    expect(body.messages[0]).toEqual({ role: 'system', content: 'system' })
    expect(body.messages[1].role).toBe('user')
    const parts = body.messages[1].content
    expect(parts[0]).toEqual({ type: 'text', text: 'extract' })
    expect(parts[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,AAAA' },
    })
  })

  it('maps a 401 to an auth AiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"Incorrect API key"}', { status: 401 })))
    await expect(visionCompletion(BASE)).rejects.toMatchObject({ name: 'AiError', kind: 'auth' })
  })

  it('maps a non-ok HTTP status to an http AiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"boom"}', { status: 500 })))
    await expect(visionCompletion(BASE)).rejects.toMatchObject({ name: 'AiError', kind: 'http' })
  })

  it('maps an empty content response to an empty AiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse('   ')))
    await expect(visionCompletion(BASE)).rejects.toMatchObject({ name: 'AiError', kind: 'empty' })
  })

  it('throws a config AiError when required params are missing', async () => {
    vi.stubGlobal('fetch', vi.fn())
    await expect(visionCompletion({ ...BASE, apiKey: '' })).rejects.toMatchObject({ kind: 'config' })
    await expect(visionCompletion({ ...BASE, model: '' })).rejects.toMatchObject({ kind: 'config' })
    await expect(visionCompletion({ ...BASE, imageBase64: '' })).rejects.toMatchObject({ kind: 'config' })
  })

  it('exposes AiError for instanceof checks', () => {
    expect(new AiError('http', 'x')).toBeInstanceOf(Error)
  })
})
