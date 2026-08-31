-- CreateTable
CREATE TABLE "Ladder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "winningRecipeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ladder_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "ladderId" TEXT,
ADD COLUMN "ladderChargeIndex" INTEGER;

-- CreateIndex
CREATE INDEX "Recipe_ladderId_idx" ON "Recipe"("ladderId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_ladderId_fkey" FOREIGN KEY ("ladderId") REFERENCES "Ladder"("id") ON DELETE SET NULL ON UPDATE CASCADE;