CREATE TABLE "tournaments" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "entry_fee" INTEGER NOT NULL,
  "prize_pool" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tournaments_date_idx" ON "tournaments"("date");

CREATE TABLE "cafeteria_items" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "note" TEXT,
  "price" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cafeteria_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cafeteria_items_name_key" ON "cafeteria_items"("name");
CREATE INDEX "cafeteria_items_is_active_name_idx" ON "cafeteria_items"("is_active", "name");
