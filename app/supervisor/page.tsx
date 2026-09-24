"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, Plus, PencilLine, Play, Square, Trash2, UserCog, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { RoleGate } from "@/components/auth/role-gate";
import { FloorMap } from "@/components/booking/floor-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOCK_TABLES, type Table } from "@/data/mock-data";
import { clearSession } from "@/lib/auth";
import {
  loadBookingQueue,
  loadRegisterEntries,
  saveBookingQueue,
  saveRegisterEntries,
} from "@/lib/booking-store";

type RegisterStatus = "live" | "booked" | "completed";

type RegisterEntry = {
  id: string;
  tableId: string;
  tableName: string;
  tableType: "SNOOKER" | "POOL";
  status: RegisterStatus;
  playerOne: string;
  playerTwo: string;
  startTime: string;
  endTime: string;
  payment: string;
  amount: number;
  createdAt: string;
};

type BookingRequest = {
  id: string;
  customer: string;
  tableId: string;
  tableName: string;
  date: string;
  start: string;
  duration: number;
  amount: number;
  status: "pending" | "confirmed" | "verified";
  source: "online" | "walk-in";
};

const PAGE_SIZE = 5;

const initialEntries: RegisterEntry[] = [
  {
    id: "reg-100",
    tableId: "snk-1",
    tableName: "Table 1",
    tableType: "SNOOKER",
    status: "live",
    playerOne: "Rahul Sharma",
    playerTwo: "Amit Verma",
    startTime: "18:10",
    endTime: "",
    payment: "UPI",
    amount: 0,
    createdAt: "2026-09-22T18:10:00.000Z",
  },
  {
    id: "reg-101",
    tableId: "pool-1",
    tableName: "Pool 1",
    tableType: "POOL",
    status: "booked",
    playerOne: "Sana Qureshi",
    playerTwo: "Mira Iqbal",
    startTime: "19:30",
    endTime: "",
    payment: "ONLINE",
    amount: 0,
    createdAt: "2026-09-22T17:55:00.000Z",
  },
  {
    id: "reg-102",
    tableId: "snk-4",
    tableName: "Table 4",
    tableType: "SNOOKER",
    status: "completed",
    playerOne: "Vivek Rao",
    playerTwo: "Harman Sethi",
    startTime: "17:00",
    endTime: "18:15",
    payment: "CASH",
    amount: 375,
    createdAt: "2026-09-22T18:15:00.000Z",
  },
  {
    id: "reg-103",
    tableId: "pool-2",
    tableName: "Pool 2",
    tableType: "POOL",
    status: "live",
    playerOne: "Ansh Patil",
    playerTwo: "Aditya Bose",
    startTime: "18:40",
    endTime: "",
    payment: "CARD",
    amount: 0,
    createdAt: "2026-09-22T18:40:00.000Z",
  },
];

const initialQueue: BookingRequest[] = [
  {
    id: "req-1",
    customer: "Nikhil Saini",
    tableId: "snk-2",
    tableName: "Table 2",
    date: "Today",
    start: "19:00",
    duration: 120,
    amount: 640,
    status: "pending",
    source: "online",
  },
  {
    id: "req-2",
    customer: "Harsh Joshi",
    tableId: "pool-1",
    tableName: "Pool 1",
    date: "Today",
    start: "20:00",
    duration: 90,
    amount: 330,
    status: "confirmed",
    source: "walk-in",
  },
  {
    id: "req-3",
    customer: "Riya Vyas",
    tableId: "snk-6",
    tableName: "Table 6",
    date: "Today",
    start: "18:30",
    duration: 60,
    amount: 300,
    status: "verified",
    source: "online",
  },
];

function toMinutes(value: string) {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export default function SupervisorPage() {
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [entries, setEntries] = useState<RegisterEntry[]>(() => {
    const saved = loadRegisterEntries();
    return saved.length > 0 ? (saved as RegisterEntry[]) : initialEntries;
  });
  const [queue, setQueue] = useState<BookingRequest[]>(() => {
    const saved = loadBookingQueue();
    return saved.length > 0 ? (saved as BookingRequest[]) : initialQueue;
  });
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tableId: MOCK_TABLES[0].id,
    playerOne: "",
    playerTwo: "",
    status: "live" as RegisterStatus,
    startTime: "",
    payment: "CASH",
  });

  useEffect(() => {
    saveRegisterEntries(entries);
  }, [entries]);

  useEffect(() => {
    saveBookingQueue(queue);
  }, [queue]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((current) => current + 1);
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const tableMap = useMemo(
    () => Object.fromEntries(MOCK_TABLES.map((table) => [table.id, table])),
    [],
  );

  const floorAvailability = useMemo(() => {
    const map: Record<string, "FREE" | "PARTIAL" | "FULL"> = {};

    for (const table of MOCK_TABLES) {
      const activeEntries = entries.filter(
        (entry) => entry.tableId === table.id && entry.status !== "completed",
      );
      map[table.id] = activeEntries.length > 0 ? "PARTIAL" : "FREE";
    }

    return map;
  }, [entries]);

  const visibleEntries = useMemo(() => entries.slice(0, page * PAGE_SIZE), [entries, page]);
  const liveEntries = entries.filter((entry) => entry.status === "live").length;
  const bookedEntries = entries.filter((entry) => entry.status === "booked").length;
  const pendingChecks = queue.filter((item) => item.status === "pending").length;

  function resetForm() {
    setForm({
      tableId: MOCK_TABLES[0].id,
      playerOne: "",
      playerTwo: "",
      status: "live",
      startTime: "",
      payment: "CASH",
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const table = tableMap[form.tableId];
    if (!table) return;

    const playerOne = form.playerOne.trim() || "Walk-in Guest";
    const playerTwo = form.playerTwo.trim() || "Opponent";

    if (editingId) {
      const confirmed = window.confirm(`Save the changes for ${playerOne} on ${table.shortName}?`);
      if (!confirmed) return;

      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingId
            ? {
                ...entry,
                tableId: table.id,
                tableName: table.shortName,
                tableType: table.type,
                playerOne,
                playerTwo,
                status: form.status,
                startTime: form.startTime || entry.startTime,
                payment: form.payment,
              }
            : entry,
        ),
      );
      resetForm();
      return;
    }

    const confirmed = window.confirm(`Add ${playerOne} at ${table.shortName} to the register?`);
    if (!confirmed) return;

    const newEntry: RegisterEntry = {
      id: `reg-${Date.now()}`,
      tableId: table.id,
      tableName: table.shortName,
      tableType: table.type,
      status: form.status,
      playerOne,
      playerTwo,
      startTime: form.startTime || "09:00",
      endTime: "",
      payment: form.payment,
      amount: 0,
      createdAt: new Date().toISOString(),
    };

    setEntries((prev) => [newEntry, ...prev]);
    resetForm();
  }

  function handleEditEntry(entry: RegisterEntry) {
    setEditingId(entry.id);
    setShowForm(true);
    setForm({
      tableId: entry.tableId,
      playerOne: entry.playerOne,
      playerTwo: entry.playerTwo,
      status: entry.status,
      startTime: entry.startTime,
      payment: entry.payment,
    });
  }

  function handleDeleteEntry(entryId: string) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    const confirmed = window.confirm(
      `Delete ${entry.tableName} from the register? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setEntries((prev) => prev.filter((item) => item.id !== entryId));
  }

  function handleStartTable(entryId: string) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    const confirmed = window.confirm(`Start ${entry.tableName} for ${entry.playerOne}?`);
    if (!confirmed) return;

    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              status: "live",
              startTime:
                entry.startTime ||
                new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }),
            }
          : entry,
      ),
    );
  }

  function handleCloseTable(entryId: string) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;

    const confirmClose = window.confirm(`Close ${entry.tableName} and finalize the bill?`);
    if (!confirmClose) return;

    const endTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const startMinutes = toMinutes(entry.startTime || endTime);
    const endMinutes = toMinutes(endTime);
    const durationMinutes = Math.max(0, endMinutes - startMinutes);
    const table = tableMap[entry.tableId];
    const amount = Number(((durationMinutes / 60) * (table?.hourlyRate ?? 0)).toFixed(2));

    setEntries((prev) =>
      prev.map((item) =>
        item.id === entryId
          ? {
              ...item,
              status: "completed",
              endTime,
              amount,
            }
          : item,
      ),
    );
  }

  function handleQueueAction(itemId: string, action: "confirm" | "verify" | "start" | "delete") {
    const item = queue.find((request) => request.id === itemId);
    if (!item) return;

    if (action === "delete") {
      const confirmed = window.confirm(`Remove the booking request from ${item.customer}?`);
      if (!confirmed) return;
      setQueue((prev) => prev.filter((entry) => entry.id !== itemId));
      return;
    }

    if (action === "confirm") {
      const confirmed = window.confirm(`Confirm the request for ${item.customer}?`);
      if (!confirmed) return;
      setQueue((prev) =>
        prev.map((entry) => (entry.id === itemId ? { ...entry, status: "confirmed" } : entry)),
      );
      return;
    }

    if (action === "verify") {
      const confirmed = window.confirm(`Verify the booking for ${item.customer}?`);
      if (!confirmed) return;
      setQueue((prev) =>
        prev.map((entry) => (entry.id === itemId ? { ...entry, status: "verified" } : entry)),
      );
      return;
    }

    const confirmedStart = window.confirm(
      `Start the table for ${item.customer} on ${item.tableName}?`,
    );
    if (!confirmedStart) return;

    const newEntry: RegisterEntry = {
      id: `reg-${Date.now()}`,
      tableId: item.tableId,
      tableName: item.tableName,
      tableType: tableMap[item.tableId]?.type ?? "POOL",
      status: "booked",
      playerOne: item.customer,
      playerTwo: "Booked Guest",
      startTime: item.start,
      endTime: "",
      payment: item.source === "online" ? "ONLINE" : "CASH",
      amount: 0,
      createdAt: new Date().toISOString(),
    };

    setEntries((prev) => [newEntry, ...prev]);
    setQueue((prev) => prev.filter((request) => request.id !== itemId));
  }

  function handleLogout() {
    clearSession();
    router.replace("/login?role=supervisor");
  }

  return (
    <RoleGate role="supervisor">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Supervisor</p>
            <h1 className="mt-2 text-3xl font-bold">Operations register</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowForm((value) => !value)}
              className="min-h-11 gap-2"
            >
              <Plus className="h-4 w-4" />
              {showForm ? "Close" : "Add entry"}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="min-h-11 gap-2">
              <UserCog className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-surface">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Live tables
              </p>
              <p className="mt-3 text-3xl font-bold text-felt">{liveEntries}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-surface">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Booked</p>
              <p className="mt-3 text-3xl font-bold text-warning">{bookedEntries}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-surface">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Pending checks
              </p>
              <p className="mt-3 text-3xl font-bold text-primary">{pendingChecks}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Live floor
              </p>
              <h2 className="mt-1 text-xl font-semibold">Table map</h2>
            </div>
            <Badge variant="outline" className="border-felt/40 text-felt">
              Live status
            </Badge>
          </div>
          <FloorMap
            selectedTableId={MOCK_TABLES[0]?.id ?? "snk-1"}
            availability={floorAvailability}
            onSelect={(table: Table) => {
              setForm((current) => ({ ...current, tableId: table.id }));
              setShowForm(true);
            }}
          />
        </div>

        {showForm ? (
          <Card className="mt-6 border-border bg-surface">
            <CardHeader>
              <CardTitle>{editingId ? "Edit register entry" : "Create register entry"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="table-select">Table</Label>
                  <select
                    id="table-select"
                    value={form.tableId}
                    onChange={(event) =>
                      setForm((curr) => ({ ...curr, tableId: event.target.value }))
                    }
                    className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {MOCK_TABLES.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.shortName} — {table.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="player-one">Player 1</Label>
                  <Input
                    id="player-one"
                    value={form.playerOne}
                    onChange={(event) =>
                      setForm((curr) => ({ ...curr, playerOne: event.target.value }))
                    }
                    placeholder="Walk-in Guest"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="player-two">Player 2</Label>
                  <Input
                    id="player-two"
                    value={form.playerTwo}
                    onChange={(event) =>
                      setForm((curr) => ({ ...curr, playerTwo: event.target.value }))
                    }
                    placeholder="Opponent"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entry-status">Status</Label>
                  <select
                    id="entry-status"
                    value={form.status}
                    onChange={(event) =>
                      setForm((curr) => ({ ...curr, status: event.target.value as RegisterStatus }))
                    }
                    className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="live">Live</option>
                    <option value="booked">Booked</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-time">Start time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm((curr) => ({ ...curr, startTime: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment</Label>
                  <select
                    id="payment-method"
                    value={form.payment}
                    onChange={(event) =>
                      setForm((curr) => ({ ...curr, payment: event.target.value }))
                    }
                    className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>

                <div className="md:col-span-3 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="min-h-11">
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button type="submit" className="min-h-11">
                    {editingId ? "Save changes" : "Add to register"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border bg-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="h-4 w-4 text-felt" />
                Register ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-background/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Table</th>
                      <th className="px-4 py-3 font-medium">Players</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Start</th>
                      <th className="px-4 py-3 font-medium">End</th>
                      <th className="px-4 py-3 font-medium">Duration</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/80 last:border-0">
                        <td className="px-4 py-3 font-medium">{entry.tableName}</td>
                        <td className="px-4 py-3">
                          <div>{entry.playerOne}</div>
                          <div className="text-xs text-muted-foreground">{entry.playerTwo}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              entry.status === "live"
                                ? "border-felt/40 text-felt"
                                : entry.status === "booked"
                                  ? "border-warning/40 text-warning"
                                  : "border-primary/40 text-primary"
                            }
                          >
                            {entry.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{entry.startTime || "--:--"}</td>
                        <td className="px-4 py-3">{entry.endTime || "Open"}</td>
                        <td className="px-4 py-3">
                          {entry.startTime && entry.endTime
                            ? `${Math.max(
                                0,
                                toMinutes(entry.endTime) - toMinutes(entry.startTime),
                              )} mins`
                            : entry.startTime
                              ? "In session"
                              : "--"}
                        </td>
                        <td className="px-4 py-3">{entry.payment}</td>
                        <td className="px-4 py-3 font-medium">₹{entry.amount.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEntry(entry)}
                              aria-label={`Edit ${entry.tableName}`}
                            >
                              <PencilLine className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEntry(entry.id)}
                              aria-label={`Delete ${entry.tableName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {entry.status !== "completed" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCloseTable(entry.id)}
                                aria-label={`Close ${entry.tableName}`}
                              >
                                <Square className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {entry.status !== "live" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartTable(entry.id)}
                                aria-label={`Start ${entry.tableName}`}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div ref={sentinelRef} className="h-6" />
            </CardContent>
          </Card>

          <Card className="border-border bg-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Check className="h-4 w-4 text-felt" />
                Booking requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {queue.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No booking requests in queue.
                </div>
              ) : (
                queue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-background/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.customer}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.tableName} • {item.date} • {item.start}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-felt/40 text-felt">
                        {item.status}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{item.duration} mins</span>
                      <span>₹{item.amount.toFixed(2)}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.status === "pending" ? (
                        <Button size="sm" onClick={() => handleQueueAction(item.id, "confirm")}>
                          Confirm
                        </Button>
                      ) : null}
                      {item.status === "confirmed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQueueAction(item.id, "verify")}
                        >
                          Verify
                        </Button>
                      ) : null}
                      {item.status === "verified" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleQueueAction(item.id, "start")}
                        >
                          Start table
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQueueAction(item.id, "delete")}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </RoleGate>
  );
}
