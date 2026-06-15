import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // English is the default; Danish is the first alternate.
  locales: ['en', 'da'],

  // Keep URLs clean: do not prefix them with /en or /da.
  // Locale is stored in a cookie and detected from Accept-Language.
  localePrefix: 'never',

  defaultLocale: 'en',
})
