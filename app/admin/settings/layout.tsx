import Link from "next/link";
import { SettingsTabs } from "@/components/admin/settings-tabs";

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Admin settings
          </p>
          <h1 className="mt-2 text-3xl font-bold">Venue configuration</h1>
        </div>
        <Link href="/admin" className="text-sm text-felt hover:underline">
          Back to dashboard
        </Link>
      </div>
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </main>
  );
}
