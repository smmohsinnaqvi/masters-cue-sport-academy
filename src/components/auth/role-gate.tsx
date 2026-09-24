"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { canAccessRole, getStoredSession, type UserRole } from "@/lib/auth";

export function RoleGate({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getStoredSession();

    if (!session || !canAccessRole(session.role, role)) {
      router.replace(`/login?role=${role}`);
      return;
    }

    setReady(true);
  }, [role, router]);

  if (!ready) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
          Verifying access...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
