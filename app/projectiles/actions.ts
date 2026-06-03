'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import type { DeleteResult } from '@/lib/types';

export async function createProjectile(formData: FormData) {
  const brand = formData.get('brand') as string;
  const type = formData.get('type') as string;
  const weightGr = parseFloat(formData.get('weightGr') as string);
  const caliber = formData.get('caliber') as string;
  const amount = parseInt(formData.get('amount') as string) || 0;
  const description = (formData.get('description') as string) || null;

  if (!brand || !type || isNaN(weightGr) || !caliber) {
    throw new Error('Missing required fields');
  }

  await prisma.projectile.create({
    data: {
      brand,
      type,
      weightGr,
      caliber,
      amount,
      description,
    },
  });

  revalidatePath('/projectiles');
}

export async function updateProjectile(id: string, formData: FormData) {
  const brand = formData.get('brand') as string;
  const type = formData.get('type') as string;
  const weightGr = parseFloat(formData.get('weightGr') as string);
  const caliber = formData.get('caliber') as string;
  const amount = parseInt(formData.get('amount') as string) || 0;
  const description = (formData.get('description') as string) || null;

  await prisma.projectile.update({
    where: { id },
    data: {
      brand,
      type,
      weightGr,
      caliber,
      amount,
      description,
    },
  });

  revalidatePath('/projectiles');
}

// Returns a result object rather than throwing: Next.js redacts thrown Server
// Action error messages in production, so a user-facing reason ("used by N
// recipes") must be returned as data to survive a production build.
export async function deleteProjectile(id: string): Promise<DeleteResult> {
  const inUse = await prisma.recipe.count({ where: { projectileId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      error: `Can't delete: this projectile is used by ${inUse} recipe${inUse === 1 ? '' : 's'}. Remove it from ${inUse === 1 ? 'that recipe' : 'those recipes'} first.`,
    };
  }

  await prisma.projectile.delete({
    where: { id },
  });

  revalidatePath('/projectiles');
  revalidatePath('/');
  return { ok: true };
}
