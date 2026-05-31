-- CreateEnum
CREATE TYPE "PrimerType" AS ENUM ('SMALL_RIFLE', 'LARGE_RIFLE', 'SMALL_PISTOL', 'LARGE_PISTOL');

-- CreateTable
CREATE TABLE "Propellant" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountGr" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Propellant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projectile" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "weightGr" DOUBLE PRECISION NOT NULL,
    "caliber" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projectile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Primer" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "magnum" BOOLEAN NOT NULL DEFAULT false,
    "type" "PrimerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Primer_pkey" PRIMARY KEY ("id")
);
