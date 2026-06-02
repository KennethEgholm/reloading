-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "cartridgeId" TEXT;

-- CreateTable
CREATE TABLE "Cartridge" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "caliber" TEXT NOT NULL,
    "waterCapacityGr" DOUBLE PRECISION,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cartridge_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_cartridgeId_fkey" FOREIGN KEY ("cartridgeId") REFERENCES "Cartridge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
