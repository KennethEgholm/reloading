-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "rifleId" TEXT;

-- CreateIndex
CREATE INDEX "Recipe_rifleId_idx" ON "Recipe"("rifleId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_rifleId_fkey" FOREIGN KEY ("rifleId") REFERENCES "Rifle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
