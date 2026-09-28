import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type LoadingVariant =
  "home" | "booking" | "services" | "login" | "admin" | "settings" | "supervisor";

function HeaderSkeleton() {
  return (
    <div className="flex h-[68px] items-center justify-between border-b border-border px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-11 w-24 rounded-md" />
    </div>
  );
}

function HeadingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-3/4 max-w-80 sm:h-10" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-4 w-2/3 max-w-md" />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <>
      <div className="relative">
        <Skeleton className="h-[min(74vw,300px)] w-full rounded-none sm:h-[min(48vw,560px)]" />
        <Skeleton className="absolute left-4 top-4 h-9 w-40 rounded-full sm:left-6 sm:top-6" />
      </div>
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
        <div className="grid max-w-lg grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-12 w-full rounded-md sm:w-36" />
          <Skeleton className="h-12 w-full rounded-md sm:w-36" />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    </>
  );
}

function BookingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6 sm:py-10">
      <HeadingSkeleton />
      <div className="space-y-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-44 rounded-full" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-24 shrink-0 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-4 w-36" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl sm:h-32" />
          ))}
        </div>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    </div>
  );
}

function ServicesSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
      <HeadingSkeleton />
      <section className="space-y-4">
        <Skeleton className="h-7 w-52" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <Skeleton className="h-7 w-44" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-3 py-5 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <HeadingSkeleton />
        <Skeleton className="h-11 w-full rounded-md sm:w-48" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
      <HeadingSkeleton />
      <div className="flex gap-2 overflow-hidden border-b border-border pb-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-28 shrink-0 rounded-md" />
        ))}
      </div>
      <div className="space-y-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <Skeleton className="h-6 w-44" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-11 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-11 w-32 rounded-md" />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SupervisorSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <HeadingSkeleton />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-11 w-32 rounded-md" />
          <Skeleton className="h-11 w-28 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="space-y-4 rounded-xl border border-border p-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, row) => (
                <Skeleton key={row} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="size-12 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-11 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </main>
  );
}

export function PageLoading({ variant = "home" }: { variant?: LoadingVariant }) {
  if (variant === "login") {
    return (
      <div role="status" aria-label="Loading login" aria-busy="true">
        <LoginSkeleton />
        <span className="sr-only">Loading login</span>
      </div>
    );
  }

  const content = {
    home: <HomeSkeleton />,
    booking: <BookingSkeleton />,
    services: <ServicesSkeleton />,
    admin: <AdminSkeleton />,
    settings: <SettingsSkeleton />,
    supervisor: <SupervisorSkeleton />,
  }[variant];

  return (
    <div role="status" aria-label="Loading page" aria-busy="true">
      {variant !== "settings" ? <HeaderSkeleton /> : null}
      {content}
      <span className="sr-only">Loading page content</span>
    </div>
  );
}

export function PageError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This page could not be loaded. Please try again.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
