"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SessionPageRow = {
  id: string;
  tableId: string;
  source: "ONLINE" | "WALKIN" | "MAINTENANCE";
  status: "HELD" | "CONFIRMED" | "ONGOING" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "EXPIRED";
  startTime: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  customerName: string | null;
  customerPhone: string | null;
  players: unknown;
  loserName: string | null;
  durationMinutes: number | null;
  amount: number | null;
  paymentStatus: string;
  createdAt: string;
  table: { id: string; name: string; type: "SNOOKER" | "POOL" };
};

export type SessionPageFilters = {
  date: string;
  source: string;
  status: string;
  payment: string;
};

export function useSessionPages(
  view: "ledger" | "bookings",
  refreshKey: number,
  filters?: SessionPageFilters,
  autoLoadEnabled = true,
) {
  const [items, setItems] = useState<SessionPageRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const requestGeneration = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const date = view === "ledger" ? (filters?.date ?? "") : "";
  const source = view === "ledger" ? (filters?.source ?? "") : "";
  const status = view === "ledger" ? (filters?.status ?? "") : "";
  const payment = view === "ledger" ? (filters?.payment ?? "") : "";

  const loadPage = useCallback(
    async (reset = false) => {
      if ((!reset && loadingRef.current) || (!reset && !hasMoreRef.current)) return;
      if (reset) {
        controllerRef.current?.abort();
        loadingRef.current = false;
        cursorRef.current = null;
        hasMoreRef.current = true;
        setCursor(null);
        setHasMore(true);
        setItems([]);
        setError(null);
      }
      loadingRef.current = true;
      setLoading(true);
      const generation = reset ? ++requestGeneration.current : requestGeneration.current;
      const pageCursor = reset ? null : cursorRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const params = new URLSearchParams({ view, take: "25" });
        if (date) params.set("date", date);
        if (source) params.set("source", source);
        if (status) params.set("status", status);
        if (payment) params.set("payment", payment);
        if (pageCursor) params.set("cursor", pageCursor);
        const response = await fetch(`/api/ledger?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          sessions?: SessionPageRow[];
          nextCursor?: string | null;
          hasMore?: boolean;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Unable to load session history");
        if (generation !== requestGeneration.current) return;

        const page = payload.sessions ?? [];
        setItems((current) => {
          if (reset) return page;
          const known = new Set(current.map((item) => item.id));
          return [...current, ...page.filter((item) => !known.has(item.id))];
        });
        cursorRef.current = payload.nextCursor ?? null;
        hasMoreRef.current = Boolean(payload.hasMore && payload.nextCursor);
        setCursor(cursorRef.current);
        setHasMore(hasMoreRef.current);
        setError(null);
      } catch (reason) {
        if (generation === requestGeneration.current && !controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Unable to load session history");
        }
      } finally {
        if (generation === requestGeneration.current) {
          controllerRef.current = null;
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [date, payment, source, status, view],
  );

  useEffect(() => {
    if (!autoLoadEnabled) return;
    cursorRef.current = null;
    hasMoreRef.current = true;
    void loadPage(true);
  }, [autoLoadEnabled, loadPage, refreshKey]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const updateViewport = () => setIsMobileViewport(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!autoLoadEnabled || !sentinel || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadPage();
      },
      {
        root: isMobileViewport ? scrollRootRef.current : null,
        rootMargin: "240px",
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [autoLoadEnabled, hasMore, isMobileViewport, loading, loadPage, cursor]);

  return { items, hasMore, loading, error, loadMore: loadPage, sentinelRef, scrollRootRef };
}
