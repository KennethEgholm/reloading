-- AlterTable
ALTER TABLE "RangeLog" ADD COLUMN "mainImageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RangeLog_mainImageId_key" ON "RangeLog"("mainImageId");

-- AddForeignKey
ALTER TABLE "RangeLog" ADD CONSTRAINT "RangeLog_mainImageId_fkey" FOREIGN KEY ("mainImageId") REFERENCES "RangeLogImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
