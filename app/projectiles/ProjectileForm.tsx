'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { Projectile } from '@/lib/types';
import { useFocusTrap } from '@/lib/useFocusTrap';

function createProjectileSchema(t: (key: string) => string) {
  return z.object({
    brand: z.string().min(1, t('form.validation.brandRequired')),
    type: z.string().min(1, t('form.validation.typeRequired')),
    weightGr: z.coerce.number().positive(t('form.validation.weightPositive')),
    bcG1: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.coerce.number().min(0, t('form.validation.bcNegative')).optional(),
    ),
    bcG7: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.coerce.number().min(0, t('form.validation.bcNegative')).optional(),
    ),
    caliber: z.string().min(1, t('form.validation.caliberRequired')),
    amount: z.coerce.number().int().min(0).default(0),
    description: z.string().optional(),
  });
}

type ProjectileSchema = ReturnType<typeof createProjectileSchema>;
type ProjectileFormInput = z.input<ProjectileSchema>;
type ProjectileFormData = z.output<ProjectileSchema>;

interface ProjectileFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<Projectile> | null;
  title: string;
  submitLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProjectileForm({ action, defaultValues, title, submitLabel, open, onOpenChange }: ProjectileFormProps) {
  const t = useTranslations('projectiles');
  const projectileSchema = useMemo(() => createProjectileSchema(t), [t]);

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
  } = useForm<ProjectileFormInput, unknown, ProjectileFormData>({
    resolver: zodResolver(projectileSchema),
    defaultValues: {
      brand: defaultValues?.brand || '',
      type: defaultValues?.type || '',
      weightGr: defaultValues?.weightGr ?? 0,
      bcG1: defaultValues?.bcG1 ?? undefined,
      bcG7: defaultValues?.bcG7 ?? undefined,
      caliber: defaultValues?.caliber || '',
      amount: defaultValues?.amount ?? 0,
      description: defaultValues?.description || '',
    },
  });

  const onSubmit = async (data: ProjectileFormData) => {
    const formData = new FormData();
    formData.append('brand', data.brand);
    formData.append('type', data.type);
    formData.append('weightGr', String(data.weightGr));
    formData.append('bcG1', data.bcG1 !== undefined && !isNaN(data.bcG1) ? String(data.bcG1) : '');
    formData.append('bcG7', data.bcG7 !== undefined && !isNaN(data.bcG7) ? String(data.bcG7) : '');
    formData.append('caliber', data.caliber);
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
        type: defaultValues.type || '',
        weightGr: defaultValues.weightGr ?? 0,
        bcG1: defaultValues.bcG1 ?? undefined,
        bcG7: defaultValues.bcG7 ?? undefined,
        caliber: defaultValues.caliber || '',
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
            aria-labelledby="projectile-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800"
          >
            <h2 id="projectile-modal-title" className="text-xl font-semibold mb-6">{title}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="projectile-brand" className="block text-sm font-medium mb-1.5">{t('form.brand')}</label>
                <input
                  id="projectile-brand"
                  autoComplete="off"
                  aria-describedby="projectile-brand-error"
                  {...register('brand')}
                  ref={(e) => {
                    // Merge react-hook-form's ref with our own for auto-focus
                    register('brand').ref(e);
                    brandInputRef.current = e;
                  }}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder={t('form.brandPlaceholder')}
                />
                {errors.brand && <p id="projectile-brand-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.brand.message}</p>}
              </div>

              <div>
                <label htmlFor="projectile-type" className="block text-sm font-medium mb-1.5">{t('form.type')}</label>
                <input
                  id="projectile-type"
                  autoComplete="off"
                  aria-describedby="projectile-type-error"
                  {...register('type')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder={t('form.typePlaceholder')}
                />
                {errors.type && <p id="projectile-type-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.type.message}</p>}
              </div>

              <div>
                <label htmlFor="projectile-weight" className="block text-sm font-medium mb-1.5">{t('form.weight')}</label>
                <input
                  id="projectile-weight"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-describedby="projectile-weight-error"
                  {...register('weightGr')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                />
                {errors.weightGr && <p id="projectile-weight-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.weightGr.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="projectile-bc-g1" className="block text-sm font-medium mb-1.5">{t('form.bcG1')}</label>
                  <input
                    id="projectile-bc-g1"
                    type="number"
                    step="0.001"
                    min="0"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-describedby="projectile-bc-g1-error"
                    {...register('bcG1')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                    placeholder={t('form.bcG1Placeholder')}
                  />
                  {errors.bcG1 && <p id="projectile-bc-g1-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.bcG1.message}</p>}
                </div>
                <div>
                  <label htmlFor="projectile-bc-g7" className="block text-sm font-medium mb-1.5">{t('form.bcG7')}</label>
                  <input
                    id="projectile-bc-g7"
                    type="number"
                    step="0.001"
                    min="0"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-describedby="projectile-bc-g7-error"
                    {...register('bcG7')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                    placeholder={t('form.bcG7Placeholder')}
                  />
                  {errors.bcG7 && <p id="projectile-bc-g7-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.bcG7.message}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="projectile-caliber" className="block text-sm font-medium mb-1.5">{t('form.caliber')}</label>
                <input
                  id="projectile-caliber"
                  autoComplete="off"
                  aria-describedby="projectile-caliber-error"
                  {...register('caliber')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder={t('form.caliberPlaceholder')}
                />
                {errors.caliber && <p id="projectile-caliber-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.caliber.message}</p>}
              </div>

              <div>
                <label htmlFor="projectile-amount" className="block text-sm font-medium mb-1.5">{t('form.amount')}</label>
                <input
                  id="projectile-amount"
                  type="number"
                  step="1"
                  min="0"
                  inputMode="numeric"
                  autoComplete="off"
                  {...register('amount')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                />
              </div>

              <div>
                <label htmlFor="projectile-description" className="block text-sm font-medium mb-1.5">{t('form.description')}</label>
                <textarea
                  id="projectile-description"
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
