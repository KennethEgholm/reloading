-- CreateTable
CREATE TABLE "Caliber" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caliber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Caliber_name_key" ON "Caliber"("name");

-- Backfill: one Caliber row per distinct (case-insensitive) designation found
-- in the existing Recipe.caliber and Cartridge.caliber free-text columns. The
-- first spelling encountered for each lowercased key wins as the canonical name.
INSERT INTO "Caliber" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "name", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT ON (lower(btrim("name"))) btrim("name") AS "name"
    FROM (
        SELECT "caliber" AS "name" FROM "Recipe" WHERE "caliber" IS NOT NULL AND btrim("caliber") <> ''
        UNION ALL
        SELECT "caliber" AS "name" FROM "Cartridge" WHERE "caliber" IS NOT NULL AND btrim("caliber") <> ''
    ) AS combined
    ORDER BY lower(btrim("name")), "name"
) AS distinct_names;

-- AlterTable: add nullable FK columns first so we can backfill them.
ALTER TABLE "Recipe" ADD COLUMN "caliberId" TEXT;
ALTER TABLE "Cartridge" ADD COLUMN "caliberId" TEXT;

-- Backfill FK columns by matching the old free-text value (case-insensitive,
-- trimmed) to the canonical Caliber row.
UPDATE "Recipe" r
SET "caliberId" = c."id"
FROM "Caliber" c
WHERE lower(btrim(r."caliber")) = lower(c."name");

UPDATE "Cartridge" ct
SET "caliberId" = c."id"
FROM "Caliber" c
WHERE lower(btrim(ct."caliber")) = lower(c."name");

-- Enforce NOT NULL now that every row is populated (both columns were NOT NULL
-- as free text, so no row can be left without a match).
ALTER TABLE "Recipe" ALTER COLUMN "caliberId" SET NOT NULL;
ALTER TABLE "Cartridge" ALTER COLUMN "caliberId" SET NOT NULL;

-- Drop the old free-text columns.
ALTER TABLE "Recipe" DROP COLUMN "caliber";
ALTER TABLE "Cartridge" DROP COLUMN "caliber";

-- CreateIndex
CREATE INDEX "Recipe_caliberId_idx" ON "Recipe"("caliberId");
CREATE INDEX "Cartridge_caliberId_idx" ON "Cartridge"("caliberId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_caliberId_fkey" FOREIGN KEY ("caliberId") REFERENCES "Caliber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Cartridge" ADD CONSTRAINT "Cartridge_caliberId_fkey" FOREIGN KEY ("caliberId") REFERENCES "Caliber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
