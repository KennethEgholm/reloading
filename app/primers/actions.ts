'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PrimerType } from '@prisma/client';

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

export async function deletePrimer(id: string) {
  await prisma.primer.delete({
    where: { id },
  });

  revalidatePath('/primers');
}
