'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

export function LocaleSwitcher() {
  const t = useTranslations('localeSwitcher');
  const locale = useLocale();
  const pathname = usePathname();

  const onChange = (nextLocale: string) => {
    // With localePrefix: 'never', the URL path stays the same; only the
    // locale cookie changes. The middleware reads the cookie and serves the
    // correct dictionary on the next request.
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.href = pathname;
  };

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span>{t('label')}:</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm"
      >
        <option value="en">{t('en')}</option>
        <option value="da">{t('da')}</option>
      </select>
    </label>
  );
}
