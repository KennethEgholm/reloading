-- Complete LoadLog's snapshot model: add COAL and cartridge snapshot columns
-- (mirroring RangeLog, which already captures both). Frozen at load-create time
-- so load history survives recipe edits and deletion. All nullable — no backfill
-- (the dev DB has no LoadLog rows), and existing rows simply read NULL until they
-- are replaced by new loads created after this migration.
ALTER TABLE "LoadLog" ADD COLUMN "coal" DOUBLE PRECISION;
ALTER TABLE "LoadLog" ADD COLUMN "cartridgeBrand" TEXT;
ALTER TABLE "LoadLog" ADD COLUMN "cartridgeCaliber" TEXT;
ALTER TABLE "LoadLog" ADD COLUMN "cartridgeWaterCapacityGr" DOUBLE PRECISION;