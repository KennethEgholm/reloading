'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { promoteLadderWinner } from '../actions';
import { useFocusTrap } from '@/lib/useFocusTrap';

function createPromoteSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('form.validation.nameRequired')),
    deleteRemaining: z.boolean().optional(),
  });
}

type PromoteSchema = ReturnType<typeof createPromoteSchema>;
type PromoteInput = z.input<PromoteSchema>;
type PromoteData = z.output<PromoteSchema>;

interface PromoteWinnerButtonProps {
  ladderId: string;
  defaultName: string;
  winnerName: string;
}

export function PromoteWinnerButton({ ladderId, defaultName, winnerName }: PromoteWinnerButtonProps) {
  const t = useTranslations('ladders');
  const router = useRouter();
  const promoteSchema = useMemo(() => createPromoteSchema(t), [t]);

  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PromoteInput, unknown, PromoteData>({
    resolver: zodResolver(promoteSchema),
    defaultValues: { name: defaultName, deleteRemaining: false },
  });

  useEffect(() => {
    if (open) reset({ name: defaultName, deleteRemaining: false });
  }, [open, defaultName, reset]);

  const onSubmit = async (data: PromoteData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.deleteRemaining) formData.append('deleteRemaining', 'true');
    try {
      const recipeId = await promoteLadderWinner(ladderId, formData);
      toast.success(t('toast.promoted'));
      router.push(`/recipes/${recipeId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.failed'));
    }
  };

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(modalRef, open);

  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
    return () => clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null;
        if (active?.tagName === 'TEXTAREA' || active?.tagName === 'BUTTON') return;
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open, handleSubmit]);

  const inputClass = 'w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
      >
        {t('page.promote')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ladder-promote-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800"
          >
            <h2 id="ladder-promote-title" className="text-xl font-semibold mb-2">
              {t('page.promoteTitle')}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              {t('page.promoteHint', { name: winnerName })}
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="ladder-promote-name" className="block text-sm font-medium mb-1.5">
                  {t('form.recipeName')}
                </label>
                <input
                  id="ladder-promote-name"
                  autoComplete="off"
                  aria-describedby="ladder-promote-name-error"
                  {...register('name')}
                  ref={(e) => {
                    register('name').ref(e);
                    nameInputRef.current = e;
                  }}
                  className={inputClass}
                />
                {errors.name && (
                  <p id="ladder-promote-name-error" aria-live="polite" className="text-red-600 text-xs mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  {...register('deleteRemaining')}
                  className="mt-0.5 rounded border-zinc-300 dark:border-zinc-600"
                />
                <span>
                  <span className="font-medium">{t('form.deleteRemaining')}</span>
                  <span className="block text-zinc-500 mt-0.5">{t('form.deleteRemainingHint')}</span>
                </span>
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm"
                >
                  {t('form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? t('form.saving') : t('page.promote')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
