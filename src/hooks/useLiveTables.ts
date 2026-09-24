"use client";

import { useEffect, useState } from "react";

import { MOCK_TABLES } from "@/data/mock-data";
import { normalizeTable, type CompatibleTable } from "@/lib/real-data";
import { supabase } from "@/lib/supabase";

export function useLiveTables() {
  const [tables, setTables] = useState<CompatibleTable[]>(MOCK_TABLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTables() {
      try {
        const { data, error: loadError } = await supabase.from("tables").select("*").order("name");

        if (loadError) {
          throw loadError;
        }

        const nextTables = (data ?? []).map((row) => normalizeTable(row as never));

        if (isMounted) {
          setTables(nextTables.length > 0 ? nextTables : MOCK_TABLES);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load table data");
          setTables(MOCK_TABLES);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadTables();

    const channel = supabase.channel("realtime-tables");

    channel.on("postgres_changes", { event: "*", schema: "public", table: "tables" }, (payload) => {
      const row = payload.new as Record<string, unknown> | null;
      const previousRow = payload.old as Record<string, unknown> | null;

      setTables((current) => {
        if (payload.eventType === "INSERT" && row) {
          const normalized = normalizeTable(row as never);
          return [...current, normalized].sort((a, b) => a.name.localeCompare(b.name));
        }

        if (payload.eventType === "UPDATE" && row) {
          const normalized = normalizeTable(row as never);
          return current
            .map((table) => (table.id === normalized.id ? normalized : table))
            .sort((a, b) => a.name.localeCompare(b.name));
        }

        if (payload.eventType === "DELETE" && previousRow) {
          return current.filter((table) => table.id !== String(previousRow.id));
        }

        return current;
      });
    });

    channel.subscribe();

    return () => {
      isMounted = false;
      void channel.unsubscribe();
    };
  }, []);

  return { tables, loading, error };
}
