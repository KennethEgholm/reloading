'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import type { DeleteResult } from '@/lib/types';

export async function createCartridge(formData: FormData) {
  const t = await getTranslations('cartridges');
  const brand = formData.get('brand') as string;
  const caliber = formData.get('caliber') as string;
  const waterCapacityGr = formData.get('waterCapacityGr')
    ? parseFloat(formData.get('waterCapacityGr') as string)
    : null;
  const amount = formData.get('amount') ? parseInt(formData.get('amount') as string, 10) : 0;
  const description = (formData.get('description') as string) || null;

  if (!brand || !caliber) {
    throw new Error(t('form.validation.brandRequired'));
  }

  await prisma.cartridge.create({
    data: {
      brand,
      caliber,
      waterCapacityGr,
      amount: isNaN(amount) ? 0 : amount,
      description,
    },
  });

  revalidatePath('/cartridges');
  revalidatePath('/');
}

export async function updateCartridge(id: string, formData: FormData) {
  const t = await getTranslations('cartridges');
  const brand = formData.get('brand') as string;
  const caliber = formData.get('caliber') as string;
  const waterCapacityGr = formData.get('waterCapacityGr')
    ? parseFloat(formData.get('waterCapacityGr') as string)
    : null;
  const amount = formData.get('amount') ? parseInt(formData.get('amount') as string, 10) : 0;
  const description = (formData.get('description') as string) || null;

  if (!brand || !caliber) {
    throw new Error(t('form.validation.brandRequired'));
  }

  await prisma.cartridge.update({
    where: { id },
    data: {
      brand,
      caliber,
      waterCapacityGr,
      amount: isNaN(amount) ? 0 : amount,
      description,
    },
  });

  revalidatePath('/cartridges');
  revalidatePath('/');
}

// Returns a result object rather than throwing (see DeleteResult) so the
// "used by N recipes" reason survives a production build.
export async function deleteCartridge(id: string): Promise<DeleteResult> {
  const t = await getTranslations('cartridges');
  const inUse = await prisma.recipe.count({ where: { cartridgeId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      error: t('delete.inUse', { count: inUse }),
    };
  }

  await prisma.cartridge.delete({
    where: { id },
  });

  revalidatePath('/cartridges');
  revalidatePath('/');
  return { ok: true };
}
