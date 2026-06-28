import { getTranslations } from 'next-intl/server'
import { getAiSettings } from './actions'
import { SettingsForm } from './SettingsForm'
import { ThemeToggle } from './ThemeToggle'
import { ThemePicker } from './ThemePicker'
import { LocaleSwitcher } from './LocaleSwitcher'
import { DataCard } from './DataCard'

export default async function SettingsPage() {
  const t = await getTranslations('settings')
  const settings = await getAiSettings()

  // Never send the raw key to the client. Pass only whether one exists + last 4
  // so the form can render a masked placeholder.
  const apiKeyLast4 = settings?.apiKey ? settings.apiKey.slice(-4) : null

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          {t('page.subtitle')}
        </p>
      </div>

      {/* Language */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">{t('page.languageTitle')}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          {t('page.languageHint')}
        </p>
        <LocaleSwitcher />
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">{t('page.appearanceTitle')}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          {t('page.appearanceHint')}
        </p>
        <ThemeToggle />

        <h3 className="text-sm font-medium mt-6 mb-1">{t('page.accentTitle')}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          {t('page.accentHint')}
        </p>
        <ThemePicker />
      </div>

      <DataCard />

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
