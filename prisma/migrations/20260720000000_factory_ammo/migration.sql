-- CreateTable
CREATE TABLE "FactoryAmmo" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "caliberId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "boxImageFilename" TEXT,
    "roundImageFilename" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactoryAmmo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactoryAmmoSession" (
    "id" TEXT NOT NULL,
    "factoryAmmoId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "conditions" TEXT,
    "roundsFired" INTEGER NOT NULL,
    "velocityMin" DOUBLE PRECISION,
    "velocityMax" DOUBLE PRECISION,
    "velocityAvg" DOUBLE PRECISION,
    "extremeSpread" DOUBLE PRECISION,
    "stdDev" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactoryAmmoSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactoryAmmoShot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "shotIndex" INTEGER NOT NULL,
    "velocity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FactoryAmmoShot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactoryAmmoGroup" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION NOT NULL,
    "shotCount" INTEGER NOT NULL,
    "groupSizeMm" DOUBLE PRECISION NOT NULL,
    "moa" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactoryAmmoGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FactoryAmmo_caliberId_idx" ON "FactoryAmmo"("caliberId");

-- CreateIndex
CREATE INDEX "FactoryAmmoSession_factoryAmmoId_idx" ON "FactoryAmmoSession"("factoryAmmoId");

-- CreateIndex
CREATE INDEX "FactoryAmmoShot_sessionId_idx" ON "FactoryAmmoShot"("sessionId");

-- CreateIndex
CREATE INDEX "FactoryAmmoGroup_sessionId_idx" ON "FactoryAmmoGroup"("sessionId");

-- AddForeignKey
ALTER TABLE "FactoryAmmo" ADD CONSTRAINT "FactoryAmmo_caliberId_fkey" FOREIGN KEY ("caliberId") REFERENCES "Caliber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactoryAmmoSession" ADD CONSTRAINT "FactoryAmmoSession_factoryAmmoId_fkey" FOREIGN KEY ("factoryAmmoId") REFERENCES "FactoryAmmo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactoryAmmoShot" ADD CONSTRAINT "FactoryAmmoShot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FactoryAmmoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactoryAmmoGroup" ADD CONSTRAINT "FactoryAmmoGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FactoryAmmoSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;