"use server";

import { prisma } from "@/lib/prisma";

export type BookingInput = {
  tableId: string;
  customerName: string;
  customerPhone: string;
  slotStart: Date | string;
  slotEnd: Date | string;
  status?: "HELD" | "CONFIRMED" | "CANCELLED";
  reference?: string | null;
  note?: string | null;
  verified?: boolean;
};

export async function createBookingAction(input: BookingInput) {
  const table = await prisma.table.findUnique({ where: { id: input.tableId } });

  if (!table) {
    throw new Error("Table not found");
  }

  const booking = await prisma.booking.create({
    data: {
      tableId: input.tableId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      slotStart: new Date(input.slotStart),
      slotEnd: new Date(input.slotEnd),
      status: input.status ?? "HELD",
      reference: input.reference ?? `MCA-${Date.now().toString().slice(-6)}`,
      note: input.note ?? null,
      verified: input.verified ?? false,
    },
  });

  return booking;
}

export async function updateBookingStatusAction(
  bookingId: string,
  status: "HELD" | "CONFIRMED" | "CANCELLED",
) {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { status },
  });
}

export async function cancelBookingAction(bookingId: string) {
  return updateBookingStatusAction(bookingId, "CANCELLED");
}

export async function confirmBookingAction(bookingId: string) {
  return updateBookingStatusAction(bookingId, "CONFIRMED");
}

export async function getBookingByIdAction(bookingId: string) {
  return prisma.booking.findUnique({ where: { id: bookingId } });
}
