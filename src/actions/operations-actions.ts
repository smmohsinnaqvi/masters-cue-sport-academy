"use server";

import {
  PaymentMethod,
  Prisma,
  SessionGameFormat as PrismaSessionGameFormat,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ONLINE_REQUEST_EXPIRY_MINUTES,
  WALKIN_EXTEND_INCREMENT_MINUTES,
} from "@/lib/operations-constants";
import {
  academyDateKey,
  academyDateRangeUtcBounds,
  academyDateTimeToUtc,
  academyMinutesOfDay,
} from "@/lib/academy-time";
import { isDateRangeValid } from "@/lib/date-range";
import { reconcileSessionLifecycle } from "@/lib/session-reconciliation";
import {
  calculateSettlementDiscount,
  closeoutPayerShares,
  discountPercentFromBasisPoints,
  discountPercentToBasisPoints,
  discountedSessionCharge,
  sessionCharge,
  sessionDurationMinutes,
  sessionPlayerNames,
  validateSessionPlayers,
  type SessionGameFormat,
  type SessionPlayer,
} from "@/lib/session-pricing";
import {
  getWalkInAvailableMinutes,
  getWalkInCutoff,
  getWalkInExtensionEnd,
  getWalkInPlannedEnd,
  validateWalkInHold,
  WALKIN_CUSTOM_DURATION_MINUTES,
  type WalkInHoldMode,
} from "@/lib/walk-in-blocks";
import { requireAcademyRole } from "@/lib/supabase-auth-server";
import { bookingCustomerSchema } from "@/lib/form-validation";

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

async function validatePlayerProfiles(
  tx: Prisma.TransactionClient,
  players: SessionPlayer[],
  requireActive: boolean,
) {
  const profileIds = players.flatMap((player) => (player.profileId ? [player.profileId] : []));
  if (profileIds.length === 0) return;
  const profiles = await tx.playerProfile.findMany({
    where: {
      id: { in: profileIds },
      ...(requireActive ? { isActive: true } : {}),
    },
    select: { id: true },
  });
  if (profiles.length !== profileIds.length) {
    throw new Error("One or more selected player profiles are no longer available.");
  }
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
  if (!input || typeof input !== "object") throw new Error("Booking details are required");
  const customer = bookingCustomerSchema.safeParse({
    name: input.customerName,
    phone: input.customerPhone,
  });
  if (!customer.success)
    throw new Error(customer.error.issues[0]?.message ?? "Check booking details");
  const customerName = customer.data.name;
  const customerPhone = customer.data.phone;

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
  gameFormat: SessionGameFormat;
  gameLabel?: string | null;
  players: SessionPlayer[];
  holdMode: WalkInHoldMode;
  durationMinutes: number;
}) {
  await requireAcademyRole("supervisor");
  if (!input || typeof input !== "object") throw new Error("Walk-in details are required");
  const tableId = requiredName(input.tableId, "Table");
  if (!Object.values(PrismaSessionGameFormat).some((format) => format === input.gameFormat)) {
    throw new Error("Choose a valid game format");
  }
  const { players, gameLabel } = validateSessionPlayers(
    input.gameFormat,
    input.players,
    input.gameLabel,
  );
  const customerName = players[0]!.name;
  validateWalkInHold(input.holdMode, input.durationMinutes);
  const now = new Date();
  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table || !table.isActive) throw new Error("Table is not available");

  try {
    return await prisma.$transaction(
      async (tx) => {
        await validatePlayerProfiles(tx, players, true);
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
        const cutoff = getWalkInCutoff(nextBooking?.startTime ?? null);
        const availableMinutes = getWalkInAvailableMinutes(now, cutoff);
        if (
          (input.holdMode === "OPEN" && availableMinutes <= 0) ||
          (input.holdMode !== "OPEN" && availableMinutes < WALKIN_CUSTOM_DURATION_MINUTES)
        ) {
          throw new Error("There is not enough time for this hold before the next booking");
        }
        const plannedEnd = getWalkInPlannedEnd(
          now,
          input.durationMinutes,
          cutoff,
          input.holdMode === "OPEN",
        );
        const plannedDurationMinutes = getWalkInAvailableMinutes(now, plannedEnd);

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
            players,
            gameFormat: input.gameFormat,
            gameLabel,
            walkInOpenEnded: input.holdMode === "OPEN",
            durationMinutes:
              input.holdMode === "OPEN"
                ? null
                : Math.min(input.durationMinutes, plannedDurationMinutes),
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
    select: { tableId: true, plannedEnd: true, walkInOpenEnded: true },
  });
  if (!session) throw new Error("Walk-in session is no longer active");
  if (session.walkInOpenEnded) {
    throw new Error("An open walk-in does not need a timed extension");
  }

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
  const cutoff = getWalkInCutoff(nextBooking?.startTime ?? null);
  const plannedEnd = getWalkInExtensionEnd(
    now,
    session.plannedEnd,
    cutoff,
    WALKIN_EXTEND_INCREMENT_MINUTES,
  );
  if (!plannedEnd) {
    throw new Error("A full 30-minute extension is not available before the next booking");
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
  gameFormat: SessionGameFormat;
  gameLabel?: string | null;
  players: SessionPlayer[];
}) {
  await requireAcademyRole("supervisor");
  if (!input || typeof input !== "object") throw new Error("Walk-in details are required");
  const sessionId = requiredName(input.sessionId, "Session");
  if (!Object.values(PrismaSessionGameFormat).some((format) => format === input.gameFormat)) {
    throw new Error("Choose a valid game format");
  }
  const { players, gameLabel } = validateSessionPlayers(
    input.gameFormat,
    input.players,
    input.gameLabel,
  );
  const customerName = players[0]!.name;
  return prisma.$transaction(async (tx) => {
    await validatePlayerProfiles(tx, players, false);
    return tx.session.update({
      where: { id: sessionId, source: "WALKIN", status: "ONGOING" },
      data: {
        customerName,
        players,
        gameFormat: input.gameFormat,
        gameLabel,
      },
    });
  });
}

export async function closeSessionAction(input: {
  sessionId: string;
  payerNames: string[];
  discountPercent: number | string;
  paymentMethod: "CASH" | "UPI" | "CARD" | null;
}) {
  await requireAcademyRole("supervisor");
  if (!input || typeof input !== "object") throw new Error("Closeout details are required");
  const sessionId = requiredName(input.sessionId, "Session");
  const discountPercentBasisPoints = discountPercentToBasisPoints(input.discountPercent);
  const discountPercent = discountPercentFromBasisPoints(discountPercentBasisPoints);
  if (!Array.isArray(input.payerNames)) throw new Error("Payer details are required");
  const payerNames = input.payerNames.map((name, index) =>
    requiredName(name, `Payer ${index + 1}`),
  );
  if (new Set(payerNames.map((name) => name.toLocaleLowerCase())).size !== payerNames.length) {
    throw new Error("A player can only be selected as a payer once");
  }
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
    const grossAmount = sessionCharge(rateSnapshot, durationMinutes);
    const amount = discountedSessionCharge(grossAmount, discountPercent);
    const availablePayers = sessionPlayerNames(session.players, session.customerName ?? "Guest");
    if (payerNames.some((name) => !availablePayers.includes(name))) {
      throw new Error("Select payers from the players recorded for this session");
    }
    const payerShares = closeoutPayerShares(amount, payerNames);
    const payerName = payerNames.join(", ");
    const paymentMethod = amount === 0 ? null : input.paymentMethod;
    const isPaid = paymentMethod !== null || amount === 0;
    const result = await tx.session.updateMany({
      where: { id: session.id, status: "ONGOING" },
      data: {
        status: "COMPLETED",
        actualEnd,
        plannedEnd: actualEnd,
        durationMinutes,
        amount,
        grossAmount,
        discountPercentBasisPoints,
        discountAmount: grossAmount - amount,
        payerShares,
        rateSnapshot,
        payerName,
        paymentStatus: isPaid ? "PAID" : "UNPAID",
        paymentMethod,
        paidAt: isPaid ? actualEnd : null,
      },
    });
    if (result.count !== 1) throw new Error("Session was already closed");
    if (!isPaid && payerShares.length > 0) {
      const players = Array.isArray(session.players)
        ? session.players.flatMap((player) => {
            if (
              !player ||
              typeof player !== "object" ||
              !("name" in player) ||
              !("profileId" in player) ||
              typeof player.name !== "string" ||
              typeof player.profileId !== "string"
            ) {
              return [];
            }
            return [{ name: player.name, profileId: player.profileId }];
          })
        : [];
      const candidateProfileIds = players.map((player) => player.profileId);
      if (candidateProfileIds.length > 0) {
        const eligibleProfiles = await tx.playerProfile.findMany({
          where: {
            id: { in: candidateProfileIds },
            isActive: true,
            tabEnabled: true,
          },
          select: { id: true },
        });
        const eligibleIds = new Set(eligibleProfiles.map((profile) => profile.id));
        const profileIdByName = new Map(
          players
            .filter((player) => eligibleIds.has(player.profileId))
            .map((player) => [player.name.toLocaleLowerCase(), player.profileId]),
        );
        const linkedPayers = payerShares.flatMap((share) => {
          const profileId = profileIdByName.get(share.name.toLocaleLowerCase());
          return profileId ? [{ share, profileId }] : [];
        });
        if (linkedPayers.length === payerShares.length) {
          await tx.sessionDue.createMany({
            data: linkedPayers.map(({ share, profileId }) => ({
              sessionId: session.id,
              payerName: share.name,
              amount: share.amount,
              playerProfileId: profileId,
            })),
          });
        }
      }
    }
    return tx.session.findUniqueOrThrow({ where: { id: session.id } });
  });
}

export async function settleSessionPaymentAction(input: {
  sessionId: string;
  payerName: string;
  paymentMethod: "CASH" | "UPI" | "CARD";
  discountPercent: string | number;
}) {
  await requireAcademyRole("supervisor");
  if (!input || typeof input !== "object") throw new Error("Payment details are required");
  const payerName = requiredName(input.payerName, "Payer name");
  const sessionId = requiredName(input.sessionId, "Session");
  if (!isPaymentMethod(input.paymentMethod)) throw new Error("Choose a valid payment method");
  const settlementDiscountPercentBasisPoints = discountPercentToBasisPoints(input.discountPercent);
  const paidAt = new Date();
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findFirst({
      where: {
        id: sessionId,
        source: { in: ["ONLINE", "WALKIN"] },
        status: "COMPLETED",
        paymentStatus: "UNPAID",
        amount: { not: null },
      },
      select: {
        id: true,
        amount: true,
        discountPercentBasisPoints: true,
        players: true,
      },
    });
    if (!session || session.amount === null) {
      throw new Error("This unpaid session cannot accept payment");
    }
    const hasRegisteredPlayers =
      Array.isArray(session.players) &&
      session.players.some(
        (player) =>
          player !== null &&
          typeof player === "object" &&
          "profileId" in player &&
          typeof player.profileId === "string",
      );
    const sessionDues = hasRegisteredPlayers
      ? await tx.sessionDue.findMany({
          where: { sessionId: session.id },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: { payments: { select: { amount: true } } },
        })
      : [];
    if (sessionDues.length > 0) {
      const outstandingDues = sessionDues.map((due) => ({
        due,
        outstandingAmount:
          due.amount - due.payments.reduce((total, payment) => total + payment.amount, 0),
      }));
      const totalOutstanding = outstandingDues.reduce(
        (total, due) => total + due.outstandingAmount,
        0,
      );
      if (totalOutstanding <= 0) throw new Error("This session has already been settled.");
      if (settlementDiscountPercentBasisPoints > 0) {
        throw new Error(
          "A session with account allocations cannot receive a second settlement discount.",
        );
      }
      const payment = await tx.playerTabPayment.create({
        data: {
          payerName,
          amount: totalOutstanding,
          paymentMethod: input.paymentMethod,
        },
      });
      await tx.sessionDuePayment.createMany({
        data: outstandingDues
          .filter((due) => due.outstandingAmount > 0)
          .map(({ due, outstandingAmount }) => ({
            dueId: due.id,
            paymentId: payment.id,
            playerProfileId: due.playerProfileId,
            amount: outstandingAmount,
          })),
      });
      const result = await tx.session.updateMany({
        where: {
          id: session.id,
          status: "COMPLETED",
          paymentStatus: "UNPAID",
        },
        data: {
          paymentStatus: "PAID",
          paymentMethod: input.paymentMethod,
          payerName,
          paidAt,
        },
      });
      if (result.count !== 1)
        throw new Error("This unpaid session changed before payment completed");
      return tx.session.findUniqueOrThrow({ where: { id: session.id } });
    }
    const settlementDiscount = calculateSettlementDiscount(
      session.amount,
      discountPercentFromBasisPoints(settlementDiscountPercentBasisPoints),
      session.discountPercentBasisPoints,
    );
    const result = await tx.session.updateMany({
      where: {
        id: session.id,
        status: "COMPLETED",
        paymentStatus: "UNPAID",
        amount: session.amount,
        discountPercentBasisPoints: session.discountPercentBasisPoints,
      },
      data: {
        amount: settlementDiscount.amount,
        settlementDiscountPercentBasisPoints: settlementDiscount.discountBasisPoints,
        settlementDiscountAmount: settlementDiscount.discountAmount,
        paymentStatus: "PAID",
        paymentMethod: input.paymentMethod,
        payerName,
        paidAt,
      },
    });
    if (result.count !== 1) throw new Error("This unpaid session changed before payment completed");
    return tx.session.findUniqueOrThrow({ where: { id: session.id } });
  });
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
  const tables = await prisma.table.findMany({
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
          walkInOpenEnded: true,
          actualStart: true,
          customerName: true,
          customerPhone: true,
          players: true,
          gameFormat: true,
          gameLabel: true,
          rateSnapshot: true,
          durationMinutes: true,
          amount: true,
          grossAmount: true,
          discountPercentBasisPoints: true,
          discountAmount: true,
          settlementDiscountPercentBasisPoints: true,
          settlementDiscountAmount: true,
          payerShares: true,
          paymentStatus: true,
          paymentMethod: true,
          payerName: true,
          paidAt: true,
          holdExpiresAt: true,
        },
      },
    },
  });
  return tables.map(({ sessions, ...table }) => ({
    ...table,
    sessions: sessions.map(
      ({ discountPercentBasisPoints, settlementDiscountPercentBasisPoints, ...session }) => ({
        ...session,
        discountPercent: discountPercentFromBasisPoints(discountPercentBasisPoints),
        settlementDiscountPercent: discountPercentFromBasisPoints(
          settlementDiscountPercentBasisPoints,
        ),
      }),
    ),
  }));
}

export async function getOperationsSummaryAction() {
  await requireAcademyRole("supervisor");
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60_000);
  const [unpaid, nextHourBookings] = await Promise.all([
    (async () => {
      try {
        const [totals] = await prisma.$queryRaw<
          { unpaidAmount: number; unpaidCount: number }[]
        >(Prisma.sql`
          SELECT
            COALESCE(
              SUM(
                CASE
                  WHEN COALESCE(due_summary.due_count, 0) > 0
                    THEN due_summary.outstanding_amount
                  ELSE COALESCE(s.amount, 0)
                END
              ),
              0
            )::int AS "unpaidAmount",
            COUNT(*)::int AS "unpaidCount"
          FROM sessions s
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*) AS due_count,
              SUM(GREATEST(0, due.amount - COALESCE(payment_summary.paid_amount, 0))) AS outstanding_amount
            FROM session_dues due
            LEFT JOIN LATERAL (
              SELECT SUM(allocation.amount) AS paid_amount
              FROM session_due_payments allocation
              WHERE allocation.due_id = due.id
            ) payment_summary ON TRUE
            WHERE due.session_id = s.id
          ) due_summary ON TRUE
          WHERE s.status = 'COMPLETED'
            AND s.payment_status = 'UNPAID'
            AND s.source IN ('ONLINE', 'WALKIN')
        `);
        if (!totals) throw new Error("Unable to calculate outstanding dues.");
        return totals;
      } catch (error) {
        const missingPlayerTables =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2021" ||
            (error.code === "P2010" && String(error.meta?.message ?? "").includes("session_dues")));
        if (!missingPlayerTables) throw error;
        const legacyTotals = await prisma.session.aggregate({
          where: {
            status: "COMPLETED",
            paymentStatus: "UNPAID",
            source: { in: ["ONLINE", "WALKIN"] },
          },
          _sum: { amount: true },
          _count: { _all: true },
        });
        return {
          unpaidAmount: legacyTotals._sum.amount ?? 0,
          unpaidCount: legacyTotals._count._all,
        };
      }
    })(),
    prisma.session.count({
      where: {
        source: "ONLINE",
        startTime: { gte: now, lt: nextHour },
        OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: now } }],
      },
    }),
  ]);
  return {
    unpaidAmount: unpaid.unpaidAmount,
    unpaidCount: unpaid.unpaidCount,
    nextHourBookings,
  };
}

export async function getHistoryRangeSummaryAction(input: {
  ledgerFrom: string;
  ledgerTo: string;
  bookingsFrom: string;
  bookingsTo: string;
}) {
  await requireAcademyRole("supervisor");
  if (
    !input ||
    !isDateRangeValid(input.ledgerFrom, input.ledgerTo) ||
    !isDateRangeValid(input.bookingsFrom, input.bookingsTo)
  ) {
    throw new Error("Choose valid Ledger and Bookings date ranges");
  }

  const ledgerRange = academyDateRangeUtcBounds(input.ledgerFrom, input.ledgerTo);
  const bookingsRange = academyDateRangeUtcBounds(input.bookingsFrom, input.bookingsTo);

  const [ledgerTotals, bookingStatuses] = await Promise.all([
    prisma.session.groupBy({
      by: ["paymentStatus"],
      where: { startTime: { gte: ledgerRange.start, lt: ledgerRange.end } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.session.groupBy({
      by: ["status"],
      where: {
        source: "ONLINE",
        startTime: { gte: bookingsRange.start, lt: bookingsRange.end },
      },
      _count: { _all: true },
    }),
  ]);

  const ledger = ledgerTotals.reduce(
    (totals, group) => {
      totals.sessionCount += group._count._all;
      if (group.paymentStatus === "PAID") totals.paidAmount = group._sum.amount ?? 0;
      if (group.paymentStatus === "UNPAID") totals.unpaidAmount = group._sum.amount ?? 0;
      return totals;
    },
    { paidAmount: 0, unpaidAmount: 0, sessionCount: 0 },
  );
  const bookings = bookingStatuses.reduce(
    (totals, group) => {
      const count = group._count._all;
      totals.totalCount += count;
      if (group.status === "HELD") totals.pendingCount += count;
      if (group.status === "CONFIRMED" || group.status === "ONGOING") {
        totals.confirmedCount += count;
      }
      return totals;
    },
    { pendingCount: 0, confirmedCount: 0, totalCount: 0 },
  );

  return { ledger, bookings };
}
