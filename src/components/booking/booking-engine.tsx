"use client";

import { ArrowRight, CalendarClock, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

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
import { Slider } from "@/components/ui/slider";
import {
  BOOKING_STEP_MINUTES,
  MIN_BOOKING_DURATION_MINUTES,
  OPEN_END,
  OPEN_START,
  bookingTimeBounds,
  buildDateOptions,
  ceilToBookingStep,
  conflictFor,
  daySegments,
  formatPrice,
  formatTime,
  freeStarts,
  isRangeFree,
  nextFreeStart,
  toTimeInput,
  type DaySegment,
} from "@/lib/booking";
import { createOnlineBookingAction } from "@/actions/operations-actions";
import type { BookingRecord, Table } from "@/types/operations";
import {
  academyDateKeyForOffset,
  academyDateTimeToUtc,
  academyMinutesOfDay,
} from "@/lib/academy-time";
import { useLiveBookings } from "@/hooks/useLiveBookings";
import { useLiveTables } from "@/hooks/useLiveTables";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function BookingEngine({ initialNow }: { initialNow: string }) {
  const [now, setNow] = useState(() => new Date(initialNow));
  const dateOptions = useMemo(() => buildDateOptions(7, now), [now]);
  const { tables, loading: tablesLoading, error: tablesError } = useLiveTables();
  const [dateOffset, setDateOffset] = useState(0);
  const {
    bookings,
    loading: bookingsLoading,
    error: bookingsError,
  } = useLiveBookings(
    dateOffset,
    academyDateKeyForOffset(dateOffset, now),
    dateOptions.length - dateOffset,
  );
  const [sessionDuration, setSessionDuration] = useState(120);
  const [timelineFocusKey, setTimelineFocusKey] = useState(0);
  const [tableType, setTableType] = useState<"ANY" | "SNOOKER" | "POOL">("ANY");
  const [tableId, setTableId] = useState("");
  const [startTime, setStartTime] = useState(18 * 60);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const table = tables.find((t) => t.id === tableId) ?? tables[0] ?? null;
  const selectedDate = dateOptions.find((d) => d.offset === dateOffset) ?? dateOptions[0]!;
  const { earliestStart } = bookingTimeBounds(dateOffset, MIN_BOOKING_DURATION_MINUTES, now);
  const maxDayDuration = Math.max(
    MIN_BOOKING_DURATION_MINUTES,
    Math.floor((OPEN_END - earliestStart) / BOOKING_STEP_MINUTES) * BOOKING_STEP_MINUTES,
  );
  const hasAvailableTime = earliestStart + MIN_BOOKING_DURATION_MINUTES <= OPEN_END;
  const duration = hasAvailableTime
    ? Math.min(sessionDuration, maxDayDuration)
    : MIN_BOOKING_DURATION_MINUTES;
  const { latestStart } = bookingTimeBounds(dateOffset, duration, now);
  const requested = hasAvailableTime
    ? Math.min(Math.max(startTime, earliestStart), latestStart)
    : earliestStart;
  const nowMinutes = academyMinutesOfDay(now);
  const academyIsOpen = nowMinutes >= OPEN_START && nowMinutes < OPEN_END;
  const timelineStart =
    dateOffset === 0 && academyIsOpen && hasAvailableTime ? nowMinutes : OPEN_START;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tables.length > 0 && !tables.some((tableItem) => tableItem.id === tableId)) {
      setTableId(tables[0]!.id);
    }
  }, [tableId, tables]);

  useEffect(() => {
    if (startTime !== requested) setStartTime(requested);
  }, [requested, startTime]);

  useEffect(() => {
    if (sessionDuration !== duration) setSessionDuration(duration);
  }, [duration, sessionDuration]);

  const filteredTables = useMemo(
    () => tables.filter((tableItem) => tableType === "ANY" || tableItem.type === tableType),
    [tableType, tables],
  );

  const withinHours =
    hasAvailableTime && requested >= earliestStart && requested + duration <= OPEN_END;
  const clash = withinHours
    ? table
      ? conflictFor(table.id, dateOffset, requested, duration, bookings)
      : "No table selected"
    : null;
  const availabilityReady = !bookingsLoading && !bookingsError;
  const requestedIsFree = withinHours && availabilityReady && !clash;

  const timelineSegments = useMemo(
    () => (table && availabilityReady ? daySegments(table.id, dateOffset, bookings) : []),
    [availabilityReady, dateOffset, table, bookings],
  );

  const alternativeTables = useMemo(() => {
    if (!table || !availabilityReady || requestedIsFree) return [];
    return dateOptions
      .filter((option) => option.offset >= dateOffset)
      .flatMap((option) => {
        const bounds = bookingTimeBounds(option.offset, duration, now);
        if (!bounds.hasAvailableTime) return [];
        const firstCandidate =
          option.offset === dateOffset
            ? Math.max(requested, bounds.earliestStart)
            : bounds.earliestStart;
        return filteredTables.flatMap((tableOption) => {
          if (option.offset === dateOffset && tableOption.id === table.id) return [];
          const availableStart = nextFreeStart(
            tableOption.id,
            option.offset,
            duration,
            firstCandidate,
            bookings,
            bounds.earliestStart,
          );
          return availableStart === null
            ? []
            : [{ table: tableOption, date: option, start: availableStart }];
        });
      })
      .sort((a, b) => a.date.offset - b.date.offset || a.start - b.start)
      .slice(0, 3);
  }, [
    availabilityReady,
    bookings,
    dateOffset,
    dateOptions,
    duration,
    filteredTables,
    now,
    requested,
    requestedIsFree,
    table,
  ]);

  const endTime = formatTime(requested + duration);
  const maxDuration = hasAvailableTime
    ? Math.max(MIN_BOOKING_DURATION_MINUTES, OPEN_END - requested)
    : MIN_BOOKING_DURATION_MINUTES;
  const canBook = Boolean(
    table &&
    availabilityReady &&
    hasAvailableTime &&
    requested % BOOKING_STEP_MINUTES === 0 &&
    isRangeFree(table.id, dateOffset, requested, duration, bookings),
  );
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
    setSubmitError(null);
    setConfirmOpen(true);
  }

  function changeDuration(nextDuration: number) {
    const boundedDuration = Math.min(
      Math.max(nextDuration, MIN_BOOKING_DURATION_MINUTES),
      maxDuration,
    );
    setSessionDuration(boundedDuration);
    setStartTime((current) =>
      Math.min(Math.max(current, earliestStart), OPEN_END - boundedDuration),
    );
    setTimelineFocusKey((current) => current + 1);
  }

  function selectStartTime(minutes: number) {
    setStartTime(minutes);
    setTimelineFocusKey((current) => current + 1);
  }

  async function confirmBooking() {
    if (isSubmitting) return;
    const start = academyDateTimeToUtc(
      academyDateKeyForOffset(dateOffset, now),
      toTimeInput(requested),
    );
    const end = new Date(start.getTime() + duration * 60_000);

    setIsSubmitting(true);
    try {
      if (!table) throw new Error("No table is selected");
      const booking = await createOnlineBookingAction({
        tableId: table.id,
        customerName: name,
        customerPhone: phone,
        slotStart: start,
        slotEnd: end,
      });
      setConfirmOpen(false);
      setConfirmed(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setSubmitError(
        message.includes("not available") || message.includes("overlapping")
          ? "This table is not available for the selected time. Please choose another time or table."
          : message.includes("Choose a future time")
            ? "That start time has passed. Choose a later time or another day."
            : message || "Unable to create booking. Please try again.",
      );
      setConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (tablesLoading || tables.length === 0 || !table) {
    return (
      <Card className="border-border bg-surface">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <p className="text-sm text-muted-foreground" role={tablesError ? "alert" : "status"}>
            {tablesLoading
              ? "Loading table choices..."
              : tablesError || "No active tables are available to book."}
          </p>
          <div className="-mx-4 space-y-3 sm:-mx-6">
            <div className="px-4 sm:px-6">
              <p className="text-sm font-semibold text-foreground">Live availability</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedDate.day}, {selectedDate.date} · 10:00 AM–11:00 PM
              </p>
            </div>
            <Timeline
              segments={[]}
              requestedStart={null}
              duration={duration}
              visibleStart={OPEN_START}
              earliestSelectableStart={OPEN_END}
              nowMinutes={null}
              focusKey={timelineFocusKey}
            />
            <p className="px-4 text-sm text-muted-foreground sm:px-6" role="status">
              {tablesError
                ? "Table information could not be loaded, so table-specific availability isn’t available yet."
                : tablesLoading
                  ? "Loading table information and live availability."
                  : bookingsError
                    ? "Live availability could not be loaded. Please try again shortly."
                    : bookingsLoading
                      ? "Loading this day’s table availability. The chart will update when it’s ready."
                      : "No active tables are available to display on the chart yet."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border-border/60 bg-surface">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant="outline" className="mb-3 min-h-7 border-felt/35 text-felt">
                Plan your game
              </Badge>
              <CardTitle className="text-2xl leading-tight sm:text-3xl">
                Choose your table and time
              </CardTitle>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-felt/35 bg-felt/10 px-3 py-2 text-xs font-medium text-felt">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Open hours 10:00 AM – 11:00 PM
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Choose a day</p>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
              {dateOptions.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant="outline"
                  aria-pressed={option.offset === dateOffset}
                  onClick={() => {
                    setDateOffset(option.offset);
                    setTimelineFocusKey((current) => current + 1);
                  }}
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
            <p className="text-sm font-medium text-muted-foreground">Filter by table type</p>
            <div className="flex flex-wrap gap-2">
              {(["ANY", "SNOOKER", "POOL"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={tableType === type ? "default" : "outline"}
                  disabled={type !== "ANY" && !tables.some((item) => item.type === type)}
                  aria-pressed={tableType === type}
                  onClick={() => {
                    setTableType(type);
                    const nextTable =
                      (type === "ANY" ? tables[0] : tables.find((item) => item.type === type)) ??
                      tables[0];
                    setTableId(nextTable.id);
                  }}
                  className={cn(
                    "min-h-9 rounded-full px-3 text-xs sm:px-4 sm:text-sm",
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
              <p className="text-sm font-medium text-muted-foreground">Choose a table</p>
              <span className="rounded-full border border-border bg-surface px-2 py-1 text-xs text-muted-foreground">
                {filteredTables.length} {filteredTables.length === 1 ? "table" : "tables"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {filteredTables.map((tableOption) => {
                const freeStartsCount = freeStarts(
                  tableOption.id,
                  dateOffset,
                  duration,
                  bookings,
                  earliestStart,
                ).length;
                const selected = tableOption.id === table.id;
                const tableBookings = bookings.filter(
                  (booking) =>
                    booking.tableId === tableOption.id && booking.dateOffset === dateOffset,
                );
                const activeBooking = conflictFor(
                  tableOption.id,
                  dateOffset,
                  requested,
                  duration,
                  bookings,
                );
                const currentBooking =
                  dateOffset === 0
                    ? tableBookings.find((booking) => {
                        const nowMinutes = academyMinutesOfDay(now);
                        return booking.start <= nowMinutes && nowMinutes < booking.end;
                      })
                    : null;
                const statusLabel = !availabilityReady
                  ? bookingsLoading
                    ? "Loading"
                    : "Unavailable"
                  : freeStartsCount === 0
                    ? "No full-hour slots"
                    : activeBooking
                      ? activeBooking.status === "ONGOING"
                        ? "In use"
                        : activeBooking.status === "HELD"
                          ? "Held"
                          : activeBooking.status === "MAINTENANCE"
                            ? "Maintenance"
                            : "Booked"
                      : "Available";
                const statusTone =
                  statusLabel === "Loading" || statusLabel === "Unavailable"
                    ? "bg-muted text-muted-foreground"
                    : statusLabel === "Available"
                      ? "bg-felt/10 text-felt"
                      : statusLabel === "In use"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-300"
                        : statusLabel === "Held"
                          ? "bg-amber-400/15 text-amber-700 dark:text-amber-300"
                          : statusLabel === "Maintenance"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-300"
                            : "bg-destructive/10 text-destructive";

                return (
                  <button
                    key={tableOption.id}
                    type="button"
                    onClick={() => handleTableSelect(tableOption)}
                    aria-pressed={selected}
                    className={cn(
                      "min-h-28 rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-felt sm:min-h-32 sm:rounded-2xl sm:p-4",
                      selected
                        ? "border-felt bg-felt/10"
                        : "border-border/70 bg-surface hover:border-border hover:bg-surface-strong",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold sm:text-base">{tableOption.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {tableOption.type === "SNOOKER" ? "Snooker" : "Pool"}
                        </p>
                      </div>
                      <span
                        className={cn("rounded-full px-2 py-1 text-[10px] font-medium", statusTone)}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-1 text-xs text-muted-foreground sm:mt-4 sm:text-sm">
                      <span className="whitespace-nowrap">
                        {formatPrice(tableOption.hourlyRate)} / hr
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {!availabilityReady
                        ? bookingsLoading
                          ? "Checking live availability"
                          : "Availability could not be checked"
                        : currentBooking?.status === "ONGOING"
                          ? "In use now"
                          : activeBooking
                            ? `Unavailable ${formatTime(requested)}–${formatTime(requested + duration)}`
                            : freeStartsCount === 0
                              ? "Try another day or session length"
                              : `${freeStartsCount} available start${freeStartsCount === 1 ? "" : "s"}`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-5 rounded-2xl bg-surface p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Choose your time</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Set your session length and start time. Your end time updates automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3 rounded-xl bg-background/60 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Session length</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        15-minute steps · at least 1 hour
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-felt/10 px-3 py-2 text-sm font-semibold text-felt">
                      {Math.floor(duration / 60)} hr{duration >= 120 ? "s" : ""}
                      {duration % 60 ? ` ${duration % 60} min` : ""}
                    </span>
                  </div>
                  {hasAvailableTime && maxDuration > MIN_BOOKING_DURATION_MINUTES ? (
                    <Slider
                      id="booking-duration"
                      min={MIN_BOOKING_DURATION_MINUTES}
                      max={maxDuration}
                      step={BOOKING_STEP_MINUTES}
                      value={[duration]}
                      onValueChange={(values) => {
                        const value = values[0];
                        if (value !== undefined) setSessionDuration(value);
                      }}
                      onValueCommit={(values) => {
                        const value = values[0];
                        if (value !== undefined) changeDuration(value);
                      }}
                      thumbLabel="Session length"
                      thumbValueText={`${duration} minutes`}
                      className="min-h-12 px-3"
                    />
                  ) : (
                    <p className="rounded-lg bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                      {hasAvailableTime
                        ? "A 1-hour session is the longest that fits at this start time. Move the start earlier for a longer game."
                        : "A full 1-hour session no longer fits today. Choose another day."}
                    </p>
                  )}
                  <div className="flex justify-between px-1 text-xs text-muted-foreground">
                    <span>1 hour</span>
                    <span>
                      {Math.floor(maxDuration / 60)} hr{maxDuration >= 120 ? "s" : ""} max
                    </span>
                  </div>
                </div>
                <div className="space-y-3 rounded-xl bg-background/60 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">Start and end</p>
                    <p className="text-xs text-muted-foreground">End time is calculated</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-background/70 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Starts</p>
                      <p className="mt-1 truncate text-lg font-semibold text-foreground sm:text-xl">
                        {hasAvailableTime ? formatTime(requested) : "No time"}
                      </p>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-xs text-muted-foreground">Ends</p>
                      <p className="mt-1 truncate text-lg font-semibold text-foreground sm:text-xl">
                        {hasAvailableTime ? endTime : "—"}
                      </p>
                    </div>
                  </div>
                  {hasAvailableTime && latestStart > earliestStart ? (
                    <Slider
                      id="booking-start-time"
                      min={earliestStart}
                      max={Math.max(earliestStart, latestStart)}
                      step={BOOKING_STEP_MINUTES}
                      value={[requested]}
                      onValueChange={(values) => {
                        const value = values[0];
                        if (value !== undefined) setStartTime(value);
                      }}
                      onValueCommit={(values) => {
                        const value = values[0];
                        if (value !== undefined) selectStartTime(value);
                      }}
                      disabled={!hasAvailableTime}
                      thumbLabel="Booking start time"
                      thumbValueText={formatTime(requested)}
                      className="min-h-12 px-3"
                    />
                  ) : (
                    <p className="rounded-lg bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                      {hasAvailableTime
                        ? "Only one start time fits this session before closing."
                        : "There are no start times left for a full-hour session today."}
                    </p>
                  )}
                  <div className="flex justify-between px-1 text-xs text-muted-foreground">
                    <span>
                      {hasAvailableTime ? formatTime(earliestStart) : "No bookable start times"}
                    </span>
                    <span>{hasAvailableTime ? formatTime(latestStart) : formatTime(OPEN_END)}</span>
                  </div>
                </div>
              </div>
            </div>

            {alternativeTables.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Better options
                </p>
                <div className="flex flex-wrap gap-2">
                  {alternativeTables.map(({ table: alternativeTable, date, start }) => (
                    <Button
                      key={`${alternativeTable.id}-${date.offset}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateOffset(date.offset);
                        setTableId(alternativeTable.id);
                        selectStartTime(start);
                      }}
                      className="min-h-11 rounded-full border-border bg-surface/80"
                    >
                      {alternativeTable.name} · {date.day}, {date.date} · {formatTime(start)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="-mx-4 space-y-4 py-3 sm:-mx-6 sm:py-4">
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6">
                <div>
                  <p className="text-sm font-semibold text-foreground">Live availability</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedDate.day}, {selectedDate.date} · swipe to see later times
                  </p>
                </div>
                {table ? (
                  <span className="shrink-0 rounded-full bg-felt/10 px-2.5 py-1 text-xs font-medium text-felt">
                    {table.name}
                  </span>
                ) : null}
              </div>
              <Timeline
                segments={timelineSegments}
                requestedStart={requested}
                duration={duration}
                visibleStart={timelineStart}
                earliestSelectableStart={earliestStart}
                nowMinutes={dateOffset === 0 ? academyMinutesOfDay(now) : null}
                focusKey={timelineFocusKey}
                onPick={setStartTime}
              />
              <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 text-xs text-muted-foreground sm:px-6">
                <LegendDot className="bg-felt/70" label="Available" />
                <LegendDot className="bg-red-500" label="Booked" />
                <LegendDot className="bg-amber-400" label="Held" />
                <LegendDot className="bg-blue-500" label="In use" />
                <LegendDot className="bg-purple-500" label="Maintenance" />
              </div>
              {bookingsLoading ? (
                <p
                  className="rounded-lg bg-background/70 px-3 py-2 text-sm text-muted-foreground"
                  role="status"
                >
                  <span className="px-4 sm:px-6">Loading live availability for {table.name}.</span>
                </p>
              ) : bookingsError ? (
                <p
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  Live availability could not be loaded. Please refresh and try again.
                </p>
              ) : dateOffset === 0 && nowMinutes < OPEN_START ? (
                <p
                  className="rounded-lg bg-background/70 px-3 py-2 text-sm text-muted-foreground"
                  role="status"
                >
                  The academy is currently closed. Today’s bookings open at 10:00 AM.
                </p>
              ) : dateOffset === 0 && !hasAvailableTime ? (
                <p
                  className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning"
                  role="status"
                >
                  {nowMinutes >= OPEN_END
                    ? "The academy is closed for today. Choose another day to book."
                    : "There isn’t enough time left today for a one-hour session. Choose another day."}
                </p>
              ) : !freeStarts(table.id, dateOffset, duration, bookings, earliestStart).length ? (
                <p
                  className="rounded-lg bg-background/70 px-3 py-2 text-sm text-muted-foreground"
                  role="status"
                >
                  No full-session openings remain for this table on {selectedDate.day.toLowerCase()}
                  .
                </p>
              ) : !requestedIsFree ? (
                <p
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="status"
                >
                  {withinHours
                    ? "That time is already taken. Choose another time or table."
                    : `Choose a start between ${formatTime(earliestStart)} and ${formatTime(latestStart)}.`}
                </p>
              ) : null}
            </div>

            {requestedIsFree ? (
              <div className="rounded-xl bg-felt/10 p-3">
                <p
                  className="flex items-center gap-2 text-sm font-semibold text-felt"
                  role="status"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {table.name} is free from {formatTime(requested)} to{" "}
                  {formatTime(requested + duration)}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background/70 p-3 sm:p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Your choice
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {table.name} · {selectedDate.day}, {selectedDate.date}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Table rate
                </p>
                <p className="mt-1 text-xl font-bold text-felt">
                  {formatPrice(table.hourlyRate)} / hr
                </p>
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
                  {table.type}
                </span>
                <span className="inline-flex min-h-9 items-center rounded-md border border-border bg-background px-3 text-felt">
                  {formatPrice(table.hourlyRate)} / hour
                </span>
              </div>
            </div>

            {confirmed ? (
              <div className="mt-4 rounded-xl border border-felt/35 bg-felt/10 p-4">
                <p className="flex items-center gap-2 text-base font-semibold text-felt">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  Request submitted
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your time is reserved while our team reviews the request. We will confirm it with
                  you before the session.
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
                  Request this table
                </Button>
              </form>
            )}
          </div>
        </DrawerContent>
      </Drawer>
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) setConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm booking?</AlertDialogTitle>
            <AlertDialogDescription>
              {table.name} on {selectedDate.day}, {selectedDate.date} from {formatTime(requested)}{" "}
              to {formatTime(requested + duration)} will be reserved while staff reviews it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Go back</AlertDialogCancel>
            <AlertDialogAction
              loading={isSubmitting}
              loadingText="Submitting…"
              onClick={(event) => {
                event.preventDefault();
                void confirmBooking();
              }}
            >
              Confirm booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {submitError ? (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-destructive/40 bg-background px-4 py-3 text-sm text-destructive shadow-lg"
        >
          {submitError}
        </div>
      ) : null}
    </>
  );
}

const SEGMENT_TONE: Record<DaySegment["kind"], string> = {
  FREE: "bg-felt/35",
  BOOKED: "bg-red-500/80",
  HELD: "bg-amber-400/80",
  ONGOING: "bg-blue-500/80",
  MAINTENANCE: "bg-purple-500/80",
};

function Timeline({
  segments,
  requestedStart,
  duration,
  visibleStart,
  earliestSelectableStart,
  nowMinutes,
  focusKey,
  onPick,
}: {
  segments: DaySegment[];
  requestedStart: number | null;
  duration: number;
  visibleStart: number;
  earliestSelectableStart: number;
  nowMinutes: number | null;
  focusKey: number;
  onPick?: (minutes: number) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastFocusedKey = useRef<number | null>(null);
  const axisStart = Math.min(visibleStart, OPEN_END - 1);
  const span = OPEN_END - axisStart;
  const pct = (minutes: number) => ((minutes - axisStart) / span) * 100;
  const firstHour = Math.ceil(axisStart / 60) * 60;
  const hours = Array.from(
    { length: Math.floor((OPEN_END - firstHour) / 60) + 1 },
    (_, index) => firstHour + index * 60,
  );

  useEffect(() => {
    if (lastFocusedKey.current === focusKey || requestedStart === null) return;
    lastFocusedKey.current = focusKey;

    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const selectedCenter =
        ((requestedStart + duration / 2 - axisStart) / span) * viewport.scrollWidth;
      const left = Math.max(0, selectedCenter - viewport.clientWidth / 2);
      viewport.scrollTo({ left, behavior: focusKey === 0 ? "auto" : "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [axisStart, duration, focusKey, requestedStart, span]);

  return (
    <div
      ref={viewportRef}
      className="overflow-x-auto overscroll-x-contain pb-2"
      role="region"
      aria-label="Table availability timeline"
    >
      <div className="relative min-w-[880px] pt-6">
        <div className="relative h-20 overflow-hidden bg-surface-subtle">
          {segments.map((segment) => {
            const start = Math.max(segment.start, axisStart);
            const end = Math.min(segment.end, OPEN_END);
            if (end <= start) return null;
            const firstSelectable = Math.max(
              ceilToBookingStep(start),
              ceilToBookingStep(axisStart),
              earliestSelectableStart,
            );
            const lastSelectable =
              Math.floor(Math.min(end - duration, OPEN_END - duration) / BOOKING_STEP_MINUTES) *
              BOOKING_STEP_MINUTES;
            const canSelect =
              segment.kind === "FREE" && firstSelectable <= lastSelectable && onPick !== undefined;

            return (
              <button
                key={`${segment.kind}-${segment.start}`}
                type="button"
                disabled={!canSelect}
                onClick={(event) => {
                  if (!canSelect) return;
                  const track = event.currentTarget.parentElement;
                  const bounds = track?.getBoundingClientRect();
                  let selected = firstSelectable;
                  if (event.detail > 0 && bounds && bounds.width > 0) {
                    const ratio = Math.min(
                      1,
                      Math.max(0, (event.clientX - bounds.left) / bounds.width),
                    );
                    const rawMinute = axisStart + ratio * span;
                    selected = Math.min(
                      lastSelectable,
                      Math.max(firstSelectable, ceilToBookingStep(rawMinute)),
                    );
                  }
                  onPick?.(selected);
                }}
                aria-label={
                  canSelect
                    ? `Available from ${formatTime(start)} to ${formatTime(end)}. Tap to choose a start time.`
                    : `${formatTime(start)} to ${formatTime(end)} ${segment.label ?? "unavailable"}`
                }
                className={cn(
                  "absolute inset-y-0 border-r border-background/50 transition-[filter] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground",
                  segment.kind === "FREE" && !canSelect
                    ? "bg-muted/60"
                    : SEGMENT_TONE[segment.kind],
                  canSelect
                    ? "cursor-pointer hover:brightness-125"
                    : "cursor-not-allowed opacity-90",
                )}
                style={{
                  left: `${pct(start)}%`,
                  width: `${Math.max(0.7, pct(end) - pct(start))}%`,
                }}
              />
            );
          })}

          {requestedStart !== null &&
          requestedStart >= axisStart &&
          requestedStart + duration <= OPEN_END ? (
            <div
              className="pointer-events-none absolute inset-y-0 rounded border-2 border-white bg-white/20"
              style={{
                left: `${pct(requestedStart)}%`,
                width: `${Math.max(0.7, pct(requestedStart + duration) - pct(requestedStart))}%`,
              }}
              aria-hidden="true"
            />
          ) : null}

          {nowMinutes !== null && nowMinutes >= axisStart && nowMinutes < OPEN_END ? (
            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white"
              style={{ left: `${pct(nowMinutes)}%` }}
              aria-hidden="true"
            />
          ) : null}
        </div>

        <div className="relative mt-2 h-6 text-[11px] text-muted-foreground">
          <span className="absolute left-0 -translate-x-0">{formatTime(axisStart)}</span>
          {hours
            .filter((hour) => hour < OPEN_END)
            .map((hour) => (
              <span
                key={hour}
                className="absolute -translate-x-1/2"
                style={{ left: `${pct(hour)}%` }}
              >
                {formatTime(hour).replace(":00", "")}
              </span>
            ))}
          <span className="absolute right-0 translate-x-0">{formatTime(OPEN_END)}</span>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-sm", className)} aria-hidden="true" />
      {label}
    </span>
  );
}
