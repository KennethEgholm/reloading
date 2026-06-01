-- AlterTable
ALTER TABLE "LoadLog" ADD COLUMN "recipeName" TEXT;
ALTER TABLE "LoadLog" ADD COLUMN "caliber" TEXT;
ALTER TABLE "LoadLog" ADD COLUMN "chargeGr" DOUBLE PRECISION;
ALTER TABLE "LoadLog" ADD COLUMN "projectileBrand" TEXT;
ALTER TABLE "LoadLog" ADD COLUMN "projectileType" TEXT;
ALTER TABLE "LoadLog" ADD COLUMN "projectileWeightGr" DOUBLE PRECISION;
ALTER TABLE "LoadLog" ADD COLUMN "propellantBrand" TEXT;
ALTER TABLE "LoadLog" ADD COLUMN "propellantType" TEXT;
ALTER TABLE "LoadLog" ADD COLUMN "primerBrand" TEXT;
ALTER TABLE "LoadLog" ADD COLUMN "primerType" TEXT;
ALTER TABLE "LoadLog" ADD COLUMN "calculatedV0" DOUBLE PRECISION;
ALTER TABLE "LoadLog" ADD COLUMN "measuredV0" DOUBLE PRECISION;
ALTER TABLE "LoadLog" ADD COLUMN "fillRate" DOUBLE PRECISION;

-- Make recipeId nullable for historical integrity
ALTER TABLE "LoadLog" ALTER COLUMN "recipeId" DROP NOT NULL;
