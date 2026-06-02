import { prisma } from '@/lib/prisma';
import { createCartridge } from './actions';
import { CartridgeForm } from './CartridgeForm';
import { CartridgesTable } from './CartridgesTable';

export default async function CartridgesPage() {
  const cartridges = await prisma.cartridge.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cartridges</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Brass / case inventory (water capacity in grains)
          </p>
        </div>

        <CartridgeForm
          action={createCartridge}
          title="Add New Cartridge"
          submitLabel="Create Cartridge"
        />
      </div>

      <CartridgesTable cartridges={cartridges} />
    </div>
  );
}
