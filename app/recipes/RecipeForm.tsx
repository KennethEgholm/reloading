'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { runRecipeAiCheckOnInput, type RecipeAiCheckResult } from './actions';
import { AiVerdictDisplay, AiDisclaimer } from './AiVerdictDisplay';
import type { RecipeWithRelations, CaliberOption } from '@/lib/types';
import { useFocusTrap } from '@/lib/useFocusTrap';
import { CaliberField } from '../CaliberField';

function createRecipeSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('form.validation.nameRequired')),
    caliber: z.string().min(1, t('form.validation.caliberRequired')),
    projectileId: z.string().min(1, t('form.validation.projectileRequired')),
    propellantId: z.string().min(1, t('form.validation.propellantRequired')),
    primerId: z.string().optional(),
    cartridgeId: z.string().optional(),
    chargeGr: z.coerce.number().optional(),
    coal: z.coerce.number().optional(),
    calculatedV0: z.coerce.number().optional(),
    measuredV0: z.coerce.number().optional(),
    fillRate: z.coerce.number().optional(),
    notes: z.string().optional(),
  });
}

type RecipeSchema = ReturnType<typeof createRecipeSchema>;
type RecipeFormInput = z.input<RecipeSchema>;
type RecipeFormData = z.output<RecipeSchema>;

interface RecipeFormProps {
  action?: (formData: FormData) => Promise<void>;
  updateAction?: (id: string, formData: FormData) => Promise<void>;
  defaultValues?: RecipeWithRelations | null;
  projectiles: Array<{ id: string; brand: string; type: string | null; weightGr: number }>;
  propellants: Array<{ id: string; brand: string; type: string }>;
  primers: Array<{ id: string; brand: string; type: string; magnum: boolean }>;
  cartridges: Array<{ id: string; brand: string; caliber: { name: string } }>;
  calibers: CaliberOption[];
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
  cartridges,
  calibers,
  title,
  submitLabel,
  open,
  onOpenChange,
}: RecipeFormProps) {
  const t = useTranslations('recipes');
  const recipeSchema = useMemo(() => createRecipeSchema(t), [t]);

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open! : uncontrolledOpen;
  const setIsOpen = (value: boolean) => {
    if (isControlled && onOpenChange) onOpenChange(value);
    else setUncontrolledOpen(value);
  };

  const isEdit = !!defaultValues?.id;

  const displayTitle = title ?? (isEdit ? t('form.titleEdit') : t('form.titleAdd'));
  const displaySubmitLabel = submitLabel ?? (isEdit ? t('form.saveChanges') : t('form.save'));

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RecipeFormInput, unknown, RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      caliber: defaultValues?.caliber?.name || '',
      projectileId: defaultValues?.projectileId || '',
      propellantId: defaultValues?.propellantId || '',
      primerId: defaultValues?.primerId || '',
      cartridgeId: defaultValues?.cartridgeId || '',
      chargeGr: defaultValues?.chargeGr,
      coal: defaultValues?.coal,
      calculatedV0: defaultValues?.calculatedV0,
      measuredV0: defaultValues?.measuredV0,
      fillRate: defaultValues?.fillRate,
      notes: defaultValues?.notes || '',
    },
  });

  // AI safety-check state (edit mode). Result lives only in the modal; it is
  // persisted server-side only when the form matches the saved recipe.
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<RecipeAiCheckResult | null>(null);

  useEffect(() => {
    if (defaultValues?.id) {
      reset({
        name: defaultValues.name || '',
        caliber: defaultValues.caliber?.name || '',
        projectileId: defaultValues.projectileId || '',
        propellantId: defaultValues.propellantId || '',
        primerId: defaultValues.primerId || '',
        cartridgeId: defaultValues.cartridgeId || '',
        chargeGr: defaultValues.chargeGr,
        coal: defaultValues.coal,
        calculatedV0: defaultValues.calculatedV0,
        measuredV0: defaultValues.measuredV0,
        fillRate: defaultValues.fillRate,
        notes: defaultValues.notes || '',
      });
    }
  }, [defaultValues?.id, reset]);

  // Clear any prior AI result when switching to a different recipe or when the
  // modal closes. Tracking the previous values and adjusting state during render
  // is React's recommended alternative to a setState-in-effect: the stale result
  // is dropped in the same render, before it could be shown for the new context.
  const [prevRecipeId, setPrevRecipeId] = useState(defaultValues?.id);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (defaultValues?.id !== prevRecipeId || isOpen !== prevIsOpen) {
    setPrevRecipeId(defaultValues?.id);
    setPrevIsOpen(isOpen);
    if (aiResult !== null) setAiResult(null);
  }

  const handleAiCheck = async () => {
    // getValues() returns the raw (pre-coercion) input shape; the AI check wants
    // the coerced output shape. zodResolver coerces the number fields, so reading
    // them as the output type here is sound.
    const values = getValues() as RecipeFormData;
    if (!values.name?.trim() || !values.caliber?.trim() || !values.projectileId || !values.propellantId) {
      toast.error(t('toast.aiCheckRequiredFields'));
      return;
    }
    setAiChecking(true);
    try {
      const result = await runRecipeAiCheckOnInput({
        recipeId: defaultValues?.id,
        name: values.name,
        caliber: values.caliber,
        projectileId: values.projectileId,
        propellantId: values.propellantId,
        primerId: values.primerId || null,
        cartridgeId: values.cartridgeId || null,
        chargeGr: values.chargeGr ?? null,
        coal: values.coal ?? null,
        calculatedV0: values.calculatedV0 ?? null,
        measuredV0: values.measuredV0 ?? null,
        fillRate: values.fillRate ?? null,
        notes: values.notes ?? null,
      });
      setAiResult(result);
      toast.success(result.persisted ? t('toast.aiCheckSaved') : t('toast.aiCheckComplete'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.aiCheckFailed');
      toast.error(message);
    } finally {
      setAiChecking(false);
    }
  };

  const onSubmit = async (data: RecipeFormData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('caliber', data.caliber);
    formData.append('projectileId', data.projectileId);
    formData.append('propellantId', data.propellantId);
    if (data.primerId) formData.append('primerId', data.primerId);
    if (data.cartridgeId) formData.append('cartridgeId', data.cartridgeId);
    if (data.chargeGr !== undefined) formData.append('chargeGr', String(data.chargeGr));
    if (data.coal !== undefined) formData.append('coal', String(data.coal));
    if (data.calculatedV0 !== undefined) formData.append('calculatedV0', String(data.calculatedV0));
    if (data.measuredV0 !== undefined) formData.append('measuredV0', String(data.measuredV0));
    if (data.fillRate !== undefined) formData.append('fillRate', String(data.fillRate));
    if (data.notes) formData.append('notes', data.notes);

    try {
      if (isEdit && updateAction && defaultValues?.id) {
        await updateAction(defaultValues.id, formData);
        toast.success(t('toast.updated'));
      } else if (action) {
        await action(formData);
        toast.success(t('toast.saved'));
      }
      setIsOpen(false);
      reset();
    } catch {
      toast.error(t('toast.failed'));
    }
  };

  const nameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  // Auto-focus the first field ONLY when the modal transitions to open. Keyed
  // solely on isOpen so it does NOT re-run on every render — otherwise editing a
  // controlled field (e.g. picking "Add new" in CaliberField, which re-renders
  // the form) would steal focus back to the name input mid-interaction.
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
          return; // let textarea get newlines, let buttons do their thing
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsOpen(false)}>
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recipe-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800"
          >
            <h2 id="recipe-modal-title" className="text-xl font-semibold mb-6">{displayTitle}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="recipe-name" className="block text-sm font-medium mb-1.5">{t('form.name')}</label>
                  <input
                    id="recipe-name"
                    autoComplete="off"
                    aria-describedby="recipe-name-error"
                    {...register('name')}
                    ref={(e) => {
                      // Merge react-hook-form's ref with our own for auto-focus
                      register('name').ref(e);
                      nameInputRef.current = e;
                    }}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                    placeholder={t('form.namePlaceholder')}
                  />
                  {errors.name && <p id="recipe-name-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label htmlFor="recipe-caliber" className="block text-sm font-medium mb-1.5">{t('form.caliber')}</label>
                  <input type="hidden" {...register('caliber')} />
                  <CaliberField
                    id="recipe-caliber"
                    describedBy="recipe-caliber-error"
                    calibers={calibers}
                    value={watch('caliber') ?? ''}
                    onChange={(name) => setValue('caliber', name, { shouldValidate: true })}
                  />
                  {errors.caliber && <p id="recipe-caliber-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.caliber.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="recipe-projectile" className="block text-sm font-medium mb-1.5">{t('form.projectile')}</label>
                  <select
                    id="recipe-projectile"
                    autoComplete="off"
                    aria-describedby="recipe-projectile-error"
                    {...register('projectileId')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  >
                    <option value="">{t('form.projectilePlaceholder')}</option>
                    {projectiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.brand} {p.type ? `– ${p.type}` : ''} ({p.weightGr} gr)
                      </option>
                    ))}
                  </select>
                  {errors.projectileId && <p id="recipe-projectile-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.projectileId.message}</p>}
                </div>

                <div>
                  <label htmlFor="recipe-propellant" className="block text-sm font-medium mb-1.5">{t('form.propellant')}</label>
                  <select
                    id="recipe-propellant"
                    autoComplete="off"
                    aria-describedby="recipe-propellant-error"
                    {...register('propellantId')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  >
                    <option value="">{t('form.propellantPlaceholder')}</option>
                    {propellants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.brand} – {p.type}
                      </option>
                    ))}
                  </select>
                  {errors.propellantId && <p id="recipe-propellant-error" aria-live="polite" className="text-red-600 text-xs mt-1">{errors.propellantId.message}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="recipe-primer" className="block text-sm font-medium mb-1.5">{t('form.primer')}</label>
                <select
                  id="recipe-primer"
                  autoComplete="off"
                  {...register('primerId')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                >
                  <option value="">{t('form.primerPlaceholder')}</option>
                  {primers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} {p.type.replace('_', ' ')} {p.magnum ? '(Magnum)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="recipe-cartridge" className="block text-sm font-medium mb-1.5">{t('form.cartridge')}</label>
                <select
                  id="recipe-cartridge"
                  autoComplete="off"
                  {...register('cartridgeId')}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                >
                  <option value="">{t('form.cartridgePlaceholder')}</option>
                  {cartridges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} – {c.caliber.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="recipe-charge" className="block text-sm font-medium mb-1.5">{t('form.charge')}</label>
                  <input
                    id="recipe-charge"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    autoComplete="off"
                    {...register('chargeGr')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <label htmlFor="recipe-coal" className="block text-sm font-medium mb-1.5">{t('form.coal')}</label>
                  <input
                    id="recipe-coal"
                    type="number"
                    step="0.001"
                    inputMode="decimal"
                    autoComplete="off"
                    {...register('coal')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="recipe-calc-v0" className="block text-sm font-medium mb-1.5">{t('form.calcV0')}</label>
                  <input
                    id="recipe-calc-v0"
                    type="number"
                    step="1"
                    inputMode="numeric"
                    autoComplete="off"
                    {...register('calculatedV0')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <label htmlFor="recipe-meas-v0" className="block text-sm font-medium mb-1.5">{t('form.measV0')}</label>
                  <input
                    id="recipe-meas-v0"
                    type="number"
                    step="1"
                    inputMode="numeric"
                    autoComplete="off"
                    {...register('measuredV0')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <label htmlFor="recipe-fill-rate" className="block text-sm font-medium mb-1.5">{t('form.fillRate')}</label>
                  <input
                    id="recipe-fill-rate"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    autoComplete="off"
                    {...register('fillRate')}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="recipe-notes" className="block text-sm font-medium mb-1.5">{t('form.notes')}</label>
                <textarea
                  id="recipe-notes"
                  autoComplete="off"
                  {...register('notes')}
                  rows={3}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950"
                  placeholder={t('form.notesPlaceholder')}
                />
              </div>

              {/* AI Safety Check — assesses the values currently in the form */}
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('form.aiCheck')}</span>
                  <button
                    type="button"
                    onClick={handleAiCheck}
                    disabled={aiChecking}
                    className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {aiChecking ? t('form.aiChecking') : t('aiCheck.run')}
                  </button>
                </div>

                <AiDisclaimer />

                {aiResult ? (
                  <>
                    <AiVerdictDisplay
                      verdict={aiResult.verdict}
                      summary={aiResult.summary}
                      concerns={aiResult.concerns}
                      model={aiResult.model}
                    />
                    {!aiResult.persisted && (
                      <p className="text-xs text-zinc-500">
                        {t('aiCheck.unsavedResult')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-zinc-500">
                    {t('aiCheck.unsavedHint')}
                  </p>
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
                  {isSubmitting ? t('form.saving') : displaySubmitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
