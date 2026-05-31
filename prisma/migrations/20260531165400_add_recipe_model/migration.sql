-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caliber" TEXT NOT NULL,
    "projectileId" TEXT NOT NULL,
    "propellantId" TEXT NOT NULL,
    "primerId" TEXT,
    "chargeGr" DOUBLE PRECISION,
    "coal" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_projectileId_fkey" FOREIGN KEY ("projectileId") REFERENCES "Projectile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_propellantId_fkey" FOREIGN KEY ("propellantId") REFERENCES "Propellant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_primerId_fkey" FOREIGN KEY ("primerId") REFERENCES "Primer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
