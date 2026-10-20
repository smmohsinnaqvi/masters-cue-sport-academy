CREATE TYPE "SessionGameFormat" AS ENUM ('SINGLES', 'DOUBLES', 'GROUP');

ALTER TABLE "sessions"
  ADD COLUMN "game_format" "SessionGameFormat",
  ADD COLUMN "game_label" TEXT,
  ADD COLUMN "gross_amount" INTEGER,
  ADD COLUMN "discount_percent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discount_amount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "payer_shares" JSONB;

UPDATE "sessions"
SET "gross_amount" = "amount"
WHERE "amount" IS NOT NULL;
