'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { createCartridgeSchema, formatZodError } from '@/lib/schemas';
import type { DeleteResult } from '@/lib/types';

function parseCartridgeForm(formData: FormData, t: (key: string) => string) {
  const parsed = createCartridgeSchema(t).safeParse({
    brand: formData.get('brand'),
    caliber: formData.get('caliber'),
    waterCapacityGr: formData.get('waterCapacityGr'),
    amount: formData.get('amount'),
    description: formData.get('description'),
  });
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return parsed.data;
}

export async function createCartridge(formData: FormData) {
  const t = await getTranslations('cartridges');
  const data = parseCartridgeForm(formData, t);

  await prisma.cartridge.create({ data });

  revalidatePath('/cartridges');
  revalidatePath('/');
}

export async function updateCartridge(id: string, formData: FormData) {
  const t = await getTranslations('cartridges');
  const data = parseCartridgeForm(formData, t);

  await prisma.cartridge.update({
    where: { id },
    data,
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
