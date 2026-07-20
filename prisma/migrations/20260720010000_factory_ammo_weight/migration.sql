-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('GR', 'G');

-- AlterTable
ALTER TABLE "FactoryAmmo" ADD COLUMN "projectileWeight" DOUBLE PRECISION,
ADD COLUMN "projectileWeightUnit" "WeightUnit" NOT NULL DEFAULT 'GR';