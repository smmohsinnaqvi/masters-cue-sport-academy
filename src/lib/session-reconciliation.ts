import { prisma } from "@/lib/prisma";

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

  await prisma.session.updateMany({
    where: {
      source: "ONLINE",
      status: "CONFIRMED",
      plannedEnd: { lte: now },
    },
    data: { status: "NO_SHOW" },
  });

  return { expired: expired.count };
}
