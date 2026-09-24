"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { FloorMap } from "@/components/booking/floor-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DURATIONS,
  OPEN_END,
  OPEN_START,
  buildDateOptions,
  conflictFor,
  daySegments,
  formatPrice,
  formatTime,
  freeStarts,
  fromTimeInput,
  isRangeFree,
  nextFreeStart,
  sessionPrice,
  tableAvailability,
  toTimeInput,
  type DaySegment,
} from "@/lib/booking";
import { appendBookingQueue } from "@/lib/booking-store";
import { MOCK_TABLES, type Table } from "@/data/mock-data";
import { cn } from "@/lib/utils";

export function BookingEngine() {
  const dateOptions = useMemo(() => buildDateOptions(7), []);
  const [dateOffset, setDateOffset] = useState(0);
  const [duration, setDuration] = useState(120);
  const [tableType, setTableType] = useState<"ANY" | "SNOOKER" | "POOL">("ANY");
  const [tableId, setTableId] = useState("snk-1");
  const [timeInput, setTimeInput] = useState("18:00");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const table = MOCK_TABLES.find((t) => t.id === tableId) ?? MOCK_TABLES[0]!;
  const selectedDate = dateOptions.find((d) => d.offset === dateOffset) ?? dateOptions[0]!;

  const tables = useMemo(
    () => MOCK_TABLES.filter((tableItem) => tableType === "ANY" || tableItem.type === tableType),
    [tableType],
  );

  const requested = fromTimeInput(timeInput) ?? OPEN_START;
  const withinHours = requested >= OPEN_START && requested + duration <= OPEN_END;
  const clash = withinHours ? conflictFor(table.id, dateOffset, requested, duration) : null;
  const requestedIsFree = withinHours && !clash;

  const mapAvailability = useMemo(
    () =>
      Object.fromEntries(
        MOCK_TABLES.map((tableItem) => [
          tableItem.id,
          tableAvailability(tableItem.id, dateOffset, duration),
        ]),
      ),
    [dateOffset, duration],
  );

  const quickStarts = useMemo(
    () => freeStarts(table.id, dateOffset, duration).slice(0, 6),
    [table.id, dateOffset, duration],
  );

  const timelineSegments = useMemo(() => daySegments(table.id, dateOffset), [dateOffset, table.id]);

  const alternativeTables = useMemo(() => {
    const sameTableOptions = tables
      .map((tableItem) => {
        const availableStart = nextFreeStart(tableItem.id, dateOffset, duration, requested);
        if (availableStart === null) return null;
        return { table: tableItem, start: availableStart };
      })
      .filter((option): option is { table: Table; start: number } => option !== null)
      .sort((a, b) => a.start - b.start)
      .slice(0, 3);

    return sameTableOptions;
  }, [tables, dateOffset, duration, requested]);

  const endTime = toTimeInput(Math.min(requested + duration, OPEN_END));
  const price = sessionPrice(table, duration);
  const canBook = isRangeFree(table.id, dateOffset, requested, duration);

  function handleTableSelect(nextTable: Table) {
    setTableId(nextTable.id);
    setConfirmed(false);
  }

  function openHoldDrawer() {
    if (!canBook) return;
    setConfirmed(false);
    setName("");
    setPhone("");
    setDrawerOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    appendBookingQueue({
      id: `booking-${Date.now()}`,
      customer: name.trim() || "Walk-in Guest",
      tableId: table.id,
      tableName: table.shortName,
      date: selectedDate.day,
      start: formatTime(requested),
      duration,
      amount: price,
      status: "pending",
      source: "online",
    });

    setConfirmed(true);
  }

  const recommendedStart = useMemo(
    () => nextFreeStart(table.id, dateOffset, duration, requested) ?? requested,
    [dateOffset, duration, requested, table.id],
  );

  return (
    <>
      <Card className="overflow-hidden border-border bg-[image:var(--gradient-panel)] shadow-[var(--shadow-felt)]">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant="outline" className="mb-3 min-h-7 border-felt/35 text-felt">
                Book in 3 taps
              </Badge>
              <CardTitle className="text-2xl leading-tight sm:text-3xl">
                Reserve a table without the hassle
              </CardTitle>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-felt/35 bg-felt/10 px-3 py-2 text-xs font-medium text-felt">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Open hours 10:00 AM – 11:00 PM
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">1. Choose a day</p>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
              {dateOptions.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant="outline"
                  onClick={() => setDateOffset(option.offset)}
                  className={cn(
                    "min-h-16 w-24 shrink-0 flex-col border-border bg-surface/70 px-2",
                    option.offset === dateOffset && "border-felt bg-felt/15 text-felt",
                  )}
                >
                  <span className="text-xs font-semibold">{option.day}</span>
                  <span className="text-sm text-foreground">{option.date}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">2. Pick your session</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((option) => (
                <Button
                  key={option.minutes}
                  type="button"
                  variant="outline"
                  onClick={() => setDuration(option.minutes)}
                  className={cn(
                    "min-h-11 border-border bg-surface/70 px-4",
                    duration === option.minutes && "border-felt bg-felt/15 text-felt",
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">3. Choose table type</p>
            <div className="flex gap-2">
              {(["ANY", "SNOOKER", "POOL"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={tableType === type ? "default" : "outline"}
                  onClick={() => {
                    setTableType(type);
                    const nextTable =
                      (type === "ANY"
                        ? MOCK_TABLES[0]
                        : MOCK_TABLES.find((item) => item.type === type)) ?? MOCK_TABLES[0];
                    setTableId(nextTable.id);
                  }}
                  className={cn(
                    "min-h-11 px-4",
                    tableType === type && "bg-primary text-primary-foreground",
                  )}
                >
                  {type === "ANY" ? "Any table" : type === "SNOOKER" ? "Snooker" : "Pool"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">4. Pick a table</p>
              <span className="rounded-full border border-border bg-surface px-2 py-1 text-xs text-muted-foreground">
                {tables.length} available
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-surface/70 p-3">
              <FloorMap
                selectedTableId={table.id}
                availability={mapAvailability}
                onSelect={handleTableSelect}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {tables.map((tableOption) => {
                const freeStartsCount = freeStarts(tableOption.id, dateOffset, duration).length;
                const selected = tableOption.id === table.id;
                const price = sessionPrice(tableOption, duration);

                return (
                  <button
                    key={tableOption.id}
                    type="button"
                    onClick={() => handleTableSelect(tableOption)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all",
                      selected
                        ? "border-felt bg-felt/10 shadow-[var(--shadow-felt)]"
                        : "border-border bg-surface/80 hover:border-felt/40 hover:bg-surface",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{tableOption.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {tableOption.type}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[10px] font-medium",
                          freeStartsCount > 0
                            ? "bg-felt/10 text-felt"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {freeStartsCount > 0 ? "Available" : "Booked"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {tableOption.size} • {tableOption.brand}
                      </span>
                      <span className="font-semibold text-foreground">₹{price}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">5. Open time range</p>
              <Badge variant="outline" className="border-felt/35 text-felt">
                Flexible booking
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="booking-start">Start time</Label>
                <Input
                  id="booking-start"
                  type="time"
                  value={timeInput}
                  onChange={(event) => setTimeInput(event.target.value)}
                  className="min-h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-end">End time</Label>
                <Input
                  id="booking-end"
                  type="time"
                  value={endTime}
                  readOnly
                  className="min-h-12 text-base"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickStarts.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTimeInput(toTimeInput(value))}
                  className={cn(
                    "min-h-9 border-felt/35 bg-felt/10 text-felt",
                    requested === value && "border-felt bg-felt/15",
                  )}
                >
                  {formatTime(value)}
                </Button>
              ))}
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Live availability</p>
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Today
                </span>
              </div>
              <Timeline
                segments={timelineSegments}
                requestedStart={requested}
                duration={duration}
                onPick={(minutes) => setTimeInput(toTimeInput(minutes))}
              />
            </div>

            {alternativeTables.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Better options
                </p>
                <div className="flex flex-wrap gap-2">
                  {alternativeTables.map(({ table: alternativeTable, start }) => (
                    <Button
                      key={alternativeTable.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTableId(alternativeTable.id);
                        setTimeInput(toTimeInput(start));
                      }}
                      className="min-h-9 border-border bg-surface/80"
                    >
                      {alternativeTable.shortName} · {formatTime(start)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {requestedIsFree ? (
              <div className="rounded-xl border border-felt/35 bg-felt/10 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-felt">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {table.name} is free from {formatTime(requested)} to{" "}
                  {formatTime(requested + duration)}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-warning/45 bg-warning/10 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-warning">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {withinHours
                    ? `This time is taken. Suggested next open slot is ${formatTime(recommendedStart)}.`
                    : `Select a time between ${formatTime(OPEN_START)} and ${formatTime(OPEN_END)}.`}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Your choice
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {table.name} · {selectedDate.day}, {selectedDate.date}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total</p>
                <p className="mt-1 text-lg font-bold text-felt">₹{price}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4 text-felt" aria-hidden="true" />
              {requestedIsFree
                ? `${formatTime(requested)} - ${formatTime(requested + duration)}`
                : "Choose a free slot"}
            </div>

            <Button
              type="button"
              onClick={openHoldDrawer}
              disabled={!requestedIsFree}
              className="min-h-12 gap-2 px-6"
            >
              Book now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setConfirmed(false);
        }}
      >
        <DrawerContent className="mx-auto max-h-[92svh] max-w-2xl border-border bg-background">
          <DrawerHeader className="px-5 text-left">
            <DrawerTitle className="text-2xl">Hold your table</DrawerTitle>
            <DrawerDescription>
              Quick confirmation. No account required, and the table is held for a few minutes.
            </DrawerDescription>
          </DrawerHeader>

          <div className="overflow-y-auto px-5 pb-6">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm text-muted-foreground">{table.name}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {selectedDate.day}, {selectedDate.date}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-background px-3">
                  <Clock3 className="h-4 w-4 text-felt" aria-hidden="true" />
                  {formatTime(requested)} – {formatTime(requested + duration)}
                </span>
                <span className="inline-flex min-h-9 items-center rounded-md border border-border bg-background px-3">
                  {table.size} • {table.type}
                </span>
                <span className="inline-flex min-h-9 items-center rounded-md border border-border bg-background px-3 text-felt">
                  {formatPrice(price)}
                </span>
              </div>
            </div>

            {confirmed ? (
              <div className="mt-4 rounded-xl border border-felt/35 bg-felt/10 p-4">
                <p className="flex items-center gap-2 text-base font-semibold text-felt">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  Table held successfully
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  We have saved your slot. Reach reception with your phone number to complete the
                  booking.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="booking-name">Name</Label>
                  <Input
                    id="booking-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    className="min-h-12"
                    placeholder="Rahul Sharma"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="booking-phone">Phone</Label>
                  <Input
                    id="booking-phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                    className="min-h-12"
                    placeholder="+91 90000 00000"
                  />
                </div>

                <Separator />

                <Button type="submit" className="min-h-12 w-full">
                  Hold this table
                </Button>
              </form>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

const SEGMENT_TONE: Record<DaySegment["kind"], string> = {
  FREE: "bg-felt/35",
  BOOKED: "bg-destructive/60",
  HELD: "bg-warning/60",
  BUFFER: "bg-muted",
};

function Timeline({
  segments,
  requestedStart,
  duration,
  onPick,
}: {
  segments: DaySegment[];
  requestedStart: number | null;
  duration: number;
  onPick: (minutes: number) => void;
}) {
  const span = OPEN_END - OPEN_START;
  const pct = (minutes: number) => ((minutes - OPEN_START) / span) * 100;
  const hours = Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => OPEN_START + i * 60);

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="relative h-12 w-full overflow-hidden rounded-md bg-surface-subtle">
        {segments.map((segment) => (
          <button
            key={`${segment.kind}-${segment.start}`}
            type="button"
            disabled={segment.kind !== "FREE"}
            onClick={() => onPick(segment.start)}
            aria-label={`${formatTime(segment.start)} to ${formatTime(segment.end)} ${segment.label ?? "free"}`}
            className={cn(
              "absolute inset-y-0 border-r border-background/60",
              SEGMENT_TONE[segment.kind],
              segment.kind === "FREE" && "cursor-pointer hover:brightness-125",
            )}
            style={{
              left: `${pct(segment.start)}%`,
              width: `${Math.max(1, pct(segment.end) - pct(segment.start))}%`,
            }}
          />
        ))}

        {requestedStart !== null && requestedStart >= OPEN_START && requestedStart <= OPEN_END ? (
          <div
            className="pointer-events-none absolute inset-y-0 rounded-sm border-2 border-neon bg-neon/20"
            style={{
              left: `${pct(requestedStart)}%`,
              width: `${Math.max(1, pct(Math.min(requestedStart + duration, OPEN_END)) - pct(requestedStart))}%`,
            }}
          />
        ) : null}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {hours.map((hour) => (
          <span key={hour}>{(Math.floor(hour / 60) % 12 || 12).toString()}</span>
        ))}
      </div>
    </div>
  );
}
