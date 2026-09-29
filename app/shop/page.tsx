import { ShopCatalog } from "@/components/shop/shop-catalog";
import { SiteHeader } from "@/components/layout/site-header";
import { getShopProducts } from "@/lib/shop";
import { getAcademySession } from "@/lib/supabase-auth-server";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [products, session] = await Promise.all([getShopProducts(), getAcademySession()]);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8">
        <ShopCatalog initialProducts={products} canManage={session?.role === "admin"} />
      </main>
    </>
  );
}
