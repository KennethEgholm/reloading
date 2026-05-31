import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [propellantCount, projectileCount, primerCount] = await Promise.all([
      prisma.propellant.count(),
      prisma.projectile.count(),
      prisma.primer.count(),
    ]);

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      counts: {
        propellants: propellantCount,
        projectiles: projectileCount,
        primers: primerCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
