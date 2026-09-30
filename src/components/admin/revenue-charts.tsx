"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DailyRevenue = {
  day: string;
  walkIn: number;
  online: number;
};

type RevenueSource = {
  name: string;
  amount: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueCharts({
  dailyRevenue,
  sourceRevenue,
}: {
  dailyRevenue: DailyRevenue[];
  sourceRevenue: RevenueSource[];
}) {
  const hasRevenue = sourceRevenue.some((source) => source.amount > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div>
          <h2 className="font-semibold">Table revenue per day</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Collected payments · academy local time
          </p>
        </div>
        {hasRevenue ? (
          <div
            className="mt-4 h-56 w-full sm:h-72"
            aria-label="Daily walk-in and online revenue chart"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenue} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  minTickGap={16}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickFormatter={(value: number) => `₹${value}`}
                />
                <Tooltip
                  cursor={{ fill: "var(--background)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                  }}
                  formatter={(value) => money(Number(value))}
                />
                <Bar
                  dataKey="walkIn"
                  name="Walk-in"
                  stackId="revenue"
                  fill="var(--felt)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="online"
                  name="Online"
                  stackId="revenue"
                  fill="var(--gold)"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground sm:h-72">
            No paid table revenue in this period.
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-felt" /> Walk-in
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-gold" /> Online
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="font-semibold">Walk-in vs online</h2>
        <p className="mt-1 text-xs text-muted-foreground">Collected table-session payments</p>
        {hasRevenue ? (
          <>
            <div className="mt-2 h-48 w-full" aria-label="Revenue split by booking source">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceRevenue}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {sourceRevenue.map((source, index) => (
                      <Cell key={source.name} fill={index === 0 ? "var(--felt)" : "var(--gold)"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                    }}
                    formatter={(value) => money(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {sourceRevenue.map((source, index) => (
                <div key={source.name} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: index === 0 ? "var(--felt)" : "var(--gold)" }}
                    />
                    {source.name}
                  </span>
                  <span className="font-medium">{money(source.amount)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
            No paid table sessions in this period.
          </div>
        )}
      </section>
    </div>
  );
}
