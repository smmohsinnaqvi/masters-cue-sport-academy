CREATE TYPE "ShopProductCategory" AS ENUM (
  'CUES',
  'TIPS',
  'CHALK',
  'GLOVES',
  'CASES',
  'ACCESSORIES'
);

CREATE TABLE "shop_products" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "image_path" TEXT NOT NULL,
  "category" "ShopProductCategory" NOT NULL,
  "price" INTEGER NOT NULL,
  "discount_percent" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shop_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shop_products_price_check" CHECK ("price" >= 0),
  CONSTRAINT "shop_products_discount_percent_check" CHECK ("discount_percent" BETWEEN 0 AND 100)
);

CREATE INDEX "shop_products_is_active_category_name_idx"
  ON "shop_products"("is_active", "category", "name");
CREATE INDEX "shop_products_created_at_idx"
  ON "shop_products"("created_at" DESC);

ALTER TABLE "shop_products" ENABLE ROW LEVEL SECURITY;
