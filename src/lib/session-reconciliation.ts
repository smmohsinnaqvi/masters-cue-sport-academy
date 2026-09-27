import { prisma } from "@/lib/prisma";
import {
  WALKIN_EXTEND_LEAD_MINUTES,
  WALKIN_EXTEND_INCREMENT_MINUTES,
} from "@/lib/operations-constants";
import { academyDateKey, academyDateTimeToUtc } from "@/lib/academy-time";

export async function reconcileWalkInExtensions(now = new Date()) {
  const walkInsToExtend = await prisma.session.findMany({
    where: {
      source: "WALKIN",
      status: "ONGOING",
      plannedEnd: { lte: new Date(now.getTime() + WALKIN_EXTEND_LEAD_MINUTES * 60_000) },
    },
    select: { id: true, tableId: true, plannedEnd: true },
  });
  let extended = 0;
  const closingTime = academyDateTimeToUtc(academyDateKey(now), "23:00");

  for (const session of walkInsToExtend) {
    if (session.plannedEnd >= closingTime) continue;
    const nextBooking = await prisma.session.findFirst({
      where: {
        tableId: session.tableId,
        source: "ONLINE",
        status: { in: ["HELD", "CONFIRMED"] },
        startTime: { gte: session.plannedEnd },
        OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: now } }],
      },
      orderBy: { startTime: "asc" },
      select: { startTime: true },
    });
    const incrementEnd = new Date(
      Math.max(
        session.plannedEnd.getTime() + WALKIN_EXTEND_INCREMENT_MINUTES * 60_000,
        now.getTime() + WALKIN_EXTEND_INCREMENT_MINUTES * 60_000,
      ),
    );
    const plannedEnd = nextBooking
      ? new Date(
          Math.min(incrementEnd.getTime(), closingTime.getTime(), nextBooking.startTime.getTime()),
        )
      : new Date(Math.min(incrementEnd.getTime(), closingTime.getTime()));
    if (plannedEnd <= session.plannedEnd) continue;

    const result = await prisma.session.updateMany({
      where: {
        id: session.id,
        source: "WALKIN",
        status: "ONGOING",
        plannedEnd: session.plannedEnd,
      },
      data: { plannedEnd },
    });
    extended += result.count;
  }

  return extended;
}

export async function reconcileSessionLifecycle(now = new Date()) {
  const onlinePricing = await prisma.session.findMany({
    where: {
      source: "ONLINE",
      OR: [{ rateSnapshot: null }, { amount: null }],
    },
    select: {
      id: true,
      amount: true,
      durationMinutes: true,
      rateSnapshot: true,
      startTime: true,
      plannedEnd: true,
      table: { select: { hourlyRate: true } },
    },
  });
  for (const session of onlinePricing) {
    const rateSnapshot = session.rateSnapshot ?? session.table.hourlyRate;
    const durationMinutes =
      session.durationMinutes ??
      Math.max(0, Math.ceil((session.plannedEnd.getTime() - session.startTime.getTime()) / 60_000));
    const amount = session.amount ?? Math.round((rateSnapshot * durationMinutes) / 60);
    await prisma.session.updateMany({
      where: { id: session.id, source: "ONLINE", OR: [{ rateSnapshot: null }, { amount: null }] },
      data: { rateSnapshot, durationMinutes, amount },
    });
  }

  const expired = await prisma.session.updateMany({
    where: { status: "HELD", holdExpiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const starting = await prisma.session.findMany({
    where: {
      source: "ONLINE",
      status: "CONFIRMED",
      startTime: { lte: now },
    },
    select: { id: true, startTime: true, plannedEnd: true },
  });
  let started = 0;
  let completedBeforeStart = 0;
  for (const session of starting) {
    if (session.plannedEnd <= now) {
      const result = await prisma.session.updateMany({
        where: { id: session.id, source: "ONLINE", status: "CONFIRMED" },
        data: {
          status: "COMPLETED",
          actualStart: session.startTime,
          actualEnd: session.plannedEnd,
        },
      });
      completedBeforeStart += result.count;
      continue;
    }
    const result = await prisma.session.updateMany({
      where: { id: session.id, source: "ONLINE", status: "CONFIRMED" },
      data: { status: "ONGOING", actualStart: session.startTime },
    });
    started += result.count;
  }

  const ending = await prisma.session.findMany({
    where: {
      source: "ONLINE",
      status: "ONGOING",
      plannedEnd: { lte: now },
    },
    select: { id: true, plannedEnd: true },
  });
  let completed = 0;
  for (const session of ending) {
    const result = await prisma.session.updateMany({
      where: { id: session.id, source: "ONLINE", status: "ONGOING", plannedEnd: { lte: now } },
      data: { status: "COMPLETED", actualEnd: session.plannedEnd },
    });
    completed += result.count;
  }

  const extended = await reconcileWalkInExtensions(now);

  return { expired: expired.count, started, completed: completed + completedBeforeStart, extended };
}
