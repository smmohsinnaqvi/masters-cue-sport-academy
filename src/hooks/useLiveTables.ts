"use client";

import { useEffect, useState } from "react";

import { normalizeTable, type CompatibleTable } from "@/lib/real-data";
import { supabase } from "@/lib/supabase";

export function useLiveTables() {
  const [tables, setTables] = useState<CompatibleTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTables() {
      try {
        const response = await fetch("/api/tables", { cache: "no-store" });
        const payload = (await response.json()) as { tables?: unknown[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load table data");
        const nextTables = (payload.tables ?? []).map((row) => normalizeTable(row as never));

        if (isMounted) {
          setTables(nextTables);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load table data");
          setTables([]);
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
      void loadTables();
    });

    channel.subscribe();

    return () => {
      isMounted = false;
      void channel.unsubscribe();
    };
  }, []);

  return { tables, loading, error };
}
