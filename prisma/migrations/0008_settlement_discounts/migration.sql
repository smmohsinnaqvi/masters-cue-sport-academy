ALTER TABLE "sessions"
  RENAME COLUMN "discount_percent" TO "discount_percent_basis_points";

UPDATE "sessions"
SET "discount_percent_basis_points" = "discount_percent_basis_points" * 100;

ALTER TABLE "sessions"
  ADD COLUMN "settlement_discount_percent_basis_points" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "settlement_discount_amount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_discount_basis_points_range"
    CHECK ("discount_percent_basis_points" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "sessions_settlement_discount_basis_points_range"
    CHECK ("settlement_discount_percent_basis_points" BETWEEN 0 AND 10000),
  ADD CONSTRAINT "sessions_settlement_discount_amount_nonnegative"
    CHECK ("settlement_discount_amount" >= 0);
