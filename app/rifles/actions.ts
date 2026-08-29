'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { createRifleSchema, formatZodError } from '@/lib/schemas';
import { resolveCaliberId } from '@/lib/resolveCaliber';
import type { DeleteResult } from '@/lib/types';

function parseRifleForm(formData: FormData, t: (key: string) => string) {
  const parsed = createRifleSchema(t).safeParse({
    name: formData.get('name'),
    caliber: formData.get('caliber'),
    barrelLengthMm: formData.get('barrelLengthMm'),
    twistIn: formData.get('twistIn'),
    sightHeightCm: formData.get('sightHeightCm'),
    zeroDistanceM: formData.get('zeroDistanceM'),
    clickCmAt100m: formData.get('clickCmAt100m'),
  });
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return parsed.data;
}

export async function createRifle(formData: FormData) {
  const t = await getTranslations('rifles');
  const { caliber, ...data } = parseRifleForm(formData, t);
  const caliberId = await resolveCaliberId(caliber, t('form.validation.caliberRequired'));

  await prisma.rifle.create({ data: { ...data, caliberId } });

  revalidatePath('/rifles');
  revalidatePath('/recipes');
  revalidatePath('/');
}

export async function updateRifle(id: string, formData: FormData) {
  const t = await getTranslations('rifles');
  const { caliber, ...data } = parseRifleForm(formData, t);
  const caliberId = await resolveCaliberId(caliber, t('form.validation.caliberRequired'));

  await prisma.rifle.update({
    where: { id },
    data: { ...data, caliberId },
  });

  revalidatePath('/rifles');
  revalidatePath(`/rifles/${id}`);
  revalidatePath('/recipes');
  revalidatePath('/range');
  revalidatePath('/');
}

export async function getRifleById(id: string) {
  return prisma.rifle.findUnique({
    where: { id },
    include: { caliber: true },
  });
}

export async function deleteRifle(id: string): Promise<DeleteResult> {
  await prisma.rifle.delete({
    where: { id },
  });

  revalidatePath('/rifles');
  revalidatePath('/recipes');
  revalidatePath('/range');
  revalidatePath('/');
  return { ok: true };
}
