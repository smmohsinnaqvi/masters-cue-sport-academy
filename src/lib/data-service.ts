import { prisma } from "@/lib/prisma";
import {
  normalizeBooking,
  normalizeTable,
  type CompatibleBooking,
  type CompatibleTable,
} from "@/lib/real-data";

export async function getLiveTables(): Promise<CompatibleTable[]> {
  const rows = await prisma.table.findMany({ orderBy: { name: "asc" } });

  return rows.map((row) => normalizeTable(row as never));
}

export async function getLiveBookings(): Promise<CompatibleBooking[]> {
  const rows = await prisma.booking.findMany({
    orderBy: { slotStart: "asc" },
  });

  return rows.map((row) => normalizeBooking(row as never, 0));
}

export async function countLiveTables() {
  return prisma.table.count();
}

export async function countLiveBookings() {
  return prisma.booking.count();
}
