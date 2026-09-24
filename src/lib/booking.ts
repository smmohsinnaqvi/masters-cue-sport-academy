import { MOCK_BOOKINGS, MOCK_TABLES, type BookingRecord, type Table } from "@/data/mock-data";

export const OPEN_START = 10 * 60; // 10:00
export const OPEN_END = 23 * 60; // 23:00
export const STEP = 30; // minutes between selectable start times
export const BUFFER = 10; // minutes of cloth brushing / racking after a session

export const DURATIONS = [
  { minutes: 60, label: "1 hr" },
  { minutes: 90, label: "1.5 hrs" },
  { minutes: 120, label: "2 hrs" },
  { minutes: 180, label: "3 hrs" },
];

export type TableAvailability = "FREE" | "PARTIAL" | "FULL";

export function formatTime(minutes: number) {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function sessionPrice(table: Table, durationMinutes: number) {
  return Math.round((table.hourlyRate * durationMinutes) / 60);
}

export interface DateOption {
  offset: number;
  id: string;
  day: string;
  date: string;
  isToday: boolean;
}

export function buildDateOptions(count = 7): DateOption[] {
  const base = new Date();
  return Array.from({ length: count }, (_, offset) => {
    const d = new Date(base.getTime() + offset * 86400000);
    const day = d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
    const date = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Kolkata",
    });
    return {
      offset,
      id: `d${offset}`,
      day: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : day,
      date,
      isToday: offset === 0,
    };
  });
}

export function bookingsFor(tableId: string, dateOffset: number, extra: BookingRecord[] = []) {
  const source = extra.length > 0 ? extra : MOCK_BOOKINGS;
  return source.filter(
    (b) => b.tableId === tableId && b.dateOffset === dateOffset && b.status !== "CANCELLED",
  );
}

/** A range is free when it fits opening hours and clears every booking plus its buffer. */
export function isRangeFree(
  tableId: string,
  dateOffset: number,
  start: number,
  duration: number,
  extra: BookingRecord[] = [],
) {
  const end = start + duration;
  if (start < OPEN_START || end > OPEN_END) return false;

  return bookingsFor(tableId, dateOffset, extra).every(
    (b) => end + BUFFER <= b.start || start >= b.end + BUFFER,
  );
}

export function startOptions() {
  const starts: number[] = [];
  for (let t = OPEN_START; t <= OPEN_END - 60; t += STEP) starts.push(t);
  return starts;
}

export function freeStarts(
  tableId: string,
  dateOffset: number,
  duration: number,
  extra: BookingRecord[] = [],
) {
  return startOptions().filter((s) => isRangeFree(tableId, dateOffset, s, duration, extra));
}

export function tableAvailability(
  tableId: string,
  dateOffset: number,
  duration: number,
  extra: BookingRecord[] = [],
): TableAvailability {
  const free = freeStarts(tableId, dateOffset, duration, extra).length;
  const total = startOptions().length;
  if (free === 0) return "FULL";
  if (free < total * 0.6) return "PARTIAL";
  return "FREE";
}

/** Nearest free windows on other tables, used when the picked table is busy. */
export function suggestAlternatives(
  tableId: string,
  dateOffset: number,
  duration: number,
  preferredStart: number,
  extra: BookingRecord[] = [],
) {
  const source = MOCK_TABLES.find((t) => t.id === tableId);
  return MOCK_TABLES.filter((t) => t.isActive && t.id !== tableId && t.type === source?.type)
    .map((table) => {
      const options = freeStarts(table.id, dateOffset, duration, extra);
      if (options.length === 0) return null;
      const closest = options.reduce((best, current) =>
        Math.abs(current - preferredStart) < Math.abs(best - preferredStart) ? current : best,
      );
      return { table, start: closest };
    })
    .filter((v): v is { table: Table; start: number } => v !== null)
    .sort((a, b) => Math.abs(a.start - preferredStart) - Math.abs(b.start - preferredStart))
    .slice(0, 3);
}

/* ---------- minute-precision picking ---------- */

export function toTimeInput(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function fromTimeInput(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export type SegmentKind = "FREE" | "BOOKED" | "BUFFER" | "HELD";

export interface DaySegment {
  start: number;
  end: number;
  kind: SegmentKind;
  label?: string;
}

/** Full opening-hours timeline for one table: booked blocks, their buffers, and free gaps. */
export function daySegments(
  tableId: string,
  dateOffset: number,
  extra: BookingRecord[] = [],
): DaySegment[] {
  const busy = bookingsFor(tableId, dateOffset, extra)
    .slice()
    .sort((a, b) => a.start - b.start);

  const segments: DaySegment[] = [];
  let cursor = OPEN_START;

  for (const booking of busy) {
    const start = Math.max(OPEN_START, booking.start);
    const end = Math.min(OPEN_END, booking.end);
    if (end <= OPEN_START || start >= OPEN_END) continue;
    if (start > cursor) segments.push({ start: cursor, end: start, kind: "FREE" });
    segments.push({
      start,
      end,
      kind: booking.status === "HELD" ? "HELD" : "BOOKED",
      label: booking.status === "HELD" ? "On hold" : "Booked",
    });
    cursor = end;
    const bufferEnd = Math.min(OPEN_END, end + BUFFER);
    if (bufferEnd > cursor) {
      segments.push({ start: cursor, end: bufferEnd, kind: "BUFFER", label: "Cloth buffer" });
      cursor = bufferEnd;
    }
  }

  if (cursor < OPEN_END) segments.push({ start: cursor, end: OPEN_END, kind: "FREE" });
  return segments;
}

/** The booking that blocks a requested window, if any (buffer included). */
export function conflictFor(
  tableId: string,
  dateOffset: number,
  start: number,
  duration: number,
  extra: BookingRecord[] = [],
) {
  const end = start + duration;
  return (
    bookingsFor(tableId, dateOffset, extra).find(
      (b) => !(end + BUFFER <= b.start || start >= b.end + BUFFER),
    ) ?? null
  );
}

/** First minute at or after `from` where the whole window fits on this table. */
export function nextFreeStart(
  tableId: string,
  dateOffset: number,
  duration: number,
  from: number,
  extra: BookingRecord[] = [],
): number | null {
  let candidate = Math.max(from, OPEN_START);
  for (let guard = 0; guard < 64; guard += 1) {
    if (candidate + duration > OPEN_END) return null;
    const clash = conflictFor(tableId, dateOffset, candidate, duration, extra);
    if (!clash) return candidate;
    candidate = clash.end + BUFFER;
  }
  return null;
}
