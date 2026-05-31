import { prisma } from '@/lib/prisma';
import { createPrimer } from './actions';
import { PrimerForm } from './PrimerForm';
import { PrimersTable } from './PrimersTable';

export default async function PrimersPage() {
  const primers = await prisma.primer.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Primers</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage your primer inventory
          </p>
        </div>

        <PrimerForm 
          action={createPrimer} 
          title="Add New Primer" 
          submitLabel="Create Primer"
        />
      </div>

      <PrimersTable primers={primers} />
    </div>
  );
}
