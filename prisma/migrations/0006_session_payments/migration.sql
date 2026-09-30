CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD');

ALTER TABLE "sessions"
  ADD COLUMN "payment_method" "PaymentMethod",
  ADD COLUMN "payer_name" TEXT,
  ADD COLUMN "paid_at" TIMESTAMP(3);

UPDATE "sessions"
SET "customer_name" = NULLIF("players"->0->>'name', '')
WHERE "source" = 'WALKIN' AND "customer_name" IS NULL;

UPDATE "sessions"
SET
  "payment_method" = CASE "payment_status"
    WHEN 'CASH' THEN 'CASH'::"PaymentMethod"
    WHEN 'UPI' THEN 'UPI'::"PaymentMethod"
    WHEN 'CARD' THEN 'CARD'::"PaymentMethod"
    ELSE NULL
  END,
  "payer_name" = COALESCE(
    NULLIF("loser_name", ''),
    NULLIF("customer_name", ''),
    NULLIF("players"->0->>'name', '')
  ),
  "paid_at" = CASE
    WHEN "payment_status" IN ('CASH', 'UPI', 'CARD')
      THEN COALESCE("actual_end", "updated_at", "created_at")
    ELSE NULL
  END,
  "payment_status" = CASE
    WHEN "payment_status" IN ('CASH', 'UPI', 'CARD') THEN 'PAID'
    ELSE 'UNPAID'
  END;

ALTER TABLE "sessions"
  ALTER COLUMN "payment_status" DROP DEFAULT;

ALTER TABLE "sessions"
  ALTER COLUMN "payment_status" TYPE "PaymentStatus"
  USING "payment_status"::"PaymentStatus";

ALTER TABLE "sessions"
  ALTER COLUMN "payment_status" SET DEFAULT 'UNPAID';

CREATE INDEX "sessions_payment_status_status_created_at_id_idx"
  ON "sessions"("payment_status", "status", "created_at" DESC, "id" DESC);
