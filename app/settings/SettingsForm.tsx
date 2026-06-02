'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { saveAiSettings, testAiConnection } from './actions'

// Providers supported by the settings UI. Grok is the only one wired up for
// now; add entries here as new providers are supported.
const PROVIDERS: { value: string; label: string; defaultBaseUrl: string; modelHint: string }[] = [
  {
    value: 'grok',
    label: 'Grok (xAI)',
    defaultBaseUrl: 'https://api.x.ai/v1',
    modelHint: 'grok-3, grok-2-latest, grok-2-vision...',
  },
]

interface SettingsFormProps {
  initialData: {
    provider: string
    model: string
    baseUrl: string
    temperature: number | null
    maxTokens: number | null
    hasApiKey: boolean
    apiKeyLast4: string | null
  }
}

export function SettingsForm({ initialData }: SettingsFormProps) {
  const [provider, setProvider] = useState(initialData.provider || 'grok')
  const [baseUrl, setBaseUrl] = useState(initialData.baseUrl)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const modelInputRef = useRef<HTMLInputElement>(null)

  const currentProvider = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0]

  const keyPlaceholder = initialData.hasApiKey
    ? `••••••••${initialData.apiKeyLast4 ?? ''} (unchanged)`
    : 'Paste your API key'

  useEffect(() => {
    const t = setTimeout(() => modelInputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])

  // When the provider changes and the base URL is empty, prefill the default.
  const onProviderChange = (value: string) => {
    setProvider(value)
    const def = PROVIDERS.find((p) => p.value === value)?.defaultBaseUrl ?? ''
    if (!baseUrl.trim()) setBaseUrl(def)
  }

  async function handleSave() {
    if (!formRef.current) return
    setIsSaving(true)
    try {
      await saveAiSettings(new FormData(formRef.current))
      toast.success('Settings saved')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTest() {
    if (!formRef.current) return
    setIsTesting(true)
    try {
      const result = await testAiConnection(new FormData(formRef.current))
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed'
      toast.error(message)
    } finally {
      setIsTesting(false)
    }
  }

  // Enter saves (except inside textareas / on buttons), matching the rest of the app.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    const active = document.activeElement as HTMLElement | null
    if (active?.tagName === 'TEXTAREA' || active?.tagName === 'BUTTON') return
    e.preventDefault()
    handleSave()
  }

  const inputClass =
    'w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950'

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
      onKeyDown={onKeyDown}
      className="space-y-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6"
    >
      <div>
        <label className="block text-sm font-medium mb-1.5">Provider</label>
        <select
          name="provider"
          value={provider}
          onChange={(e) => onProviderChange(e.target.value)}
          className={inputClass}
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Model</label>
        <input
          ref={modelInputRef}
          type="text"
          name="model"
          defaultValue={initialData.model}
          placeholder={currentProvider.modelHint}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 mt-1">Free text, so new model names work without an app update.</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">API Key</label>
        <input
          type="password"
          name="apiKey"
          autoComplete="off"
          placeholder={keyPlaceholder}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 mt-1">
          {initialData.hasApiKey
            ? 'Leave blank to keep the existing key. Stored in the database.'
            : 'Stored in the database.'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Base URL</label>
        <input
          type="text"
          name="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={currentProvider.defaultBaseUrl}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Temperature (optional)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            name="temperature"
            defaultValue={initialData.temperature ?? ''}
            placeholder="0.7"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Max tokens (optional)</label>
          <input
            type="number"
            step="1"
            min="1"
            name="maxTokens"
            defaultValue={initialData.maxTokens ?? ''}
            placeholder="1024"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting || isSaving}
          className="flex-1 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          {isTesting ? 'Testing...' : 'Test connection'}
        </button>
        <button
          type="submit"
          disabled={isSaving || isTesting}
          className="flex-1 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </form>
  )
}
