CREATE INDEX IF NOT EXISTS "sessions_created_at_id_idx"
  ON "sessions" ("created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "sessions_source_created_at_id_idx"
  ON "sessions" ("source", "created_at" DESC, "id" DESC);
