-- CreateTable
CREATE TABLE "Rifle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caliberId" TEXT NOT NULL,
    "barrelLengthMm" DOUBLE PRECISION NOT NULL,
    "twistMm" DOUBLE PRECISION NOT NULL,
    "sightHeightCm" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rifle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rifle_caliberId_idx" ON "Rifle"("caliberId");

-- AddForeignKey
ALTER TABLE "Rifle" ADD CONSTRAINT "Rifle_caliberId_fkey" FOREIGN KEY ("caliberId") REFERENCES "Caliber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
