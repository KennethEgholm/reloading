import { getAiSettings } from './actions'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const settings = await getAiSettings()

  // Never send the raw key to the client. Pass only whether one exists + last 4
  // so the form can render a masked placeholder.
  const apiKeyLast4 = settings?.apiKey ? settings.apiKey.slice(-4) : null

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Configure the AI model used by the app. The active provider can be switched here.
        </p>
      </div>

      <SettingsForm
        initialData={{
          provider: settings?.provider ?? 'grok',
          model: settings?.model ?? '',
          baseUrl: settings?.baseUrl ?? '',
          temperature: settings?.temperature ?? null,
          maxTokens: settings?.maxTokens ?? null,
          hasApiKey: !!settings?.apiKey,
          apiKeyLast4,
        }}
      />
    </div>
  )
}
