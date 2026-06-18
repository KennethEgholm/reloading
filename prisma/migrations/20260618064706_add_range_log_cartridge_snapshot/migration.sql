-- Complete RangeLog's snapshot model: add the cartridge snapshot columns to match
-- LoadLog (which already captures brand/caliber/water capacity). Frozen at
-- session-create time so range history survives recipe edits and deletion. All
-- nullable — no backfill (existing sessions simply read NULL until replaced by
-- new sessions created after this migration).
ALTER TABLE "RangeLog" ADD COLUMN "cartridgeBrand" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "cartridgeCaliber" TEXT;
ALTER TABLE "RangeLog" ADD COLUMN "cartridgeWaterCapacityGr" DOUBLE PRECISION;