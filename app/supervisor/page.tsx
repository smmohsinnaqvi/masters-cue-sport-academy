"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, PencilLine, Play, Plus, Square, Trash2, UserCog, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { RoleGate } from "@/components/auth/role-gate";
import {
  cancelSessionAction,
  createWalkInSessionAction,
  endSessionAction,
  getOperationsSnapshotAction,
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
import type { Table } from "@/data/mock-data";
import { clearSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type EntryStatus = "live" | "booked" | "completed";
type Entry = {
  id: string;
  sessionId?: string;
  tableId: string;
  tableName: string;
  tableType: Table["type"];
  status: EntryStatus;
  playerOne: string;
  playerTwo: string;
  startTime: string;
  endTime: string;
  payment: string;
  amount: number;
};
type Booking = {
  id: string;
  tableId: string;
  customerName: string;
  slotStart: string;
  slotEnd: string;
  status: "HELD" | "CONFIRMED" | "CANCELLED";
  verified: boolean;
  table?: { shortName: string; type: Table["type"] };
};
type Snapshot = Awaited<ReturnType<typeof getOperationsSnapshotAction>>;

const emptyForm = {
  tableId: "",
  playerOne: "",
  playerTwo: "",
  payment: "CASH" as "CASH" | "UPI" | "CARD",
};

function time(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function entriesFromSnapshot(snapshot: Snapshot): Entry[] {
  return snapshot.flatMap((table) =>
    table.sessions
      .filter((session) => session.source === "WALKIN")
      .map((session) => ({
        id: session.id,
        sessionId: session.id,
        tableId: table.id,
        tableName: table.name,
        tableType: table.type,
        status: "live",
        playerOne:
          Array.isArray(session.players) &&
          session.players[0] &&
          typeof session.players[0] === "object" &&
          "name" in session.players[0]
            ? String(session.players[0].name)
            : "Walk-in",
        playerTwo:
          Array.isArray(session.players) &&
          session.players[1] &&
          typeof session.players[1] === "object" &&
          "name" in session.players[1]
            ? String(session.players[1].name)
            : "Opponent",
        startTime: time(session.actualStart ?? session.startTime),
        endTime: "",
        payment: session.paymentStatus,
        amount: session.amount ?? 0,
      })),
  );
}

function bookingsFromSnapshot(snapshot: Snapshot): Booking[] {
  return snapshot.flatMap((table) =>
    table.sessions
      .filter((session) => session.source === "ONLINE")
      .map((booking) => ({
        id: booking.id,
        tableId: booking.tableId,
        customerName: booking.customerName ?? "Guest",
        slotStart: booking.startTime.toISOString(),
        slotEnd: booking.plannedEnd.toISOString(),
        status:
          booking.status === "HELD"
            ? "HELD"
            : booking.status === "CONFIRMED"
              ? "CONFIRMED"
              : "CANCELLED",
        verified: booking.status === "CONFIRMED",
        table: { shortName: table.name, type: table.type },
      })),
  );
}

export default function SupervisorPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await getOperationsSnapshotAction();
    setSnapshot(next);
    setBookings(bookingsFromSnapshot(next));
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
  const entries = entriesFromSnapshot(tables);
  const liveCount = entries.length;
  const bookedCount = bookings.filter((booking) => booking.status !== "CANCELLED").length;

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
      payment: entry.payment as typeof emptyForm.payment,
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
        paymentMethod: form.payment,
      });
    }
    setShowForm(false);
    await refresh();
  }

  function ask(title: string, description: string, action: () => Promise<void>) {
    setConfirm({ title, description, action });
  }

  async function runConfirmed() {
    if (!confirm) return;
    try {
      await confirm.action();
      setConfirm(null);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Operation failed");
      setConfirm(null);
    }
  }

  return (
    <RoleGate role="supervisor">
      <>
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Supervisor
              </p>
              <h1 className="mt-2 text-3xl font-bold">Operations register</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={openCreate} className="min-h-11 gap-2">
                <Plus className="h-4 w-4" /> Add walk-in
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  clearSession();
                  router.replace("/login?role=supervisor");
                }}
                className="min-h-11 gap-2"
              >
                <UserCog className="h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
          {error ? (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Metric label="Live tables" value={liveCount} />
            <Metric label="Booked slots" value={bookedCount} />
            <Metric label="Open tables" value={Math.max(0, snapshot.length - liveCount)} />
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
                  <div className="space-y-2">
                    <Label htmlFor="payment">Payment</Label>
                    <select
                      id="payment"
                      value={form.payment}
                      onChange={(event) =>
                        setForm({ ...form, payment: event.target.value as typeof form.payment })
                      }
                      className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                    </select>
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

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle>Register ledger</CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-background/50 text-muted-foreground">
                      <tr>
                        {[
                          "Table",
                          "Players",
                          "Status",
                          "Start",
                          "End",
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
                          <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                            No active walk-in sessions.
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
                                {entry.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">{entry.startTime}</td>
                            <td className="px-4 py-3">Open</td>
                            <td className="px-4 py-3">{entry.payment}</td>
                            <td className="px-4 py-3">—</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
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
                                    ask(
                                      "Finish this session?",
                                      "The final amount will be calculated from the hourly rate.",
                                      async () => {
                                        await endSessionAction({
                                          sessionId: entry.sessionId!,
                                          loserName: entry.playerOne,
                                        });
                                        await refresh();
                                      },
                                    )
                                  }
                                  aria-label="Finish session"
                                >
                                  <Square className="h-4 w-4" />
                                </Button>
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
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle>Booking requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <AlertDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => {
            if (!open) setConfirm(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go back</AlertDialogCancel>
              <AlertDialogAction
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
      </>
    </RoleGate>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-border bg-surface">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-3 text-3xl font-bold text-felt">{value}</p>
      </CardContent>
    </Card>
  );
}
