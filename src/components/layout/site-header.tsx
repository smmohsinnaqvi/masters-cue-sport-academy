"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import logoImage from "@/assets/mcsa-logo.jpeg";

import { currentAcademySessionAction, logoutAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { ACADEMY } from "@/data/academy";
import type { AcademySession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<AcademySession | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void currentAcademySessionAction().then((current) => {
      if (active) setSession(current);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  const nav = useMemo(() => {
    const items = [
      { to: "/", label: "Home" },
      { to: "/services", label: "Services" },
      { to: "/shop", label: "Shop" },
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

  async function handleLogout() {
    await logoutAction();
    setSession(null);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
      <nav className="mx-auto flex min-h-[4.5rem] max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={`${ACADEMY.name} home`}
          className="flex min-h-12 min-w-0 items-center gap-2.5 pr-1 sm:gap-3"
        >
          <span className="flex h-11 w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-1 sm:h-12 sm:w-[82px]">
            <Image
              src={logoImage}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain"
              sizes="(min-width: 640px) 82px, 72px"
              priority
            />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block max-w-[8.5rem] text-xs font-semibold tracking-tight sm:max-w-none sm:text-sm">
              {ACADEMY.name}
            </span>
            <span className="mt-1 block text-[10px] text-muted-foreground sm:text-xs">
              Snooker <span className="text-gold">·</span> Pool <span className="text-gold">·</span>{" "}
              Academy
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => {
            const isActive = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-felt/10 text-felt"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {!session ? (
            <Button asChild className="ml-2 min-h-11 rounded-full px-5">
              <Link href="/booking">Book a table</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="ml-2 min-h-11 rounded-full border-border bg-surface/70 px-5"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Logout
            </Button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <Button asChild className="min-h-11 rounded-full px-4">
            <Link href="/booking">Book</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="min-h-11 w-11 rounded-full border-border bg-surface/70 px-0"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </nav>

      <div
        className={cn(
          "border-t border-border/70 bg-background/95 px-4 pb-3 pt-2 backdrop-blur-xl lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        {nav.map((item) => {
          const isActive = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium",
                isActive
                  ? "bg-felt/10 text-felt"
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
