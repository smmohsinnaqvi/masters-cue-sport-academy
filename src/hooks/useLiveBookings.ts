"use client";

import { useEffect, useRef, useState } from "react";
import type { BookingRecord } from "@/types/operations";
import { academyDateKeyForOffset, academyDateOffset } from "@/lib/academy-time";
import { normalizeBooking } from "@/lib/real-data";
import { supabase } from "@/lib/supabase";

export function useLiveBookings(selectedDateOffset = 0) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const extensionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    function clearExtensionTimer() {
      if (extensionTimer.current) clearTimeout(extensionTimer.current);
      extensionTimer.current = null;
    }

    async function load() {
      try {
        const dateKey = academyDateKeyForOffset(selectedDateOffset);
        const response = await fetch(`/api/tables/availability?date=${dateKey}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          sessions?: Array<Record<string, unknown>>;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load booking data");
        const next = (payload.sessions ?? []).map((raw) => {
          const tableId = raw.tableId;
          const startTime = raw.startTime;
          const plannedEnd = raw.plannedEnd;
          if (
            typeof raw.id !== "string" ||
            typeof tableId !== "string" ||
            typeof startTime !== "string" ||
            typeof plannedEnd !== "string" ||
            (raw.source !== "ONLINE" && raw.source !== "WALKIN" && raw.source !== "MAINTENANCE") ||
            (raw.status !== "HELD" &&
              raw.status !== "CONFIRMED" &&
              raw.status !== "ONGOING" &&
              raw.status !== "CANCELLED")
          ) {
            throw new Error("Availability response contained an invalid session");
          }

          return normalizeBooking(
            {
              id: raw.id,
              tableId,
              source: raw.source,
              slotStart: startTime,
              slotEnd: plannedEnd,
              status: raw.status,
            },
            academyDateOffset(startTime),
          );
        });
        if (mounted) {
          setBookings(next);
          clearExtensionTimer();
          if (selectedDateOffset === 0) {
            const nextWalkInEnd = (payload.sessions ?? [])
              .filter(
                (session): session is Record<string, unknown> & { plannedEnd: string } =>
                  session.source === "WALKIN" &&
                  session.status === "ONGOING" &&
                  typeof session.plannedEnd === "string",
              )
              .map((session) => new Date(session.plannedEnd).getTime())
              .filter((end) => end > Date.now())
              .sort((a, b) => a - b)[0];
            if (nextWalkInEnd) {
              const msUntilEnd = nextWalkInEnd - Date.now();
              extensionTimer.current = setTimeout(() => void load(), msUntilEnd + 100);
            }
          }
        }
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
      clearExtensionTimer();
      void channel.unsubscribe();
    };
  }, [selectedDateOffset]);

  return { bookings, loading, error };
}
