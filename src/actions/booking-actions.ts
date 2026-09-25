"use server";

import { prisma } from "@/lib/prisma";
import { confirmSessionAction, createHoldAction } from "@/actions/operations-actions";

export type BookingInput = {
  tableId: string;
  customerName: string;
  customerPhone: string;
  slotStart: Date | string;
  slotEnd: Date | string;
};

export async function createBookingAction(input: BookingInput) {
  const start = new Date(input.slotStart);
  const end = new Date(input.slotEnd);
  const hold = await createHoldAction({
    tableId: input.tableId,
    startTime: start,
    durationMinutes: Math.ceil((end.getTime() - start.getTime()) / 60_000),
  });
  return confirmSessionAction({
    sessionId: hold.id,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
  });
}

export async function updateBookingStatusAction(
  sessionId: string,
  status: "CONFIRMED" | "CANCELLED" | "NO_SHOW",
) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { status },
  });
}

export async function cancelBookingAction(sessionId: string) {
  return updateBookingStatusAction(sessionId, "CANCELLED");
}

export async function confirmBookingAction(sessionId: string) {
  return updateBookingStatusAction(sessionId, "CONFIRMED");
}

export async function getBookingByIdAction(sessionId: string) {
  return prisma.session.findUnique({ where: { id: sessionId } });
}
