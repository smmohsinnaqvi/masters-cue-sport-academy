import { ShopCatalog } from "@/components/shop/shop-catalog";
import { getShopProducts } from "@/lib/shop";
import { requireAcademyRole } from "@/lib/supabase-auth-server";

export const dynamic = "force-dynamic";

export default async function ShopSettingsPage() {
  await requireAcademyRole("admin");
  const products = await getShopProducts();

  return (
    <section aria-labelledby="shop-settings-heading">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Storefront</p>
        <h2 id="shop-settings-heading" className="mt-1 text-xl font-bold sm:text-2xl">
          Shop products
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage the products customers see in the shop. Add, edit, or remove items without leaving
          this page.
        </p>
      </div>
      <ShopCatalog initialProducts={products} canManage settingsView />
    </section>
  );
}
