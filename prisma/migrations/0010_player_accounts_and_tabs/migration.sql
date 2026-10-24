CREATE TYPE "PlayerDiscipline" AS ENUM ('SNOOKER', 'POOL', 'BOTH');
CREATE TYPE "PlayerSkillTier" AS ENUM ('NOVICE', 'CLUB_REGULAR', 'STATE_PRO', 'PROFESSIONAL');

CREATE TABLE "player_profiles" (
  "id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "nickname" TEXT,
  "phone" TEXT NOT NULL,
  "primary_discipline" "PlayerDiscipline" NOT NULL DEFAULT 'BOTH',
  "preferred_format" "SessionGameFormat",
  "skill_tier" "PlayerSkillTier" NOT NULL DEFAULT 'CLUB_REGULAR',
  "tab_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "credit_limit" INTEGER NOT NULL DEFAULT 5000,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_profiles_credit_limit_check" CHECK ("credit_limit" >= 0)
);

CREATE TABLE "session_dues" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "player_profile_id" TEXT,
  "payer_name" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_dues_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "session_dues_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "session_dues_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "session_dues_player_profile_id_fkey"
    FOREIGN KEY ("player_profile_id") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "player_tab_payments" (
  "id" TEXT NOT NULL,
  "player_profile_id" TEXT,
  "payer_name" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "payment_method" "PaymentMethod" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "player_tab_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_tab_payments_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "player_tab_payments_player_profile_id_fkey"
    FOREIGN KEY ("player_profile_id") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "session_due_payments" (
  "id" TEXT NOT NULL,
  "due_id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "player_profile_id" TEXT,
  "amount" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_due_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "session_due_payments_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "session_due_payments_due_id_fkey"
    FOREIGN KEY ("due_id") REFERENCES "session_dues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "session_due_payments_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "player_tab_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "session_due_payments_player_profile_id_fkey"
    FOREIGN KEY ("player_profile_id") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "player_profiles_phone_key" ON "player_profiles"("phone");
CREATE INDEX "player_profiles_is_active_full_name_idx" ON "player_profiles"("is_active", "full_name");
CREATE INDEX "player_profiles_nickname_idx" ON "player_profiles"("nickname");
CREATE UNIQUE INDEX "session_dues_session_id_payer_name_key" ON "session_dues"("session_id", "payer_name");
CREATE INDEX "session_dues_player_profile_id_created_at_idx" ON "session_dues"("player_profile_id", "created_at");
CREATE INDEX "session_dues_session_id_idx" ON "session_dues"("session_id");
CREATE INDEX "player_tab_payments_player_profile_id_created_at_idx" ON "player_tab_payments"("player_profile_id", "created_at" DESC);
CREATE UNIQUE INDEX "session_due_payments_due_id_payment_id_key" ON "session_due_payments"("due_id", "payment_id");
CREATE INDEX "session_due_payments_player_profile_id_created_at_idx" ON "session_due_payments"("player_profile_id", "created_at");
CREATE INDEX "session_due_payments_payment_id_idx" ON "session_due_payments"("payment_id");
