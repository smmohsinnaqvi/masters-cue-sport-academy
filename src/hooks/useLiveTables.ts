"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { Table } from "@/types/database";

export function useLiveTables() {
  const [tables, setTables] = useState<Table[]>([]);
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

        if (isMounted) {
          setTables((data ?? []) as Table[]);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load table data");
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
      const row = payload.new as Table | null;
      const previousRow = payload.old as Table | null;

      setTables((current) => {
        if (payload.eventType === "INSERT" && row) {
          return [...current, row].sort((a, b) => a.name.localeCompare(b.name));
        }

        if (payload.eventType === "UPDATE" && row) {
          return current
            .map((table) => (table.id === row.id ? { ...table, ...row } : table))
            .sort((a, b) => a.name.localeCompare(b.name));
        }

        if (payload.eventType === "DELETE" && previousRow) {
          return current.filter((table) => table.id !== previousRow.id);
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
