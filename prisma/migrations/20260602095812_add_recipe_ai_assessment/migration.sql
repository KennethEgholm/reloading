-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "aiCheckedAt" TIMESTAMP(3),
ADD COLUMN     "aiConcerns" TEXT,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "aiVerdict" TEXT;
