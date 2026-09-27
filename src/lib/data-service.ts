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
  const rows = await prisma.session.findMany({
    where: { source: "ONLINE", status: { in: ["HELD", "CONFIRMED"] } },
    orderBy: { startTime: "asc" },
  });

  return rows.map((row) =>
    normalizeBooking(
      {
        id: row.id,
        tableId: row.tableId,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        slotStart: row.startTime,
        slotEnd: row.plannedEnd,
        status: row.status,
        reference: row.refCode,
      } as never,
      0,
    ),
  );
}

export async function countLiveTables() {
  return prisma.table.count();
}

export async function countLiveBookings() {
  return prisma.session.count({
    where: { source: "ONLINE", status: { in: ["HELD", "CONFIRMED"] } },
  });
}
