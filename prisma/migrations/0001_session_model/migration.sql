CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "SessionSource" AS ENUM ('ONLINE', 'WALKIN', 'MAINTENANCE');
CREATE TYPE "SessionStatus" AS ENUM ('HELD', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED');

CREATE TABLE "supervisors" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'supervisor',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supervisors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supervisors_username_key" ON "supervisors"("username");

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "table_id" TEXT NOT NULL,
  "source" "SessionSource" NOT NULL,
  "status" "SessionStatus" NOT NULL,
  "start_time" TIMESTAMP(3) NOT NULL,
  "planned_end" TIMESTAMP(3) NOT NULL,
  "actual_start" TIMESTAMP(3),
  "actual_end" TIMESTAMP(3),
  "hold_expires_at" TIMESTAMP(3),
  "customer_name" TEXT,
  "customer_phone" TEXT,
  "ref_code" TEXT,
  "players" JSONB,
  "loser_name" TEXT,
  "rate_snapshot" INTEGER,
  "duration_minutes" INTEGER,
  "amount" INTEGER,
  "payment_status" TEXT NOT NULL DEFAULT 'UNPAID',
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_ref_code_key" ON "sessions"("ref_code");
CREATE INDEX "sessions_table_id_status_idx" ON "sessions"("table_id", "status");
CREATE INDEX "sessions_table_id_start_time_planned_end_idx" ON "sessions"("table_id", "start_time", "planned_end");
CREATE INDEX "sessions_status_hold_expires_at_idx" ON "sessions"("status", "hold_expires_at");

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_table_id_fkey"
  FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "supervisors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sessions"
  ADD CONSTRAINT "no_overlapping_sessions"
  EXCLUDE USING gist (
    "table_id" WITH =,
    tstzrange("start_time", "planned_end" + interval '10 minutes') WITH &&
  )
  WHERE ("status" IN ('HELD', 'CONFIRMED', 'ONGOING'));
