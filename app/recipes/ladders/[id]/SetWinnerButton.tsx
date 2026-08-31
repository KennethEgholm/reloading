'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { setLadderWinner } from '../actions';

interface SetWinnerButtonProps {
  ladderId: string;
  recipeId: string;
  isWinner: boolean;
}

export function SetWinnerButton({ ladderId, recipeId, isWinner }: SetWinnerButtonProps) {
  const t = useTranslations('ladders');
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending || isWinner}
      onClick={() => {
        startTransition(async () => {
          try {
            await setLadderWinner(ladderId, recipeId);
            toast.success(t('toast.winnerSet'));
          } catch (error) {
            toast.error(error instanceof Error ? error.message : t('toast.failed'));
          }
        });
      }}
      className={`text-sm font-medium ${
        isWinner
          ? 'text-accent'
          : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50'
      }`}
    >
      {isWinner ? t('table.winnerBadge') : t('table.markWinner')}
    </button>
  );
}