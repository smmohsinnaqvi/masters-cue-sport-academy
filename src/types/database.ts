export type TableType = "SNOOKER" | "POOL";
export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";
export type BookingStatus = "HELD" | "CONFIRMED" | "CANCELLED";
export type ActiveSessionStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type GameType = "CASUAL" | "MATCH" | "PRACTICE";
export type PaymentMethod = "CASH" | "UPI" | "CARD";

export interface Table {
  id: string;
  name: string;
  type: TableType;
  size: string;
  hourly_rate: number;
  is_active: boolean;
  current_status: TableStatus;
  session_started_at: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  table_id: string;
  customer_name: string;
  customer_phone: string;
  slot_start: string;
  slot_end: string;
  status: BookingStatus;
  locked_until: string | null;
  created_at: string;
}

export interface ActiveSession {
  id: string;
  table_id: string;
  customer_name: string;
  started_at: string;
  ended_at: string | null;
  hourly_rate: number;
  total_minutes: number | null;
  final_amount: number | null;
  status: ActiveSessionStatus;
  created_at: string;
  player_two_name?: string | null;
  winner_name?: string | null;
  game_type?: GameType;
  payment_method?: PaymentMethod;
}

export type Database = {
  public: {
    Tables: {
      tables: {
        Row: Table;
        Insert: Omit<Table, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Table>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Booking>;
      };
      active_sessions: {
        Row: ActiveSession;
        Insert: Omit<ActiveSession, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<ActiveSession>;
      };
    };
  };
};
