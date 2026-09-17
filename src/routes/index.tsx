import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  IndianRupee,
  LockKeyhole,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import heroImage from "@/assets/snooker-academy-hero.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MOCK_SLOTS, MOCK_TABLES, type Slot, type Table } from "@/lib/mockData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Premium Snooker & Pool Academy | Live Table Booking" },
      {
        name: "description",
        content:
          "Reserve 9ft pool and 12ft snooker tables with live slot status, no account required.",
      },
      { property: "og:title", content: "Premium Snooker & Pool Academy | Live Table Booking" },
      {
        property: "og:description",
        content:
          "A dark, mobile-first academy showcase with fast table booking for pool and snooker players.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type TableType = Table["type"];
type DisplaySlotStatus = Slot["status"] | "BUFFER";
type DisplaySlot = Slot & {
  displayStatus: DisplaySlotStatus;
  note?: string | undefined;
};

const TABLE_TYPES: Array<{
  value: TableType;
  label: string;
  size: string;
  copy: string;
}> = [
  {
    value: "POOL",
    label: "9ft Pool",
    size: "9ft",
    copy: "Fast racks, social sessions, and league practice.",
  },
  {
    value: "SNOOKER",
    label: "12ft Snooker",
    size: "12ft",
    copy: "Match-table conditions with tournament cloth.",
  },
];

const DATE_OPTIONS = [
  { id: "today", day: "Today", date: "17 Sep", hint: "Live" },
  { id: "fri", day: "Fri", date: "18 Sep", hint: "Prime" },
  { id: "sat", day: "Sat", date: "19 Sep", hint: "Busy" },
  { id: "sun", day: "Sun", date: "20 Sep", hint: "Open" },
  { id: "mon", day: "Mon", date: "21 Sep", hint: "Coach" },
];

const STATUS_STYLES: Record<DisplaySlotStatus, string> = {
  AVAILABLE:
    "border-felt/45 bg-felt/15 text-felt hover:border-felt hover:bg-felt/25 hover:text-felt-foreground",
  BOOKED: "border-destructive/40 bg-destructive/15 text-destructive",
  HELD: "border-warning/45 bg-warning/15 text-warning",
  BUFFER: "border-buffer/45 bg-buffer/15 text-buffer",
};

const STATUS_LABELS: Record<DisplaySlotStatus, string> = {
  AVAILABLE: "Available",
  BOOKED: "Booked",
  HELD: "Locked",
  BUFFER: "Buffer",
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function Index() {
  const [tableType, setTableType] = useState<TableType>("POOL");
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0]?.id ?? "today");
  const [selectedTableId, setSelectedTableId] = useState("tbl-4");
  const [selectedSlot, setSelectedSlot] = useState<DisplaySlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const filteredTables = useMemo(
    () => MOCK_TABLES.filter((table) => table.type === tableType && table.isActive),
    [tableType],
  );

  const selectedTable = filteredTables.find((table) => table.id === selectedTableId) ?? filteredTables[0];
  const selectedDateLabel = DATE_OPTIONS.find((date) => date.id === selectedDate);

  const visibleSlots = useMemo<DisplaySlot[]>(() => {
    if (!selectedTable) {
      return [];
    }

    return MOCK_SLOTS.map((slot) => ({
      ...slot,
      id: `${selectedTable.id}-${slot.id}`,
      tableId: selectedTable.id,
    })).map((slot, index, slots) => {
      const previous = slots[index - 1];
      const isBufferWindow = slot.status === "AVAILABLE" && previous?.status === "BOOKED";

      return {
        ...slot,
        displayStatus: isBufferWindow ? "BUFFER" : slot.status,
        note: isBufferWindow ? "10-min cloth brush" : undefined,
      };
    });
  }, [selectedTable]);

  const availableCount = visibleSlots.filter((slot) => slot.displayStatus === "AVAILABLE").length;

  function switchTableType(nextType: TableType) {
    setTableType(nextType);
    const nextTable = MOCK_TABLES.find((table) => table.type === nextType && table.isActive);
    if (nextTable) {
      setSelectedTableId(nextTable.id);
    }
    setSelectedSlot(null);
  }

  function openSlot(slot: DisplaySlot) {
    if (slot.displayStatus !== "AVAILABLE") {
      return;
    }

    setSelectedSlot(slot);
    setBookingConfirmed(false);
    setCustomerName("");
    setCustomerPhone("");
  }

  function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingConfirmed(true);
  }

  if (!selectedTable || !selectedDateLabel) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-20 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a href="#top" className="flex min-h-12 items-center gap-3 rounded-md pr-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md border border-felt/35 bg-felt/15 shadow-[var(--shadow-felt)]">
              <Activity className="h-5 w-5 text-felt" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">Cue Academy</span>
              <span className="block text-xs text-muted-foreground">Snooker & Pool</span>
            </span>
          </a>
          <Button asChild variant="secondary" className="min-h-12 border border-border bg-surface/80">
            <a href="#booking">Book now</a>
          </Button>
        </nav>
      </header>

      <main id="top">
        <section className="relative isolate flex min-h-[82svh] items-end overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <img
            src={heroImage}
            alt="Tournament snooker tables inside a premium dark academy."
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            width={1600}
            height={1000}
          />
          <div className="absolute inset-0 -z-10 bg-[image:var(--gradient-hero)]" />

          <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
            <div className="max-w-3xl">
              <Badge className="mb-5 min-h-8 gap-2 border-felt/35 bg-felt/15 px-3 text-felt shadow-[var(--shadow-felt)]">
                <span className="h-2.5 w-2.5 rounded-full bg-neon" />
                Live Tables Available
              </Badge>
              <h1 className="max-w-3xl text-5xl font-black leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
                Premium snooker & pool, booked in seconds.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Choose a table, swipe through live slots, and place a 5-minute hold with just
                your name and phone number.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="min-h-12 shadow-[var(--shadow-felt)]">
                  <a href="#booking">
                    Book a Slot
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="min-h-12 border-border bg-surface/70">
                  <a href="#booking">Check today’s availability</a>
                </Button>
              </div>
            </div>

            <div className="hidden rounded-lg border border-border bg-surface/75 p-4 shadow-[var(--shadow-gold)] backdrop-blur lg:block">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Right now</p>
                  <p className="text-3xl font-bold text-foreground">{availableCount} slots</p>
                </div>
                <Sparkles className="h-9 w-9 text-gold" aria-hidden="true" />
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border bg-surface-subtle p-3">
                  <p className="text-muted-foreground">Tables</p>
                  <p className="mt-1 font-semibold text-foreground">5 active</p>
                </div>
                <div className="rounded-md border border-border bg-surface-subtle p-3">
                  <p className="text-muted-foreground">Hold</p>
                  <p className="mt-1 font-semibold text-foreground">5 min</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="booking" className="relative px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Card className="border-border bg-[image:var(--gradient-panel)] shadow-[var(--shadow-felt)] backdrop-blur">
              <CardHeader className="gap-4 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge variant="outline" className="mb-3 min-h-7 border-gold/35 text-gold">
                      Booking Engine
                    </Badge>
                    <CardTitle className="text-2xl leading-tight sm:text-3xl">
                      Reserve your table
                    </CardTitle>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Red slots are booked. Yellow slots are held or reserved for the 10-minute
                      cloth and rack buffer.
                    </p>
                  </div>
                  <div className="flex min-h-12 items-center gap-2 rounded-md border border-felt/35 bg-felt/15 px-3 text-sm text-felt">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    Race-safe holds
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-7 p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      1
                    </span>
                    Select table type
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {TABLE_TYPES.map((option) => {
                      const isActive = tableType === option.value;
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant="outline"
                          onClick={() => switchTableType(option.value)}
                          className={cn(
                            "min-h-24 justify-start border-border bg-surface/70 p-4 text-left hover:bg-surface-strong",
                            isActive && "border-felt bg-felt/15 shadow-[var(--shadow-felt)]",
                          )}
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-subtle text-lg font-bold text-felt">
                            {option.size}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-base font-semibold text-foreground">
                              {option.label}
                            </span>
                            <span className="mt-1 block whitespace-normal text-sm leading-5 text-muted-foreground">
                              {option.copy}
                            </span>
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      2
                    </span>
                    Pick a date
                  </div>
                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                    {DATE_OPTIONS.map((date) => {
                      const isActive = selectedDate === date.id;
                      return (
                        <Button
                          key={date.id}
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedDate(date.id)}
                          className={cn(
                            "min-h-20 w-24 shrink-0 flex-col border-border bg-surface/70 px-3 hover:bg-surface-strong",
                            isActive && "border-felt bg-felt/15 text-felt shadow-[var(--shadow-felt)]",
                          )}
                        >
                          <span className="text-sm font-semibold">{date.day}</span>
                          <span className="text-base text-foreground">{date.date}</span>
                          <span className="text-xs text-muted-foreground">{date.hint}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        3
                      </span>
                      Select table and time
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDateLabel.day}, {selectedDateLabel.date}
                    </div>
                  </div>

                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                    {filteredTables.map((table) => {
                      const isActive = table.id === selectedTable.id;
                      return (
                        <Button
                          key={table.id}
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedTableId(table.id)}
                          className={cn(
                            "min-h-20 w-64 shrink-0 justify-start border-border bg-surface/70 p-4 text-left hover:bg-surface-strong",
                            isActive && "border-felt bg-felt/15 shadow-[var(--shadow-felt)]",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {table.name}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-normal text-xs text-muted-foreground">
                              <span>{table.clothType}</span>
                              <span>{formatPrice(table.hourlyRate)}/hr</span>
                            </span>
                          </span>
                        </Button>
                      );
                    })}
                  </div>

                  <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                    {visibleSlots.map((slot) => {
                      const isAvailable = slot.displayStatus === "AVAILABLE";
                      return (
                        <Button
                          key={slot.id}
                          type="button"
                          variant="outline"
                          disabled={!isAvailable}
                          onClick={() => openSlot(slot)}
                          className={cn(
                            "min-h-24 w-36 shrink-0 flex-col items-start border px-4 py-3 text-left disabled:opacity-100",
                            STATUS_STYLES[slot.displayStatus],
                          )}
                          aria-label={`${slot.startTime} to ${slot.endTime}: ${STATUS_LABELS[slot.displayStatus]}`}
                        >
                          <span className="flex w-full items-center justify-between gap-2 text-xs font-semibold uppercase text-current">
                            {STATUS_LABELS[slot.displayStatus]}
                            {isAvailable ? (
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                            )}
                          </span>
                          <span className="mt-2 text-lg font-bold text-foreground">{slot.startTime}</span>
                          <span className="text-xs text-muted-foreground">
                            to {slot.endTime}
                          </span>
                          {slot.note ? <span className="mt-1 text-xs text-current">{slot.note}</span> : null}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <CheckoutDrawer
        open={Boolean(selectedSlot)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSlot(null);
          }
        }}
        selectedSlot={selectedSlot}
        selectedTable={selectedTable}
        selectedDateLabel={selectedDateLabel}
        customerName={customerName}
        customerPhone={customerPhone}
        bookingConfirmed={bookingConfirmed}
        onNameChange={setCustomerName}
        onPhoneChange={setCustomerPhone}
        onSubmit={handleCheckout}
      />
    </div>
  );
}

function CheckoutDrawer({
  open,
  onOpenChange,
  selectedSlot,
  selectedTable,
  selectedDateLabel,
  customerName,
  customerPhone,
  bookingConfirmed,
  onNameChange,
  onPhoneChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSlot: DisplaySlot | null;
  selectedTable: Table;
  selectedDateLabel: (typeof DATE_OPTIONS)[number];
  customerName: string;
  customerPhone: string;
  bookingConfirmed: boolean;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92svh] max-w-2xl border-border bg-background">
        <DrawerHeader className="px-5 text-left">
          <DrawerTitle className="text-2xl">Confirm your table hold</DrawerTitle>
          <DrawerDescription>
            No account needed. This mock hold mirrors the 5-minute lock flow.
          </DrawerDescription>
        </DrawerHeader>

        {selectedSlot ? (
          <div className="overflow-y-auto px-5 pb-2">
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{selectedTable.name}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {selectedDateLabel.day}, {selectedDateLabel.date}
                  </p>
                </div>
                <Badge className="border-felt/35 bg-felt/15 text-felt" variant="outline">
                  {formatPrice(selectedTable.hourlyRate)}/hr
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex min-h-12 items-center gap-2 rounded-md border border-border bg-surface-subtle px-3">
                  <Clock3 className="h-4 w-4 text-felt" aria-hidden="true" />
                  <span>
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </span>
                </div>
                <div className="flex min-h-12 items-center gap-2 rounded-md border border-border bg-surface-subtle px-3">
                  <CalendarDays className="h-4 w-4 text-gold" aria-hidden="true" />
                  <span>{selectedTable.size} table</span>
                </div>
              </div>
            </div>

            {bookingConfirmed ? (
              <div className="mt-5 rounded-lg border border-felt/35 bg-felt/10 p-5 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-felt" aria-hidden="true" />
                <h2 className="mt-3 text-xl font-bold text-foreground">Slot held successfully</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  We have reserved this table for 5 minutes. Pay at the counter or use the
                  Phase 2 UPI placeholder.
                </p>
                <Button className="mt-5 w-full min-h-12" type="button">
                  <Phone className="h-5 w-5" aria-hidden="true" />
                  Pay via UPI (PhonePe/GPay)
                </Button>
              </div>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Name</Label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(event) => onNameChange(event.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    className="min-h-12 bg-surface"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Phone number</Label>
                  <Input
                    id="customer-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => onPhoneChange(event.target.value)}
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    className="min-h-12 bg-surface"
                  />
                </div>
                <Button className="w-full min-h-12 shadow-[var(--shadow-felt)]" type="submit">
                  <IndianRupee className="h-5 w-5" aria-hidden="true" />
                  Hold this slot
                </Button>
              </form>
            )}
          </div>
        ) : null}

        <DrawerFooter className="px-5">
          <DrawerClose asChild>
            <Button variant="outline" className="min-h-12 border-border bg-surface" type="button">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
