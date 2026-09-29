const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

for (const file of [".env", ".env.local"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

const bucketName = "shop-products";
const storageLimit = 3 * 1024 * 1024;
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"];
const products = [
  {
    name: "Master's Pro Cue",
    description:
      "A balanced 3/4-joint cue with a smooth ash shaft and a warm hardwood butt, ready for practice and match play.",
    category: "CUES",
    price: 3200,
    discountPercent: 10,
    artwork: "cue.svg",
    key: "products/demo-cue.svg",
  },
  {
    name: "Precision Cue Tips · 10 mm",
    description:
      "Layered leather tips with a dependable feel for controlled spin and confident cue-ball contact.",
    category: "TIPS",
    price: 250,
    discountPercent: 0,
    artwork: "tips.svg",
    key: "products/demo-tips.svg",
  },
  {
    name: "Tournament Chalk · 3 pack",
    description:
      "A tidy three-piece set for consistent coverage and a sure grip through long frames.",
    category: "CHALK",
    price: 180,
    discountPercent: 10,
    artwork: "chalk.svg",
    key: "products/demo-chalk.svg",
  },
  {
    name: "Right-hand Billiards Glove",
    description: "A breathable, low-friction glove designed to keep your bridge smooth and steady.",
    category: "GLOVES",
    price: 450,
    discountPercent: 15,
    artwork: "glove.svg",
    key: "products/demo-glove.svg",
  },
  {
    name: "Hard-shell Cue Case",
    description:
      "Protect your cue between visits with a lightweight case, secure zip, and soft interior lining.",
    category: "CASES",
    price: 2200,
    discountPercent: 5,
    artwork: "case.svg",
    key: "products/demo-case.svg",
  },
  {
    name: "Cue Care Starter Kit",
    description: "A simple kit for keeping your cue clean, smooth, and ready for the next session.",
    category: "ACCESSORIES",
    price: 550,
    discountPercent: 0,
    artwork: "care.svg",
    key: "products/demo-care.svg",
  },
];

function requireEnvironment() {
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!databaseUrl || !supabaseUrl || !serviceKey) {
    throw new Error(
      "Set DIRECT_URL or DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, and a server-only Supabase service-role/secret key.",
    );
  }

  const isLocal = (value) => {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  };
  if (
    (!isLocal(databaseUrl) || !isLocal(supabaseUrl)) &&
    !process.argv.includes("--confirm-remote")
  ) {
    throw new Error(
      "Refusing to write demo products to a remote database or Storage project. Rerun with --confirm-remote only after verifying this is the intended Supabase environment.",
    );
  }
  return { supabaseUrl, serviceKey };
}

async function ensureBucket(storage) {
  const options = {
    public: true,
    fileSizeLimit: storageLimit,
    allowedMimeTypes,
  };
  const { error } = await storage.getBucket(bucketName);
  if (!error) {
    const { error: updateError } = await storage.updateBucket(bucketName, options);
    if (updateError)
      throw new Error(`Unable to configure product image bucket: ${updateError.message}`);
    return;
  }
  if (error.statusCode !== "404") {
    throw new Error(`Unable to inspect product image bucket: ${error.message}`);
  }
  const { error: createError } = await storage.createBucket(bucketName, options);
  if (createError) throw new Error(`Unable to create product image bucket: ${createError.message}`);
}

async function seedShop() {
  const { supabaseUrl, serviceKey } = requireEnvironment();
  const prisma = new PrismaClient();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    await ensureBucket(supabase.storage);

    for (const product of products) {
      const artwork = fs.readFileSync(
        path.join(__dirname, "..", "public", "shop", "art", product.artwork),
      );
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(product.key, artwork, {
          contentType: "image/svg+xml",
          cacheControl: "3600",
          upsert: true,
        });
      if (uploadError)
        throw new Error(`Unable to upload ${product.artwork}: ${uploadError.message}`);

      const existing = await prisma.shopProduct.findFirst({
        where: { name: product.name },
        select: { id: true },
      });
      const data = {
        name: product.name,
        description: product.description,
        imagePath: product.key,
        category: product.category,
        price: product.price,
        discountPercent: product.discountPercent,
        isActive: true,
      };
      if (existing) {
        await prisma.shopProduct.update({ where: { id: existing.id }, data });
      } else {
        await prisma.shopProduct.create({ data });
      }
    }

    const count = await prisma.shopProduct.count({ where: { isActive: true } });
    console.log(
      `Seeded ${products.length} demo products; ${count} active products are in the shop.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

seedShop().catch((error) => {
  console.error("Failed to seed shop products:", error);
  process.exitCode = 1;
});
