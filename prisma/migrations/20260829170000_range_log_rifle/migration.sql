-- AlterTable
ALTER TABLE "RangeLog" ADD COLUMN "rifleId" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "rifleName" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "rifleCaliber" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "rifleBarrelLengthMm" DOUBLE PRECISION;
ALTER TABLE "RangeLog" ADD COLUMN "rifleTwistIn" DOUBLE PRECISION;
ALTER TABLE "RangeLog" ADD COLUMN "rifleSightHeightCm" DOUBLE PRECISION;
ALTER TABLE "RangeLog" ADD COLUMN "rifleZeroDistanceM" DOUBLE PRECISION;
ALTER TABLE "RangeLog" ADD COLUMN "rifleClickCmAt100m" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "RangeLog_rifleId_idx" ON "RangeLog"("rifleId");

-- AddForeignKey
ALTER TABLE "RangeLog" ADD CONSTRAINT "RangeLog_rifleId_fkey" FOREIGN KEY ("rifleId") REFERENCES "Rifle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
