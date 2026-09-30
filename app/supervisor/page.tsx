"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  PencilLine,
  Play,
  Plus,
  Square,
  Table2,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import { RoleGate } from "@/components/auth/role-gate";
import {
  cancelSessionAction,
  closeSessionAction,
  createWalkInSessionAction,
  extendWalkInSessionAction,
  getOperationsSnapshotAction,
  getOperationsSummaryAction,
  settleSessionPaymentAction,
  startOnlineBookingAction,
  updateWalkInSessionAction,
} from "@/actions/operations-actions";
import { updateBookingStatusAction } from "@/actions/booking-actions";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Table } from "@/types/operations";
import { supabase } from "@/lib/supabase";
import { useSessionPages, type SessionPageRow } from "@/hooks/useSessionPages";
import { cn } from "@/lib/utils";
import { sessionCharge, sessionDurationMinutes } from "@/lib/session-pricing";
import { WALKIN_BLOCK_OPTIONS, WALKIN_EXTEND_INCREMENT_MINUTES } from "@/lib/operations-constants";
import { academyDateKey, academyDateTimeToUtc } from "@/lib/academy-time";
import {
  getWalkInAvailableMinutes,
  getWalkInBlockEnd,
  getWalkInCutoff,
  getWalkInExtensionEnd,
} from "@/lib/walk-in-blocks";

type EntryStatus = "live" | "booked" | "completed" | "cancelled" | "no-show" | "expired";
type Entry = {
  id: string;
  sessionId?: string;
  tableId: string;
  tableName: string;
  tableType: Table["type"];
  status: EntryStatus;
  statusLabel: string;
  playerOne: string;
  playerTwo: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  payment: string;
  amount: number;
  payerName: string;
  paymentMethod: string;
  durationMinutes: number | null;
  source: "ONLINE" | "WALKIN" | "MAINTENANCE";
};
type Booking = {
  id: string;
  tableId: string;
  customerName: string;
  slotStart: string;
  slotEnd: string;
  status: "HELD" | "CONFIRMED" | "ONGOING" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "EXPIRED";
  amount: number;
  paymentStatus: string;
  verified: boolean;
  table?: { shortName: string; type: Table["type"] };
};
type Snapshot = Awaited<ReturnType<typeof getOperationsSnapshotAction>>;
type OperationsSummary = Awaited<ReturnType<typeof getOperationsSummaryAction>>;

const emptyForm = {
  tableId: "",
  playerOne: "",
  playerTwo: "",
  customerPhone: "",
  durationMinutes: 120,
};

function time(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function elapsedClock(start: Date | string | null, now: number) {
  if (!start) return "0:00:00";
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function playerName(players: unknown, index: number, fallback: string) {
  if (!Array.isArray(players)) return fallback;
  const player = players[index];
  if (!player || typeof player !== "object" || !("name" in player)) return fallback;
  return String(player.name);
}

function entryFromPage(session: SessionPageRow): Entry {
  return {
    id: session.id,
    sessionId: session.id,
    tableId: session.tableId,
    tableName: session.table.name,
    tableType: session.table.type,
    status:
      session.status === "ONGOING"
        ? "live"
        : session.status === "CONFIRMED" || session.status === "HELD"
          ? "booked"
          : session.status === "NO_SHOW"
            ? "no-show"
            : session.status === "CANCELLED"
              ? "cancelled"
              : session.status === "EXPIRED"
                ? "expired"
                : "completed",
    statusLabel:
      session.source === "MAINTENANCE" && session.status !== "CANCELLED"
        ? "Maintenance"
        : session.status === "HELD"
          ? "Held"
          : session.status === "CONFIRMED"
            ? "Booked"
            : session.status === "ONGOING"
              ? "In use"
              : session.status === "COMPLETED"
                ? "Completed"
                : session.status === "CANCELLED"
                  ? "Cancelled"
                  : session.status === "NO_SHOW"
                    ? "No-show"
                    : "Expired",
    playerOne:
      session.source === "WALKIN"
        ? playerName(session.players, 0, "Walk-in")
        : (session.customerName ?? "Guest"),
    playerTwo:
      session.source === "WALKIN"
        ? playerName(session.players, 1, "Opponent")
        : (session.customerPhone ?? ""),
    customerPhone: session.customerPhone ?? "",
    startTime: time(session.actualStart ?? session.startTime),
    endTime: time(session.actualEnd ?? session.plannedEnd),
    payment: session.paymentStatus,
    paymentMethod: session.paymentMethod ?? "",
    payerName: session.payerName ?? "",
    amount: session.amount ?? 0,
    durationMinutes: session.durationMinutes,
    source: session.source,
  };
}

function bookingFromPage(session: SessionPageRow): Booking {
  return {
    id: session.id,
    tableId: session.tableId,
    customerName: session.customerName ?? "Guest",
    slotStart: session.startTime,
    slotEnd: session.plannedEnd,
    status: session.status,
    verified: session.status === "CONFIRMED",
    amount: session.amount ?? 0,
    paymentStatus: session.paymentStatus,
    table: { shortName: session.table.name, type: session.table.type },
  };
}

export default function SupervisorPage() {
  const [snapshot, setSnapshot] = useState<Snapshot>([]);
  const [summary, setSummary] = useState<OperationsSummary>({
    unpaidAmount: 0,
    unpaidCount: 0,
    nextHourBookings: 0,
  });
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeHistory, setActiveHistory] = useState<"tables" | "unpaid" | "ledger" | "bookings">(
    "tables",
  );
  const [expandedBookings, setExpandedBookings] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [ledgerSearch, setLedgerSearch] = useState("");
  const ledgerPage = useSessionPages("ledger", refreshKey, { search: ledgerSearch });
  const bookingsPage = useSessionPages("bookings", refreshKey);
  const duesPage = useSessionPages("dues", refreshKey);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [endSession, setEndSession] = useState<{
    sessionId: string;
    payerName: string;
    paymentMethod: "CASH" | "UPI" | "CARD" | null;
  } | null>(null);
  const [paymentEntry, setPaymentEntry] = useState<{
    sessionId: string;
    payerName: string;
    paymentMethod: "CASH" | "UPI" | "CARD";
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isSavingWalkIn, setIsSavingWalkIn] = useState(false);
  const [startingBookingId, setStartingBookingId] = useState<string | null>(null);
  const [extendingSessionId, setExtendingSessionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [next, nextSummary] = await Promise.all([
      getOperationsSnapshotAction(),
      getOperationsSummaryAction(),
    ]);
    setSnapshot(next);
    setSummary(nextSummary);
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    void refresh()
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Unable to load operations"),
      )
      .finally(() => setSnapshotLoading(false));
    const channel = supabase
      .channel("operations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        () => void refresh(),
      )
      .subscribe();
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1_000);
    return () => {
      window.clearInterval(timer);
      void channel.unsubscribe();
    };
  }, [refresh]);

  const tables = useMemo(() => snapshot, [snapshot]);
  const entries = ledgerPage.items.map(entryFromPage);
  const bookings = bookingsPage.items.map(bookingFromPage);
  const dues = duesPage.items.map(entryFromPage);
  const activeSessions = tables.flatMap((table) => table.sessions);
  const liveCount = activeSessions.filter((session) => session.status === "ONGOING").length;
  const closingSession = endSession
    ? activeSessions.find((session) => session.id === endSession.sessionId)
    : null;
  const closingTable = closingSession
    ? tables.find((table) => table.id === closingSession.tableId)
    : null;
  const closingStartedAt = closingSession?.actualStart ?? closingSession?.startTime;
  const closingPlayerName = closingSession
    ? closingSession.source === "WALKIN"
      ? playerName(closingSession.players, 0, "Walk-in")
      : (closingSession.customerName ?? "Online booking")
    : "";
  const closingMinutes = closingStartedAt
    ? sessionDurationMinutes(closingStartedAt, new Date(currentTime))
    : 0;
  const closingRate = closingSession?.rateSnapshot ?? closingTable?.hourlyRate ?? 0;
  const closingAmount = sessionCharge(closingRate, closingMinutes);
  const walkInTable = tables.find((table) => table.id === form.tableId);
  const walkInNow = new Date(currentTime);
  const walkInClosingTime = academyDateTimeToUtc(academyDateKey(walkInNow), "23:00");
  const walkInNextBooking = walkInTable?.sessions
    .filter(
      (session) =>
        session.source === "ONLINE" &&
        (session.status === "HELD" || session.status === "CONFIRMED") &&
        session.startTime.getTime() > currentTime,
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
  const walkInCutoff = getWalkInCutoff(walkInClosingTime, walkInNextBooking?.startTime ?? null);
  const walkInPlannedEnd = getWalkInBlockEnd(walkInNow, form.durationMinutes, walkInCutoff);
  const walkInAvailableMinutes = getWalkInAvailableMinutes(walkInNow, walkInCutoff);
  const walkInActualMinutes = getWalkInAvailableMinutes(walkInNow, walkInPlannedEnd);
  const paymentEntryDetails = paymentEntry
    ? (dues.find((entry) => entry.id === paymentEntry.sessionId) ??
      entries.find((entry) => entry.id === paymentEntry.sessionId) ??
      bookings.find((booking) => booking.id === paymentEntry.sessionId))
    : null;

  function openCreate(tableId: string) {
    setEditing(null);
    setForm({ ...emptyForm, tableId, durationMinutes: 120 });
    setShowForm(true);
  }

  function openEdit(entry: Entry) {
    setEditing(entry);
    setForm({
      tableId: entry.tableId,
      playerOne: entry.playerOne,
      playerTwo: entry.playerTwo,
      customerPhone: entry.customerPhone,
      durationMinutes: 120,
    });
    setShowForm(true);
  }

  async function saveForm() {
    if (isSavingWalkIn) return;
    setIsSavingWalkIn(true);
    try {
      if (editing?.sessionId) {
        await updateWalkInSessionAction({
          sessionId: editing.sessionId,
          customerName: form.playerOne,
          playerTwoName: form.playerTwo,
        });
      } else {
        await createWalkInSessionAction({
          tableId: form.tableId,
          customerName: form.playerOne,
          customerPhone: form.customerPhone,
          durationMinutes: form.durationMinutes,
        });
      }
      setShowForm(false);
      setError(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save session");
    } finally {
      setIsSavingWalkIn(false);
    }
  }

  function ask(title: string, description: string, action: () => Promise<void>) {
    setConfirm({ title, description, action });
  }

  async function runConfirmed() {
    if (!confirm || isConfirming) return;
    setIsConfirming(true);
    try {
      await confirm.action();
      setConfirm(null);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Operation failed");
      setConfirm(null);
    } finally {
      setIsConfirming(false);
    }
  }

  async function closeCurrentSession() {
    if (!endSession || isEndingSession) return;
    setIsEndingSession(true);
    try {
      await closeSessionAction(endSession);
      setEndSession(null);
      setError(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to close session");
    } finally {
      setIsEndingSession(false);
    }
  }

  async function extendSession(sessionId: string) {
    if (extendingSessionId) return;
    setExtendingSessionId(sessionId);
    try {
      await extendWalkInSessionAction(sessionId);
      setError(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to extend the table block");
    } finally {
      setExtendingSessionId(null);
    }
  }

  async function startBooking(bookingId: string) {
    if (startingBookingId) return;
    setStartingBookingId(bookingId);
    try {
      await startOnlineBookingAction(bookingId);
      setError(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start this booking");
    } finally {
      setStartingBookingId(null);
    }
  }

  async function recordCurrentPayment() {
    if (!paymentEntry || isRecordingPayment) return;
    setIsRecordingPayment(true);
    try {
      await settleSessionPaymentAction(paymentEntry);
      setPaymentEntry(null);
      setError(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  }

  return (
    <RoleGate role="supervisor">
      <>
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-felt">
                Supervisor
              </p>
              <h1 className="mt-0.5 text-xl font-bold sm:text-2xl">Live floor</h1>
            </div>
          </div>
          {error ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-3 gap-2" aria-busy={snapshotLoading}>
            {snapshotLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-[4.5rem] rounded-xl" />
              ))
            ) : (
              <>
                <Metric
                  icon={Table2}
                  label="Tables in play"
                  value={`${liveCount} / ${snapshot.length}`}
                />
                <Metric
                  icon={Check}
                  label="Payments due"
                  value={money(summary.unpaidAmount)}
                  detail={`${summary.unpaidCount} sessions`}
                />
                <Metric
                  icon={CalendarClock}
                  label="Next hour bookings"
                  value={String(summary.nextHourBookings)}
                />
              </>
            )}
          </div>

          <Dialog
            open={showForm}
            onOpenChange={(open) => {
              if (!open && !isSavingWalkIn) setShowForm(false);
            }}
          >
            <DialogContent className="max-h-[90dvh] w-[calc(100%-1.25rem)] max-w-md overflow-y-auto rounded-2xl p-5 sm:p-6">
              <DialogHeader className="pr-7">
                <DialogTitle>
                  {editing ? "Update players" : `Start walk-in on ${walkInTable?.name ?? "table"}`}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Update the names on this active table."
                    : `Held at ${money(walkInTable?.hourlyRate ?? 0)}/hr. Play is billed by actual minutes.`}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveForm();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="player-one">Player / payer name</Label>
                  <Input
                    id="player-one"
                    autoComplete="name"
                    maxLength={120}
                    value={form.playerOne}
                    onChange={(event) => setForm({ ...form, playerOne: event.target.value })}
                    required
                  />
                </div>
                {editing ? (
                  <div className="space-y-2">
                    <Label htmlFor="player-two">Second player (optional)</Label>
                    <Input
                      id="player-two"
                      value={form.playerTwo}
                      onChange={(event) => setForm({ ...form, playerTwo: event.target.value })}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="customer-phone">Phone (optional)</Label>
                      <Input
                        id="customer-phone"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={40}
                        value={form.customerPhone}
                        onChange={(event) =>
                          setForm({ ...form, customerPhone: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Hold the table for</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {WALKIN_BLOCK_OPTIONS.map((minutes) => (
                          <button
                            key={minutes}
                            type="button"
                            aria-pressed={form.durationMinutes === minutes}
                            onClick={() => setForm({ ...form, durationMinutes: minutes })}
                            className={cn(
                              "min-h-11 rounded-lg border px-1 text-xs font-semibold",
                              form.durationMinutes === minutes
                                ? "border-felt bg-felt/10 text-felt"
                                : "border-border bg-background text-muted-foreground",
                            )}
                          >
                            {minutes % 60 === 0
                              ? `${minutes / 60}h 00m`
                              : `${Math.floor(minutes / 60)}h 30m`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5 text-xs text-muted-foreground">
                      {walkInAvailableMinutes < WALKIN_BLOCK_OPTIONS[0] ? (
                        <span>
                          There is not enough time for a 1-hour block before the next booking or
                          closing.
                        </span>
                      ) : (
                        <span>
                          Table held until{" "}
                          <strong className="text-foreground">{time(walkInPlannedEnd)}</strong>
                          {walkInActualMinutes < form.durationMinutes
                            ? " · shortened for the next booking or closing"
                            : ""}
                        </span>
                      )}
                    </div>
                  </>
                )}
                <DialogFooter className="flex-row gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 flex-1 sm:flex-none"
                    disabled={isSavingWalkIn}
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-11 flex-1 gap-2 sm:flex-none"
                    loading={isSavingWalkIn}
                    loadingText={editing ? "Saving…" : "Starting…"}
                    disabled={
                      !form.playerOne.trim() ||
                      (!editing && walkInAvailableMinutes < WALKIN_BLOCK_OPTIONS[0])
                    }
                  >
                    {!editing ? <Play className="h-4 w-4" aria-hidden="true" /> : null}
                    {editing ? "Save changes" : "Start clock"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <div className="mt-5">
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-surface p-1">
              {(["tables", "unpaid", "ledger", "bookings"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveHistory(view)}
                  aria-pressed={activeHistory === view}
                  className={cn(
                    "min-h-11 rounded-lg px-1.5 text-xs font-semibold capitalize transition-colors sm:px-3 sm:text-sm",
                    activeHistory === view
                      ? "bg-felt text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {view === "unpaid" && summary.unpaidCount > 0
                    ? `Unpaid ${summary.unpaidCount}`
                    : view}
                </button>
              ))}
            </div>
          </div>
          {activeHistory === "tables" ? (
            <section className="mt-4" aria-labelledby="floor-heading" aria-busy={snapshotLoading}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 id="floor-heading" className="text-lg font-semibold sm:text-xl">
                    Tables
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Live sessions and the next reservations for each table.
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {snapshot.length} tables
                </Badge>
              </div>
              {snapshotLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <Card key={index} className="border-border bg-surface p-4">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="mt-4 h-16 w-full" />
                      <Skeleton className="mt-4 h-11 w-full" />
                    </Card>
                  ))}
                </div>
              ) : tables.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No active tables are configured.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {tables.map((table) => {
                    const active = table.sessions.find((session) => session.status === "ONGOING");
                    const nowBooking = table.sessions.find(
                      (session) =>
                        session.source === "ONLINE" &&
                        (session.status === "HELD" || session.status === "CONFIRMED") &&
                        session.startTime.getTime() <= currentTime &&
                        session.plannedEnd.getTime() > currentTime,
                    );
                    const upcoming = table.sessions.filter(
                      (session) =>
                        session.source === "ONLINE" &&
                        (session.status === "HELD" || session.status === "CONFIRMED") &&
                        session.plannedEnd.getTime() > currentTime,
                    );
                    const expanded = Boolean(expandedBookings[table.id]);
                    const visibleBookings = expanded ? upcoming : upcoming.slice(0, 1);
                    const isMaintenance = active?.source === "MAINTENANCE";
                    const players = active?.source === "WALKIN" ? active.players : null;
                    const playerOne = active
                      ? active.source === "WALKIN"
                        ? playerName(players, 0, "Walk-in")
                        : (active.customerName ?? "Online booking")
                      : "";
                    const playerTwo = active?.source === "WALKIN" ? playerName(players, 1, "") : "";
                    const start = active?.actualStart ?? active?.startTime;
                    const minutes =
                      active && start ? sessionDurationMinutes(start, new Date(currentTime)) : 0;
                    const rate = active?.rateSnapshot ?? table.hourlyRate;
                    const liveAmount = active ? sessionCharge(rate, minutes) : 0;
                    const overtimeMinutes =
                      active && active.source !== "MAINTENANCE"
                        ? Math.max(
                            0,
                            Math.floor((currentTime - active.plannedEnd.getTime()) / 60_000),
                          )
                        : 0;
                    const extensionBooking = active
                      ? table.sessions
                          .filter(
                            (session) =>
                              session.source === "ONLINE" &&
                              (session.status === "HELD" || session.status === "CONFIRMED") &&
                              session.startTime.getTime() >= active.plannedEnd.getTime() &&
                              session.plannedEnd.getTime() > currentTime,
                          )
                          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0]
                      : null;
                    const extensionCutoff = getWalkInCutoff(
                      academyDateTimeToUtc(academyDateKey(new Date(currentTime)), "23:00"),
                      extensionBooking?.startTime ?? null,
                    );
                    const canExtendWalkIn = Boolean(
                      active?.source === "WALKIN" &&
                      getWalkInExtensionEnd(
                        new Date(currentTime),
                        active.plannedEnd,
                        extensionCutoff,
                        WALKIN_EXTEND_INCREMENT_MINUTES,
                      ),
                    );
                    const unavailable = Boolean(active || nowBooking);
                    const activeEntry: Entry | null =
                      active && active.source === "WALKIN"
                        ? {
                            id: active.id,
                            sessionId: active.id,
                            tableId: table.id,
                            tableName: table.name,
                            tableType: table.type,
                            status: "live",
                            statusLabel: "In use",
                            playerOne,
                            playerTwo,
                            startTime: time(start ?? null),
                            endTime: time(active.plannedEnd),
                            payment: active.paymentStatus,
                            paymentMethod: active.paymentMethod ?? "",
                            payerName: active.payerName ?? "",
                            customerPhone: active.customerPhone ?? "",
                            durationMinutes: active.durationMinutes,
                            amount: active.amount ?? 0,
                            source: active.source,
                          }
                        : null;

                    return (
                      <Card
                        key={table.id}
                        className={cn(
                          "overflow-hidden border-border bg-surface",
                          active && !isMaintenance && !overtimeMinutes && "border-felt/35",
                          overtimeMinutes > 0 && "border-destructive/50",
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold">{table.name}</h3>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {table.type === "SNOOKER" ? "Snooker" : "Pool"} ·{" "}
                                {money(table.hourlyRate)}/hr ·{" "}
                                {money(Math.round(table.hourlyRate / 60))}/min
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0",
                                active && !isMaintenance && "border-felt/40 text-felt",
                                isMaintenance && "border-warning/40 text-warning",
                                overtimeMinutes > 0 && "border-destructive/50 text-destructive",
                              )}
                            >
                              {isMaintenance
                                ? "Maintenance"
                                : active
                                  ? overtimeMinutes > 0
                                    ? "Time over"
                                    : "In play"
                                  : unavailable
                                    ? nowBooking?.status === "CONFIRMED"
                                      ? "Booked now"
                                      : "Reserved"
                                    : "Free"}
                            </Badge>
                          </div>

                          {active ? (
                            <div
                              className={cn(
                                "mt-3 rounded-xl border p-3",
                                overtimeMinutes > 0
                                  ? "border-destructive/30 bg-destructive/5"
                                  : "border-felt/20 bg-felt/5",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold">{playerOne}</p>
                                  {playerTwo ? (
                                    <p className="truncate text-xs text-muted-foreground">
                                      vs. {playerTwo}
                                    </p>
                                  ) : null}
                                  {active.customerPhone ? (
                                    <p className="truncate text-xs text-muted-foreground">
                                      {active.customerPhone}
                                    </p>
                                  ) : null}
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {active.source === "ONLINE" ? "Online" : "Walk-in"} · Started{" "}
                                    {time(start ?? null)} · due {time(active.plannedEnd)}
                                  </p>
                                </div>
                                {!isMaintenance ? (
                                  <div className="text-right">
                                    <p className="font-mono text-lg font-bold text-felt">
                                      {elapsedClock(start ?? null, currentTime)}
                                    </p>
                                    <p className="text-sm font-semibold text-warning">
                                      {money(liveAmount)} · bill
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                              {!isMaintenance && overtimeMinutes > 0 ? (
                                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
                                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Overtime · {overtimeMinutes}m past the block
                                </p>
                              ) : !isMaintenance ? (
                                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                  {Math.floor(
                                    Math.max(0, active.plannedEnd.getTime() - currentTime) / 60_000,
                                  )}{" "}
                                  min left on the block
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {upcoming.length > 0 ? (
                            <div
                              className={cn(
                                "mt-3",
                                active ? "" : "rounded-xl bg-background/70 p-3",
                              )}
                            >
                              {!active ? (
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {visibleBookings[0]?.startTime.getTime() <= currentTime
                                    ? "Booking ready"
                                    : "Next booking"}
                                </p>
                              ) : null}
                              <div className="space-y-2">
                                {visibleBookings.map((booking) => (
                                  <div
                                    key={booking.id}
                                    className="rounded-lg border border-border/70 bg-background/50 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                          {booking.customerName ?? "Online booking"}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {new Intl.DateTimeFormat("en-IN", {
                                            timeZone: "Asia/Kolkata",
                                            weekday: "short",
                                            day: "numeric",
                                            month: "short",
                                          }).format(booking.startTime)}
                                          {" · "}
                                          {time(booking.startTime)}–{time(booking.plannedEnd)}
                                        </p>
                                        {booking.customerPhone ? (
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            {booking.customerPhone}
                                          </p>
                                        ) : null}
                                      </div>
                                      <Badge variant="outline" className="shrink-0 text-[10px]">
                                        {booking.status === "HELD" ? "Awaiting confirm" : "Booked"}
                                      </Badge>
                                    </div>
                                    {booking.status === "HELD" ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="mt-2 min-h-10 w-full"
                                        onClick={() =>
                                          ask(
                                            "Confirm this booking?",
                                            "The booking will remain reserved for the customer.",
                                            async () => {
                                              await updateBookingStatusAction(
                                                booking.id,
                                                "CONFIRMED",
                                              );
                                              await refresh();
                                            },
                                          )
                                        }
                                      >
                                        Confirm booking
                                      </Button>
                                    ) : booking.status === "CONFIRMED" ? (
                                      <Button
                                        type="button"
                                        variant={
                                          booking.startTime.getTime() <= currentTime
                                            ? "default"
                                            : "outline"
                                        }
                                        className="mt-2 min-h-10 w-full gap-2"
                                        disabled={
                                          booking.startTime.getTime() > currentTime ||
                                          Boolean(active) ||
                                          startingBookingId === booking.id
                                        }
                                        loading={startingBookingId === booking.id}
                                        loadingText="Starting…"
                                        onClick={() => void startBooking(booking.id)}
                                      >
                                        {booking.startTime.getTime() <= currentTime ? (
                                          <Play className="h-4 w-4" aria-hidden="true" />
                                        ) : null}
                                        {booking.startTime.getTime() <= currentTime
                                          ? `Start ${booking.customerName}`
                                          : `Starts at ${time(booking.startTime)}`}
                                      </Button>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                              {upcoming.length > 1 ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="mt-1 min-h-10 w-full gap-1 text-xs"
                                  onClick={() =>
                                    setExpandedBookings((current) => ({
                                      ...current,
                                      [table.id]: !expanded,
                                    }))
                                  }
                                  aria-expanded={expanded}
                                >
                                  {expanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                                      Show fewer bookings
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                      Show {upcoming.length - 1} more
                                    </>
                                  )}
                                </Button>
                              ) : null}
                            </div>
                          ) : !active ? (
                            <p className="mt-3 rounded-xl bg-background/70 p-3 text-xs text-muted-foreground">
                              No upcoming bookings.
                            </p>
                          ) : null}

                          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                            {active && !isMaintenance ? (
                              <>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  className="min-h-11 w-full gap-2"
                                  onClick={() =>
                                    setEndSession({
                                      sessionId: active.id,
                                      payerName:
                                        active.source === "ONLINE"
                                          ? (active.customerName ?? "")
                                          : playerName(active.players, 0, ""),
                                      paymentMethod: "CASH",
                                    })
                                  }
                                >
                                  <Square className="h-4 w-4" aria-hidden="true" />
                                  Stop & close
                                </Button>
                                {active.source === "WALKIN" ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11 min-w-[7.5rem] gap-2 px-3"
                                    disabled={!canExtendWalkIn || extendingSessionId === active.id}
                                    loading={extendingSessionId === active.id}
                                    loadingText="Adding…"
                                    title={
                                      canExtendWalkIn
                                        ? "Add 30 minutes"
                                        : "A full 30-minute extension is not available before the next booking or closing"
                                    }
                                    onClick={() => void extendSession(active.id)}
                                  >
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    30 min
                                  </Button>
                                ) : null}
                              </>
                            ) : !unavailable ? (
                              <Button
                                type="button"
                                className="col-span-2 min-h-11 w-full gap-2"
                                onClick={() => openCreate(table.id)}
                              >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Start walk-in
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          <div className="mt-4 grid gap-6 lg:mt-6">
            {activeHistory === "unpaid" ? (
              <Card className="min-w-0 border-border bg-surface">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Unpaid dues</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Completed sessions waiting for payment · {money(summary.unpaidAmount)} total
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
                  {dues.length === 0 && duesPage.loading ? (
                    Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="space-y-2 rounded-xl border border-border p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))
                  ) : dues.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center">
                      <p className="font-medium">All settled</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        There are no completed sessions with an outstanding balance.
                      </p>
                    </div>
                  ) : (
                    dues.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-border bg-background/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {entry.payerName || entry.playerOne}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {entry.tableName} · {entry.source === "ONLINE" ? "Online" : "Walk-in"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {entry.durationMinutes ?? 0} min · {entry.startTime}–
                              {entry.endTime || "—"}
                            </p>
                          </div>
                          <p className="shrink-0 text-lg font-bold text-warning">
                            {money(entry.amount)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="mt-3 min-h-11 w-full"
                          onClick={() =>
                            setPaymentEntry({
                              sessionId: entry.sessionId!,
                              payerName: entry.payerName || entry.playerOne,
                              paymentMethod: "CASH",
                            })
                          }
                        >
                          Record payment
                        </Button>
                      </div>
                    ))
                  )}
                  {duesPage.error ? (
                    <p role="alert" className="text-sm text-destructive">
                      {duesPage.error}
                    </p>
                  ) : null}
                  {duesPage.hasMore ? <div ref={duesPage.sentinelRef} className="h-4" /> : null}
                </CardContent>
              </Card>
            ) : null}
            <Card
              className={cn(
                "min-w-0 border-border bg-surface",
                activeHistory !== "ledger" && "hidden",
              )}
            >
              <CardHeader className="gap-3 p-4 sm:p-6">
                <CardTitle>Ledger</CardTitle>
                <Input
                  value={ledgerSearch}
                  onChange={(event) => setLedgerSearch(event.target.value)}
                  placeholder="Search player, phone, or reference"
                  aria-label="Search ledger by player, phone, or booking reference"
                  className="min-h-11"
                />
              </CardHeader>
              <CardContent className="overflow-hidden p-0">
                <div
                  ref={ledgerPage.scrollRootRef}
                  className="hidden max-h-[62vh] touch-pan-x touch-pan-y overflow-auto overscroll-contain lg:block"
                  aria-label="Scrollable ledger history"
                  aria-busy={ledgerPage.loading}
                >
                  <table className="min-w-[900px] text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-border bg-background text-muted-foreground">
                      <tr>
                        {[
                          "Table",
                          "Players",
                          "Status",
                          "Start",
                          "End",
                          "Type",
                          "Payment",
                          "Amount",
                          "Actions",
                        ].map((heading) => (
                          <th key={heading} className="px-4 py-3 font-medium">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.length === 0 && ledgerPage.loading ? (
                        Array.from({ length: 4 }, (_, index) => (
                          <tr key={`ledger-skeleton-${index}`}>
                            {Array.from({ length: 9 }, (_, cell) => (
                              <td key={cell} className="px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : entries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                            No session records yet.
                          </td>
                        </tr>
                      ) : (
                        entries.map((entry) => (
                          <tr key={entry.id} className="border-b border-border/80 last:border-0">
                            <td className="px-4 py-3 font-medium">{entry.tableName}</td>
                            <td className="px-4 py-3">
                              <div>{entry.playerOne}</div>
                              <div className="text-xs text-muted-foreground">{entry.playerTwo}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="border-felt/40 text-felt">
                                {entry.statusLabel}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">{entry.startTime}</td>
                            <td className="px-4 py-3">{entry.endTime || "—"}</td>
                            <td className="px-4 py-3">
                              {entry.source === "ONLINE"
                                ? "Online"
                                : entry.source === "WALKIN"
                                  ? "Walk-in"
                                  : "Maintenance"}
                            </td>
                            <td className="px-4 py-3">
                              {entry.payment === "PAID"
                                ? `Paid · ${entry.paymentMethod}`
                                : "Unpaid"}
                            </td>
                            <td className="px-4 py-3">
                              {entry.amount > 0 ? money(entry.amount) : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                {entry.source === "WALKIN" && entry.status === "live" ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEdit(entry)}
                                      aria-label="Edit ledger entry"
                                    >
                                      <PencilLine className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        setEndSession({
                                          sessionId: entry.sessionId!,
                                          payerName: entry.payerName || entry.playerOne,
                                          paymentMethod: "CASH",
                                        })
                                      }
                                      aria-label="Finish session"
                                    >
                                      <Square className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : null}
                                {entry.source === "ONLINE" && entry.status === "live" ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setEndSession({
                                        sessionId: entry.sessionId!,
                                        payerName: entry.payerName || entry.playerOne,
                                        paymentMethod: "CASH",
                                      })
                                    }
                                    aria-label="Stop online booking"
                                  >
                                    <Square className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                {entry.status === "booked" ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      ask(
                                        "Cancel this session?",
                                        "The table will be made available again.",
                                        async () => {
                                          await cancelSessionAction(entry.sessionId!);
                                          await refresh();
                                        },
                                      )
                                    }
                                    aria-label="Cancel session"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                      {entries.length > 0 && ledgerPage.loading
                        ? Array.from({ length: 2 }, (_, index) => (
                            <tr key={`ledger-more-${index}`}>
                              {Array.from({ length: 9 }, (_, cell) => (
                                <td key={cell} className="px-4 py-3">
                                  <Skeleton className="h-4 w-20" />
                                </td>
                              ))}
                            </tr>
                          ))
                        : null}
                    </tbody>
                  </table>
                  {ledgerPage.error ? (
                    <p className="p-4 text-sm text-destructive">{ledgerPage.error}</p>
                  ) : null}
                  {ledgerPage.hasMore ? <div ref={ledgerPage.sentinelRef} className="h-4" /> : null}
                </div>
                <div className="space-y-3 p-3 lg:hidden">
                  {entries.length === 0 && ledgerPage.loading ? (
                    Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="space-y-3 rounded-xl border border-border p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))
                  ) : entries.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No session records match these filters.
                    </p>
                  ) : (
                    entries.map((entry) => (
                      <article
                        key={entry.id}
                        className="rounded-xl border border-border bg-background/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {entry.payerName || entry.playerOne}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {entry.tableName} ·{" "}
                              {entry.source === "ONLINE"
                                ? "Online"
                                : entry.source === "WALKIN"
                                  ? "Walk-in"
                                  : "Maintenance"}
                            </p>
                          </div>
                          <p className="shrink-0 font-bold">
                            {entry.amount > 0 ? money(entry.amount) : "—"}
                          </p>
                        </div>
                        {entry.playerTwo ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.playerOne} vs. {entry.playerTwo}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{entry.statusLabel}</Badge>
                          <Badge
                            variant="outline"
                            className={
                              entry.payment === "PAID"
                                ? "border-felt/40 text-felt"
                                : "border-warning/40 text-warning"
                            }
                          >
                            {entry.payment === "PAID" ? `Paid · ${entry.paymentMethod}` : "Unpaid"}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>
                            {entry.durationMinutes
                              ? `${entry.durationMinutes} min`
                              : "Duration pending"}
                          </span>
                          <span>
                            {entry.startTime}
                            {entry.endTime ? ` – ${entry.endTime}` : ""}
                          </span>
                        </div>
                        {entry.payment === "UNPAID" &&
                        entry.status === "completed" &&
                        entry.amount > 0 ? (
                          <Button
                            type="button"
                            className="mt-3 min-h-10 w-full"
                            onClick={() =>
                              setPaymentEntry({
                                sessionId: entry.sessionId!,
                                payerName: entry.payerName || entry.playerOne,
                                paymentMethod: "CASH",
                              })
                            }
                          >
                            Record payment
                          </Button>
                        ) : null}
                      </article>
                    ))
                  )}
                  {ledgerPage.error ? (
                    <p role="alert" className="text-sm text-destructive">
                      {ledgerPage.error}
                    </p>
                  ) : null}
                  {ledgerPage.hasMore ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full"
                      loading={ledgerPage.loading}
                      loadingText="Loading…"
                      onClick={() => void ledgerPage.loadMore()}
                    >
                      Load more sessions
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            <Card
              className={cn(
                "min-w-0 border-border bg-surface",
                activeHistory !== "bookings" && "hidden",
              )}
            >
              <CardHeader className="p-4 sm:p-6">
                <CardTitle>Bookings</CardTitle>
              </CardHeader>
              <CardContent
                ref={bookingsPage.scrollRootRef}
                className="max-h-[70vh] space-y-4 overflow-y-auto overscroll-contain p-4 pt-0 sm:p-6 sm:pt-0"
              >
                <p className="text-sm text-muted-foreground">
                  Pending, upcoming, in-progress, and past online bookings.
                </p>
                {bookings.length === 0 && bookingsPage.loading ? (
                  <div className="space-y-3" role="status" aria-label="Loading bookings">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="space-y-3 rounded-lg border border-border p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-9 w-full rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No online booking requests.
                  </div>
                ) : (
                  bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-lg border border-border bg-background/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{booking.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.table?.shortName ?? booking.tableId} ·{" "}
                            {time(booking.slotStart)}–{time(booking.slotEnd)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reserved charge: ₹{booking.amount.toFixed(2)}
                          </p>
                        </div>
                        <Badge variant="outline">{booking.status}</Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {booking.status === "HELD" ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              ask(
                                "Confirm this booking?",
                                "The booking will remain reserved for the customer.",
                                async () => {
                                  await updateBookingStatusAction(booking.id, "CONFIRMED");
                                  await refresh();
                                },
                              )
                            }
                          >
                            Confirm
                          </Button>
                        ) : null}
                        {booking.status === "CONFIRMED" || booking.status === "ONGOING" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              ask(
                                "Mark this booking as no-show?",
                                "Use this only when the customer did not arrive for the approved booking.",
                                async () => {
                                  await updateBookingStatusAction(booking.id, "NO_SHOW");
                                  await refresh();
                                },
                              )
                            }
                          >
                            No-show
                          </Button>
                        ) : null}
                        {booking.status === "HELD" || booking.status === "CONFIRMED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              ask(
                                "Cancel this booking?",
                                "The table will become available for this time range.",
                                async () => {
                                  await updateBookingStatusAction(booking.id, "CANCELLED");
                                  await refresh();
                                },
                              )
                            }
                          >
                            <X className="mr-1 h-4 w-4" /> Cancel
                          </Button>
                        ) : null}
                        {booking.paymentStatus === "UNPAID" &&
                        booking.amount > 0 &&
                        booking.status === "COMPLETED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPaymentEntry({
                                sessionId: booking.id,
                                payerName: booking.customerName,
                                paymentMethod: "CASH",
                              })
                            }
                          >
                            Record payment
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
                {bookings.length > 0 && bookingsPage.loading ? (
                  <div className="space-y-3" role="status" aria-label="Loading more bookings">
                    {Array.from({ length: 2 }, (_, index) => (
                      <div key={index} className="space-y-3 rounded-lg border border-border p-4">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : null}
                {bookingsPage.error ? (
                  <p className="text-sm text-destructive">{bookingsPage.error}</p>
                ) : null}
                {bookingsPage.hasMore ? (
                  <div ref={bookingsPage.sentinelRef} className="h-4" />
                ) : null}
              </CardContent>
            </Card>
          </div>
        </main>
        <AlertDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => {
            if (!open && !isConfirming) setConfirm(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isConfirming}>Go back</AlertDialogCancel>
              <AlertDialogAction
                loading={isConfirming}
                loadingText="Working…"
                onClick={(event) => {
                  event.preventDefault();
                  void runConfirmed();
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={Boolean(endSession)}
          onOpenChange={(open) => {
            if (!open && !isEndingSession) setEndSession(null);
          }}
        >
          <AlertDialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Close table · {closingPlayerName || closingTable?.name || "session"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {closingTable?.name ?? "Table"} ·{" "}
                {closingSession?.source === "ONLINE" ? "Online booking" : "Walk-in"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Start</span>
                  <span>{time(closingStartedAt ?? null)}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">End</span>
                  <span>{time(new Date(currentTime))}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Played</span>
                  <span>{closingMinutes} min</span>
                </div>
                <div className="flex items-end justify-between gap-3 border-t border-border pt-2">
                  <span className="font-semibold">Amount due</span>
                  <span className="text-2xl font-bold text-warning">{money(closingAmount)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Billed at {money(closingRate)}/hr using actual play time.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payer-name">Who is paying?</Label>
                <Input
                  id="payer-name"
                  autoComplete="name"
                  maxLength={120}
                  placeholder="Enter the payer's name"
                  value={endSession?.payerName ?? ""}
                  onChange={(event) =>
                    setEndSession((current) =>
                      current ? { ...current, payerName: event.target.value } : current,
                    )
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-payment">Settlement</Label>
                <select
                  id="end-payment"
                  value={endSession?.paymentMethod ?? "UNPAID"}
                  onChange={(event) =>
                    setEndSession((current) =>
                      current
                        ? {
                            ...current,
                            paymentMethod:
                              event.target.value === "UNPAID"
                                ? null
                                : (event.target.value as "CASH" | "UPI" | "CARD"),
                          }
                        : current,
                    )
                  }
                  className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="CASH">Paid · Cash</option>
                  <option value="UPI">Paid · UPI</option>
                  <option value="CARD">Paid · Card</option>
                  <option value="UNPAID">Add to unpaid dues</option>
                </select>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isEndingSession}>Go back</AlertDialogCancel>
              <AlertDialogAction
                loading={isEndingSession}
                loadingText="Closing session…"
                onClick={(event) => {
                  event.preventDefault();
                  if (!endSession?.payerName.trim()) {
                    setError("Enter the name of the person responsible for the bill.");
                    return;
                  }
                  void closeCurrentSession();
                }}
              >
                Stop clock & free table
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={Boolean(paymentEntry)}
          onOpenChange={(open) => {
            if (!open && !isRecordingPayment) setPaymentEntry(null);
          }}
        >
          <AlertDialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Settle unpaid session</AlertDialogTitle>
              <AlertDialogDescription>
                Record full payment for this completed session. The amount and duration already
                saved to the ledger will not change.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
              {paymentEntryDetails ? (
                <div className="rounded-xl border border-felt/25 bg-felt/10 p-4">
                  <p className="text-sm text-muted-foreground">Outstanding amount</p>
                  <p className="mt-1 text-2xl font-bold text-felt">
                    {money(paymentEntryDetails.amount)}
                  </p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="settlement-payer">Paid by</Label>
                <Input
                  id="settlement-payer"
                  autoComplete="name"
                  maxLength={120}
                  value={paymentEntry?.payerName ?? ""}
                  onChange={(event) =>
                    setPaymentEntry((current) =>
                      current ? { ...current, payerName: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-payment-method">Payment method</Label>
                <select
                  id="booking-payment-method"
                  value={paymentEntry?.paymentMethod ?? "CASH"}
                  onChange={(event) =>
                    setPaymentEntry((current) =>
                      current
                        ? {
                            ...current,
                            paymentMethod: event.target.value as "CASH" | "UPI" | "CARD",
                          }
                        : current,
                    )
                  }
                  className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRecordingPayment}>Go back</AlertDialogCancel>
              <AlertDialogAction
                loading={isRecordingPayment}
                loadingText="Recording payment…"
                onClick={(event) => {
                  event.preventDefault();
                  if (!paymentEntry?.payerName.trim()) {
                    setError("Enter the name of the person who paid.");
                    return;
                  }
                  void recordCurrentPayment();
                }}
              >
                Record payment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </RoleGate>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="border-border bg-surface">
      <CardContent className="p-2.5 sm:p-4">
        <Icon className="h-3.5 w-3.5 text-felt" aria-hidden="true" />
        <p className="mt-1.5 truncate text-[9px] uppercase tracking-[0.05em] text-muted-foreground sm:mt-2 sm:text-xs sm:tracking-[0.1em]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-base font-bold text-felt sm:text-xl">{value}</p>
        {detail ? (
          <p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">{detail}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
