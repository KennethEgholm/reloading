-- Twist is stored in inches per revolution, not millimetres.
ALTER TABLE "Rifle" RENAME COLUMN "twistMm" TO "twistIn";
UPDATE "Rifle" SET "twistIn" = ROUND(("twistIn" / 25.4)::numeric, 2);
