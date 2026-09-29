"use server";

import { ShopProductCategory } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  SHOP_IMAGE_BUCKET,
  SHOP_IMAGE_CONTENT_TYPES,
  SHOP_IMAGE_MAX_BYTES,
  type ShopCategory,
} from "@/constants/shop";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase";
import { shopProductImageUrl } from "@/lib/shop";
import { requireAcademyRole } from "@/lib/supabase-auth-server";

const categoryValues = Object.values(ShopProductCategory);
const imageExtension: Record<(typeof SHOP_IMAGE_CONTENT_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

type ShopProductInput = {
  name: string;
  description: string;
  imagePath: string;
  category: ShopCategory;
  price: number;
  discountPercent: number;
};

function requiredText(value: string, label: string, maxLength: number) {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > maxLength)
    throw new Error(`${label} must be ${maxLength} characters or fewer`);
  return normalized;
}

function productInput(input: ShopProductInput) {
  if (!input || typeof input !== "object") throw new Error("Product details are required");
  if (typeof input.imagePath !== "string") throw new Error("Choose a valid product image");
  const category = categoryValues.find((value) => value === input.category);
  if (!category) throw new Error("Choose a valid product category");
  if (!Number.isSafeInteger(input.price) || input.price < 1) {
    throw new Error("Price must be a whole number greater than zero");
  }
  if (
    !Number.isSafeInteger(input.discountPercent) ||
    input.discountPercent < 0 ||
    input.discountPercent > 100
  ) {
    throw new Error("Discount must be a whole percentage between 0 and 100");
  }
  if (
    !/^products\/[A-Za-z0-9][A-Za-z0-9/_-]*\.(?:jpg|jpeg|png|webp|avif|svg)$/i.test(input.imagePath)
  ) {
    throw new Error("Choose a valid product image");
  }

  return {
    name: requiredText(input.name, "Product name", 80),
    description: requiredText(input.description, "Description", 500),
    imagePath: input.imagePath,
    category,
    price: input.price,
    discountPercent: input.discountPercent,
  };
}

async function requireUploadedImage(path: string) {
  const storage = createServerSupabaseClient().storage.from(SHOP_IMAGE_BUCKET);
  const { data, error } = await storage.info(path);
  if (error || !data) {
    throw new Error("Product image upload was not found. Please upload the image again.");
  }
}

function revalidateShop() {
  revalidatePath("/shop");
  revalidatePath("/admin/settings/shop");
}

export async function createShopImageUploadAction(input: { contentType: string; size: number }) {
  await requireAcademyRole("admin");
  if (!input || typeof input !== "object") throw new Error("Image details are required");
  if (typeof input.contentType !== "string") throw new Error("Choose a supported product image");
  if (
    !SHOP_IMAGE_CONTENT_TYPES.includes(
      input.contentType as (typeof SHOP_IMAGE_CONTENT_TYPES)[number],
    )
  ) {
    throw new Error("Use a JPEG, PNG, WebP, or AVIF product image");
  }
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > SHOP_IMAGE_MAX_BYTES) {
    throw new Error("Product images must be smaller than 3 MB");
  }

  const contentType = input.contentType as (typeof SHOP_IMAGE_CONTENT_TYPES)[number];
  const path = `products/${randomUUID()}.${imageExtension[contentType]}`;
  const { data, error } = await createServerSupabaseClient()
    .storage.from(SHOP_IMAGE_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw new Error(`Unable to prepare product image upload: ${error.message}`);

  return {
    path,
    token: data.token,
    publicUrl: shopProductImageUrl(path),
  };
}

export async function createShopProductAction(input: ShopProductInput) {
  await requireAcademyRole("admin");
  const data = productInput(input);
  await requireUploadedImage(data.imagePath);
  const product = await prisma.shopProduct.create({ data });
  revalidateShop();
  return { ...product, imageUrl: shopProductImageUrl(product.imagePath) };
}

export async function updateShopProductAction(id: string, input: ShopProductInput) {
  await requireAcademyRole("admin");
  const productId = requiredText(id, "Product ID", 64);
  const data = productInput(input);
  await requireUploadedImage(data.imagePath);
  const current = await prisma.shopProduct.findUniqueOrThrow({ where: { id: productId } });
  const product = await prisma.shopProduct.update({ where: { id: productId }, data });
  let cleanupWarning: string | null = null;

  if (current.imagePath !== product.imagePath) {
    const { error } = await createServerSupabaseClient()
      .storage.from(SHOP_IMAGE_BUCKET)
      .remove([current.imagePath]);
    if (error) {
      console.error("Unable to remove replaced shop product image", {
        productId,
        message: error.message,
      });
      cleanupWarning = "Product saved, but its previous image could not be removed.";
    }
  }

  revalidateShop();
  return {
    ...product,
    imageUrl: shopProductImageUrl(product.imagePath),
    cleanupWarning,
  };
}

export async function deleteShopProductAction(id: string) {
  await requireAcademyRole("admin");
  const productId = requiredText(id, "Product ID", 64);
  const product = await prisma.shopProduct.delete({ where: { id: productId } });
  const { error } = await createServerSupabaseClient()
    .storage.from(SHOP_IMAGE_BUCKET)
    .remove([product.imagePath]);
  revalidateShop();

  if (error) {
    console.error("Unable to remove deleted shop product image", {
      productId,
      message: error.message,
    });
    return { cleanupWarning: "Product deleted, but its image could not be removed." };
  }
  return { cleanupWarning: null };
}
