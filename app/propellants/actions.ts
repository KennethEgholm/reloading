'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { createPropellantSchema, formatZodError } from '@/lib/schemas';
import type { DeleteResult } from '@/lib/types';

function parsePropellantForm(formData: FormData, t: (key: string) => string) {
  const parsed = createPropellantSchema(t).safeParse({
    brand: formData.get('brand'),
    type: formData.get('type'),
    amountGr: formData.get('amountGr'),
    description: formData.get('description'),
  });
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return parsed.data;
}

export async function createPropellant(formData: FormData) {
  const t = await getTranslations('propellants');
  const data = parsePropellantForm(formData, t);

  await prisma.propellant.create({ data });

  revalidatePath('/propellants');
}

export async function updatePropellant(id: string, formData: FormData) {
  const t = await getTranslations('propellants');
  const data = parsePropellantForm(formData, t);

  await prisma.propellant.update({
    where: { id },
    data,
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
