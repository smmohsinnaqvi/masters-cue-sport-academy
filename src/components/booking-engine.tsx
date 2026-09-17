import { CheckCircle2, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { FloorMap } from "@/components/floor-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DURATIONS,
  buildDateOptions,
  formatPrice,
  formatTime,
  freeStarts,
  isRangeFree,
  sessionPrice,
  suggestAlternatives,
  tableAvailability,
  type TableAvailability,
} from "@/lib/booking";
import { MOCK_TABLES, type Table } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export function BookingEngine() {
  const dateOptions = useMemo(() => buildDateOptions(7), []);
  const [dateOffset, setDateOffset] = useState(0);
  const [duration, setDuration] = useState(60);
  const [tableId, setTableId] = useState("snk-1");
  const [start, setStart] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const table = MOCK_TABLES.find((t) => t.id === tableId) ?? MOCK_TABLES[0]!;
  const selectedDate = dateOptions.find((d) => d.offset === dateOffset) ?? dateOptions[0]!;

  const availability = useMemo(() => {
    const map: Record<string, TableAvailability> = {};
    for (const t of MOCK_TABLES) {
      map[t.id] = tableAvailability(t.id, dateOffset, duration);
    }
    return map;
  }, [dateOffset, duration]);

  const suggestions = useMemo(
    () => freeStarts(table.id, dateOffset, duration),
    [table.id, dateOffset, duration],
  );

  const alternatives = useMemo(
    () => (suggestions.length === 0 ? suggestAlternatives(table.id, dateOffset, duration, 18 * 60) : []),
    [suggestions.length, table.id, dateOffset, duration],
  );

  function pickTable(next: Table) {
    setTableId(next.id);
    setStart(null);
  }

  function pickStart(value: number) {
    setStart(value);
    setConfirmed(false);
    setName("");
    setPhone("");
    setDrawerOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmed(true);
  }

  const price = sessionPrice(table, duration);
  const canBook = start !== null && isRangeFree(table.id, dateOffset, start, duration);

  return (
    <>
      <Card className="border-border bg-[image:var(--gradient-panel)] shadow-[var(--shadow-felt)] backdrop-blur">
        <CardHeader className="gap-3 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge variant="outline" className="mb-3 min-h-7 border-gold/35 text-gold">
                Live floor
              </Badge>
              <CardTitle className="text-2xl leading-tight sm:text-3xl">
                Pick your table off the floor map
              </CardTitle>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Choose a date and how long you want to play, tap a table on the plan, then pick a
                suggested start time. A 10-minute cloth-brushing buffer is kept after every session.
              </p>
            </div>
            <div className="flex min-h-12 items-center gap-2 rounded-md border border-felt/35 bg-felt/15 px-3 text-sm text-felt">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              No double bookings
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-7 p-4 pt-0 sm:p-6 sm:pt-0">
          <Step number={1} title="Pick a date">
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
              {dateOptions.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDateOffset(option.offset);
                    setStart(null);
                  }}
                  className={cn(
                    "min-h-20 w-28 shrink-0 flex-col border-border bg-surface/70 px-3 hover:bg-surface-strong",
                    option.offset === dateOffset &&
                      "border-felt bg-felt/15 text-felt shadow-[var(--shadow-felt)]",
                  )}
                >
                  <span className="text-sm font-semibold">{option.day}</span>
                  <span className="text-base text-foreground">{option.date}</span>
                </Button>
              ))}
            </div>
          </Step>

          <Step number={2} title="How long do you want to play?">
            <div className="flex flex-wrap gap-3">
              {DURATIONS.map((option) => (
                <Button
                  key={option.minutes}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDuration(option.minutes);
                    setStart(null);
                  }}
                  className={cn(
                    "min-h-12 min-w-24 border-border bg-surface/70 hover:bg-surface-strong",
                    duration === option.minutes && "border-felt bg-felt/15 text-felt",
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </Step>

          <Step number={3} title="Tap a table on the floor plan">
            <FloorMap selectedTableId={table.id} availability={availability} onSelect={pickTable} />
            <div className="mt-3 rounded-lg border border-border bg-surface p-4">
              <p className="text-base font-semibold text-foreground">{table.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {table.size} {table.brand} · {table.clothType} · {formatPrice(table.hourlyRate)}/hr
              </p>
              <p className="mt-2 text-sm text-felt">
                {formatPrice(price)} for this {DURATIONS.find((d) => d.minutes === duration)?.label}{" "}
                session
              </p>
            </div>
          </Step>

          <Step number={4} title="Suggested start times">
            {suggestions.length > 0 ? (
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                {suggestions.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    onClick={() => pickStart(value)}
                    className={cn(
                      "min-h-20 w-36 shrink-0 flex-col items-start border-felt/45 bg-felt/15 px-4 text-left text-felt hover:bg-felt/25",
                      start === value && "border-felt bg-felt/30",
                    )}
                  >
                    <span className="flex w-full items-center justify-between text-xs font-semibold uppercase">
                      Available
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="mt-2 text-base font-bold text-foreground">
                      {formatTime(value)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      to {formatTime(value + duration)}
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-warning/45 bg-warning/10 p-4">
                <p className="text-sm font-semibold text-warning">
                  No {DURATIONS.find((d) => d.minutes === duration)?.label} window left on this
                  table for {selectedDate.day}.
                </p>
                {alternatives.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-muted-foreground">Closest options:</p>
                    {alternatives.map((alt) => (
                      <Button
                        key={alt.table.id}
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setTableId(alt.table.id);
                          pickStart(alt.start);
                        }}
                        className="min-h-12 w-full justify-between border-border bg-surface/70"
                      >
                        <span>{alt.table.name}</span>
                        <span className="text-felt">{formatTime(alt.start)}</span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a shorter session or another date.
                  </p>
                )}
              </div>
            )}
          </Step>
        </CardContent>
      </Card>

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setStart(null);
        }}
      >
        <DrawerContent className="mx-auto max-h-[92svh] max-w-2xl border-border bg-background">
          <DrawerHeader className="px-5 text-left">
            <DrawerTitle className="text-2xl">Confirm your table hold</DrawerTitle>
            <DrawerDescription>
              No account needed — just your name and phone number. We hold the table for 5 minutes.
            </DrawerDescription>
          </DrawerHeader>

          {start !== null ? (
            <div className="overflow-y-auto px-5 pb-6">
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-muted-foreground">{table.name}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {selectedDate.day}, {selectedDate.date}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-surface-subtle px-3">
                    <Clock3 className="h-4 w-4 text-felt" aria-hidden="true" />
                    {formatTime(start)} – {formatTime(start + duration)}
                  </span>
                  <span className="inline-flex min-h-9 items-center rounded-md border border-border bg-surface-subtle px-3">
                    {table.size} {table.type === "SNOOKER" ? "Snooker" : "Pool"}
                  </span>
                  <span className="inline-flex min-h-9 items-center rounded-md border border-border bg-surface-subtle px-3 text-felt">
                    {formatPrice(price)}
                  </span>
                </div>
              </div>

              {confirmed ? (
                <div className="mt-4 rounded-lg border border-felt/45 bg-felt/10 p-4">
                  <p className="flex items-center gap-2 text-base font-semibold text-felt">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    Slot held successfully
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Show your phone number at reception. Payment at the counter for now.
                  </p>
                  <Button type="button" className="mt-4 min-h-12 w-full">
                    Pay via UPI (PhonePe/GPay)
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="booking-name">Your name</Label>
                    <Input
                      id="booking-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      className="min-h-12"
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="booking-phone">Phone number</Label>
                    <Input
                      id="booking-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      required
                      className="min-h-12"
                      placeholder="+91 90000 00000"
                    />
                  </div>
                  <Separator />
                  <Button type="submit" disabled={!canBook} className="min-h-12 w-full">
                    Hold this slot
                  </Button>
                </form>
              )}
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          {number}
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}
