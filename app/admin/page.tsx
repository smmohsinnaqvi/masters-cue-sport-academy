import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, CircleDollarSign, Table2, UserRoundCheck } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { academyDateKey, academyDayUtcBounds } from "@/lib/academy-time";
import { getAcademySession } from "@/lib/supabase-auth-server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAcademySession();
  if (!session) redirect("/login?role=admin");
  if (session.role !== "admin") redirect("/supervisor");

  const now = new Date();
  const today = academyDayUtcBounds(academyDateKey(now));
  const [payments, activeSessions, pendingBookings, activeTables] = await Promise.all([
    prisma.session.aggregate({
      where: {
        paidAt: { gte: today.start, lt: today.end },
        paymentStatus: "PAID",
      },
      _sum: { amount: true },
    }),
    prisma.session.count({ where: { status: "ONGOING" } }),
    prisma.session.count({
      where: { source: "ONLINE", status: "HELD", holdExpiresAt: { gt: now } },
    }),
    prisma.table.count({ where: { isActive: true } }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
            <h1 className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">Academy dashboard</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Current operations and academy settings.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/admin/revenue">
                Revenue <BarChart3 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/supervisor">
                Supervisor <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-4 lg:grid-cols-4">
          <Summary
            icon={CircleDollarSign}
            label="Payments today"
            value={`₹${(payments._sum.amount ?? 0).toLocaleString("en-IN")}`}
          />
          <Summary icon={Table2} label="Tables in use" value={String(activeSessions)} />
          <Summary icon={UserRoundCheck} label="Pending bookings" value={String(pendingBookings)} />
          <Summary icon={BarChart3} label="Active tables" value={String(activeTables)} />
        </div>
        <Card className="mt-5 border-border bg-surface sm:mt-8">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Academy settings</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Manage tournaments, cafeteria items, hourly rates, and shop products. Changes are
              saved to the academy database.
            </p>
            <Button asChild className="mt-5 min-h-11 w-full sm:w-auto">
              <Link href="/admin/settings">Open settings</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border bg-surface">
      <CardContent className="p-3 sm:p-5">
        <Icon className="h-4 w-4 text-felt" />
        <p className="mt-3 line-clamp-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:mt-4 sm:text-xs sm:tracking-[0.16em]">
          {label}
        </p>
        <p className="mt-1 truncate text-xl font-bold sm:mt-2 sm:text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}
