"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PencilLine, Plus, Square, Trash2, UserCog, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { RoleGate } from "@/components/auth/role-gate";
import {
  cancelSessionAction,
  createWalkInSessionAction,
  endOnlineBookingAction,
  endSessionAction,
  getOperationsSnapshotAction,
  updateWalkInSessionAction,
} from "@/actions/operations-actions";
import { recordOnlinePaymentAction, updateBookingStatusAction } from "@/actions/booking-actions";
import { logoutAction } from "@/actions/auth-actions";
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
import type { Table } from "@/types/operations";
import { supabase } from "@/lib/supabase";
import { useSessionPages, type SessionPageRow } from "@/hooks/useSessionPages";
import { cn } from "@/lib/utils";

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
  startTime: string;
  endTime: string;
  payment: string;
  amount: number;
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

const emptyForm = {
  tableId: "",
  playerOne: "",
  playerTwo: "",
};

function time(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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
    startTime: time(session.actualStart ?? session.startTime),
    endTime: time(session.source === "WALKIN" ? session.actualEnd : session.plannedEnd),
    payment: session.paymentStatus,
    amount: session.amount ?? 0,
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
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeHistory, setActiveHistory] = useState<"ledger" | "bookings">("ledger");
  const [ledgerFilters, setLedgerFilters] = useState({
    date: "",
    source: "",
    status: "",
    payment: "",
  });
  const ledgerPage = useSessionPages("ledger", refreshKey, ledgerFilters);
  const bookingsPage = useSessionPages("bookings", refreshKey);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [endSession, setEndSession] = useState<{
    sessionId: string;
    loserName: string;
    paymentMethod: "CASH" | "UPI" | "CARD";
  } | null>(null);
  const [paymentEntry, setPaymentEntry] = useState<{
    sessionId: string;
    paymentMethod: "CASH" | "UPI" | "CARD";
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getOperationsSnapshotAction();
    setSnapshot(next);
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    void refresh().catch((reason) =>
      setError(reason instanceof Error ? reason.message : "Unable to load operations"),
    );
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
    return () => void channel.unsubscribe();
  }, [refresh]);

  const tables = useMemo(() => snapshot, [snapshot]);
  const entries = ledgerPage.items.map(entryFromPage);
  const bookings = bookingsPage.items.map(bookingFromPage);
  const activeSessions = tables.flatMap((table) => table.sessions);
  const liveCount = activeSessions.filter((session) => session.status === "ONGOING").length;
  const bookedCount = activeSessions.filter(
    (session) =>
      session.source === "ONLINE" && (session.status === "HELD" || session.status === "CONFIRMED"),
  ).length;
  const busyTableCount = new Set(
    activeSessions
      .filter((session) => session.status !== "HELD" || session.source === "ONLINE")
      .map((session) => session.tableId),
  ).size;

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, tableId: snapshot[0]?.id ?? "" });
    setShowForm(true);
  }

  function openEdit(entry: Entry) {
    setEditing(entry);
    setForm({
      tableId: entry.tableId,
      playerOne: entry.playerOne,
      playerTwo: entry.playerTwo,
    });
    setShowForm(true);
  }

  async function saveForm() {
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
        playerTwoName: form.playerTwo,
      });
    }
    setShowForm(false);
    await refresh();
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

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutAction();
      router.replace("/login?role=supervisor");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to log out");
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function closeCurrentSession() {
    if (!endSession || isEndingSession) return;
    setIsEndingSession(true);
    try {
      await endSessionAction(endSession);
      setEndSession(null);
      setError(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to close session");
    } finally {
      setIsEndingSession(false);
    }
  }

  async function recordCurrentPayment() {
    if (!paymentEntry || isRecordingPayment) return;
    setIsRecordingPayment(true);
    try {
      await recordOnlinePaymentAction(paymentEntry.sessionId, paymentEntry.paymentMethod);
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
        <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Supervisor
              </p>
              <h1 className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">Operations register</h1>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button variant="outline" onClick={openCreate} className="min-h-11 gap-2">
                <Plus className="h-4 w-4" /> Add walk-in
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleLogout()}
                loading={isLoggingOut}
                loadingText="Logging out…"
                className="min-h-11 gap-2"
              >
                <UserCog className="h-4 w-4" /> Logout
              </Button>
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
          <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-4 md:grid-cols-3">
            <Metric label="Live tables" value={liveCount} />
            <Metric label="Booked slots" value={bookedCount} />
            <Metric label="Open tables" value={Math.max(0, snapshot.length - busyTableCount)} />
          </div>

          {showForm ? (
            <Card className="mt-6 border-border bg-surface">
              <CardHeader>
                <CardTitle>{editing ? "Update ledger entry" : "Start walk-in session"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    ask(
                      editing ? "Update ledger entry?" : "Start walk-in session?",
                      editing
                        ? "The current ledger entry will be updated."
                        : "This table will become unavailable immediately.",
                      saveForm,
                    );
                  }}
                  className="grid gap-4 md:grid-cols-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="table">Table</Label>
                    <select
                      id="table"
                      disabled={Boolean(editing)}
                      value={form.tableId}
                      onChange={(event) => setForm({ ...form, tableId: event.target.value })}
                      className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.name} — {table.type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="player-one">Player 1</Label>
                    <Input
                      id="player-one"
                      value={form.playerOne}
                      onChange={(event) => setForm({ ...form, playerOne: event.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="player-two">Player 2</Label>
                    <Input
                      id="player-two"
                      value={form.playerTwo}
                      onChange={(event) => setForm({ ...form, playerTwo: event.target.value })}
                    />
                  </div>
                  <div className="md:col-span-4 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editing ? "Save changes" : "Start session"}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <div className="mt-5 lg:hidden">
            <div className="grid grid-cols-2 rounded-lg border border-border bg-surface p-1">
              {(["ledger", "bookings"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveHistory(view)}
                  aria-pressed={activeHistory === view}
                  className={cn(
                    "min-h-11 rounded-md px-3 text-sm font-medium capitalize transition-colors",
                    activeHistory === view
                      ? "bg-felt text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-6 lg:mt-6 lg:grid-cols-2 xl:grid-cols-[1.15fr_0.85fr]">
            <Card
              className={cn(
                "min-w-0 border-border bg-surface",
                activeHistory !== "ledger" && "hidden lg:block",
              )}
            >
              <CardHeader className="gap-3 p-4 sm:p-6">
                <CardTitle>Ledger</CardTitle>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label htmlFor="ledger-date" className="text-xs">
                      Date
                    </Label>
                    <Input
                      id="ledger-date"
                      type="date"
                      value={ledgerFilters.date}
                      onChange={(event) =>
                        setLedgerFilters((current) => ({ ...current, date: event.target.value }))
                      }
                      className="min-h-11"
                    />
                  </div>
                  <FilterSelect
                    id="ledger-source"
                    label="Type"
                    value={ledgerFilters.source}
                    onChange={(value) =>
                      setLedgerFilters((current) => ({ ...current, source: value }))
                    }
                    options={[
                      ["", "All types"],
                      ["ONLINE", "Online"],
                      ["WALKIN", "Walk-in"],
                      ["MAINTENANCE", "Maintenance"],
                    ]}
                  />
                  <FilterSelect
                    id="ledger-status"
                    label="Status"
                    value={ledgerFilters.status}
                    onChange={(value) =>
                      setLedgerFilters((current) => ({ ...current, status: value }))
                    }
                    options={[
                      ["", "All statuses"],
                      ["HELD", "Held"],
                      ["CONFIRMED", "Confirmed"],
                      ["ONGOING", "Ongoing"],
                      ["COMPLETED", "Completed"],
                      ["CANCELLED", "Cancelled"],
                      ["NO_SHOW", "No-show"],
                      ["EXPIRED", "Expired"],
                    ]}
                  />
                  <FilterSelect
                    id="ledger-payment"
                    label="Payment"
                    value={ledgerFilters.payment}
                    onChange={(value) =>
                      setLedgerFilters((current) => ({ ...current, payment: value }))
                    }
                    options={[
                      ["", "All payments"],
                      ["UNPAID", "Unpaid"],
                      ["CASH", "Cash"],
                      ["UPI", "UPI"],
                      ["CARD", "Card"],
                    ]}
                  />
                </div>
              </CardHeader>
              <CardContent className="overflow-hidden p-0">
                <div
                  ref={ledgerPage.scrollRootRef}
                  className="max-h-[62vh] touch-pan-x touch-pan-y overflow-auto overscroll-contain"
                  aria-label="Scrollable ledger history"
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
                      {entries.length === 0 ? (
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
                            <td className="px-4 py-3">{entry.payment}</td>
                            <td className="px-4 py-3">
                              {entry.amount > 0 ? `₹${entry.amount.toFixed(2)}` : "—"}
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
                                          loserName: entry.playerOne,
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
                                      ask(
                                        "Stop this booking?",
                                        "The table will be released now. The reserved-slot amount remains on the ledger.",
                                        async () => {
                                          await endOnlineBookingAction(entry.sessionId!);
                                          await refresh();
                                        },
                                      )
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
                    </tbody>
                  </table>
                  {ledgerPage.error ? (
                    <p className="p-4 text-sm text-destructive">{ledgerPage.error}</p>
                  ) : null}
                  {ledgerPage.loading ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">Loading ledger…</p>
                  ) : null}
                  {ledgerPage.hasMore ? <div ref={ledgerPage.sentinelRef} className="h-4" /> : null}
                </div>
              </CardContent>
            </Card>
            <Card
              className={cn(
                "min-w-0 border-border bg-surface",
                activeHistory !== "bookings" && "hidden lg:block",
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
                {bookings.length === 0 ? (
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
                        ["ONGOING", "COMPLETED"].includes(booking.status) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPaymentEntry({ sessionId: booking.id, paymentMethod: "CASH" })
                            }
                          >
                            Record payment
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
                {bookingsPage.error ? (
                  <p className="text-sm text-destructive">{bookingsPage.error}</p>
                ) : null}
                {bookingsPage.loading ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Loading booking history…
                  </p>
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close walk-in session</AlertDialogTitle>
              <AlertDialogDescription>
                Confirm the final player and payment method. The exact bill will be calculated from
                the actual play time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="loser-name">Paying player</Label>
                <Input
                  id="loser-name"
                  value={endSession?.loserName ?? ""}
                  onChange={(event) =>
                    setEndSession((current) =>
                      current ? { ...current, loserName: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-payment">Payment method</Label>
                <select
                  id="end-payment"
                  value={endSession?.paymentMethod ?? "CASH"}
                  onChange={(event) =>
                    setEndSession((current) =>
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
              <AlertDialogCancel disabled={isEndingSession}>Go back</AlertDialogCancel>
              <AlertDialogAction
                loading={isEndingSession}
                loadingText="Closing session…"
                onClick={(event) => {
                  event.preventDefault();
                  if (!endSession?.loserName.trim()) {
                    setError("Paying player is required before closing the session.");
                    return;
                  }
                  void closeCurrentSession();
                }}
              >
                Close and record payment
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Record booking payment</AlertDialogTitle>
              <AlertDialogDescription>
                Record the reserved booking charge as paid. This updates the payment status in the
                ledger.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
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
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRecordingPayment}>Go back</AlertDialogCancel>
              <AlertDialogAction
                loading={isRecordingPayment}
                loadingText="Recording payment…"
                onClick={(event) => {
                  event.preventDefault();
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border bg-surface">
      <CardContent className="p-3 sm:p-5">
        <p className="truncate text-[10px] uppercase tracking-[0.08em] text-muted-foreground sm:text-xs sm:tracking-[0.18em]">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-felt sm:mt-3 sm:text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue || "all"} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
