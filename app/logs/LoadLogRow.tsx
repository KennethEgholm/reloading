'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { formatDate } from '@/lib/format';

interface LoadLogRowProps {
  log: any; // Matches the shape from getLoadLogs (includes snapshots)
}

export function LoadLogRow({ log }: LoadLogRowProps) {
  const t = useTranslations('logs');
  const locale = useLocale();

  return (
    <Link
      href={`/logs/${log.id}`}
      className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-lg">{log.recipeName}</div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatDate(log.date, locale)} — {t('row.rounds', { count: log.quantity })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {t('row.loaded', { count: log.quantity })}
          </div>
        </div>
      </div>

      {log.notes && (
        <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3 line-clamp-2">
          {log.notes}
        </div>
      )}
    </Link>
  );
}
