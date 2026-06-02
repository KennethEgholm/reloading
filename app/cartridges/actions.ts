'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function createCartridge(formData: FormData) {
  const brand = formData.get('brand') as string;
  const caliber = formData.get('caliber') as string;
  const waterCapacityGr = formData.get('waterCapacityGr')
    ? parseFloat(formData.get('waterCapacityGr') as string)
    : null;
  const amount = formData.get('amount') ? parseInt(formData.get('amount') as string, 10) : 0;
  const description = (formData.get('description') as string) || null;

  if (!brand || !caliber) {
    throw new Error('Brand and caliber are required');
  }

  await prisma.cartridge.create({
    data: {
      brand,
      caliber,
      waterCapacityGr,
      amount: isNaN(amount) ? 0 : amount,
      description,
    },
  });

  revalidatePath('/cartridges');
  revalidatePath('/');
}

export async function updateCartridge(id: string, formData: FormData) {
  const brand = formData.get('brand') as string;
  const caliber = formData.get('caliber') as string;
  const waterCapacityGr = formData.get('waterCapacityGr')
    ? parseFloat(formData.get('waterCapacityGr') as string)
    : null;
  const amount = formData.get('amount') ? parseInt(formData.get('amount') as string, 10) : 0;
  const description = (formData.get('description') as string) || null;

  if (!brand || !caliber) {
    throw new Error('Brand and caliber are required');
  }

  await prisma.cartridge.update({
    where: { id },
    data: {
      brand,
      caliber,
      waterCapacityGr,
      amount: isNaN(amount) ? 0 : amount,
      description,
    },
  });

  revalidatePath('/cartridges');
  revalidatePath('/');
}

export async function deleteCartridge(id: string) {
  await prisma.cartridge.delete({
    where: { id },
  });

  revalidatePath('/cartridges');
  revalidatePath('/');
}
