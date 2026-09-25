import { Button } from "@/components/ui/button";

export function PageLoading() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-felt"
        role="status"
        aria-label="Loading"
      />
    </main>
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
