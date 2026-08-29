'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { RifleWithCaliber, CaliberOption } from '@/lib/types';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { CaliberField } from '../CaliberField';

function createRifleFormSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('form.validation.nameRequired')),
    caliber: z.string().min(1, t('form.validation.caliberRequired')),
    barrelLengthMm: z.coerce.number().positive(t('form.validation.barrelPositive')),
    twistIn: z.coerce.number().positive(t('form.validation.twistPositive')),
    sightHeightCm: z.coerce.number().positive(t('form.validation.sightPositive')),
    zeroDistanceM: z.coerce.number().positive(t('form.validation.zeroPositive')),
    clickCmAt100m: z.coerce.number().positive(t('form.validation.clickPositive')),
  });
}

type RifleSchema = ReturnType<typeof createRifleFormSchema>;
type RifleFormInput = z.input<RifleSchema>;
type RifleFormData = z.output<RifleSchema>;

interface RifleFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<RifleWithCaliber> | null;
  calibers: CaliberOption[];
  title: string;
  submitLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RifleForm({ action, defaultValues, calibers, title, submitLabel, open, onOpenChange }: RifleFormProps) {
  const t = useTranslations('rifles');
  const rifleSchema = useMemo(() => createRifleFormSchema(t), [t]);

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
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RifleFormInput, unknown, RifleFormData>({
    resolver: zodResolver(rifleSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      caliber: defaultValues?.caliber?.name || '',
      barrelLengthMm: defaultValues?.barrelLengthMm ?? undefined,
      twistIn: defaultValues?.twistIn ?? undefined,
      sightHeightCm: defaultValues?.sightHeightCm ?? 5,
      zeroDistanceM: defaultValues?.zeroDistanceM ?? 100,
      clickCmAt100m: defaultValues?.clickCmAt100m ?? 1,
    },
  });

  const onSubmit = async (data: RifleFormData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('caliber', data.caliber);
    formData.append('barrelLengthMm', String(data.barrelLengthMm));
    formData.append('twistIn', String(data.twistIn));
    formData.append('sightHeightCm', String(data.sightHeightCm));
    formData.append('zeroDistanceM', String(data.zeroDistanceM));
    formData.append('clickCmAt100m', String(data.clickCmAt100m));

    try {
      await action(formData);
      setIsOpen(false);
      reset();
      toast.success(defaultValues?.id ? t('toast.updated') : t('toast.created'));
    } catch {
      toast.error(t('toast.failed'));
    }
  };

  const nameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

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
          return;
        }
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, setIsOpen, reset, handleSubmit, onSubmit]);

  useEffect(() => {
    if (defaultValues?.id) {
      reset({
        name: defaultValues.name || '',
        caliber: defaultValues.caliber?.name || '',
        barrelLengthMm: defaultValues.barrelLengthMm ?? undefined,
        twistIn: defaultValues.twistIn ?? undefined,
        sightHeightCm: defaultValues.sightHeightCm ?? 5,
        zeroDistanceM: defaultValues.zeroDistanceM ?? 100,
        clickCmAt100m: defaultValues.clickCmAt100m ?? 1,
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
            aria-labelledby="rifle-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800"
          >
            <h2 id="rifle-modal-title" className="text-xl font-semibold mb-6">{title}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="rifle-name" className="block text-sm font-medium mb-1.5">{t('form.name')}</label>
                <input
                  id="rifle-name"
                  autoComplete="off"
                  aria-describedby="rifle-name-error"
                  {...register('name')}
                  ref={(e) => {
                    register('name').ref(e);
                    nameInputRef.current = e;
                  }}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder={t('form.namePlaceholder')}
                />
                {errors.name && <p id="rifle-name-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="rifle-caliber" className="block text-sm font-medium mb-1.5">{t('form.caliber')}</label>
                <input type="hidden" {...register('caliber')} />
                <CaliberField
                  id="rifle-caliber"
                  describedBy="rifle-caliber-error"
                  calibers={calibers}
                  value={watch('caliber') ?? ''}
                  onChange={(name) => setValue('caliber', name, { shouldValidate: true })}
                />
                {errors.caliber && <p id="rifle-caliber-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.caliber.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rifle-barrel" className="block text-sm font-medium mb-1.5">{t('form.barrelLength')}</label>
                  <input
                    id="rifle-barrel"
                    type="number"
                    step="1"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-describedby="rifle-barrel-error"
                    {...register('barrelLengthMm')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                    placeholder={t('form.barrelPlaceholder')}
                  />
                  {errors.barrelLengthMm && (
                    <p id="rifle-barrel-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.barrelLengthMm.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="rifle-twist" className="block text-sm font-medium mb-1.5">{t('form.twist')}</label>
                  <input
                    id="rifle-twist"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-describedby="rifle-twist-error rifle-twist-hint"
                    {...register('twistIn')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                    placeholder={t('form.twistPlaceholder')}
                  />
                  <p id="rifle-twist-hint" className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('form.twistHint')}</p>
                  {errors.twistIn && (
                    <p id="rifle-twist-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.twistIn.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rifle-sight" className="block text-sm font-medium mb-1.5">{t('form.sightHeight')}</label>
                  <input
                    id="rifle-sight"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-describedby="rifle-sight-error"
                    {...register('sightHeightCm')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                    placeholder={t('form.sightPlaceholder')}
                  />
                  {errors.sightHeightCm && (
                    <p id="rifle-sight-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.sightHeightCm.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="rifle-zero" className="block text-sm font-medium mb-1.5">{t('form.zeroDistance')}</label>
                  <input
                    id="rifle-zero"
                    type="number"
                    step="1"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-describedby="rifle-zero-error"
                    {...register('zeroDistanceM')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                    placeholder={t('form.zeroPlaceholder')}
                  />
                  {errors.zeroDistanceM && (
                    <p id="rifle-zero-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.zeroDistanceM.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="rifle-click" className="block text-sm font-medium mb-1.5">{t('form.click')}</label>
                <input
                  id="rifle-click"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-describedby="rifle-click-error rifle-click-hint"
                  {...register('clickCmAt100m')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder={t('form.clickPlaceholder')}
                />
                <p id="rifle-click-hint" className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('form.clickHint')}</p>
                {errors.clickCmAt100m && (
                  <p id="rifle-click-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.clickCmAt100m.message}</p>
                )}
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
