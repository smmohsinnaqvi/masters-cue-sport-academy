CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "sessions"
  ADD CONSTRAINT "no_overlapping_sessions"
  EXCLUDE USING gist (
    "table_id" WITH =,
    tsrange("start_time", "planned_end") WITH &&
  )
  WHERE ("status" IN ('HELD', 'CONFIRMED', 'ONGOING'));
