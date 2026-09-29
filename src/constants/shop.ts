export const SHOP_IMAGE_BUCKET = "shop-products";
export const SHOP_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const SHOP_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const SHOP_CATEGORIES = [
  { value: "CUES", label: "Cues" },
  { value: "TIPS", label: "Tips" },
  { value: "CHALK", label: "Chalk" },
  { value: "GLOVES", label: "Gloves" },
  { value: "CASES", label: "Cases" },
  { value: "ACCESSORIES", label: "Accessories" },
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number]["value"];

export type ShopProductView = {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  imageUrl: string;
  category: ShopCategory;
  price: number;
  discountPercent: number;
};
