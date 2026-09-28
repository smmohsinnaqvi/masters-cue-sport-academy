"use client";

import { useEffect, useState } from "react";

import { useLiveBookings } from "@/hooks/useLiveBookings";
import { useLiveTables } from "@/hooks/useLiveTables";
import { academyDateKey, academyMinutesOfDay } from "@/lib/academy-time";
import { OPEN_END, OPEN_START } from "@/lib/booking";
import { cn } from "@/lib/utils";

export function LiveAvailabilityIndicator() {
  const [now, setNow] = useState<Date | null>(null);
  const { tables, loading: tablesLoading, error: tablesError } = useLiveTables();
  const today = academyDateKey(now ?? new Date());
  const { bookings, loading: bookingsLoading, error: bookingsError } = useLiveBookings(0, today);

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    const interval = setInterval(updateNow, 30_000);
    return () => clearInterval(interval);
  }, []);

  const nowMinutes = now ? academyMinutesOfDay(now) : null;
  const isOpen = nowMinutes !== null && nowMinutes >= OPEN_START && nowMinutes < OPEN_END;
  const hasAvailableTable =
    isOpen &&
    tables.some(
      (table) =>
        !bookings.some(
          (booking) =>
            booking.tableId === table.id &&
            booking.dateOffset === 0 &&
            booking.status !== "CANCELLED" &&
            booking.start <= nowMinutes &&
            nowMinutes < booking.end,
        ),
    );

  const loading = now === null || tablesLoading || bookingsLoading;
  const failed = Boolean(tablesError || bookingsError);
  const message = loading
    ? "Checking live availability"
    : failed
      ? "Availability unavailable"
      : hasAvailableTable
        ? "Tables available now"
        : "No tables available now";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold text-foreground",
        hasAvailableTable && !loading && !failed ? "border-felt/40" : "border-border",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          loading || failed
            ? "bg-muted-foreground"
            : hasAvailableTable
              ? "bg-felt"
              : "bg-destructive",
        )}
        aria-hidden="true"
      />
      {message}
    </div>
  );
}
