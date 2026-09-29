import { Skeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-8">
      <Skeleton className="h-44 rounded-2xl sm:h-56" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border">
            <Skeleton className="aspect-square rounded-none" />
            <div className="space-y-2 p-3 sm:p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
