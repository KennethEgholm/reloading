-- CreateTable
CREATE TABLE "RangeGroup" (
    "id" TEXT NOT NULL,
    "rangeLogId" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION NOT NULL,
    "shotCount" INTEGER NOT NULL,
    "groupSizeMm" DOUBLE PRECISION NOT NULL,
    "moa" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RangeGroup_rangeLogId_idx" ON "RangeGroup"("rangeLogId");

-- AddForeignKey
ALTER TABLE "RangeGroup" ADD CONSTRAINT "RangeGroup_rangeLogId_fkey" FOREIGN KEY ("rangeLogId") REFERENCES "RangeLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
