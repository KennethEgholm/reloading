'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import type { DeleteResult } from '@/lib/types';

export async function createPropellant(formData: FormData) {
  const brand = formData.get('brand') as string;
  const type = formData.get('type') as string;
  const amountGr = parseFloat(formData.get('amountGr') as string);
  const description = (formData.get('description') as string) || null;

  if (!brand || !type || isNaN(amountGr)) {
    throw new Error('Missing required fields');
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
  const brand = formData.get('brand') as string;
  const type = formData.get('type') as string;
  const amountGr = parseFloat(formData.get('amountGr') as string);
  const description = (formData.get('description') as string) || null;

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
  const inUse = await prisma.recipe.count({ where: { propellantId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      error: `Can't delete: this propellant is used by ${inUse} recipe${inUse === 1 ? '' : 's'}. Remove it from ${inUse === 1 ? 'that recipe' : 'those recipes'} first.`,
    };
  }

  await prisma.propellant.delete({
    where: { id },
  });

  revalidatePath('/propellants');
  revalidatePath('/');
  return { ok: true };
}
