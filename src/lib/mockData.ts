export interface Table {
  id: string;
  name: string;
  type: "SNOOKER" | "POOL";
  size: string;
  hourlyRate: number;
  clothType: string;
  isActive: boolean;
}

export interface Slot {
  id: string;
  tableId: string;
  startTime: string;
  endTime: string;
  status: "AVAILABLE" | "BOOKED" | "HELD";
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

export const MOCK_TABLES: Table[] = [
  {
    id: "tbl-1",
    name: "Star Match Arena (Table 1)",
    type: "SNOOKER",
    size: "12ft",
    hourlyRate: 350,
    clothType: "Strachan 6811 Gold Tournament",
    isActive: true,
  },
  {
    id: "tbl-2",
    name: "Rasson Professional (Table 2)",
    type: "SNOOKER",
    size: "12ft",
    hourlyRate: 300,
    clothType: "Hainsworth Precision",
    isActive: true,
  },
  {
    id: "tbl-3",
    name: "Club Snooker (Table 3)",
    type: "SNOOKER",
    size: "12ft",
    hourlyRate: 250,
    clothType: "Standard Wool",
    isActive: true,
  },
  {
    id: "tbl-4",
    name: "Brunswick Pool (Table 4)",
    type: "POOL",
    size: "9ft",
    hourlyRate: 200,
    clothType: "Simonis 860 High Speed",
    isActive: true,
  },
  {
    id: "tbl-5",
    name: "Rasson Ox Pool (Table 5)",
    type: "POOL",
    size: "9ft",
    hourlyRate: 200,
    clothType: "Simonis 860 High Speed",
    isActive: true,
  },
];

export const MOCK_SLOTS: Slot[] = [
  { id: "s1", tableId: "tbl-1", startTime: "10:00 AM", endTime: "11:00 AM", status: "AVAILABLE" },
  { id: "s2", tableId: "tbl-1", startTime: "11:00 AM", endTime: "12:00 PM", status: "BOOKED" },
  { id: "s3", tableId: "tbl-1", startTime: "12:00 PM", endTime: "01:00 PM", status: "HELD" },
  { id: "s4", tableId: "tbl-1", startTime: "01:00 PM", endTime: "02:00 PM", status: "AVAILABLE" },
  { id: "s5", tableId: "tbl-1", startTime: "02:00 PM", endTime: "03:00 PM", status: "AVAILABLE" },
  { id: "s6", tableId: "tbl-1", startTime: "03:00 PM", endTime: "04:00 PM", status: "BOOKED" },
  { id: "s7", tableId: "tbl-1", startTime: "04:00 PM", endTime: "05:00 PM", status: "AVAILABLE" },
  { id: "s8", tableId: "tbl-1", startTime: "05:00 PM", endTime: "06:00 PM", status: "AVAILABLE" },
  { id: "s9", tableId: "tbl-1", startTime: "06:00 PM", endTime: "07:00 PM", status: "BOOKED" },
  { id: "s10", tableId: "tbl-1", startTime: "07:00 PM", endTime: "08:00 PM", status: "BOOKED" },
  { id: "s11", tableId: "tbl-1", startTime: "08:00 PM", endTime: "09:00 PM", status: "AVAILABLE" },
  { id: "s12", tableId: "tbl-1", startTime: "09:00 PM", endTime: "10:00 PM", status: "AVAILABLE" },
];

export const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: "tourney-1",
    title: "State Snooker Open Championship",
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
    date: "Next Saturday",
    time: "04:00 PM Onwards",
    entryFee: 500,
    prizePool: 15000,
    totalSpots: 16,
    spotsLeft: 10,
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