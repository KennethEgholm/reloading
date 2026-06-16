'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import type { DeleteResult } from '@/lib/types';

export async function createPropellant(formData: FormData) {
  const t = await getTranslations('propellants');
  const brand = formData.get('brand') as string;
  const type = formData.get('type') as string;
  const amountGr = parseFloat(formData.get('amountGr') as string);
  const description = (formData.get('description') as string) || null;

  if (!brand || !type || isNaN(amountGr)) {
    throw new Error(t('form.validation.brandRequired'));
  }

  await prisma.propellant.create({
    data: {
      brand,
      type,
      amountGr,
      description,
    },
  });

  revalidatePath('/propellants');
}

export async function updatePropellant(id: string, formData: FormData) {
  const t = await getTranslations('propellants');
  const brand = formData.get('brand') as string;
  const type = formData.get('type') as string;
  const amountGr = parseFloat(formData.get('amountGr') as string);
  const description = (formData.get('description') as string) || null;

  if (!brand || !type || isNaN(amountGr)) {
    throw new Error(t('form.validation.brandRequired'));
  }

  await prisma.propellant.update({
    where: { id },
    data: {
      brand,
      type,
      amountGr,
      description,
    },
  });

  revalidatePath('/propellants');
}

// Returns a result object rather than throwing (see DeleteResult) so the
// "used by N recipes" reason survives a production build.
export async function deletePropellant(id: string): Promise<DeleteResult> {
  const t = await getTranslations('propellants');
  const inUse = await prisma.recipe.count({ where: { propellantId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      error: t('delete.inUse', { count: inUse }),
    };
  }

  await prisma.propellant.delete({
    where: { id },
  });

  revalidatePath('/propellants');
  revalidatePath('/');
  return { ok: true };
}
