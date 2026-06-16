'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

function createCartridgeSchema(t: (key: string) => string) {
  return z.object({
    brand: z.string().min(1, t('form.validation.brandRequired')),
    caliber: z.string().min(1, t('form.validation.caliberRequired')),
    waterCapacityGr: z.coerce.number().min(0, t('form.validation.capacityNegative')).optional(),
    amount: z.coerce.number().int().min(0, t('form.validation.amountNegative')),
    description: z.string().optional(),
  });
}

type CartridgeFormData = z.infer<ReturnType<typeof createCartridgeSchema>>;

interface CartridgeFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<CartridgeFormData & { id?: string }>;
  title: string;
  submitLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CartridgeForm({ action, defaultValues, title, submitLabel, open, onOpenChange }: CartridgeFormProps) {
  const t = useTranslations('cartridges');
  const cartridgeSchema = useMemo(() => createCartridgeSchema(t), [t]);

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
  } = useForm<CartridgeFormData>({
    // @ts-expect-error - zod + RHF resolver typing (known friction, safe at runtime)
    resolver: zodResolver(cartridgeSchema),
    defaultValues: {
      brand: defaultValues?.brand || '',
      caliber: defaultValues?.caliber || '',
      waterCapacityGr: defaultValues?.waterCapacityGr,
      amount: defaultValues?.amount ?? 0,
      description: defaultValues?.description || '',
    },
  });

  const onSubmit = async (data: CartridgeFormData) => {
    const formData = new FormData();
    formData.append('brand', data.brand);
    formData.append('caliber', data.caliber);
    if (data.waterCapacityGr !== undefined && !isNaN(data.waterCapacityGr)) {
      formData.append('waterCapacityGr', String(data.waterCapacityGr));
    }
    formData.append('amount', String(data.amount ?? 0));
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

  useEffect(() => {
    if (!isOpen) return;

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
          return;
        }
        e.preventDefault();
        handleSubmit(onSubmit as any)();
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
        caliber: defaultValues.caliber || '',
        waterCapacityGr: defaultValues.waterCapacityGr,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-6">{title}</h2>

            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t('form.brand')}</label>
                <input
                  {...register('brand')}
                  ref={(e) => {
                    register('brand').ref(e);
                    brandInputRef.current = e;
                  }}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder={t('form.brandPlaceholder')}
                />
                {errors.brand && <p className="text-red-600 text-xs mt-1">{errors.brand.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">{t('form.caliber')}</label>
                <input
                  {...register('caliber')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder={t('form.caliberPlaceholder')}
                />
                {errors.caliber && <p className="text-red-600 text-xs mt-1">{errors.caliber.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('form.waterCapacity')}</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('waterCapacityGr')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                    placeholder={t('form.waterCapacityPlaceholder')}
                  />
                  {errors.waterCapacityGr && (
                    <p className="text-red-600 text-xs mt-1">{errors.waterCapacityGr.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">{t('form.amount')}</label>
                  <input
                    type="number"
                    step="1"
                    {...register('amount')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  />
                  {errors.amount && <p className="text-red-600 text-xs mt-1">{errors.amount.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">{t('form.description')}</label>
                <textarea
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
