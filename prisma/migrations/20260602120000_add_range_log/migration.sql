-- CreateTable
CREATE TABLE "RangeLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "conditions" TEXT,
    "recipeId" TEXT NOT NULL,
    "roundsFired" INTEGER NOT NULL,
    "velocityMin" DOUBLE PRECISION,
    "velocityMax" DOUBLE PRECISION,
    "velocityAvg" DOUBLE PRECISION,
    "extremeSpread" DOUBLE PRECISION,
    "stdDev" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RangeLogImage" (
    "id" TEXT NOT NULL,
    "rangeLogId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RangeLogImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RangeLog" ADD CONSTRAINT "RangeLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RangeLogImage" ADD CONSTRAINT "RangeLogImage_rangeLogId_fkey" FOREIGN KEY ("rangeLogId") REFERENCES "RangeLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
