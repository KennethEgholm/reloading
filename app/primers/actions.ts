'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { createPrimerSchema, formatZodError } from '@/lib/schemas';
import type { DeleteResult } from '@/lib/types';

function parsePrimerForm(formData: FormData, t: (key: string) => string) {
  const parsed = createPrimerSchema(t).safeParse({
    brand: formData.get('brand'),
    type: formData.get('type'),
    magnum: formData.get('magnum'),
    amount: formData.get('amount'),
    description: formData.get('description'),
  });
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return parsed.data;
}

export async function createPrimer(formData: FormData) {
  const t = await getTranslations('primers');
  const data = parsePrimerForm(formData, t);

  await prisma.primer.create({ data });

  revalidatePath('/primers');
}

export async function updatePrimer(id: string, formData: FormData) {
  const t = await getTranslations('primers');
  const data = parsePrimerForm(formData, t);

  await prisma.primer.update({
    where: { id },
    data,
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
