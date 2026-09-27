export interface Table {
  id: string;
  name: string;
  type: "SNOOKER" | "POOL";
  hourlyRate: number;
  isActive: boolean;
}

export interface BookingRecord {
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
}
