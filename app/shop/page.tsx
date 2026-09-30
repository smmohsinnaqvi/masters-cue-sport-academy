import { ShopCatalog } from "@/components/shop/shop-catalog";
import { SiteHeader } from "@/components/layout/site-header";
import { getShopProducts } from "@/lib/shop";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getShopProducts();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8">
        <ShopCatalog initialProducts={products} canManage={false} />
      </main>
    </>
  );
}
