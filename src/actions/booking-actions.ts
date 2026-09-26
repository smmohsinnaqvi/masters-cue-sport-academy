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
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { source: true, status: true },
  });
  if (!session || session.source !== "ONLINE") {
    throw new Error("Online booking not found");
  }

  const allowed =
    (session.status === "HELD" && (status === "CONFIRMED" || status === "CANCELLED")) ||
    (session.status === "CONFIRMED" && (status === "CANCELLED" || status === "NO_SHOW"));
  if (!allowed) {
    throw new Error(`Cannot change booking from ${session.status} to ${status}`);
  }

  const result = await prisma.session.updateMany({
    where: {
      id: sessionId,
      source: "ONLINE",
      ...(status === "CONFIRMED"
        ? { status: "HELD", holdExpiresAt: { gt: new Date() } }
        : status === "NO_SHOW"
          ? { status: "CONFIRMED" }
          : {
              OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: new Date() } }],
            }),
    },
    data: { status },
  });
  if (result.count !== 1) throw new Error("Booking changed before this action completed");
  return prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
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
