import { prisma } from '@/lib/prisma';
import { createProjectile } from './actions';
import { ProjectileForm } from './ProjectileForm';
import { ProjectilesTable } from './ProjectilesTable';

export default async function ProjectilesPage() {
  const projectiles = await prisma.projectile.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projectiles</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage your bullet / projectile inventory
          </p>
        </div>

        <ProjectileForm 
          action={createProjectile} 
          title="Add New Projectile" 
          submitLabel="Create Projectile"
        />
      </div>

      <ProjectilesTable projectiles={projectiles} />
    </div>
  );
}
