"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_WALKIN_BLOCK_MINUTES, HOLD_DURATION_MINUTES } from "@/lib/operations-constants";

const ACTIVE_STATUSES = ["HELD", "CONFIRMED", "ONGOING"] as const;

function date(value: Date | string) {
  const result = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(result.getTime())) throw new Error("Invalid date");
  return result;
}

function conflictError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010") ||
    message.includes("23P01") ||
    message.includes("no_overlapping_sessions")
  ) {
    throw new Error("Table is not available for that time");
  }
  throw error;
}

export async function createHoldAction(input: {
  tableId: string;
  startTime: Date | string;
  durationMinutes: number;
}) {
  const startTime = date(input.startTime);
  const plannedEnd = new Date(startTime.getTime() + input.durationMinutes * 60_000);
  try {
    return await prisma.session.create({
      data: {
        tableId: input.tableId,
        source: "ONLINE",
        status: "HELD",
        startTime,
        plannedEnd,
        holdExpiresAt: new Date(Date.now() + HOLD_DURATION_MINUTES * 60_000),
      },
    });
  } catch (error) {
    return conflictError(error);
  }
}

export async function confirmSessionAction(input: {
  sessionId: string;
  customerName: string;
  customerPhone: string;
}) {
  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.trim();
  if (!customerName || !customerPhone) throw new Error("Name and phone are required");

  return prisma.session.update({
    where: { id: input.sessionId, status: "HELD" },
    data: {
      status: "CONFIRMED",
      customerName,
      customerPhone,
      refCode: `MCA-${Date.now().toString().slice(-6)}`,
      holdExpiresAt: null,
    },
  });
}

export async function createOnlineBookingAction(input: {
  tableId: string;
  customerName: string;
  customerPhone: string;
  slotStart: Date | string;
  slotEnd: Date | string;
}) {
  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.trim();
  if (!customerName || !customerPhone) throw new Error("Name and phone are required");

  const startTime = date(input.slotStart);
  const endTime = date(input.slotEnd);
  const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / 60_000);
  if (durationMinutes <= 0) throw new Error("Booking end time must be after start time");

  const hold = await createHoldAction({
    tableId: input.tableId,
    startTime,
    durationMinutes,
  });
  return confirmSessionAction({
    sessionId: hold.id,
    customerName,
    customerPhone,
  });
}

export async function createWalkInSessionAction(input: {
  tableId: string;
  customerName: string;
  playerTwoName?: string | null;
  paymentMethod?: "CASH" | "UPI" | "CARD";
}) {
  const now = new Date();
  const table = await prisma.table.findUnique({ where: { id: input.tableId } });
  if (!table || !table.isActive) throw new Error("Table is not available");

  try {
    return await prisma.session.create({
      data: {
        tableId: input.tableId,
        source: "WALKIN",
        status: "ONGOING",
        startTime: now,
        plannedEnd: new Date(now.getTime() + DEFAULT_WALKIN_BLOCK_MINUTES * 60_000),
        actualStart: now,
        rateSnapshot: table.hourlyRate,
        players: [
          { name: input.customerName.trim() },
          ...(input.playerTwoName?.trim() ? [{ name: input.playerTwoName.trim() }] : []),
        ],
        paymentStatus: input.paymentMethod ? "PAID" : "UNPAID",
      },
    });
  } catch (error) {
    return conflictError(error);
  }
}

export async function updateWalkInSessionAction(input: {
  sessionId: string;
  customerName: string;
  playerTwoName?: string | null;
}) {
  const customerName = input.customerName.trim();
  if (!customerName) throw new Error("Customer name is required");
  return prisma.session.update({
    where: { id: input.sessionId, source: "WALKIN", status: "ONGOING" },
    data: {
      players: [
        { name: customerName },
        ...(input.playerTwoName?.trim() ? [{ name: input.playerTwoName.trim() }] : []),
      ],
    },
  });
}

export async function endSessionAction(input: { sessionId: string; loserName: string }) {
  const loserName = input.loserName.trim();
  if (!loserName) throw new Error("Loser name is required before closing a walk-in");

  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: input.sessionId } });
    if (!session || session.status !== "ONGOING") throw new Error("Session is not active");
    const actualEnd = new Date();
    const actualStart = session.actualStart ?? session.startTime;
    const durationMinutes = Math.max(
      1,
      Math.ceil((actualEnd.getTime() - actualStart.getTime()) / 60_000),
    );
    const amount = Math.round(((session.rateSnapshot ?? 0) / 60) * durationMinutes);
    return tx.session.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        actualEnd,
        plannedEnd: actualEnd,
        durationMinutes,
        amount,
        loserName,
        paymentStatus: "PAID",
      },
    });
  });
}

export async function cancelSessionAction(sessionId: string) {
  return prisma.session.updateMany({
    where: { id: sessionId, status: { in: [...ACTIVE_STATUSES] } },
    data: { status: "CANCELLED" },
  });
}

export async function getOperationsSnapshotAction() {
  return prisma.table.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      sessions: {
        where: { status: { in: [...ACTIVE_STATUSES] } },
        orderBy: { startTime: "asc" },
      },
    },
  });
}
