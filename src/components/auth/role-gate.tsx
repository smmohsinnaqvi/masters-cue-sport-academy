"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { canAccessRole, type UserRole } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export function RoleGate({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unauthorized");
        const payload = (await response.json()) as {
          session: { role: UserRole };
        };
        if (!canAccessRole(payload.session.role, role)) {
          router.replace(`/login?role=${role}`);
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) router.replace(`/login?role=${role}`);
      });
    return () => controller.abort();
  }, [role, router]);

  if (!ready) {
    return (
      <main
        className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4 py-8"
        role="status"
        aria-label="Verifying access"
        aria-busy="true"
      >
        <div className="w-full max-w-xl space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-11 w-full rounded-md" />
          <span className="sr-only">Verifying access</span>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
