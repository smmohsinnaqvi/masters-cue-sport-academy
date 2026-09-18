"use client";

import { BadgeCheck, CalendarX2, CircleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACADEMY } from "@/lib/academy";
import { DURATIONS, buildDateOptions, formatTime } from "@/lib/booking";
import { MOCK_BOOKINGS, MOCK_TABLES, type BookingRecord } from "@/lib/mockData";

const STATUS_STYLE: Record<BookingRecord["status"], string> = {
  CONFIRMED: "border-felt/45 text-felt",
  HELD: "border-warning/45 text-warning",
  CANCELLED: "border-destructive/45 text-destructive",
};

export default function AdminPage() {
  const dateOptions = useMemo(() => buildDateOptions(7), []);
  const [dateOffset, setDateOffset] = useState(0);
  const [records, setRecords] = useState<BookingRecord[]>(MOCK_BOOKINGS);

  const [blockTables, setBlockTables] = useState<string[]>([]);
  const [blockStart, setBlockStart] = useState("18:00");
  const [blockDuration, setBlockDuration] = useState(120);
  const [blockReason, setBlockReason] = useState("Maintenance");

  const dayRecords = records
    .filter((b) => b.dateOffset === dateOffset)
    .sort((a, b) => a.start - b.start);

  const selectedDate = dateOptions.find((d) => d.offset === dateOffset) ?? dateOptions[0]!;
  const confirmed = dayRecords.filter((b) => b.status === "CONFIRMED").length;
  const held = dayRecords.filter((b) => b.status === "HELD").length;
  const unverified = dayRecords.filter((b) => !b.verified && b.status !== "CANCELLED").length;

  function toggleVerified(id: string) {
    setRecords((prev) =>
      prev.map((b) => (b.id === id ? { ...b, verified: !b.verified } : b)),
    );
  }

  function cancelBooking(id: string) {
    setRecords((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "CANCELLED" as const } : b)),
    );
  }

  function applyBlock() {
    if (blockTables.length === 0) return;
    const [h, m] = blockStart.split(":").map(Number);
    const start = (h ?? 0) * 60 + (m ?? 0);
    const created: BookingRecord[] = blockTables.map((tableId, index) => ({
      id: `block-${Date.now()}-${index}`,
      tableId,
      dateOffset,
      start,
      end: start + blockDuration,
      customerName: `BLOCKED — ${blockReason}`,
      customerPhone: ACADEMY.phone,
      status: "CONFIRMED",
      reference: `BLK-${String(Date.now()).slice(-4)}${index}`,
      verified: true,
      note: blockReason,
    }));
    setRecords((prev) => [...prev, ...created]);
    setBlockTables([]);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Supervisor dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Today&apos;s queue across all eight tables — who booked, on which table, and whether they
          have been verified at reception.
        </p>

        <div className="no-scrollbar mt-6 flex gap-3 overflow-x-auto pb-1">
          {dateOptions.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              onClick={() => setDateOffset(option.offset)}
              className={
                "min-h-14 w-28 shrink-0 flex-col border-border bg-surface/70 px-3" +
                (option.offset === dateOffset ? " border-felt bg-felt/15 text-felt" : "")
              }
            >
              <span className="text-xs font-semibold">{option.day}</span>
              <span className="text-sm text-foreground">{option.date}</span>
            </Button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Kpi label="Sessions" value={String(dayRecords.length)} />
          <Kpi label="Confirmed" value={String(confirmed)} tone="felt" />
          <Kpi label="On hold" value={String(held)} tone="warning" />
          <Kpi label="To verify" value={String(unverified)} tone="warning" />
        </div>

        <h2 className="mt-12 text-2xl font-bold">
          Queue — {selectedDate.day}, {selectedDate.date}
        </h2>
        <div className="mt-5 space-y-3">
          {dayRecords.length === 0 ? (
            <Card className="border-border bg-surface">
              <CardContent className="p-5 text-sm text-muted-foreground">
                No bookings for this day yet.
              </CardContent>
            </Card>
          ) : (
            dayRecords.map((booking) => {
              const table = MOCK_TABLES.find((t) => t.id === booking.tableId);
              return (
                <Card key={booking.id} className="border-border bg-surface">
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">{booking.customerName}</p>
                        <Badge variant="outline" className={STATUS_STYLE[booking.status]}>
                          {booking.status}
                        </Badge>
                        {booking.verified ? (
                          <Badge variant="outline" className="border-felt/45 text-felt">
                            <BadgeCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-warning/45 text-warning">
                            <CircleAlert className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {booking.customerPhone} · Ref {booking.reference}
                      </p>
                      <p className="mt-1 text-sm">
                        <span className="text-felt">
                          {formatTime(booking.start)} – {formatTime(booking.end)}
                        </span>{" "}
                        · {table?.name ?? booking.tableId}
                      </p>
                      {booking.note ? (
                        <p className="mt-1 text-xs text-muted-foreground">{booking.note}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => toggleVerified(booking.id)}
                        className="min-h-12 border-border bg-surface/70"
                      >
                        {booking.verified ? "Mark unverified" : "Mark verified"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={booking.status === "CANCELLED"}
                        onClick={() => cancelBooking(booking.id)}
                        className="min-h-12 border-destructive/40 bg-surface/70 text-destructive"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <h2 className="mt-14 text-2xl font-bold">Bulk block tables</h2>
        <Card className="mt-5 border-border bg-surface">
          <CardHeader className="p-5 pb-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarX2 className="h-5 w-5 text-warning" aria-hidden="true" />
              Maintenance or tournament block
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div>
              <Label className="text-sm">Tables</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {MOCK_TABLES.map((table) => {
                  const active = blockTables.includes(table.id);
                  return (
                    <Button
                      key={table.id}
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setBlockTables((prev) =>
                          active ? prev.filter((id) => id !== table.id) : [...prev, table.id],
                        )
                      }
                      className={
                        "min-h-12 border-border bg-surface/70" +
                        (active ? " border-warning bg-warning/15 text-warning" : "")
                      }
                    >
                      {table.shortName}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="block-start">Start time</Label>
                <Input
                  id="block-start"
                  type="time"
                  value={blockStart}
                  onChange={(event) => setBlockStart(event.target.value)}
                  className="min-h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <Button
                      key={d.minutes}
                      type="button"
                      variant="outline"
                      onClick={() => setBlockDuration(d.minutes)}
                      className={
                        "min-h-12 border-border bg-surface/70" +
                        (blockDuration === d.minutes ? " border-felt bg-felt/15 text-felt" : "")
                      }
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-reason">Block reason</Label>
                <Input
                  id="block-reason"
                  value={blockReason}
                  onChange={(event) => setBlockReason(event.target.value)}
                  className="min-h-12"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={applyBlock} className="min-h-12">
                Apply block
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "felt" | "warning";
}) {
  const toneClass =
    tone === "felt"
      ? "border-felt/45 bg-felt/15 text-felt"
      : tone === "warning"
        ? "border-warning/45 bg-warning/10 text-warning"
        : "border-border bg-surface/70 text-foreground";

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
