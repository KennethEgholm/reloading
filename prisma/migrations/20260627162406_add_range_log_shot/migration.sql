-- CreateTable
CREATE TABLE "RangeLogShot" (
    "id" TEXT NOT NULL,
    "rangeLogId" TEXT NOT NULL,
    "shotIndex" INTEGER NOT NULL,
    "velocity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RangeLogShot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RangeLogShot_rangeLogId_idx" ON "RangeLogShot"("rangeLogId");

-- AddForeignKey
ALTER TABLE "RangeLogShot" ADD CONSTRAINT "RangeLogShot_rangeLogId_fkey" FOREIGN KEY ("rangeLogId") REFERENCES "RangeLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
