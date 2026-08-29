'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RifleForm } from './RifleForm';
import type { RifleWithCaliber, CaliberOption } from '@/lib/types';

interface RifleEditButtonProps {
  rifle: RifleWithCaliber;
  calibers: CaliberOption[];
}

export function RifleEditButton({ rifle, calibers }: RifleEditButtonProps) {
  const t = useTranslations('rifles');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        {tc('edit')}
      </button>
      <RifleForm
        action={async (formData) => {
          const { updateRifle } = await import('./actions');
          await updateRifle(rifle.id, formData);
        }}
        defaultValues={rifle}
        calibers={calibers}
        title={t('form.titleEdit')}
        submitLabel={t('form.saveChanges')}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
