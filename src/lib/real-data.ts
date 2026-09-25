type RawTableRow = {
  id: string;
  name?: string;
  shortName?: string;
  short_name?: string;
  type?: "SNOOKER" | "POOL" | string;
  size?: string;
  brand?: string;
  hourlyRate?: number | string;
  hourly_rate?: number | string;
  clothType?: string;
  cloth_type?: string;
  isActive?: boolean;
  is_active?: boolean;
  zone?: "MAIN_ARENA" | "LOUNGE" | string;
  position?: unknown;
};

export type CompatibleTable = {
  id: string;
  name: string;
  shortName: string;
  type: "SNOOKER" | "POOL";
  size: string;
  brand: string;
  hourlyRate: number;
  clothType: string;
  isActive: boolean;
  zone: "MAIN_ARENA" | "LOUNGE";
  position: { x: number; y: number; w: number; h: number };
};

const TABLE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  S1: { x: 6, y: 6, w: 24, h: 13 },
  S2: { x: 38, y: 6, w: 24, h: 13 },
  S3: { x: 70, y: 6, w: 24, h: 13 },
  S4: { x: 6, y: 25, w: 24, h: 13 },
  S5: { x: 38, y: 25, w: 24, h: 13 },
  S6: { x: 70, y: 25, w: 24, h: 13 },
  P1: { x: 14, y: 45, w: 19, h: 11 },
  P2: { x: 40, y: 45, w: 19, h: 11 },
};

export function normalizeTable(row: RawTableRow): CompatibleTable {
  const positionSource =
    typeof row.position === "string" ? JSON.parse(row.position) : (row.position ?? {});
  const position =
    typeof positionSource === "object" && positionSource !== null
      ? (positionSource as Partial<{ x: number; y: number; w: number; h: number }>)
      : {};

  const type = row.type === "POOL" || row.type === "SNOOKER" ? row.type : "SNOOKER";
  const zone = row.zone === "LOUNGE" || row.zone === "MAIN_ARENA" ? row.zone : "MAIN_ARENA";

  return {
    id: row.id,
    name: row.name ?? "Academy table",
    shortName: row.shortName ?? row.short_name ?? "TBL",
    type,
    size: row.size ?? "9ft",
    brand: row.brand ?? "Custom Academy Table",
    hourlyRate: Number(row.hourlyRate ?? row.hourly_rate ?? 0),
    clothType: row.clothType ?? row.cloth_type ?? "Tournament cloth",
    isActive: row.isActive ?? row.is_active ?? true,
    zone,
    position:
      Number(position.w ?? 0) > 0
        ? {
            x: Number(position.x),
            y: Number(position.y),
            w: Number(position.w),
            h: Number(position.h),
          }
        : (TABLE_LAYOUT[row.name ?? ""] ?? { x: 0, y: 0, w: 0, h: 0 }),
  };
}

export type CompatibleBooking = {
  id: string;
  tableId: string;
  dateOffset: number;
  start: number;
  end: number;
  customerName: string;
  customerPhone: string;
  status: "HELD" | "CONFIRMED" | "ONGOING" | "MAINTENANCE" | "CANCELLED";
  reference: string;
  verified: boolean;
  note?: string;
};

type BookingRow = {
  id: string;
  tableId?: string;
  table_id?: string;
  customerName?: string;
  customer_name?: string;
  customerPhone?: string;
  customer_phone?: string;
  slotStart?: Date | string;
  slot_start?: Date | string;
  slotEnd?: Date | string;
  slot_end?: Date | string;
  status?: "HELD" | "CONFIRMED" | "ONGOING" | "MAINTENANCE" | "CANCELLED" | string;
  reference?: string | null;
  verified?: boolean;
  note?: string | null;
};

export function normalizeBooking(row: BookingRow, dateOffset: number): CompatibleBooking {
  const startDate = new Date(row.slotStart ?? row.slot_start ?? new Date());
  const endDate = new Date(row.slotEnd ?? row.slot_end ?? new Date());
  const start = startDate.getHours() * 60 + startDate.getMinutes();
  const end = endDate.getHours() * 60 + endDate.getMinutes();

  return {
    id: row.id,
    tableId: row.tableId ?? row.table_id ?? "",
    dateOffset,
    start,
    end,
    customerName: row.customerName ?? row.customer_name ?? "Guest",
    customerPhone: row.customerPhone ?? row.customer_phone ?? "+91 00000 00000",
    status: (row.status as CompatibleBooking["status"]) ?? "HELD",
    reference: row.reference ?? `MCA-${row.id.slice(0, 5).toUpperCase()}`,
    verified: row.verified ?? false,
    note: row.note ?? undefined,
  };
}
