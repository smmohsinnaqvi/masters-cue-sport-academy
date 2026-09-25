"use client";

import { useEffect, useState } from "react";
import { type BookingRecord } from "@/data/mock-data";
import { normalizeBooking } from "@/lib/real-data";
import { supabase } from "@/lib/supabase";

function dateOffsetFor(value: string | Date) {
  const today = new Date();
  const target = new Date(value);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  return Math.round((targetStart - start) / 86_400_000);
}

export function useLiveBookings(selectedDateOffset = 0) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const today = new Date();
        const date = new Date(today.getTime());
        date.setDate(date.getDate() + selectedDateOffset);
        const dateKey = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");
        const response = await fetch(`/api/tables/availability?date=${dateKey}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          sessions?: Array<Record<string, unknown>>;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load booking data");
        const next = (payload.sessions ?? []).map((row) => {
          const raw = row as unknown as Record<string, unknown>;
          const tableId = raw.tableId ?? raw.table_id;
          const startTime = raw.startTime ?? raw.start_time;
          const plannedEnd = raw.plannedEnd ?? raw.planned_end;

          if (
            typeof tableId !== "string" ||
            typeof startTime !== "string" ||
            typeof plannedEnd !== "string"
          ) {
            throw new Error("Availability response contained an invalid session");
          }

          return normalizeBooking(
            {
              id: raw.id,
              table_id: tableId,
              customer_name: raw.customer_name,
              customer_phone: raw.customer_phone,
              slot_start: startTime,
              slot_end: plannedEnd,
              status: raw.status,
              reference: raw.ref_code,
            } as never,
            dateOffsetFor(startTime),
          );
        });
        if (mounted) setBookings(next);
      } catch (reason) {
        if (mounted) {
          setError(reason instanceof Error ? reason.message : "Unable to load booking data");
          setBookings([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    const channel = supabase
      .channel("realtime-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => void load(),
      )
      .subscribe();
    return () => {
      mounted = false;
      void channel.unsubscribe();
    };
  }, [selectedDateOffset]);

  return { bookings, loading, error };
}
