import { academyMinutesOfDay } from "@/lib/academy-time";

export type CompatibleTable = {
  id: string;
  name: string;
  type: "SNOOKER" | "POOL";
  hourlyRate: number;
  isActive: boolean;
};

export function normalizeTable(value: unknown): CompatibleTable {
  if (typeof value !== "object" || value === null) {
    throw new Error("Table response contained an invalid row");
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    (row.type !== "POOL" && row.type !== "SNOOKER") ||
    typeof row.hourlyRate !== "number" ||
    typeof row.isActive !== "boolean"
  ) {
    throw new Error("Table response was missing required database fields");
  }
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    hourlyRate: row.hourlyRate,
    isActive: row.isActive,
  };
}

export type CompatibleBooking = {
  id: string;
  tableId: string;
  dateOffset: number;
  start: number;
  end: number;
  customerName: string | null;
  customerPhone: string | null;
  status: "HELD" | "CONFIRMED" | "ONGOING" | "MAINTENANCE" | "CANCELLED";
  reference: string | null;
  verified: boolean;
  note?: string;
};

type BookingRow = {
  id: string;
  tableId: string;
  source: "ONLINE" | "WALKIN" | "MAINTENANCE";
  customerName?: string;
  customerPhone?: string;
  slotStart: Date | string;
  slotEnd: Date | string;
  status: "HELD" | "CONFIRMED" | "ONGOING" | "CANCELLED";
  reference?: string | null;
  verified?: boolean;
  note?: string | null;
};

export function normalizeBooking(row: BookingRow, dateOffset: number): CompatibleBooking {
  const startDate = new Date(row.slotStart);
  const endDate = new Date(row.slotEnd);
  const start = academyMinutesOfDay(startDate);
  const end = academyMinutesOfDay(endDate);

  return {
    id: row.id,
    tableId: row.tableId,
    dateOffset,
    start,
    end,
    customerName: row.customerName ?? null,
    customerPhone: row.customerPhone ?? null,
    status: row.source === "MAINTENANCE" ? "MAINTENANCE" : row.status,
    reference: row.reference ?? null,
    verified: row.verified ?? false,
    note: row.note ?? undefined,
  };
}
