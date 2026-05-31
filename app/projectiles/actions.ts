'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

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

export async function deleteProjectile(id: string) {
  await prisma.projectile.delete({
    where: { id },
  });

  revalidatePath('/projectiles');
}

export async function adjustProjectileAmount(id: string, delta: number) {
  const projectile = await prisma.projectile.findUnique({ where: { id } });
  if (!projectile) throw new Error('Projectile not found');

  const newAmount = Math.max(0, projectile.amount + delta);

  await prisma.projectile.update({
    where: { id },
    data: { amount: newAmount },
  });

  revalidatePath('/projectiles');
}
