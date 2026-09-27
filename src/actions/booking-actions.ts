"use server";

import { prisma } from "@/lib/prisma";
import { createOnlineBookingAction } from "@/actions/operations-actions";
import { requireAcademyRole } from "@/lib/supabase-auth-server";

export type BookingInput = {
  tableId: string;
  customerName: string;
  customerPhone: string;
  slotStart: Date | string;
  slotEnd: Date | string;
};

export async function createBookingAction(input: BookingInput) {
  return createOnlineBookingAction(input);
}

export async function updateBookingStatusAction(
  sessionId: string,
  status: "CONFIRMED" | "CANCELLED" | "NO_SHOW",
) {
  await requireAcademyRole("supervisor");
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      source: true,
      status: true,
      startTime: true,
      plannedEnd: true,
      durationMinutes: true,
      rateSnapshot: true,
      amount: true,
      table: { select: { hourlyRate: true } },
    },
  });
  if (!session || session.source !== "ONLINE") {
    throw new Error("Online booking not found");
  }

  const allowed =
    (session.status === "HELD" && (status === "CONFIRMED" || status === "CANCELLED")) ||
    (session.status === "CONFIRMED" && (status === "CANCELLED" || status === "NO_SHOW")) ||
    (session.status === "ONGOING" && status === "NO_SHOW");
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
          ? { status: { in: ["CONFIRMED", "ONGOING"] } }
          : {
              OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: new Date() } }],
            }),
    },
    data: {
      status,
      ...(status === "CONFIRMED"
        ? {
            holdExpiresAt: null,
            rateSnapshot: session.rateSnapshot ?? session.table.hourlyRate,
            amount:
              session.amount ??
              Math.round(
                (session.table.hourlyRate *
                  (session.durationMinutes ??
                    Math.ceil(
                      (session.plannedEnd.getTime() - session.startTime.getTime()) / 60_000,
                    ))) /
                  60,
              ),
          }
        : {}),
    },
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
  await requireAcademyRole("supervisor");
  return prisma.session.findUnique({ where: { id: sessionId } });
}

export async function recordOnlinePaymentAction(
  sessionId: string,
  paymentMethod: "CASH" | "UPI" | "CARD",
) {
  await requireAcademyRole("supervisor");
  const result = await prisma.session.updateMany({
    where: {
      id: sessionId,
      source: "ONLINE",
      status: { in: ["CONFIRMED", "ONGOING", "COMPLETED"] },
      paymentStatus: "UNPAID",
      amount: { not: null },
    },
    data: { paymentStatus: paymentMethod },
  });
  if (result.count !== 1)
    throw new Error("This booking cannot accept payment in its current state");
  return prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
}
