'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const projectileSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  type: z.string().min(1, 'Type is required'),
  weightGr: z.coerce.number().positive('Weight must be positive'),
  caliber: z.string().min(1, 'Caliber is required'),
  amount: z.coerce.number().int().min(0).default(0),
  description: z.string().optional(),
});

type ProjectileFormData = z.infer<typeof projectileSchema>;

interface ProjectileFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<ProjectileFormData & { id?: string }>;
  title: string;
  submitLabel: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProjectileForm({ action, defaultValues, title, submitLabel, open, onOpenChange }: ProjectileFormProps) {
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
  } = useForm<ProjectileFormData>({
    // @ts-expect-error - zod + RHF resolver typing (known friction, safe at runtime)
    resolver: zodResolver(projectileSchema),
    defaultValues: {
      brand: defaultValues?.brand || '',
      type: defaultValues?.type || '',
      weightGr: defaultValues?.weightGr ?? 0,
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
    formData.append('caliber', data.caliber);
    formData.append('amount', String(data.amount));
    if (data.description) formData.append('description', data.description);

    try {
      await action(formData);
      setIsOpen(false);
      reset();
      toast.success(defaultValues?.id ? 'Projectile updated' : 'Projectile created');
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const brandInputRef = useRef<HTMLInputElement>(null);

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
        handleSubmit(onSubmit as any)();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, setIsOpen, reset, handleSubmit, onSubmit]);

  return (
    <>
      {!isEdit && !isControlled && (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          {title === 'Add New Projectile' ? '+ Add Projectile' : 'Edit'}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-6">{title}</h2>

            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Brand</label>
                <input
                  {...register('brand')}
                  ref={(e) => {
                    // Merge react-hook-form's ref with our own for auto-focus
                    register('brand').ref(e);
                    brandInputRef.current = e;
                  }}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder="Sierra, Hornady, Berger..."
                />
                {errors.brand && <p className="text-red-600 text-xs mt-1">{errors.brand.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <input
                  {...register('type')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder="Game King, MatchKing, Tipped..."
                />
                {errors.type && <p className="text-red-600 text-xs mt-1">{errors.type.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Weight (grains)</label>
                <input
                  type="number"
                  step="0.1"
                  {...register('weightGr')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                />
                {errors.weightGr && <p className="text-red-600 text-xs mt-1">{errors.weightGr.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Caliber</label>
                <input
                  {...register('caliber')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder="9mm, .308, 5.56..."
                />
                {errors.caliber && <p className="text-red-600 text-xs mt-1">{errors.caliber.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Amount in stock</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  {...register('amount')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder="Notes, BC, etc."
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
