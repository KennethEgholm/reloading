import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

// Custom middleware that handles locale detection via cookie/header
// without rewriting URLs (since we use localePrefix: 'never')
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Check for locale in cookie first
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  const headerLocale = acceptLanguage?.split(',')[0]?.split('-')[0]

  // Determine locale: cookie > header > default
  let locale = cookieLocale
  if (!locale && headerLocale && routing.locales.includes(headerLocale as 'en' | 'da')) {
    locale = headerLocale
  }
  if (!locale) {
    locale = routing.defaultLocale
  }

  // Set locale header for server components
  response.headers.set('x-next-intl-locale', locale)
  // Set cookie if not already set
  if (!cookieLocale) {
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  // Match all paths except static files and API routes.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
