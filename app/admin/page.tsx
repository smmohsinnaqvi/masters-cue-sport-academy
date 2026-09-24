"use client";

import {
  CalendarRange,
  CircleDollarSign,
  Coffee,
  KeyRound,
  Plus,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { RoleGate } from "@/components/auth/role-gate";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOCK_TOURNAMENTS, CAFE_MENU, type CafeItem } from "@/data/mock-data";

type AdminSettings = {
  snookerRate: number;
  poolRate: number;
  maintenanceBufferMinutes: number;
  serviceChargePercent: number;
  lateFee: number;
  bookingHoldWindowMinutes: number;
};

type TournamentForm = {
  title: string;
  gameType: "Snooker (15-Red)" | "8-Ball Pool" | "9-Ball Pool";
  date: string;
  time: string;
  entryFee: string;
  prizePool: string;
  totalSpots: string;
};

const INITIAL_SETTINGS: AdminSettings = {
  snookerRate: 350,
  poolRate: 220,
  maintenanceBufferMinutes: 10,
  serviceChargePercent: 5,
  lateFee: 150,
  bookingHoldWindowMinutes: 15,
};

const DEFAULT_TOURNAMENT_FORM: TournamentForm = {
  title: "",
  gameType: "Snooker (15-Red)",
  date: "",
  time: "",
  entryFee: "",
  prizePool: "",
  totalSpots: "",
};

export default function AdminPage() {
  const [settings, setSettings] = useState<AdminSettings>(INITIAL_SETTINGS);
  const [cafeItems, setCafeItems] = useState<CafeItem[]>(CAFE_MENU);
  const [tournaments, setTournaments] = useState(MOCK_TOURNAMENTS);
  const [tournamentForm, setTournamentForm] = useState<TournamentForm>(DEFAULT_TOURNAMENT_FORM);

  const summaryCards = useMemo(
    () => [
      { label: "Occupied tables", value: "12/18", tone: "text-felt" },
      { label: "Today revenue", value: "₹ 18,640", tone: "text-primary" },
      { label: "Pending checks", value: "07", tone: "text-warning" },
      { label: "Active tournaments", value: "03", tone: "text-success" },
    ],
    [],
  );

  const hourUtilization = [62, 78, 55, 72, 88, 68, 81, 70];

  function updateSetting(field: keyof AdminSettings, value: number) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function addCafeItem() {
    setCafeItems((prev) => [
      ...prev,
      {
        name: `New item ${prev.length + 1}`,
        price: 0,
        note: "Add a price and note",
      },
    ]);
  }

  function updateCafeItem(index: number, field: keyof CafeItem, value: string | number) {
    setCafeItems((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  }

  function addTournament(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tournamentForm.title.trim() || !tournamentForm.date || !tournamentForm.time) {
      return;
    }

    const entryFee = Number(tournamentForm.entryFee) || 0;
    const prizePool = Number(tournamentForm.prizePool) || 0;
    const totalSpots = Number(tournamentForm.totalSpots) || 0;

    const newTournament: (typeof MOCK_TOURNAMENTS)[number] = {
      id: `tourney-${Date.now()}`,
      title: tournamentForm.title.trim(),
      gameType: tournamentForm.gameType,
      date: tournamentForm.date,
      time: tournamentForm.time,
      entryFee,
      prizePool,
      totalSpots,
      spotsLeft: Math.max(0, totalSpots - 2),
      status: "OPEN",
    };

    setTournaments((prev) => [newTournament, ...prev]);
    setTournamentForm(DEFAULT_TOURNAMENT_FORM);
  }

  return (
    <RoleGate role="admin">
      <>
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Owner access
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Academy dashboard</h1>
            </div>
            <Badge variant="outline" className="w-fit border-felt/40 text-felt">
              Live operations
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.label} className="border-border bg-surface">
                <CardContent className="p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className={`mt-3 text-3xl font-bold ${card.tone}`}>{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarRange className="h-4 w-4 text-felt" />
                  Table utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex h-36 items-end gap-2 rounded-xl border border-border bg-background/40 p-4">
                  {hourUtilization.map((value, index) => (
                    <div
                      key={`${value}-${index}`}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-felt via-felt/80 to-primary/80"
                        style={{ height: `${value}%` }}
                      />
                      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Peak window: 6 PM – 9 PM</span>
                  <span>Avg. occupancy: 71%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CircleDollarSign className="h-4 w-4 text-primary" />
                  Revenue snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Walk-ins", value: "₹ 6,420" },
                  { label: "Online bookings", value: "₹ 8,240" },
                  { label: "Cafe sales", value: "₹ 2,980" },
                  { label: "Tournament fees", value: "₹ 3,600" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2"
                  >
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <KeyRound className="h-4 w-4 text-felt" />
                  Role access & permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Owner / admin</p>
                      <p className="text-xs text-muted-foreground">Full access across academy</p>
                    </div>
                    <Badge variant="outline" className="border-felt/40 text-felt">
                      Full control
                    </Badge>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>• View all revenue, table usage, and operational settings</li>
                    <li>• Edit pricing, cafe items, tournaments, and hold rules</li>
                    <li>• Manage supervisor actions and workflow approvals</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Supervisor</p>
                      <p className="text-xs text-muted-foreground">
                        Front-line register and bookings
                      </p>
                    </div>
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      Operational access
                    </Badge>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>• Confirm, verify, and start booking requests</li>
                    <li>• Manage walk-in and online register entries</li>
                    <li>• Update current table availability without revenue visibility</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-4 w-4 text-felt" />
                  Quick operational actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Review pending booking approvals",
                  "Open live register ledger",
                  "Update table pricing for the week",
                  "Add new tournament or promo event",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2"
                  >
                    <span className="text-sm text-foreground">{item}</span>
                    <Button type="button" variant="outline" size="sm">
                      Open
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-4 w-4 text-felt" />
                  Venue settings & pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="snooker-rate">Snooker per hour</Label>
                    <Input
                      id="snooker-rate"
                      type="number"
                      value={settings.snookerRate}
                      onChange={(event) =>
                        updateSetting("snookerRate", Number(event.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pool-rate">Pool per hour</Label>
                    <Input
                      id="pool-rate"
                      type="number"
                      value={settings.poolRate}
                      onChange={(event) =>
                        updateSetting("poolRate", Number(event.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buffer-minutes">Maintenance buffer</Label>
                    <Input
                      id="buffer-minutes"
                      type="number"
                      value={settings.maintenanceBufferMinutes}
                      onChange={(event) =>
                        updateSetting("maintenanceBufferMinutes", Number(event.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="late-fee">Late fee</Label>
                    <Input
                      id="late-fee"
                      type="number"
                      value={settings.lateFee}
                      onChange={(event) =>
                        updateSetting("lateFee", Number(event.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-charge">Service charge %</Label>
                    <Input
                      id="service-charge"
                      type="number"
                      value={settings.serviceChargePercent}
                      onChange={(event) =>
                        updateSetting("serviceChargePercent", Number(event.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hold-window">Booking hold window (mins)</Label>
                    <Input
                      id="hold-window"
                      type="number"
                      value={settings.bookingHoldWindowMinutes}
                      onChange={(event) =>
                        updateSetting("bookingHoldWindowMinutes", Number(event.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Coffee className="h-4 w-4 text-felt" />
                      Cafeteria pricing
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCafeItem}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {cafeItems.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="grid gap-2 rounded-lg border border-border bg-surface p-3 md:grid-cols-[1.3fr_0.7fr_1.2fr]"
                      >
                        <Input
                          value={item.name}
                          onChange={(event) => updateCafeItem(index, "name", event.target.value)}
                          aria-label={`Cafe item ${index + 1} name`}
                        />
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(event) =>
                            updateCafeItem(index, "price", Number(event.target.value) || 0)
                          }
                          aria-label={`Cafe item ${index + 1} price`}
                        />
                        <Input
                          value={item.note}
                          onChange={(event) => updateCafeItem(index, "note", event.target.value)}
                          aria-label={`Cafe item ${index + 1} note`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-4 w-4 text-felt" />
                  Upcoming tournaments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <form
                  onSubmit={addTournament}
                  className="space-y-3 rounded-xl border border-border bg-background/40 p-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="tournament-name">Tournament title</Label>
                    <Input
                      id="tournament-name"
                      value={tournamentForm.title}
                      onChange={(event) =>
                        setTournamentForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="City Open 2026"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tournament-game">Game type</Label>
                      <select
                        id="tournament-game"
                        value={tournamentForm.gameType}
                        onChange={(event) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            gameType: event.target.value as TournamentForm["gameType"],
                          }))
                        }
                        className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="Snooker (15-Red)">Snooker (15-Red)</option>
                        <option value="8-Ball Pool">8-Ball Pool</option>
                        <option value="9-Ball Pool">9-Ball Pool</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tournament-spots">Total spots</Label>
                      <Input
                        id="tournament-spots"
                        type="number"
                        value={tournamentForm.totalSpots}
                        onChange={(event) =>
                          setTournamentForm((prev) => ({ ...prev, totalSpots: event.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tournament-date">Date</Label>
                      <Input
                        id="tournament-date"
                        type="date"
                        value={tournamentForm.date}
                        onChange={(event) =>
                          setTournamentForm((prev) => ({ ...prev, date: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tournament-time">Time</Label>
                      <Input
                        id="tournament-time"
                        type="time"
                        value={tournamentForm.time}
                        onChange={(event) =>
                          setTournamentForm((prev) => ({ ...prev, time: event.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tournament-entry">Entry fee</Label>
                      <Input
                        id="tournament-entry"
                        type="number"
                        value={tournamentForm.entryFee}
                        onChange={(event) =>
                          setTournamentForm((prev) => ({ ...prev, entryFee: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tournament-prize">Prize pool</Label>
                      <Input
                        id="tournament-prize"
                        type="number"
                        value={tournamentForm.prizePool}
                        onChange={(event) =>
                          setTournamentForm((prev) => ({ ...prev, prizePool: event.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add tournament
                  </Button>
                </form>

                <div className="space-y-3">
                  {tournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="rounded-lg border border-border bg-background/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{tournament.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            {tournament.gameType}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-felt/40 text-felt">
                          {tournament.status}
                        </Badge>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarRange className="h-3.5 w-3.5" />
                        {tournament.date}
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        {tournament.time} • Entry ₹{tournament.entryFee}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Spots left: {tournament.spotsLeft}</span>
                        <span>Prize: ₹{tournament.prizePool}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    </RoleGate>
  );
}
