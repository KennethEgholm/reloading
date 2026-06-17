'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatDate } from '@/lib/format';
import { DeleteRangeLogButton } from './DeleteRangeLogButton';
import type { RangeLogListItem } from '@/lib/types';

interface RangeLogRowProps {
  log: RangeLogListItem;
}

export function RangeLogRow({ log }: RangeLogRowProps) {
  const router = useRouter();
  const t = useTranslations('range');
  const locale = useLocale();
  const [showPhotoOverlay, setShowPhotoOverlay] = useState(false);

  const goToDetail = () => {
    router.push(`/range/${log.id}`);
  };

  const goToEdit = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    e.preventDefault();
    router.push(`/range/${log.id}/edit`);
  };

  // Escape to close photo overlay
  useEffect(() => {
    if (!showPhotoOverlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPhotoOverlay(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPhotoOverlay]);

  const imageCount = log._count?.images ?? 0

  return (
    <>
      <div
        onClick={goToDetail}
        className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
      >
        <div className="flex gap-4">
          {log.mainImage?.filename && (
            <img
              src={`/uploads/range-logs/${log.mainImage.filename}`}
              alt=""
              className="w-14 h-14 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setShowPhotoOverlay(true);
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-lg">{log.recipe?.name ?? log.recipeName ?? t('row.recipeDeleted')}</div>
                <div className="text-sm text-zinc-500">
                  {formatDate(log.date, locale)} • {t('row.rounds', { count: log.roundsFired })}
                  {log.location && ` • ${log.location}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {imageCount > 0 && (
                  <div className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">
                    {t('row.photoCount', { count: imageCount })}
                  </div>
                )}
                <a
                  href={`/range/${log.id}/edit`}
                  className="text-sm text-accent hover:text-accent-hover hover:underline"
                  onClick={goToEdit}
                >
                  {t('row.edit')}
                </a>
                <span aria-hidden="true" className="text-zinc-300">|</span>
                <span onClick={(e) => e.stopPropagation()}>
                  <DeleteRangeLogButton id={log.id} />
                </span>
              </div>
            </div>

            {(log.velocityAvg || log.extremeSpread) && (
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {log.velocityAvg && t('row.avg', { value: log.velocityAvg.toFixed(0) })}
                {log.extremeSpread && ` • ${t('row.es', { value: log.extremeSpread.toFixed(0) })}`}
              </div>
            )}

            {log.notes && (
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {log.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo overlay for list thumbnail */}
      {showPhotoOverlay && log.mainImage?.filename && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowPhotoOverlay(false)}
        >
          <div
            className="relative w-full max-w-[95vw] max-h-[95vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPhotoOverlay(false)}
              className="absolute -top-3 -right-3 z-10 bg-white dark:bg-zinc-900 text-black dark:text-white rounded-full w-9 h-9 flex items-center justify-center text-2xl font-bold shadow hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label={t('row.closeOverlay')}
            >
              ×
            </button>

            <img
              src={`/uploads/range-logs/${log.mainImage.filename}`}
              alt={log.mainImage.description || ''}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl bg-zinc-900"
            />

            <div className="mt-3 text-center text-white max-w-2xl">
              <div className="text-lg font-semibold">{log.recipe?.name ?? log.recipeName ?? t('row.recipeDeleted')}</div>
              <div className="text-sm opacity-80">
                {formatDate(log.date, locale)} • {t('row.rounds', { count: log.roundsFired })}
                {log.location && ` • ${log.location}`}
              </div>
              {log.mainImage.description && (
                <div className="mt-1 text-sm opacity-90">{log.mainImage.description}</div>
              )}
              <a
                href={`/range/${log.id}`}
                className="inline-block mt-3 text-accent hover:text-accent-hover hover:underline text-sm"
                onClick={() => setShowPhotoOverlay(false)}
              >
                {t('row.viewFullSession')}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
