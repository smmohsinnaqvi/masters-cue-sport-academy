export type TableType = "SNOOKER" | "POOL";
export type SessionSource = "ONLINE" | "WALKIN" | "MAINTENANCE";
export type SessionStatus =
  "HELD" | "CONFIRMED" | "ONGOING" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "EXPIRED";

export interface TableRow {
  id: string;
  name: string;
  type: TableType;
  hourly_rate: number;
  is_active: boolean;
}

export type Table = TableRow;

export interface SessionRow {
  id: string;
  table_id: string;
  source: SessionSource;
  status: SessionStatus;
  start_time: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  hold_expires_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  ref_code: string | null;
  players: unknown;
  loser_name: string | null;
  rate_snapshot: number | null;
  duration_minutes: number | null;
  amount: number | null;
  payment_status: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      tables: {
        Row: TableRow;
        Insert: Omit<TableRow, "id"> & { id?: string };
        Update: Partial<TableRow>;
      };
      sessions: {
        Row: SessionRow;
        Insert: Omit<SessionRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SessionRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      TableType: TableType;
      SessionSource: SessionSource;
      SessionStatus: SessionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
