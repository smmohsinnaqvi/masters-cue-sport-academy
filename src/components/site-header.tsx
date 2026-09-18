"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ACADEMY } from "@/lib/academy";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/booking", label: "Booking" },
  { to: "/admin", label: "Admin" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
          {NAV.map((item) => {
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
          <Button asChild className="ml-2 min-h-12 shadow-[var(--shadow-felt)]">
            <Link href="/booking">Book a table</Link>
          </Button>
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
        {NAV.map((item) => {
          const isActive = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex min-h-12 items-center rounded-md px-3 text-sm font-medium",
                isActive ? "text-felt" : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
