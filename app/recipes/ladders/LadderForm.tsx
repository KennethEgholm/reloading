'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createLadder } from './actions';
import { generateCharges, LADDER_MIN_STEPS, LADDER_MAX_STEPS } from '@/lib/ladder';
import { CaliberField } from '../../CaliberField';
import type { CaliberOption } from '@/lib/types';

function createLadderFormSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('form.validation.nameRequired')),
    caliber: z.string().min(1, t('form.validation.caliberRequired')),
    projectileId: z.string().min(1, t('form.validation.projectileRequired')),
    propellantId: z.string().min(1, t('form.validation.propellantRequired')),
    primerId: z.string().optional(),
    cartridgeId: z.string().optional(),
    rifleId: z.string().optional(),
    coal: z.coerce.number().optional(),
    startChargeGr: z.coerce.number().positive(t('form.validation.chargePositive')),
    stepGr: z.coerce.number().refine((v) => v !== 0, t('form.validation.stepNonZero')),
    count: z.coerce
      .number()
      .int()
      .min(LADDER_MIN_STEPS, t('form.validation.countRange'))
      .max(LADDER_MAX_STEPS, t('form.validation.countRange')),
    notes: z.string().optional(),
  });
}

type LadderFormSchema = ReturnType<typeof createLadderFormSchema>;
type LadderFormInput = z.input<LadderFormSchema>;
type LadderFormData = z.output<LadderFormSchema>;

export interface LadderPrefill {
  id: string;
  name: string;
  caliber: string;
  projectileId: string;
  propellantId: string;
  primerId: string | null;
  cartridgeId: string | null;
  rifleId: string | null;
  coal: number | null;
  chargeGr: number | null;
}

interface LadderFormProps {
  projectiles: Array<{ id: string; brand: string; type: string | null; weightGr: number }>;
  propellants: Array<{ id: string; brand: string; type: string }>;
  primers: Array<{ id: string; brand: string; type: string; magnum: boolean }>;
  cartridges: Array<{ id: string; brand: string; caliber: { name: string } }>;
  rifles: Array<{ id: string; name: string; caliber: { name: string } }>;
  calibers: CaliberOption[];
  prefill?: LadderPrefill | null;
}

export function LadderForm({
  projectiles,
  propellants,
  primers,
  cartridges,
  rifles,
  calibers,
  prefill,
}: LadderFormProps) {
  const t = useTranslations('ladders');
  const router = useRouter();
  const ladderFormSchema = useMemo(() => createLadderFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LadderFormInput, unknown, LadderFormData>({
    resolver: zodResolver(ladderFormSchema),
    defaultValues: {
      name: prefill?.name ?? '',
      caliber: prefill?.caliber ?? '',
      projectileId: prefill?.projectileId ?? '',
      propellantId: prefill?.propellantId ?? '',
      primerId: prefill?.primerId ?? '',
      cartridgeId: prefill?.cartridgeId ?? '',
      rifleId: prefill?.rifleId ?? '',
      coal: prefill?.coal ?? undefined,
      startChargeGr: prefill?.chargeGr ?? undefined,
      stepGr: 0.5,
      count: 5,
      notes: '',
    },
  });

  // Live preview of the charge sequence. Invalid/partial input simply shows
  // an empty preview — the resolver surfaces field errors on submit.
  const name = watch('name');
  const startChargeGr = watch('startChargeGr');
  const stepGr = watch('stepGr');
  const count = watch('count');
  const preview = useMemo(() => {
    if (
      startChargeGr === undefined || startChargeGr === '' ||
      stepGr === undefined || stepGr === '' ||
      count === undefined || count === ''
    ) {
      return null;
    }
    try {
      return generateCharges(Number(startChargeGr), Number(stepGr), Number(count));
    } catch {
      return null;
    }
  }, [startChargeGr, stepGr, count]);

  const onSubmit = async (data: LadderFormData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('caliber', data.caliber);
    formData.append('projectileId', data.projectileId);
    formData.append('propellantId', data.propellantId);
    if (data.primerId) formData.append('primerId', data.primerId);
    if (data.cartridgeId) formData.append('cartridgeId', data.cartridgeId);
    if (data.rifleId) formData.append('rifleId', data.rifleId);
    if (data.coal !== undefined) formData.append('coal', String(data.coal));
    formData.append('startChargeGr', String(data.startChargeGr));
    formData.append('stepGr', String(data.stepGr));
    formData.append('count', String(data.count));
    if (data.notes) formData.append('notes', data.notes);

    try {
      const ladderId = await createLadder(formData);
      toast.success(t('toast.created'));
      router.push(`/recipes/ladders/${ladderId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.failed'));
    }
  };

  const inputClass = 'w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {prefill && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('form.prefilledFrom', { name: prefill.name })}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ladder-name" className="block text-sm font-medium mb-1.5">{t('form.name')}</label>
          <input
            id="ladder-name"
            autoFocus
            autoComplete="off"
            {...register('name')}
            className={inputClass}
            placeholder={t('form.namePlaceholder')}
          />
          {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="ladder-caliber" className="block text-sm font-medium mb-1.5">{t('form.caliber')}</label>
          <input type="hidden" {...register('caliber')} />
          <CaliberField
            id="ladder-caliber"
            calibers={calibers}
            value={watch('caliber') ?? ''}
            onChange={(c) => setValue('caliber', c, { shouldValidate: true })}
          />
          {errors.caliber && <p className="text-red-600 text-xs mt-1">{errors.caliber.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ladder-projectile" className="block text-sm font-medium mb-1.5">{t('form.projectile')}</label>
          <select id="ladder-projectile" autoComplete="off" {...register('projectileId')} className={inputClass}>
            <option value="">{t('form.projectilePlaceholder')}</option>
            {projectiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand} {p.type ? `– ${p.type}` : ''} ({p.weightGr} gr)
              </option>
            ))}
          </select>
          {errors.projectileId && <p className="text-red-600 text-xs mt-1">{errors.projectileId.message}</p>}
        </div>

        <div>
          <label htmlFor="ladder-propellant" className="block text-sm font-medium mb-1.5">{t('form.propellant')}</label>
          <select id="ladder-propellant" autoComplete="off" {...register('propellantId')} className={inputClass}>
            <option value="">{t('form.propellantPlaceholder')}</option>
            {propellants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand} – {p.type}
              </option>
            ))}
          </select>
          {errors.propellantId && <p className="text-red-600 text-xs mt-1">{errors.propellantId.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="ladder-primer" className="block text-sm font-medium mb-1.5">{t('form.primer')}</label>
          <select id="ladder-primer" autoComplete="off" {...register('primerId')} className={inputClass}>
            <option value="">{t('form.primerPlaceholder')}</option>
            {primers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand} {p.type.replace('_', ' ')} {p.magnum ? '(Magnum)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ladder-cartridge" className="block text-sm font-medium mb-1.5">{t('form.cartridge')}</label>
          <select id="ladder-cartridge" autoComplete="off" {...register('cartridgeId')} className={inputClass}>
            <option value="">{t('form.cartridgePlaceholder')}</option>
            {cartridges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand} – {c.caliber.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ladder-rifle" className="block text-sm font-medium mb-1.5">{t('form.rifle')}</label>
          <select id="ladder-rifle" autoComplete="off" {...register('rifleId')} className={inputClass}>
            <option value="">{t('form.riflePlaceholder')}</option>
            {rifles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} – {r.caliber.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="ladder-coal" className="block text-sm font-medium mb-1.5">{t('form.coal')}</label>
          <input id="ladder-coal" type="number" step="0.001" inputMode="decimal" autoComplete="off" {...register('coal')} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ladder-start" className="block text-sm font-medium mb-1.5">{t('form.startCharge')}</label>
          <input id="ladder-start" type="number" step="0.1" inputMode="decimal" autoComplete="off" {...register('startChargeGr')} className={inputClass} />
          {errors.startChargeGr && <p className="text-red-600 text-xs mt-1">{errors.startChargeGr.message}</p>}
        </div>
        <div>
          <label htmlFor="ladder-step" className="block text-sm font-medium mb-1.5">{t('form.step')}</label>
          <input id="ladder-step" type="number" step="0.1" inputMode="decimal" autoComplete="off" {...register('stepGr')} className={inputClass} />
          {errors.stepGr && <p className="text-red-600 text-xs mt-1">{errors.stepGr.message}</p>}
        </div>
        <div>
          <label htmlFor="ladder-count" className="block text-sm font-medium mb-1.5">{t('form.count')}</label>
          <input
            id="ladder-count"
            type="number"
            min={LADDER_MIN_STEPS}
            max={LADDER_MAX_STEPS}
            inputMode="numeric"
            autoComplete="off"
            {...register('count')}
            className={inputClass}
          />
          {errors.count && <p className="text-red-600 text-xs mt-1">{errors.count.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="ladder-notes" className="block text-sm font-medium mb-1.5">{t('form.notes')}</label>
        <textarea
          id="ladder-notes"
          autoComplete="off"
          rows={3}
          {...register('notes')}
          className={inputClass}
          placeholder={t('form.notesPlaceholder')}
        />
      </div>

      {/* Live preview of the recipes that will be created */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
        <p className="text-sm font-medium mb-2">{t('form.previewTitle')}</p>
        {preview ? (
          <ul className="space-y-1">
            {preview.map((c) => (
              <li key={c.index} className="text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                {c.index}. {name || t('form.previewUnnamed')}{name ? ' ' : ''}— {c.label}gr
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">{t('form.previewHint')}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/recipes')}
          className="flex-1 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm"
        >
          {t('form.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {isSubmitting ? t('form.saving') : t('form.create')}
        </button>
      </div>
    </form>
  );
}