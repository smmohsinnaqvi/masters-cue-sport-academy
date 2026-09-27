import Link from "next/link";
import { SettingsTabs } from "@/components/admin/settings-tabs";

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Admin settings
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">Venue configuration</h1>
        </div>
        <Link href="/admin" className="min-h-11 py-3 text-sm text-felt hover:underline sm:py-0">
          Back to dashboard
        </Link>
      </div>
      <SettingsTabs />
      <div className="mt-4 sm:mt-6">{children}</div>
    </main>
  );
}
