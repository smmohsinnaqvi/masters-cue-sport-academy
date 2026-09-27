"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/settings/tournaments", label: "Tournaments" },
  { href: "/admin/settings/cafeteria", label: "Cafeteria" },
  { href: "/admin/settings/rates", label: "Hourly rates" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Admin settings">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "whitespace-nowrap border-b-2 px-3 py-3 text-sm",
            pathname === tab.href
              ? "border-felt text-felt"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
