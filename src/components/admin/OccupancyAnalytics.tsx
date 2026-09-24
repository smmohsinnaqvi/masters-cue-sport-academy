"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  hours: {
    label: "Occupied hours",
    color: "var(--color-felt)",
  },
} satisfies ChartConfig;

const analyticsData = [
  { table: "Table 1", hours: 6.5 },
  { table: "Table 2", hours: 7.2 },
  { table: "Table 3", hours: 5.8 },
  { table: "Table 4", hours: 6.1 },
  { table: "Table 5", hours: 4.9 },
  { table: "Table 6", hours: 5.4 },
];

export function OccupancyAnalytics() {
  return (
    <Card className="border-border bg-surface">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-base">Table utilization</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={analyticsData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="table" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} unit="h" />
            <ChartTooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
              content={<ChartTooltipContent hideLabel className="w-[140px]" />}
            />
            <Bar dataKey="hours" radius={[6, 6, 0, 0]} fill="var(--color-felt)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
