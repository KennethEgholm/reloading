-- Snapshot columns (nullable), mirroring LoadLog's snapshot expansion. Frozen
-- at session-create time so range history survives recipe edits and deletion.
ALTER TABLE "RangeLog" ADD COLUMN "recipeName" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "caliber" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "chargeGr" DOUBLE PRECISION;
ALTER TABLE "RangeLog" ADD COLUMN "coal" DOUBLE PRECISION;
ALTER TABLE "RangeLog" ADD COLUMN "projectileBrand" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "projectileType" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "projectileWeightGr" DOUBLE PRECISION;
ALTER TABLE "RangeLog" ADD COLUMN "propellantBrand" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "propellantType" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "primerBrand" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "primerType" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "calculatedV0" DOUBLE PRECISION;
ALTER TABLE "RangeLog" ADD COLUMN "measuredV0" DOUBLE PRECISION;
ALTER TABLE "RangeLog" ADD COLUMN "fillRate" DOUBLE PRECISION;

-- Make recipeId nullable + switch the FK from RESTRICT to SET NULL, so deleting
-- a recipe nulls the pointer while the snapshot above preserves the record.
ALTER TABLE "RangeLog" DROP CONSTRAINT "RangeLog_recipeId_fkey";
ALTER TABLE "RangeLog" ALTER COLUMN "recipeId" DROP NOT NULL;
ALTER TABLE "RangeLog" ADD CONSTRAINT "RangeLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;