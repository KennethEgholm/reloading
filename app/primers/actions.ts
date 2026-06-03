'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PrimerType } from '@prisma/client';
import type { DeleteResult } from '@/lib/types';

export async function createPrimer(formData: FormData) {
  const brand = formData.get('brand') as string;
  const type = formData.get('type') as PrimerType;
  const magnum = formData.get('magnum') === 'on';
  const amount = parseInt(formData.get('amount') as string, 10);
  const description = (formData.get('description') as string) || null;

  if (!brand || !type || isNaN(amount)) {
    throw new Error('Missing required fields');
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
  const brand = formData.get('brand') as string;
  const type = formData.get('type') as PrimerType;
  const magnum = formData.get('magnum') === 'on';
  const amount = parseInt(formData.get('amount') as string, 10);
  const description = (formData.get('description') as string) || null;

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
  const inUse = await prisma.recipe.count({ where: { primerId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      error: `Can't delete: this primer is used by ${inUse} recipe${inUse === 1 ? '' : 's'}. Remove it from ${inUse === 1 ? 'that recipe' : 'those recipes'} first.`,
    };
  }

  await prisma.primer.delete({
    where: { id },
  });

  revalidatePath('/primers');
  revalidatePath('/');
  return { ok: true };
}
