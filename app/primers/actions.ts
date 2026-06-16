'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { PrimerType } from '@prisma/client';
import type { DeleteResult } from '@/lib/types';

export async function createPrimer(formData: FormData) {
  const t = await getTranslations('primers');
  const brand = formData.get('brand') as string;
  const type = formData.get('type') as PrimerType;
  const magnum = formData.get('magnum') === 'on';
  const amount = parseInt(formData.get('amount') as string, 10);
  const description = (formData.get('description') as string) || null;

  if (!brand || !type || isNaN(amount)) {
    throw new Error(t('form.validation.brandRequired'));
  }

  await prisma.primer.create({
    data: {
      brand,
      type,
      magnum,
      amount,
      description,
    },
  });

  revalidatePath('/primers');
}

export async function updatePrimer(id: string, formData: FormData) {
  const t = await getTranslations('primers');
  const brand = formData.get('brand') as string;
  const type = formData.get('type') as PrimerType;
  const magnum = formData.get('magnum') === 'on';
  const amount = parseInt(formData.get('amount') as string, 10);
  const description = (formData.get('description') as string) || null;

  if (!brand || !type || isNaN(amount)) {
    throw new Error(t('form.validation.brandRequired'));
  }

  await prisma.primer.update({
    where: { id },
    data: {
      brand,
      type,
      magnum,
      amount,
      description,
    },
  });

  revalidatePath('/primers');
}

// Returns a result object rather than throwing (see DeleteResult) so the
// "used by N recipes" reason survives a production build.
export async function deletePrimer(id: string): Promise<DeleteResult> {
  const t = await getTranslations('primers');
  const inUse = await prisma.recipe.count({ where: { primerId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      error: t('delete.inUse', { count: inUse }),
    };
  }

  await prisma.primer.delete({
    where: { id },
  });

  revalidatePath('/primers');
  revalidatePath('/');
  return { ok: true };
}
