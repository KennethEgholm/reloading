'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PrimerType } from '@prisma/client';
import { toast } from 'sonner';

const primerSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  type: z.nativeEnum(PrimerType),
  magnum: z.boolean(),
  amount: z.coerce.number().min(0),
  description: z.string().optional(),
});

type PrimerFormData = z.infer<typeof primerSchema>;

interface PrimerFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<PrimerFormData & { id?: string }>;
  title: string;
  submitLabel: string;
}

export function PrimerForm({ action, defaultValues, title, submitLabel }: PrimerFormProps) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PrimerFormData>({
    // @ts-expect-error - zod + RHF resolver typing (known friction, safe at runtime)
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
      setOpen(false);
      reset();
      toast.success(defaultValues?.id ? 'Primer updated' : 'Primer created');
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
      >
        {title === 'Add New Primer' ? '+ Add Primer' : 'Edit'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-6">{title}</h2>

            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Brand</label>
                <input
                  {...register('brand')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
                  placeholder="CCI, Federal, Winchester..."
                />
                {errors.brand && <p className="text-red-600 text-xs mt-1">{errors.brand.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <select
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
                  {...register('magnum')}
                  className="w-4 h-4"
                />
                <label htmlFor="magnum" className="text-sm">Magnum</label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Amount</label>
                <input
                  type="number"
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
                  placeholder="Lot number, notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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
