const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const baseTables = [
  {
    id: "snk-1",
    name: "Snooker Table 1 — Match Arena",
    shortName: "S1",
    type: "SNOOKER",
    size: "12ft",
    brand: "Rasson Magnum II",
    hourlyRate: 350,
    clothType: "Strachan 6811 Gold Tournament",
    isActive: true,
    zone: "MAIN_ARENA",
    currentStatus: "AVAILABLE",
    position: { x: 6, y: 6, w: 24, h: 13 },
  },
  {
    id: "snk-2",
    name: "Snooker Table 2",
    shortName: "S2",
    type: "SNOOKER",
    size: "12ft",
    brand: "Rasson Magnum II",
    hourlyRate: 320,
    clothType: "Strachan 6811 Gold Tournament",
    isActive: true,
    zone: "MAIN_ARENA",
    currentStatus: "AVAILABLE",
    position: { x: 38, y: 6, w: 24, h: 13 },
  },
  {
    id: "snk-3",
    name: "Snooker Table 3",
    shortName: "S3",
    type: "SNOOKER",
    size: "12ft",
    brand: "Rasson Magnum II",
    hourlyRate: 320,
    clothType: "Strachan 6811 Gold Tournament",
    isActive: true,
    zone: "MAIN_ARENA",
    currentStatus: "AVAILABLE",
    position: { x: 70, y: 6, w: 24, h: 13 },
  },
  {
    id: "snk-4",
    name: "Snooker Table 4",
    shortName: "S4",
    type: "SNOOKER",
    size: "12ft",
    brand: "Rasson Magnum II",
    hourlyRate: 300,
    clothType: "Strachan 6811 Gold Tournament",
    isActive: true,
    zone: "MAIN_ARENA",
    currentStatus: "AVAILABLE",
    position: { x: 6, y: 25, w: 24, h: 13 },
  },
  {
    id: "snk-5",
    name: "Snooker Table 5",
    shortName: "S5",
    type: "SNOOKER",
    size: "12ft",
    brand: "Rasson Magnum II",
    hourlyRate: 300,
    clothType: "Strachan 6811 Gold Tournament",
    isActive: true,
    zone: "MAIN_ARENA",
    currentStatus: "AVAILABLE",
    position: { x: 38, y: 25, w: 24, h: 13 },
  },
  {
    id: "snk-6",
    name: "Snooker Table 6 — Coaching",
    shortName: "S6",
    type: "SNOOKER",
    size: "12ft",
    brand: "Rasson Magnum II",
    hourlyRate: 300,
    clothType: "Strachan 6811 Gold Tournament",
    isActive: true,
    zone: "MAIN_ARENA",
    currentStatus: "AVAILABLE",
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
    currentStatus: "AVAILABLE",
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
    currentStatus: "AVAILABLE",
    position: { x: 40, y: 45, w: 19, h: 11 },
  },
];

function dateFromToday(offsetDays, hour, minute) {
  const base = new Date();
  base.setHours(hour, minute, 0, 0);
  base.setDate(base.getDate() + offsetDays);
  return base;
}

const baseBookings = [
  {
    id: "bk-1",
    tableId: "snk-1",
    customerName: "Arjun Mehta",
    customerPhone: "+91 98200 11223",
    slotStart: dateFromToday(0, 11, 0),
    slotEnd: dateFromToday(0, 13, 0),
    status: "CONFIRMED",
    reference: "MCA-4821",
    verified: true,
    note: "Coaching warm-up",
  },
  {
    id: "bk-2",
    tableId: "snk-1",
    customerName: "Rehan Qureshi",
    customerPhone: "+91 99870 44512",
    slotStart: dateFromToday(0, 18, 0),
    slotEnd: dateFromToday(0, 20, 0),
    status: "CONFIRMED",
    reference: "MCA-4835",
    verified: false,
    note: null,
  },
  {
    id: "bk-3",
    tableId: "snk-2",
    customerName: "Sneha Iyer",
    customerPhone: "+91 90040 77321",
    slotStart: dateFromToday(0, 14, 0),
    slotEnd: dateFromToday(0, 15, 30),
    status: "HELD",
    reference: "MCA-4840",
    verified: false,
    note: null,
  },
  {
    id: "bk-4",
    tableId: "snk-3",
    customerName: "City League — Frame 3",
    customerPhone: "+91 98111 20394",
    slotStart: dateFromToday(0, 19, 0),
    slotEnd: dateFromToday(0, 22, 0),
    status: "CONFIRMED",
    reference: "MCA-4811",
    verified: true,
    note: "League block",
  },
  {
    id: "bk-5",
    tableId: "pool-1",
    customerName: "Karan Dsouza",
    customerPhone: "+91 97020 88123",
    slotStart: dateFromToday(0, 16, 0),
    slotEnd: dateFromToday(0, 17, 0),
    status: "CONFIRMED",
    reference: "MCA-4844",
    verified: true,
    note: null,
  },
  {
    id: "bk-6",
    tableId: "pool-2",
    customerName: "Nikhil Shah",
    customerPhone: "+91 97654 12987",
    slotStart: dateFromToday(0, 18, 30),
    slotEnd: dateFromToday(0, 20, 30),
    status: "HELD",
    reference: "MCA-4839",
    verified: false,
    note: "Walk-in request",
  },
];

async function main() {
  const tablePromises = baseTables.map((table) =>
    prisma.table.upsert({
      where: { id: table.id },
      update: table,
      create: table,
    }),
  );

  await Promise.all(tablePromises);

  const bookingPromises = baseBookings.map((booking) =>
    prisma.booking.upsert({
      where: { id: booking.id },
      update: {
        ...booking,
        slotStart: booking.slotStart,
        slotEnd: booking.slotEnd,
      },
      create: {
        ...booking,
        slotStart: booking.slotStart,
        slotEnd: booking.slotEnd,
      },
    }),
  );

  await Promise.all(bookingPromises);

  const tableCount = await prisma.table.count();
  const bookingCount = await prisma.booking.count();
  console.log(`Seeded ${tableCount} tables and ${bookingCount} bookings.`);
}

main()
  .catch((error) => {
    console.error("Database seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
