import "server-only";

import { SHOP_IMAGE_BUCKET } from "@/constants/shop";
import { prisma } from "@/lib/prisma";

export function shopProductImageUrl(path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Shop images are not configured");
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${SHOP_IMAGE_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export async function getShopProducts() {
  const products = await prisma.shopProduct.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return products.map((product) => ({
    ...product,
    imageUrl: shopProductImageUrl(product.imagePath),
  }));
}
