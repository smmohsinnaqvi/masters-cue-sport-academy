"use client";

import { useEffect, useState } from "react";

import { MOCK_BOOKINGS, type BookingRecord } from "@/data/mock-data";
import { normalizeBooking } from "@/lib/real-data";
import { supabase } from "@/lib/supabase";

export function useLiveBookings() {
  const [bookings, setBookings] = useState<BookingRecord[]>(MOCK_BOOKINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBookings() {
      try {
        const { data, error: loadError } = await supabase
          .from("bookings")
          .select("*")
          .order("slot_start", { ascending: true });

        if (loadError) {
          throw loadError;
        }

        const nextBookings = (data ?? []).map((row) => normalizeBooking(row as never, 0));

        if (isMounted) {
          setBookings(nextBookings.length > 0 ? nextBookings : MOCK_BOOKINGS);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load booking data");
          setBookings(MOCK_BOOKINGS);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadBookings();

    const channel = supabase.channel("realtime-bookings");

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      (payload) => {
        const row = payload.new as Record<string, unknown> | null;
        const previousRow = payload.old as Record<string, unknown> | null;

        setBookings((current) => {
          if (payload.eventType === "INSERT" && row) {
            const normalized = normalizeBooking(row as never, 0);
            return [...current, normalized];
          }

          if (payload.eventType === "UPDATE" && row) {
            const normalized = normalizeBooking(row as never, 0);
            return current.map((booking) => (booking.id === normalized.id ? normalized : booking));
          }

          if (payload.eventType === "DELETE" && previousRow) {
            return current.filter((booking) => booking.id !== String(previousRow.id));
          }

          return current;
        });
      },
    );

    channel.subscribe();

    return () => {
      isMounted = false;
      void channel.unsubscribe();
    };
  }, []);

  return { bookings, loading, error };
}
