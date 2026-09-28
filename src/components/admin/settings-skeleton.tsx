import { Skeleton } from "@/components/ui/skeleton";

export function SettingsListSkeleton({
  variant = "card",
  rows = 3,
}: {
  variant?: "card" | "compact";
  rows?: number;
}) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading saved settings">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={
            variant === "card"
              ? "flex items-center justify-between gap-3 rounded-lg border border-border p-4"
              : "rounded-lg border border-border p-4"
          }
        >
          <div className="w-full space-y-2">
            <Skeleton className="h-4 w-2/3 max-w-56" />
            <Skeleton className="h-3 w-1/2 max-w-40" />
            {variant === "compact" ? <Skeleton className="h-3 w-1/3 max-w-28" /> : null}
          </div>
          {variant === "card" ? <Skeleton className="h-9 w-20 shrink-0 rounded-md" /> : null}
        </div>
      ))}
      <span className="sr-only">Loading saved settings</span>
    </div>
  );
}

export function SettingsFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="max-w-md space-y-4" role="status" aria-label="Loading saved settings">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-11 w-32 rounded-md" />
      <span className="sr-only">Loading saved settings</span>
    </div>
  );
}
