"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, LogOut, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ACADEMY } from "@/data/academy";
import { clearSession, getStoredSession, type AcademySession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<AcademySession | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setSession(getStoredSession());
  }, [pathname]);

  const nav = useMemo(() => {
    const items = [
      { to: "/", label: "Home" },
      { to: "/services", label: "Services" },
      { to: "/booking", label: "Booking" },
    ];

    if (session?.role === "admin") {
      items.push({ to: "/admin", label: "Admin" });
      items.push({ to: "/supervisor", label: "Supervisor" });
    }

    if (session?.role === "supervisor") {
      items.push({ to: "/supervisor", label: "Supervisor" });
    }

    if (!session) {
      items.push({ to: "/login", label: "Login" });
    }

    return items;
  }, [session]);

  function handleLogout() {
    clearSession();
    setSession(null);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-h-12 items-center gap-3 pr-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-md border border-felt/35 bg-felt/15 shadow-[var(--shadow-felt)]">
            <Activity className="h-5 w-5 text-felt" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">{ACADEMY.name}</span>
            <span className="block text-xs text-muted-foreground">Snooker & Pool</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const isActive = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  "inline-flex min-h-12 items-center rounded-md px-4 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-felt/15 text-felt"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {!session ? (
            <Button asChild className="ml-2 min-h-12 shadow-[var(--shadow-felt)]">
              <Link href="/booking">Book a table</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="ml-2 min-h-12 border-border bg-surface/70"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Logout
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button asChild className="min-h-12">
            <Link href="/booking">Book</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="min-h-12 w-12 border-border bg-surface/70 px-0"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </nav>

      <div className={cn("border-t border-border px-4 pb-3 md:hidden", open ? "block" : "hidden")}>
        {nav.map((item) => {
          const isActive = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-12 items-center rounded-md px-3 text-sm font-medium",
                isActive
                  ? "text-felt"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
        {session ? (
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex min-h-12 w-full items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
}
