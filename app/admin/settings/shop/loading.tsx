import { Skeleton } from "@/components/ui/skeleton";

export default function ShopSettingsLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-36 rounded-2xl sm:h-44" />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border">
            <Skeleton className="aspect-square rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
