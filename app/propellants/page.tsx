import { prisma } from '@/lib/prisma';
import { createPropellant } from './actions';
import { PropellantForm } from './PropellantForm';
import { PropellantsTable } from './PropellantsTable';

export default async function PropellantsPage() {
  const propellants = await prisma.propellant.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Propellants</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage your powder inventory (amount in grams)
          </p>
        </div>

        <PropellantForm 
          action={createPropellant} 
          title="Add New Propellant" 
          submitLabel="Create Propellant"
        />
      </div>

      <PropellantsTable propellants={propellants} />
    </div>
  );
}
