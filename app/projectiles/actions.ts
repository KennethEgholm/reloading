'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { createProjectileSchema, formatZodError } from '@/lib/schemas';
import type { DeleteResult } from '@/lib/types';

function parseProjectileForm(formData: FormData, t: (key: string) => string) {
  const parsed = createProjectileSchema(t).safeParse({
    brand: formData.get('brand'),
    type: formData.get('type'),
    weightGr: formData.get('weightGr'),
    caliber: formData.get('caliber'),
    amount: formData.get('amount'),
    description: formData.get('description'),
  });
  if (!parsed.success) {
    throw new Error(formatZodError(parsed.error));
  }
  return parsed.data;
}

export async function createProjectile(formData: FormData) {
  const t = await getTranslations('projectiles');
  const data = parseProjectileForm(formData, t);

  await prisma.projectile.create({ data });

  revalidatePath('/projectiles');
}

export async function updateProjectile(id: string, formData: FormData) {
  const t = await getTranslations('projectiles');
  const data = parseProjectileForm(formData, t);

  await prisma.projectile.update({
    where: { id },
    data,
  });

  revalidatePath('/projectiles');
}

// Returns a result object rather than throwing: Next.js redacts thrown Server
// Action error messages in production, so a user-facing reason ("used by N
// recipes") must be returned as data to survive a production build.
export async function deleteProjectile(id: string): Promise<DeleteResult> {
  const t = await getTranslations('projectiles');
  const inUse = await prisma.recipe.count({ where: { projectileId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      error: t('delete.inUse', { count: inUse }),
    };
  }

  await prisma.projectile.delete({
    where: { id },
  });

  revalidatePath('/projectiles');
  revalidatePath('/');
  return { ok: true };
}
