'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const recipeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  caliber: z.string().min(1, 'Caliber is required'),
  projectileId: z.string().min(1, 'Projectile is required'),
  propellantId: z.string().min(1, 'Propellant is required'),
  primerId: z.string().optional(),
  chargeGr: z.coerce.number().optional(),
  coal: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

interface RecipeFormProps {
  action?: (formData: FormData) => Promise<void>;
  updateAction?: (id: string, formData: FormData) => Promise<void>;
  defaultValues?: any;
  projectiles: Array<{ id: string; brand: string; type: string | null; weightGr: number }>;
  propellants: Array<{ id: string; brand: string; type: string }>;
  primers: Array<{ id: string; brand: string; type: string; magnum: boolean }>;
  title?: string;
  submitLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RecipeForm({
  action,
  updateAction,
  defaultValues,
  projectiles,
  propellants,
  primers,
  title,
  submitLabel,
  open,
  onOpenChange,
}: RecipeFormProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open! : uncontrolledOpen;
  const setIsOpen = (value: boolean) => {
    if (isControlled && onOpenChange) onOpenChange(value);
    else setUncontrolledOpen(value);
  };

  const isEdit = !!defaultValues?.id;

  const displayTitle = title ?? (isEdit ? 'Edit Recipe' : 'Add New Recipe');
  const displaySubmitLabel = submitLabel ?? (isEdit ? 'Save Changes' : 'Save Recipe');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RecipeFormData>({
    // @ts-expect-error - zod coercion typing issue with react-hook-form
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      caliber: defaultValues?.caliber || '',
      projectileId: defaultValues?.projectileId || '',
      propellantId: defaultValues?.propellantId || '',
      primerId: defaultValues?.primerId || '',
      chargeGr: defaultValues?.chargeGr,
      coal: defaultValues?.coal,
      notes: defaultValues?.notes || '',
    },
  });

  useEffect(() => {
    if (defaultValues?.id) {
      reset({
        name: defaultValues.name || '',
        caliber: defaultValues.caliber || '',
        projectileId: defaultValues.projectileId || '',
        propellantId: defaultValues.propellantId || '',
        primerId: defaultValues.primerId || '',
        chargeGr: defaultValues.chargeGr,
        coal: defaultValues.coal,
        notes: defaultValues.notes || '',
      });
    }
  }, [defaultValues?.id, reset]);

  const onSubmit = async (data: RecipeFormData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('caliber', data.caliber);
    formData.append('projectileId', data.projectileId);
    formData.append('propellantId', data.propellantId);
    if (data.primerId) formData.append('primerId', data.primerId);
    if (data.chargeGr !== undefined) formData.append('chargeGr', String(data.chargeGr));
    if (data.coal !== undefined) formData.append('coal', String(data.coal));
    if (data.notes) formData.append('notes', data.notes);

    try {
      if (isEdit && updateAction && defaultValues?.id) {
        await updateAction(defaultValues.id, formData);
        toast.success('Recipe updated');
      } else if (action) {
        await action(formData);
        toast.success('Recipe saved');
      }
      setIsOpen(false);
      reset();
    } catch (error) {
      toast.error('Failed to save recipe');
    }
  };

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Auto-focus the first field when the modal opens (critical for keyboard handling)
    const focusTimer = setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
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
          + Add Recipe
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-6">{displayTitle}</h2>

            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Name</label>
                  <input
                    {...register('name')}
                    ref={(e) => {
                      // Merge react-hook-form's ref with our own for auto-focus
                      register('name').ref(e);
                      nameInputRef.current = e;
                    }}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                    placeholder="308 Win 168gr Match"
                  />
                  {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Caliber</label>
                  <input
                    {...register('caliber')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                    placeholder=".308 Win"
                  />
                  {errors.caliber && <p className="text-red-600 text-xs mt-1">{errors.caliber.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Projectile</label>
                  <select
                    {...register('projectileId')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  >
                    <option value="">Select Projectile</option>
                    {projectiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.brand} {p.type ? `– ${p.type}` : ''} ({p.weightGr} gr)
                      </option>
                    ))}
                  </select>
                  {errors.projectileId && <p className="text-red-600 text-xs mt-1">{errors.projectileId.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Propellant</label>
                  <select
                    {...register('propellantId')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  >
                    <option value="">Select Propellant</option>
                    {propellants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.brand} – {p.type}
                      </option>
                    ))}
                  </select>
                  {errors.propellantId && <p className="text-red-600 text-xs mt-1">{errors.propellantId.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Primer (optional)</label>
                <select
                  {...register('primerId')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                >
                  <option value="">Select Primer (optional)</option>
                  {primers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} {p.type.replace('_', ' ')} {p.magnum ? '(Magnum)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Charge (grains)</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('chargeGr')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">COAL (inches)</label>
                  <input
                    type="number"
                    step="0.001"
                    {...register('coal')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder="Velocity, group size, seating depth, etc."
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
                  {isSubmitting ? 'Saving...' : displaySubmitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
