'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { updateLadder } from '../actions';
import { useFocusTrap } from '@/lib/useFocusTrap';

function createLadderEditSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('form.validation.nameRequired')),
    notes: z.string().optional(),
  });
}

type LadderEditSchema = ReturnType<typeof createLadderEditSchema>;
type LadderEditInput = z.input<LadderEditSchema>;
type LadderEditData = z.output<LadderEditSchema>;

interface LadderEditButtonProps {
  ladder: { id: string; name: string; notes: string | null };
}

export function LadderEditButton({ ladder }: LadderEditButtonProps) {
  const t = useTranslations('ladders');
  const editSchema = useMemo(() => createLadderEditSchema(t), [t]);

  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LadderEditInput, unknown, LadderEditData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: ladder.name,
      notes: ladder.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({ name: ladder.name, notes: ladder.notes ?? '' });
    }
  }, [open, ladder.name, ladder.notes, reset]);

  const onSubmit = async (data: LadderEditData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.notes) formData.append('notes', data.notes);
    try {
      await updateLadder(ladder.id, formData);
      toast.success(t('toast.updated'));
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.failed'));
    }
  };

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(modalRef, open);

  // Auto-focus the name field when the modal transitions to open.
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
        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        {t('page.edit')}
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
            aria-labelledby="ladder-edit-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800"
          >
            <h2 id="ladder-edit-title" className="text-xl font-semibold mb-6">
              {t('page.editTitle')}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="ladder-edit-name" className="block text-sm font-medium mb-1.5">
                  {t('form.name')}
                </label>
                <input
                  id="ladder-edit-name"
                  autoComplete="off"
                  aria-describedby="ladder-edit-name-error"
                  {...register('name')}
                  ref={(e) => {
                    register('name').ref(e);
                    nameInputRef.current = e;
                  }}
                  className={inputClass}
                />
                {errors.name && (
                  <p id="ladder-edit-name-error" aria-live="polite" className="text-red-600 text-xs mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="ladder-edit-notes" className="block text-sm font-medium mb-1.5">
                  {t('form.notes')}
                </label>
                <textarea
                  id="ladder-edit-notes"
                  rows={3}
                  {...register('notes')}
                  className={inputClass}
                  placeholder={t('form.notesPlaceholder')}
                />
              </div>
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
                  {isSubmitting ? t('form.saving') : t('form.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}