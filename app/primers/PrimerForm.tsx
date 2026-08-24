'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PrimerType } from '@prisma/client';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { Primer } from '@/lib/types';
import { useFocusTrap } from '@/lib/useFocusTrap';

function createPrimerSchema(t: (key: string) => string) {
  return z.object({
    brand: z.string().min(1, t('form.validation.brandRequired')),
    type: z.nativeEnum(PrimerType),
    magnum: z.boolean(),
    amount: z.coerce.number().min(0),
    description: z.string().optional(),
  });
}

type PrimerSchema = ReturnType<typeof createPrimerSchema>;
type PrimerFormInput = z.input<PrimerSchema>;
type PrimerFormData = z.output<PrimerSchema>;

interface PrimerFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<Primer> | null;
  title: string;
  submitLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PrimerForm({ action, defaultValues, title, submitLabel, open, onOpenChange }: PrimerFormProps) {
  const t = useTranslations('primers');
  const primerSchema = useMemo(() => createPrimerSchema(t), [t]);

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open! : uncontrolledOpen;
  const setIsOpen = (value: boolean) => {
    if (isControlled && onOpenChange) onOpenChange(value);
    else setUncontrolledOpen(value);
  };

  const isEdit = !!defaultValues?.id;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PrimerFormInput, unknown, PrimerFormData>({
    resolver: zodResolver(primerSchema),
    defaultValues: {
      brand: defaultValues?.brand || '',
      type: defaultValues?.type || PrimerType.SMALL_RIFLE,
      magnum: defaultValues?.magnum ?? false,
      amount: defaultValues?.amount ?? 0,
      description: defaultValues?.description || '',
    },
  });

  const onSubmit = async (data: PrimerFormData) => {
    const formData = new FormData();
    formData.append('brand', data.brand);
    formData.append('type', data.type);
    if (data.magnum) formData.append('magnum', 'on');
    formData.append('amount', String(data.amount));
    if (data.description) formData.append('description', data.description);

    try {
      await action(formData);
      setIsOpen(false);
      reset();
      toast.success(defaultValues?.id ? t('toast.updated') : t('toast.created'));
    } catch {
      toast.error(t('toast.failed'));
    }
  };

  const brandInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;

    // Auto-focus the first field when the modal opens (critical for keyboard handling)
    const focusTimer = setTimeout(() => {
      brandInputRef.current?.focus();
      brandInputRef.current?.select();
    }, 0);

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        reset();
        return;
      }

      if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null;
        if (active?.tagName === 'TEXTAREA' || active?.tagName === 'BUTTON') {
          return; // let textarea get newlines, let buttons do their thing
        }
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, setIsOpen, reset, handleSubmit, onSubmit]);

  useEffect(() => {
    if (defaultValues?.id) {
      reset({
        brand: defaultValues.brand || '',
        type: defaultValues.type || PrimerType.SMALL_RIFLE,
        magnum: defaultValues.magnum ?? false,
        amount: defaultValues.amount ?? 0,
        description: defaultValues.description || '',
      });
    }
  }, [defaultValues?.id, reset]);

  return (
    <>
      {!isEdit && !isControlled && (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          {t('page.addButton')}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="primer-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800"
          >
            <h2 id="primer-modal-title" className="text-xl font-semibold mb-6">{title}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="primer-brand" className="block text-sm font-medium mb-1.5">{t('form.brand')}</label>
                <input
                  id="primer-brand"
                  autoComplete="off"
                  aria-describedby="primer-brand-error"
                  {...register('brand')}
                  ref={(e) => {
                    // Merge react-hook-form's ref with our own for auto-focus
                    register('brand').ref(e);
                    brandInputRef.current = e;
                  }}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder={t('form.brandPlaceholder')}
                />
                {errors.brand && <p id="primer-brand-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.brand.message}</p>}
              </div>

              <div>
                <label htmlFor="primer-type" className="block text-sm font-medium mb-1.5">{t('form.type')}</label>
                <select
                  id="primer-type"
                  autoComplete="off"
                  {...register('type')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                >
                  {Object.values(PrimerType).map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="magnum"
                  autoComplete="off"
                  {...register('magnum')}
                  className="w-4 h-4"
                />
                <label htmlFor="magnum" className="text-sm">{t('form.magnum')}</label>
              </div>

              <div>
                <label htmlFor="primer-amount" className="block text-sm font-medium mb-1.5">{t('form.amount')}</label>
                <input
                  id="primer-amount"
                  type="number"
                  inputMode="numeric"
                  autoComplete="off"
                  {...register('amount')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                />
              </div>

              <div>
                <label htmlFor="primer-description" className="block text-sm font-medium mb-1.5">{t('form.description')}</label>
                <textarea
                  id="primer-description"
                  autoComplete="off"
                  {...register('description')}
                  rows={3}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder={t('form.descriptionPlaceholder')}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    reset();
                  }}
                  className="flex-1 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm"
                >
                  {t('form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? t('form.saving') : submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
