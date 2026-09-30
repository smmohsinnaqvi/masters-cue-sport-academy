"use server";

import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ONLINE_REQUEST_EXPIRY_MINUTES,
  WALKIN_BLOCK_OPTIONS,
  WALKIN_EXTEND_INCREMENT_MINUTES,
} from "@/lib/operations-constants";
import { academyDateKey, academyDateTimeToUtc, academyMinutesOfDay } from "@/lib/academy-time";
import { reconcileSessionLifecycle } from "@/lib/session-reconciliation";
import { sessionCharge, sessionDurationMinutes } from "@/lib/session-pricing";
import {
  getWalkInAvailableMinutes,
  getWalkInBlockEnd,
  getWalkInCutoff,
  getWalkInExtensionEnd,
} from "@/lib/walk-in-blocks";
import { requireAcademyRole } from "@/lib/supabase-auth-server";

const ACTIVE_STATUSES = ["HELD", "CONFIRMED", "ONGOING"] as const;

function requiredName(value: unknown, label: string) {
  if (typeof value !== "string") throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > 120) throw new Error(`${label} must be 120 characters or fewer`);
  return normalized;
}

function optionalName(value: unknown, label: string) {
  if (value == null) return null;
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > 120) throw new Error(`${label} must be 120 characters or fewer`);
  return normalized;
}

function isPaymentMethod(value: unknown): value is "CASH" | "UPI" | "CARD" {
  return Object.values(PaymentMethod).some((method) => method === value);
}

function date(value: Date | string) {
  const result = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(result.getTime())) throw new Error("Invalid date");
  return result;
}

function conflictError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010") ||
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") ||
    message.includes("23P01") ||
    message.includes("no_overlapping_sessions")
  ) {
    throw new Error("Table is no longer available for that time");
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
  customerPhone?: string | null;
  durationMinutes: number;
}) {
  await requireAcademyRole("supervisor");
  if (!input || typeof input !== "object") throw new Error("Walk-in details are required");
  const customerName = requiredName(input.customerName, "Customer name");
  const tableId = requiredName(input.tableId, "Table");
  const customerPhone = optionalName(input.customerPhone, "Phone number");
  if (!WALKIN_BLOCK_OPTIONS.some((duration) => duration === input.durationMinutes)) {
    throw new Error("Choose a valid walk-in block");
  }
  const now = new Date();
  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table || !table.isActive) throw new Error("Table is not available");

  try {
    return await prisma.$transaction(
      async (tx) => {
        const activeSession = await tx.session.findFirst({
          where: {
            tableId,
            OR: [
              { status: "ONGOING" },
              {
                source: "ONLINE",
                status: { in: ["HELD", "CONFIRMED"] },
                startTime: { lte: now },
                plannedEnd: { gt: now },
                OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: now } }],
              },
            ],
          },
          select: { id: true },
        });
        if (activeSession) throw new Error("This table is already in use or reserved");

        const closingTime = academyDateTimeToUtc(academyDateKey(now), "23:00");
        if (now >= closingTime) throw new Error("The academy is closed for walk-ins");
        const nextBooking = await tx.session.findFirst({
          where: {
            tableId,
            source: "ONLINE",
            status: { in: ["HELD", "CONFIRMED"] },
            startTime: { gt: now },
            OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: now } }],
          },
          orderBy: { startTime: "asc" },
          select: { startTime: true },
        });
        const cutoff = getWalkInCutoff(closingTime, nextBooking?.startTime ?? null);
        if (getWalkInAvailableMinutes(now, cutoff) < WALKIN_BLOCK_OPTIONS[0]) {
          throw new Error(
            "There is not enough time for a one-hour walk-in before the next booking or closing",
          );
        }
        const plannedEnd = getWalkInBlockEnd(now, input.durationMinutes, cutoff);

        return tx.session.create({
          data: {
            tableId,
            source: "WALKIN",
            status: "ONGOING",
            startTime: now,
            plannedEnd,
            actualStart: now,
            rateSnapshot: table.hourlyRate,
            customerName,
            customerPhone,
            players: [{ name: customerName }],
            paymentStatus: "UNPAID",
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    return conflictError(error);
  }
}

export async function extendWalkInSessionAction(sessionId: string) {
  await requireAcademyRole("supervisor");
  const id = requiredName(sessionId, "Session");
  const now = new Date();
  const session = await prisma.session.findFirst({
    where: { id, source: "WALKIN", status: "ONGOING" },
    select: { tableId: true, plannedEnd: true },
  });
  if (!session) throw new Error("Walk-in session is no longer active");

  const closingTime = academyDateTimeToUtc(academyDateKey(now), "23:00");
  const nextBooking = await prisma.session.findFirst({
    where: {
      tableId: session.tableId,
      source: "ONLINE",
      status: { in: ["HELD", "CONFIRMED"] },
      startTime: { gte: session.plannedEnd },
      plannedEnd: { gt: now },
      OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: now } }],
    },
    orderBy: { startTime: "asc" },
    select: { startTime: true },
  });
  const cutoff = getWalkInCutoff(closingTime, nextBooking?.startTime ?? null);
  const plannedEnd = getWalkInExtensionEnd(
    now,
    session.plannedEnd,
    cutoff,
    WALKIN_EXTEND_INCREMENT_MINUTES,
  );
  if (!plannedEnd) {
    throw new Error(
      "A full 30-minute extension is not available before the next booking or closing",
    );
  }

  try {
    const result = await prisma.session.updateMany({
      where: {
        id,
        tableId: session.tableId,
        source: "WALKIN",
        status: "ONGOING",
        plannedEnd: session.plannedEnd,
      },
      data: { plannedEnd },
    });
    if (result.count !== 1) throw new Error("Session changed before it could be extended");
    return prisma.session.findUniqueOrThrow({ where: { id } });
  } catch (error) {
    return conflictError(error);
  }
}

export async function startOnlineBookingAction(sessionId: string) {
  await requireAcademyRole("supervisor");
  const id = requiredName(sessionId, "Booking");
  const now = new Date();
  try {
    return await prisma.$transaction(
      async (tx) => {
        const booking = await tx.session.findFirst({
          where: {
            id,
            source: "ONLINE",
            status: "CONFIRMED",
            startTime: { lte: now },
            plannedEnd: { gt: now },
          },
          select: { tableId: true },
        });
        if (!booking) {
          throw new Error("This booking can only be started at or after its scheduled start time");
        }
        const activeSession = await tx.session.findFirst({
          where: { tableId: booking.tableId, status: "ONGOING", id: { not: id } },
          select: { id: true },
        });
        if (activeSession) {
          throw new Error(
            "The table is still in use. Close its current session before starting this booking",
          );
        }
        const result = await tx.session.updateMany({
          where: {
            id,
            source: "ONLINE",
            status: "CONFIRMED",
            startTime: { lte: now },
            plannedEnd: { gt: now },
          },
          data: { status: "ONGOING", actualStart: now },
        });
        if (result.count !== 1) throw new Error("Booking changed before it could be started");
        return tx.session.findUniqueOrThrow({ where: { id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
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
  if (!input || typeof input !== "object") throw new Error("Walk-in details are required");
  const customerName = requiredName(input.customerName, "Customer name");
  const sessionId = requiredName(input.sessionId, "Session");
  const playerTwoName = optionalName(input.playerTwoName, "Second player name");
  return prisma.session.update({
    where: { id: sessionId, source: "WALKIN", status: "ONGOING" },
    data: {
      customerName,
      players: [{ name: customerName }, ...(playerTwoName ? [{ name: playerTwoName }] : [])],
    },
  });
}

export async function closeSessionAction(input: {
  sessionId: string;
  payerName: string;
  paymentMethod: "CASH" | "UPI" | "CARD" | null;
}) {
  await requireAcademyRole("supervisor");
  if (!input || typeof input !== "object") throw new Error("Closeout details are required");
  const payerName = requiredName(input.payerName, "Payer name");
  const sessionId = requiredName(input.sessionId, "Session");
  if (input.paymentMethod !== null && !isPaymentMethod(input.paymentMethod)) {
    throw new Error("Choose a valid payment method or add the amount to unpaid dues");
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findFirst({
      where: { id: sessionId, source: { in: ["WALKIN", "ONLINE"] }, status: "ONGOING" },
      include: { table: { select: { hourlyRate: true } } },
    });
    if (!session) {
      throw new Error("Session is not active");
    }
    const actualEnd = new Date();
    const actualStart = session.actualStart ?? session.startTime;
    const durationMinutes = sessionDurationMinutes(actualStart, actualEnd);
    const rateSnapshot = session.rateSnapshot ?? session.table.hourlyRate;
    const amount = sessionCharge(rateSnapshot, durationMinutes);
    const isPaid = input.paymentMethod !== null;
    const result = await tx.session.updateMany({
      where: { id: session.id, status: "ONGOING" },
      data: {
        status: "COMPLETED",
        actualEnd,
        plannedEnd: actualEnd,
        durationMinutes,
        amount,
        rateSnapshot,
        payerName,
        paymentStatus: isPaid ? "PAID" : "UNPAID",
        paymentMethod: input.paymentMethod,
        paidAt: isPaid ? actualEnd : null,
      },
    });
    if (result.count !== 1) throw new Error("Session was already closed");
    return tx.session.findUniqueOrThrow({ where: { id: session.id } });
  });
}

export async function settleSessionPaymentAction(input: {
  sessionId: string;
  payerName: string;
  paymentMethod: "CASH" | "UPI" | "CARD";
}) {
  await requireAcademyRole("supervisor");
  if (!input || typeof input !== "object") throw new Error("Payment details are required");
  const payerName = requiredName(input.payerName, "Payer name");
  const sessionId = requiredName(input.sessionId, "Session");
  if (!isPaymentMethod(input.paymentMethod)) throw new Error("Choose a valid payment method");
  const paidAt = new Date();
  const result = await prisma.session.updateMany({
    where: {
      id: sessionId,
      source: { in: ["ONLINE", "WALKIN"] },
      status: "COMPLETED",
      paymentStatus: "UNPAID",
      amount: { not: null },
    },
    data: {
      paymentStatus: "PAID",
      paymentMethod: input.paymentMethod,
      payerName,
      paidAt,
    },
  });
  if (result.count !== 1) throw new Error("This unpaid session cannot accept payment");
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
  const now = new Date();
  await reconcileSessionLifecycle(now);
  return prisma.table.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      hourlyRate: true,
      sessions: {
        where: {
          status: { in: [...ACTIVE_STATUSES] },
          OR: [
            { status: "ONGOING" },
            {
              status: "CONFIRMED",
              startTime: { lte: new Date(now.getTime() + 7 * 86_400_000) },
              plannedEnd: { gt: now },
            },
            { status: "HELD", holdExpiresAt: { gt: now } },
          ],
        },
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          tableId: true,
          source: true,
          status: true,
          startTime: true,
          plannedEnd: true,
          actualStart: true,
          customerName: true,
          customerPhone: true,
          players: true,
          rateSnapshot: true,
          durationMinutes: true,
          amount: true,
          paymentStatus: true,
          paymentMethod: true,
          payerName: true,
          paidAt: true,
          holdExpiresAt: true,
        },
      },
    },
  });
}

export async function getOperationsSummaryAction() {
  await requireAcademyRole("supervisor");
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60_000);
  const [unpaid, nextHourBookings] = await Promise.all([
    prisma.session.aggregate({
      where: {
        status: "COMPLETED",
        paymentStatus: "UNPAID",
        source: { in: ["ONLINE", "WALKIN"] },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.session.count({
      where: {
        source: "ONLINE",
        startTime: { gte: now, lt: nextHour },
        OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: now } }],
      },
    }),
  ]);
  return {
    unpaidAmount: unpaid._sum.amount ?? 0,
    unpaidCount: unpaid._count._all,
    nextHourBookings,
  };
}
