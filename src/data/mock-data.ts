export interface Table {
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
  /** Top-down floor plan position, in floor-plan units (100 x 62 grid). */
  position: { x: number; y: number; w: number; h: number };
}

export interface BookingRecord {
  id: string;
  tableId: string;
  dateOffset: number;
  /** Minutes from midnight. */
  start: number;
  end: number;
  customerName: string;
  customerPhone: string;
  status: "HELD" | "CONFIRMED" | "CANCELLED";
  reference: string;
  verified: boolean;
  note?: string;
}

export interface Tournament {
  id: string;
  title: string;
  gameType: "Snooker (15-Red)" | "8-Ball Pool" | "9-Ball Pool";
  date: string;
  time: string;
  entryFee: number;
  prizePool: number;
  totalSpots: number;
  spotsLeft: number;
  status: "OPEN" | "FILLING_FAST" | "CLOSED";
}

export interface CoachingPackage {
  id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  price: number;
  features: string[];
}

export interface CafeItem {
  name: string;
  price: number;
  note: string;
}

const SNOOKER_BRAND = "Rasson Magnum II";
const SNOOKER_CLOTH = "Strachan 6811 Gold Tournament";

export const MOCK_TABLES: Table[] = [
  {
    id: "snk-1",
    name: "Snooker Table 1 — Match Arena",
    shortName: "S1",
    type: "SNOOKER",
    size: "12ft",
    brand: SNOOKER_BRAND,
    hourlyRate: 350,
    clothType: SNOOKER_CLOTH,
    isActive: true,
    zone: "MAIN_ARENA",
    position: { x: 6, y: 6, w: 24, h: 13 },
  },
  {
    id: "snk-2",
    name: "Snooker Table 2",
    shortName: "S2",
    type: "SNOOKER",
    size: "12ft",
    brand: SNOOKER_BRAND,
    hourlyRate: 320,
    clothType: SNOOKER_CLOTH,
    isActive: true,
    zone: "MAIN_ARENA",
    position: { x: 38, y: 6, w: 24, h: 13 },
  },
  {
    id: "snk-3",
    name: "Snooker Table 3",
    shortName: "S3",
    type: "SNOOKER",
    size: "12ft",
    brand: SNOOKER_BRAND,
    hourlyRate: 320,
    clothType: SNOOKER_CLOTH,
    isActive: true,
    zone: "MAIN_ARENA",
    position: { x: 70, y: 6, w: 24, h: 13 },
  },
  {
    id: "snk-4",
    name: "Snooker Table 4",
    shortName: "S4",
    type: "SNOOKER",
    size: "12ft",
    brand: SNOOKER_BRAND,
    hourlyRate: 300,
    clothType: SNOOKER_CLOTH,
    isActive: true,
    zone: "MAIN_ARENA",
    position: { x: 6, y: 25, w: 24, h: 13 },
  },
  {
    id: "snk-5",
    name: "Snooker Table 5",
    shortName: "S5",
    type: "SNOOKER",
    size: "12ft",
    brand: SNOOKER_BRAND,
    hourlyRate: 300,
    clothType: SNOOKER_CLOTH,
    isActive: true,
    zone: "MAIN_ARENA",
    position: { x: 38, y: 25, w: 24, h: 13 },
  },
  {
    id: "snk-6",
    name: "Snooker Table 6 — Coaching",
    shortName: "S6",
    type: "SNOOKER",
    size: "12ft",
    brand: SNOOKER_BRAND,
    hourlyRate: 300,
    clothType: SNOOKER_CLOTH,
    isActive: true,
    zone: "MAIN_ARENA",
    position: { x: 70, y: 25, w: 24, h: 13 },
  },
  {
    id: "pool-1",
    name: "Pool Table 1",
    shortName: "P1",
    type: "POOL",
    size: "9ft",
    brand: "Rasson Ox",
    hourlyRate: 220,
    clothType: "Simonis 860 High Speed",
    isActive: true,
    zone: "MAIN_ARENA",
    position: { x: 14, y: 45, w: 19, h: 11 },
  },
  {
    id: "pool-2",
    name: "Pool Table 2",
    shortName: "P2",
    type: "POOL",
    size: "9ft",
    brand: "Rasson Ox",
    hourlyRate: 220,
    clothType: "Simonis 860 High Speed",
    isActive: true,
    zone: "MAIN_ARENA",
    position: { x: 40, y: 45, w: 19, h: 11 },
  },
];

/** Non-table rooms drawn on the floor plan. */
export const FLOOR_ZONES = [
  { id: "cafe", label: "Cue & Cup Cafe", x: 66, y: 43, w: 28, h: 7, tone: "gold" as const },
  {
    id: "smoking",
    label: "Glass Smoking Lounge",
    x: 66,
    y: 52,
    w: 28,
    h: 7,
    tone: "muted" as const,
  },
  { id: "proshop", label: "Pro Shop & Lockers", x: 6, y: 58, w: 26, h: 4, tone: "muted" as const },
  { id: "reception", label: "Reception", x: 36, y: 58, w: 22, h: 4, tone: "felt" as const },
];

export const MOCK_BOOKINGS: BookingRecord[] = [
  {
    id: "bk-1",
    tableId: "snk-1",
    dateOffset: 0,
    start: 11 * 60,
    end: 13 * 60,
    customerName: "Arjun Mehta",
    customerPhone: "+91 98200 11223",
    status: "CONFIRMED",
    reference: "MCA-4821",
    verified: true,
    note: "Coaching warm-up",
  },
  {
    id: "bk-2",
    tableId: "snk-1",
    dateOffset: 0,
    start: 18 * 60,
    end: 20 * 60,
    customerName: "Rehan Qureshi",
    customerPhone: "+91 99870 44512",
    status: "CONFIRMED",
    reference: "MCA-4835",
    verified: false,
  },
  {
    id: "bk-3",
    tableId: "snk-2",
    dateOffset: 0,
    start: 14 * 60,
    end: 15 * 60 + 30,
    customerName: "Sneha Iyer",
    customerPhone: "+91 90040 77321",
    status: "HELD",
    reference: "MCA-4840",
    verified: false,
  },
  {
    id: "bk-4",
    tableId: "snk-3",
    dateOffset: 0,
    start: 19 * 60,
    end: 22 * 60,
    customerName: "City League — Frame 3",
    customerPhone: "+91 98111 20394",
    status: "CONFIRMED",
    reference: "MCA-4811",
    verified: true,
    note: "League block",
  },
  {
    id: "bk-5",
    tableId: "pool-1",
    dateOffset: 0,
    start: 16 * 60,
    end: 17 * 60,
    customerName: "Karan Dsouza",
    customerPhone: "+91 97020 88123",
    status: "CONFIRMED",
    reference: "MCA-4844",
    verified: true,
  },
  {
    id: "bk-6",
    tableId: "pool-2",
    dateOffset: 0,
    start: 20 * 60,
    end: 21 * 60 + 30,
    customerName: "Fatima Shaikh",
    customerPhone: "+91 93210 55098",
    status: "HELD",
    reference: "MCA-4849",
    verified: false,
  },
  {
    id: "bk-7",
    tableId: "snk-5",
    dateOffset: 0,
    start: 12 * 60,
    end: 14 * 60,
    customerName: "Vivek Rane",
    customerPhone: "+91 88790 32144",
    status: "CANCELLED",
    reference: "MCA-4802",
    verified: false,
  },
  {
    id: "bk-8",
    tableId: "snk-4",
    dateOffset: 1,
    start: 17 * 60,
    end: 19 * 60,
    customerName: "Anaya Kulkarni",
    customerPhone: "+91 90999 21876",
    status: "CONFIRMED",
    reference: "MCA-4861",
    verified: false,
  },
  {
    id: "bk-9",
    tableId: "snk-6",
    dateOffset: 1,
    start: 10 * 60,
    end: 12 * 60,
    customerName: "Junior Coaching Batch",
    customerPhone: "+91 98111 20394",
    status: "CONFIRMED",
    reference: "MCA-4790",
    verified: true,
    note: "Academy batch",
  },
];

export const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: "tourney-1",
    title: "Masters Cue State Snooker Open",
    gameType: "Snooker (15-Red)",
    date: "Oct 24 - Oct 26, 2026",
    time: "10:00 AM Onwards",
    entryFee: 1500,
    prizePool: 50000,
    totalSpots: 32,
    spotsLeft: 6,
    status: "FILLING_FAST",
  },
  {
    id: "tourney-2",
    title: "Weekend 8-Ball Blitz",
    gameType: "8-Ball Pool",
    date: "Every Saturday",
    time: "04:00 PM Onwards",
    entryFee: 500,
    prizePool: 15000,
    totalSpots: 16,
    spotsLeft: 10,
    status: "OPEN",
  },
  {
    id: "tourney-3",
    title: "Academy Juniors 9-Ball Cup",
    gameType: "9-Ball Pool",
    date: "Nov 08, 2026",
    time: "11:00 AM Onwards",
    entryFee: 300,
    prizePool: 8000,
    totalSpots: 24,
    spotsLeft: 19,
    status: "OPEN",
  },
];

export const MOCK_COACHING: CoachingPackage[] = [
  {
    id: "coach-1",
    title: "Stance & Grip Fundamentals",
    level: "Beginner",
    duration: "5 Sessions (1 Hr Each)",
    price: 3500,
    features: [
      "Bridge hand stabilization",
      "Sighting and alignment correction",
      "Basic cue action rhythm",
      "Includes complimentary table time",
    ],
  },
  {
    id: "coach-2",
    title: "Break Building & Cue Ball Control",
    level: "Intermediate",
    duration: "10 Sessions (1.5 Hrs Each)",
    price: 7500,
    features: [
      "Positional play & spin control",
      "Safety play strategies",
      "Video stance analysis",
      "Personal cue lock allocation during course",
    ],
  },
  {
    id: "coach-3",
    title: "Pro Masterclass & Match Play",
    level: "Advanced",
    duration: "Monthly Subscription",
    price: 12000,
    features: [
      "1-on-1 coaching with State Level Trainer",
      "Tactical frame simulation",
      "Free monthly cue locker rental",
      "Priority tournament seeding",
    ],
  },
];

export const CAFE_MENU: CafeItem[] = [
  { name: "Filter Coffee / Masala Chai", price: 60, note: "Brewed fresh through the night" },
  { name: "Cold Coffee & Shakes", price: 120, note: "Served at the arena rail" },
  { name: "Club Sandwich", price: 150, note: "Veg & chicken options" },
  { name: "Peri Peri Fries", price: 110, note: "Most ordered between frames" },
  { name: "Paneer / Chicken Wrap", price: 180, note: "Quick between-session meal" },
  { name: "Energy Bowls & Salads", price: 190, note: "Light plates for long sessions" },
];
