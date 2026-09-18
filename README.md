# Cue Master Bookings

Project Context & Objective Build a mobile-first, full-stack web application for a premium Snooker & Pool Academy. The platform serves as a local SEO landing page, a facility showcase, and a real-time, race-condition-free table booking engine.

Tech Stack Constraints

Framework: Next.js (App Router)

Styling: Tailwind CSS

UI Components: shadcn/ui (use drawers, dialogs, cards, date-pickers) and lucide-react for icons.

Database & Auth: Supabase (PostgreSQL)

State/API: Next.js Server Actions for data mutation.

Design System & UI/UX

Theme: Dark-mode first. Midnight slate backgrounds, subtle neon accents, and deep felt-green highlights.

Mobile-First Ergonomics:

Minimum 48x48px touch targets for all interactive elements.

Use horizontal swipeable carousels for dates/times instead of dense grids.

Use a Bottom Drawer (Slide-up) for the checkout form to maintain context.

Typography: Clean sans-serif, high contrast for readability.

Database Schema & Logic (Supabase) Assume the following PostgreSQL schema and RPC function are deployed:

tables: id (uuid), name (string), type (SNOOKER, POOL), size (string), hourly_rate (numeric), is_active (boolean).

bookings: id (uuid), table_id (fk), customer_name (string), customer_phone (string), slot_start (timestamptz), slot_end (timestamptz), status (HELD, CONFIRMED, CANCELLED), locked_until (timestamptz).

Concurrency Logic: The system uses an atomic RPC function reserve_table_slot that places a 5-minute HELD lock on a table. If abandoned, the lock expires. No two users can book the same slot.

Core Pages & Features to Generate

1. Public Landing Page (/)

Hero Section: High-impact headline, glowing "Live Tables Available" badge, and a CTA to "Book a Slot".

Booking Widget (The Engine):

Step 1: Select Table Type (9ft Pool vs 12ft Snooker).

Step 2: Horizontal scroll of dates.

Step 3: Hourly slot chips (Green = Available, Red = Booked, Yellow = Locked).

Step 4: Tapping an available slot opens a bottom drawer.

Step 5: Checkout Form requires ONLY Name and Phone Number (use <input type="tel">).

Facilities & Amenities Showcase:

Academy & Coaching: Cards for training packages (Beginner to Pro).

In-House Cafe: Visual menu section.

Pro Shop & Lockers: Sell cues/accessories and rent monthly trainer lockers.

Zoning Policy: Explicitly state the Main Arena is strictly No Smoking, but highlight the separate "Cozy Glass-Enclosed Smoking Lounge".

Tournaments Board: Upcoming events with entry fees, prize pools, and countdowns.

Location: Embedded Google Map with a native "Get Directions" deep-link button.

2. Admin Dashboard (/admin)

Queue View: A simple table showing today's bookings (Customer, Phone, Table, Time, Status).

Manual Override: A tool to select specific tables and bulk-block time slots for maintenance or multi-day tournaments.

Business Rules to Implement in Code

10-Minute Buffer: When displaying available slots, automatically account for a 10-minute maintenance buffer after a booked slot (for cloth brushing/racking).

Frictionless UX: Do not force users to create an account or use passwords to book.

UPI Placeholder: On the booking success screen, place a mock button for "Pay via UPI (PhonePe/GPay)" that will act as a placeholder for Phase 2 deep-linking.

First Task: Generate the global layout, the dark-mode Tailwind configuration, and the Hero Section + Booking Widget UI on the main page. Use mock data for the tables and slots for now.

// mockData.ts

export interface Table {

id: string;

name: string;

type: 'SNOOKER' | 'POOL';

size: string;

hourlyRate: number;

clothType: string;

isActive: boolean;

}

export interface Slot {

id: string;

tableId: string;

startTime: string; // e.g. "10:00 AM"

endTime: string; // e.g. "11:00 AM"

status: 'AVAILABLE' | 'BOOKED' | 'HELD';

}

export interface Tournament {

id: string;

title: string;

gameType: 'Snooker (15-Red)' | '8-Ball Pool' | '9-Ball Pool';

date: string;

time: string;

entryFee: number;

prizePool: number;

totalSpots: number;

spotsLeft: number;

status: 'OPEN' | 'FILLING_FAST' | 'CLOSED';

}

export interface CoachingPackage {

id: string;

title: string;

level: 'Beginner' | 'Intermediate' | 'Advanced';

duration: string;

price: number;

features: string[];

}

// ---------------------------------------------------------------------------

// MOCK DATA EXPORTS

// ---------------------------------------------------------------------------

export const MOCK_TABLES: Table[] = [

{

    id: 'tbl-1',

    name: 'Star Match Arena (Table 1)',

    type: 'SNOOKER',

    size: '12ft',

    hourlyRate: 350,

    clothType: 'Strachan 6811 Gold Tournament',

    isActive: true,

},

{

    id: 'tbl-2',

    name: 'Rasson Professional (Table 2)',

    type: 'SNOOKER',

    size: '12ft',

    hourlyRate: 300,

    clothType: ' Hainsworth Precision',

    isActive: true,

},

{

    id: 'tbl-3',

    name: 'Club Snooker (Table 3)',

    type: 'SNOOKER',

    size: '12ft',

    hourlyRate: 250,

    clothType: 'Standard Wool',

    isActive: true,

},

{

    id: 'tbl-4',

    name: 'Brunswick Pool (Table 4)',

    type: 'POOL',

    size: '9ft',

    hourlyRate: 200,

    clothType: 'Simonis 860 High Speed',

    isActive: true,

},

{

    id: 'tbl-5',

    name: 'Rasson Ox Pool (Table 5)',

    type: 'POOL',

    size: '9ft',

    hourlyRate: 200,

    clothType: 'Simonis 860 High Speed',

    isActive: true,

},

];

export const MOCK_SLOTS: Slot[] = [

{ id: 's1', tableId: 'tbl-1', startTime: '10:00 AM', endTime: '11:00 AM', status: 'AVAILABLE' },

{ id: 's2', tableId: 'tbl-1', startTime: '11:00 AM', endTime: '12:00 PM', status: 'BOOKED' },

{ id: 's3', tableId: 'tbl-1', startTime: '12:00 PM', endTime: '01:00 PM', status: 'HELD' },

{ id: 's4', tableId: 'tbl-1', startTime: '01:00 PM', endTime: '02:00 PM', status: 'AVAILABLE' },

{ id: 's5', tableId: 'tbl-1', startTime: '02:00 PM', endTime: '03:00 PM', status: 'AVAILABLE' },

{ id: 's6', tableId: 'tbl-1', startTime: '03:00 PM', endTime: '04:00 PM', status: 'BOOKED' },

{ id: 's7', tableId: 'tbl-1', startTime: '04:00 PM', endTime: '05:00 PM', status: 'AVAILABLE' },

{ id: 's8', tableId: 'tbl-1', startTime: '05:00 PM', endTime: '06:00 PM', status: 'AVAILABLE' },

{ id: 's9', tableId: 'tbl-1', startTime: '06:00 PM', endTime: '07:00 PM', status: 'BOOKED' },

{ id: 's10', tableId: 'tbl-1', startTime: '07:00 PM', endTime: '08:00 PM', status: 'BOOKED' },

{ id: 's11', tableId: 'tbl-1', startTime: '08:00 PM', endTime: '09:00 PM', status: 'AVAILABLE' },

{ id: 's12', tableId: 'tbl-1', startTime: '09:00 PM', endTime: '10:00 PM', status: 'AVAILABLE' },

];

export const MOCK_TOURNAMENTS: Tournament[] = [

{

    id: 'tourney-1',

    title: 'State Snooker Open Championship',

    gameType: 'Snooker (15-Red)',

    date: 'Oct 24 - Oct 26, 2026',

    time: '10:00 AM Onwards',

    entryFee: 1500,

    prizePool: 50000,

    totalSpots: 32,

    spotsLeft: 6,

    status: 'FILLING_FAST',

},

{

    id: 'tourney-2',

    title: 'Weekend 8-Ball Blitz',

    gameType: '8-Ball Pool',

    date: 'Next Saturday',

    time: '04:00 PM Onwards',

    entryFee: 500,

    prizePool: 15000,

    totalSpots: 16,

    spotsLeft: 10,

    status: 'OPEN',

},

];

export const MOCK_COACHING: CoachingPackage[] = [

{

    id: 'coach-1',

    title: 'Stance & Grip Fundamentals',

    level: 'Beginner',

    duration: '5 Sessions (1 Hr Each)',

    price: 3500,

    features: [

      'Bridge hand stabilization',

      'Sighting and alignment correction',

      'Basic cue action rhythm',

      'Includes complimentary table time',

    ],

},

{

    id: 'coach-2',

    title: 'Break Building & Cue Ball Control',

    level: 'Intermediate',

    duration: '10 Sessions (1.5 Hrs Each)',

    price: 7500,

    features: [

      'Positional play & spin control',

      'Safety play strategies',

      'Video stance analysis',

      'Personal cue lock allocation during course',

    ],

},

{

    id: 'coach-3',

    title: 'Pro Masterclass & Match Play',

    level: 'Advanced',

    duration: 'Monthly Subscription',

    price: 12000,

    features: [

      '1-on-1 coaching with State Level Trainer',

      'Tactical frame simulation',

      'Free monthly cue locker rental',

      'Priority tournament seeding',

    ],

},

];

-- ============================================================================

-- DATABASE SEED SCRIPT FOR SUPABASE

-- Run this directly in the Supabase SQL Editor after running the initial migration.

-- ============================================================================

-- 1. SEED TABLES (Physical Snooker & Pool Tables)

INSERT INTO public.tables (id, name, type, size, hourly_rate, is_active) VALUES

('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Star Match Arena (Table 1)', 'SNOOKER', '12ft', 350.00, TRUE),

('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Rasson Professional (Table 2)', 'SNOOKER', '12ft', 300.00, TRUE),

('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Club Snooker (Table 3)', 'SNOOKER', '12ft', 250.00, TRUE),

('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Brunswick Pool (Table 4)', 'POOL', '9ft', 200.00, TRUE),

('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Rasson Ox Pool (Table 5)', 'POOL', '9ft', 200.00, TRUE)

ON CONFLICT (id) DO NOTHING;

-- 2. SEED SAMPLE BOOKINGS & HOLDS FOR TODAY

-- Uses dynamic date calculations so seeds remain realistic relative to today's date.

INSERT INTO public.bookings (table_id, customer_name, customer_phone, slot_start, slot_end, status, locked_until) VALUES

-- Table 1: Confirmed Slot (11:00 AM - 12:00 PM)

(

    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',

    'Rohan Sharma',

    '+919876543210',

    CURRENT_DATE + INTERVAL '11 hours',

    CURRENT_DATE + INTERVAL '12 hours',

    'CONFIRMED',

    NULL

),

-- Table 1: Temporary Held Slot (12:00 PM - 01:00 PM)

(

    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',

    'Vikram Patel',

    '+919812345678',

    CURRENT_DATE + INTERVAL '12 hours',

    CURRENT_DATE + INTERVAL '13 hours',

    'HELD',

    NOW() + INTERVAL '5 minutes'

),

-- Table 1: Confirmed Evening Slot (06:00 PM - 08:00 PM)

(

    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',

    'Amit Verma',

    '+919988776655',

    CURRENT_DATE + INTERVAL '18 hours',

    CURRENT_DATE + INTERVAL '20 hours',

    'CONFIRMED',

    NULL

);

-- 3. OPTIONAL SCHEMA & SEED FOR TOURNAMENTS

CREATE TABLE IF NOT EXISTS public.tournaments (

    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    title VARCHAR(150) NOT NULL,

    game_type VARCHAR(50) NOT NULL,

    event_date VARCHAR(100) NOT NULL,

    start_time VARCHAR(50) NOT NULL,

    entry_fee NUMERIC(10, 2) NOT NULL,

    prize_pool NUMERIC(10, 2) NOT NULL,

    total_spots INT NOT NULL,

    spots_left INT NOT NULL,

    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FILLING_FAST', 'CLOSED')),

    created_at TIMESTAMPTZ DEFAULT NOW()

);

INSERT INTO public.tournaments (title, game_type, event_date, start_time, entry_fee, prize_pool, total_spots, spots_left, status) VALUES

('State Snooker Open Championship', 'Snooker (15-Red)', 'Oct 24 - Oct 26, 2026', '10:00 AM Onwards', 1500.00, 50000.00, 32, 6, 'FILLING_FAST'),

('Weekend 8-Ball Blitz', '8-Ball Pool', 'Next Saturday', '04:00 PM Onwards', 500.00, 15000.00, 16, 10, 'OPEN');

-- 4. OPTIONAL SCHEMA & SEED FOR COACHING PACKAGES

CREATE TABLE IF NOT EXISTS public.coaching_packages (

    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    title VARCHAR(150) NOT NULL,

    level VARCHAR(20) NOT NULL CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),

    duration VARCHAR(50) NOT NULL,

    price NUMERIC(10, 2) NOT NULL,

    features TEXT[] NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

INSERT INTO public.coaching_packages (title, level, duration, price, features) VALUES

(

    'Stance & Grip Fundamentals',

    'Beginner',

    '5 Sessions (1 Hr Each)',

    3500.00,

    ARRAY['Bridge hand stabilization', 'Sighting and alignment correction', 'Basic cue action rhythm', 'Includes complimentary table time']

),

(

    'Break Building & Cue Ball Control',

    'Intermediate',

    '10 Sessions (1.5 Hrs Each)',

    7500.00,

    ARRAY['Positional play & spin control', 'Safety play strategies', 'Video stance analysis', 'Personal cue lock allocation during course']

),

(

    'Pro Masterclass & Match Play',

    'Advanced',

    'Monthly Subscription',

    12000.00,

    ARRAY['1-on-1 coaching with State Level Trainer', 'Tactical frame simulation', 'Free monthly cue locker rental', 'Priority tournament seeding']

);

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e1af0f0f-6dc6-47d4-8d60-96ecd8629c84).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
