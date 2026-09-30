import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, CircleDollarSign, Coffee, Table2, Users } from "lucide-react";
import { Prisma } from "@prisma/client";

import { getAcademySession } from "@/lib/supabase-auth-server";
import { prisma } from "@/lib/prisma";
import {
  academyDateKey,
  academyDateKeyForOffset,
  academyDayUtcBounds,
  academyDateTimeToUtc,
} from "@/lib/academy-time";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { RevenueCharts } from "@/components/admin/revenue-charts";

export const dynamic = "force-dynamic";

type RevenuePageProps = {
  searchParams: Promise<{ range?: string }>;
};

type DailyRevenueRow = {
  day: string;
  source: "WALKIN" | "ONLINE";
  amount: bigint;
  sessions: bigint;
};

const RANGE_OPTIONS = [
  { value: "1d", label: "Today", days: 1 },
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
] as const;

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminRevenuePage({ searchParams }: RevenuePageProps) {
  const session = await getAcademySession();
  if (!session) redirect("/login?role=admin");
  if (session.role !== "admin") redirect("/supervisor");

  const params = await searchParams;
  const selectedRange =
    RANGE_OPTIONS.find((option) => option.value === params.range) ?? RANGE_OPTIONS[1];
  const now = new Date();
  const todayKey = academyDateKey(now);
  const startKey = academyDateKeyForOffset(-(selectedRange.days - 1), now);
  const start = academyDayUtcBounds(startKey).start;
  const end = academyDayUtcBounds(todayKey).end;
  const where: Prisma.SessionWhereInput = {
    source: { in: ["ONLINE", "WALKIN"] },
    paymentStatus: "PAID",
    paidAt: { gte: start, lt: end },
  };

  const [dailyRows, sourceGroups, tableGroups, tables, unpaid, paidCount] = await Promise.all([
    prisma.$queryRaw<DailyRevenueRow[]>(Prisma.sql`
      SELECT
        TO_CHAR(("paid_at" AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day,
        "source"::text AS source,
        COALESCE(SUM("amount"), 0)::bigint AS amount,
        COUNT(*)::bigint AS sessions
      FROM "sessions"
      WHERE "payment_status" = 'PAID'
        AND "source" IN ('WALKIN', 'ONLINE')
        AND "paid_at" >= ${start}
        AND "paid_at" < ${end}
      GROUP BY day, "source"
      ORDER BY day ASC
    `),
    prisma.session.groupBy({
      by: ["source"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.session.groupBy({
      by: ["tableId"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.table.findMany({ select: { id: true, name: true } }),
    prisma.session.aggregate({
      where: {
        source: { in: ["ONLINE", "WALKIN"] },
        status: "COMPLETED",
        paymentStatus: "UNPAID",
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.session.count({ where }),
  ]);

  const sourceAmount = (source: "WALKIN" | "ONLINE") =>
    sourceGroups.find((group) => group.source === source)?._sum.amount ?? 0;
  const walkInRevenue = sourceAmount("WALKIN");
  const onlineRevenue = sourceAmount("ONLINE");
  const totalRevenue = walkInRevenue + onlineRevenue;
  const dailyMap = new Map<string, { walkIn: number; online: number }>();
  for (const row of dailyRows) {
    const current = dailyMap.get(row.day) ?? { walkIn: 0, online: 0 };
    if (row.source === "WALKIN") current.walkIn = Number(row.amount);
    if (row.source === "ONLINE") current.online = Number(row.amount);
    dailyMap.set(row.day, current);
  }
  const dailyRevenue = Array.from({ length: selectedRange.days }, (_, index) => {
    const day = academyDateKeyForOffset(index - (selectedRange.days - 1), now);
    const date = academyDateTimeToUtc(day, "12:00");
    const dayLabel =
      day === todayKey
        ? "Today"
        : new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "numeric",
            month: "short",
          }).format(date);
    const amounts = dailyMap.get(day) ?? { walkIn: 0, online: 0 };
    return { day: dayLabel, ...amounts };
  });
  const tableNames = new Map(tables.map((table) => [table.id, table.name]));
  const tableRevenue = tableGroups.map((group) => ({
    id: group.tableId,
    name: tableNames.get(group.tableId) ?? "Removed table",
    amount: group._sum.amount ?? 0,
    sessions: group._count._all,
  }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-10 w-10 shrink-0">
            <Link href="/admin" aria-label="Back to admin dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-felt">
              Admin analytics
            </p>
            <h1 className="truncate text-2xl font-bold sm:text-3xl">Revenue</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Collected table-session payments · academy local time
            </p>
          </div>
        </div>

        <nav className="mt-4 grid grid-cols-3 gap-2" aria-label="Revenue period">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              asChild
              variant={selectedRange.value === option.value ? "default" : "outline"}
              className="min-h-10 px-2 text-xs sm:text-sm"
            >
              <Link href={`/admin/revenue?range=${option.value}`}>{option.label}</Link>
            </Button>
          ))}
        </nav>

        <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <RevenueMetric
            icon={CircleDollarSign}
            label="Total revenue"
            value={money(totalRevenue)}
          />
          <RevenueMetric icon={Users} label="Walk-in play" value={money(walkInRevenue)} />
          <RevenueMetric icon={Table2} label="Online bookings" value={money(onlineRevenue)} />
          <RevenueMetric
            icon={Coffee}
            label="Cafe"
            value="Not tracked"
            note="Sales aren't recorded yet"
          />
          <RevenueMetric
            icon={BarChart3}
            label="Unpaid dues"
            value={money(unpaid._sum.amount ?? 0)}
            note={`${unpaid._count._all} sessions · all time`}
          />
        </section>

        <div className="mt-4">
          <RevenueCharts
            dailyRevenue={dailyRevenue}
            sourceRevenue={[
              { name: "Walk-in", amount: walkInRevenue },
              { name: "Online", amount: onlineRevenue },
            ]}
          />
        </div>

        <section className="mt-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">Earnings by table</h2>
              <p className="mt-1 text-xs text-muted-foreground">Paid sessions · selected period</p>
            </div>
            <span className="text-xs text-muted-foreground">{paidCount} sessions</span>
          </div>
          {tableRevenue.length ? (
            <div className="mt-4 space-y-3">
              {tableRevenue.map((table) => (
                <div key={table.id} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-sm font-semibold">{table.name}</span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-felt"
                      style={{
                        width: `${Math.max(2, Math.round((table.amount / Math.max(totalRevenue, 1)) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-right text-sm font-semibold">
                    {money(table.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No paid table sessions in this period.
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Cafe revenue will appear here once cafe sales are recorded by the app.
          </p>
        </section>
      </main>
    </>
  );
}

function RevenueMetric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <Icon className="h-4 w-4 text-felt" aria-hidden="true" />
      <p className="mt-2 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-bold sm:text-xl">{value}</p>
      {note ? <p className="mt-1 truncate text-[10px] text-muted-foreground">{note}</p> : null}
    </section>
  );
}
