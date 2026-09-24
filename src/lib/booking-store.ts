export type BookingQueueStatus = "pending" | "confirmed" | "verified";
export type BookingQueueSource = "online" | "walk-in";

export interface BookingQueueItem {
  id: string;
  customer: string;
  tableId: string;
  tableName: string;
  date: string;
  start: string;
  duration: number;
  amount: number;
  status: BookingQueueStatus;
  source: BookingQueueSource;
}

export interface RegisterEntrySnapshot {
  id: string;
  tableId: string;
  tableName: string;
  tableType: "SNOOKER" | "POOL";
  status: "live" | "booked" | "completed";
  playerOne: string;
  playerTwo: string;
  startTime: string;
  endTime: string;
  payment: string;
  amount: number;
  createdAt: string;
}

const BOOKING_QUEUE_KEY = "masters-academy-booking-queue";
const REGISTER_ENTRIES_KEY = "masters-academy-register-entries";

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadBookingQueue(): BookingQueueItem[] {
  return readStorage<BookingQueueItem[]>(BOOKING_QUEUE_KEY, []);
}

export function saveBookingQueue(items: BookingQueueItem[]) {
  writeStorage(BOOKING_QUEUE_KEY, items);
}

export function appendBookingQueue(item: BookingQueueItem) {
  const items = loadBookingQueue();
  const next = [item, ...items];
  saveBookingQueue(next);
  return next;
}

export function loadRegisterEntries(): RegisterEntrySnapshot[] {
  return readStorage<RegisterEntrySnapshot[]>(REGISTER_ENTRIES_KEY, []);
}

export function saveRegisterEntries(entries: RegisterEntrySnapshot[]) {
  writeStorage(REGISTER_ENTRIES_KEY, entries);
}
