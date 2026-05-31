'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

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

export async function deletePropellant(id: string) {
  await prisma.propellant.delete({
    where: { id },
  });

  revalidatePath('/propellants');
}

export async function adjustPropellantAmount(id: string, delta: number) {
  const propellant = await prisma.propellant.findUnique({ where: { id } });
  if (!propellant) throw new Error('Propellant not found');

  const newAmount = Math.max(0, Math.round((propellant.amountGr + delta) * 100) / 100);

  await prisma.propellant.update({
    where: { id },
    data: { amountGr: newAmount },
  });

  revalidatePath('/propellants');
}
