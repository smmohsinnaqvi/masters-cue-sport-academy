"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_WALKIN_BLOCK_MINUTES,
  ONLINE_REQUEST_EXPIRY_MINUTES,
} from "@/lib/operations-constants";
import { academyDateKey, academyDateTimeToUtc, academyMinutesOfDay } from "@/lib/academy-time";
import { reconcileSessionLifecycle } from "@/lib/session-reconciliation";
import { requireAcademyRole } from "@/lib/supabase-auth-server";

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
  const durationMilliseconds = endTime.getTime() - startTime.getTime();
  if (durationMilliseconds <= 0 || durationMilliseconds % 60_000 !== 0) {
    throw new Error("Booking end time must be after start time on a whole-minute boundary");
  }
  const durationMinutes = durationMilliseconds / 60_000;
  const startMinute = academyMinutesOfDay(startTime);
  const endMinute = academyMinutesOfDay(endTime);
  if (
    durationMinutes < 60 ||
    durationMinutes % 15 !== 0 ||
    startMinute % 15 !== 0 ||
    startTime.getSeconds() !== 0 ||
    startTime.getMilliseconds() !== 0
  ) {
    throw new Error("Bookings must be at least 1 hour and use 15-minute start and duration steps");
  }
  if (
    startTime <= new Date() ||
    startMinute < 10 * 60 ||
    endMinute > 23 * 60 ||
    academyDateKey(startTime) !== academyDateKey(endTime)
  ) {
    throw new Error("Choose a future time within academy hours (10:00 AM–11:00 PM)");
  }
  const table = await prisma.table.findUnique({
    where: { id: input.tableId },
    select: { isActive: true, hourlyRate: true },
  });
  if (!table?.isActive) throw new Error("Table is not available");
  const amount = Math.round((table.hourlyRate * durationMinutes) / 60);

  try {
    await reconcileSessionLifecycle();
    return await prisma.session.create({
      data: {
        tableId: input.tableId,
        source: "ONLINE",
        status: "HELD",
        startTime,
        plannedEnd: endTime,
        customerName,
        customerPhone,
        refCode: `MCA-${Date.now().toString().slice(-6)}`,
        holdExpiresAt: new Date(Date.now() + ONLINE_REQUEST_EXPIRY_MINUTES * 60_000),
        durationMinutes,
        rateSnapshot: table.hourlyRate,
        amount,
        paymentStatus: "UNPAID",
      },
    });
  } catch (error) {
    return conflictError(error);
  }
}

export async function createWalkInSessionAction(input: {
  tableId: string;
  customerName: string;
  playerTwoName?: string | null;
}) {
  await requireAcademyRole("supervisor");
  const customerName = input.customerName.trim();
  if (!customerName) throw new Error("Customer name is required");
  const now = new Date();
  const table = await prisma.table.findUnique({ where: { id: input.tableId } });
  if (!table || !table.isActive) throw new Error("Table is not available");

  try {
    const closingTime = academyDateTimeToUtc(academyDateKey(now), "23:00");
    const initialEnd = new Date(now.getTime() + DEFAULT_WALKIN_BLOCK_MINUTES * 60_000);
    const nextBooking = await prisma.session.findFirst({
      where: {
        tableId: input.tableId,
        source: "ONLINE",
        status: { in: ["HELD", "CONFIRMED"] },
        startTime: { gt: now },
        OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: now } }],
      },
      orderBy: { startTime: "asc" },
      select: { startTime: true },
    });
    const plannedEnd = nextBooking
      ? new Date(
          Math.min(initialEnd.getTime(), closingTime.getTime(), nextBooking.startTime.getTime()),
        )
      : new Date(Math.min(initialEnd.getTime(), closingTime.getTime()));
    if (plannedEnd <= now) throw new Error("The academy is closed for walk-ins");

    return await prisma.session.create({
      data: {
        tableId: input.tableId,
        source: "WALKIN",
        status: "ONGOING",
        startTime: now,
        plannedEnd,
        actualStart: now,
        rateSnapshot: table.hourlyRate,
        players: [
          { name: customerName },
          ...(input.playerTwoName?.trim() ? [{ name: input.playerTwoName.trim() }] : []),
        ],
        paymentStatus: "UNPAID",
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
  await requireAcademyRole("supervisor");
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

export async function endSessionAction(input: {
  sessionId: string;
  loserName: string;
  paymentMethod: "CASH" | "UPI" | "CARD";
}) {
  await requireAcademyRole("supervisor");
  const loserName = input.loserName.trim();
  if (!loserName) throw new Error("Loser name is required before closing a walk-in");

  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: input.sessionId } });
    if (!session || session.source !== "WALKIN" || session.status !== "ONGOING") {
      throw new Error("Walk-in session is not active");
    }
    const actualEnd = new Date();
    const actualStart = session.actualStart ?? session.startTime;
    const durationMinutes = Math.max(
      1,
      Math.ceil((actualEnd.getTime() - actualStart.getTime()) / 60_000),
    );
    const amount = Math.round(((session.rateSnapshot ?? 0) / 60) * durationMinutes);
    const result = await tx.session.updateMany({
      where: { id: session.id, status: "ONGOING" },
      data: {
        status: "COMPLETED",
        actualEnd,
        plannedEnd: actualEnd,
        durationMinutes,
        amount,
        loserName,
        paymentStatus: input.paymentMethod,
      },
    });
    if (result.count !== 1) throw new Error("Session was already closed");
    return tx.session.findUniqueOrThrow({ where: { id: session.id } });
  });
}

export async function endOnlineBookingAction(sessionId: string) {
  await requireAcademyRole("supervisor");
  const actualEnd = new Date();
  const result = await prisma.session.updateMany({
    where: { id: sessionId, source: "ONLINE", status: "ONGOING" },
    data: {
      status: "COMPLETED",
      actualEnd,
      plannedEnd: actualEnd,
    },
  });
  if (result.count !== 1) throw new Error("Online booking is not active");
  return prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
}

export async function cancelSessionAction(sessionId: string) {
  await requireAcademyRole("supervisor");
  const now = new Date();
  const result = await prisma.session.updateMany({
    where: {
      id: sessionId,
      source: "ONLINE",
      OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: now } }],
    },
    data: { status: "CANCELLED" },
  });
  if (result.count !== 1) {
    throw new Error("Only a current or confirmed online booking can be cancelled");
  }
}

export async function getOperationsSnapshotAction() {
  await requireAcademyRole("supervisor");
  await reconcileSessionLifecycle();
  return prisma.table.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      sessions: {
        where: { status: { in: [...ACTIVE_STATUSES] } },
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          tableId: true,
          source: true,
          status: true,
        },
      },
    },
  });
}
