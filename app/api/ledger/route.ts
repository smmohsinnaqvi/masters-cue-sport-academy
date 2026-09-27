import { NextResponse } from "next/server";
import { Prisma, SessionSource, SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reconcileSessionLifecycle } from "@/lib/session-reconciliation";
import { getAcademySession } from "@/lib/supabase-auth-server";
import { academyDayUtcBounds } from "@/lib/academy-time";

const PAYMENT_STATUSES = ["UNPAID", "CASH", "UPI", "CARD"] as const;

function includesEnumValue<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((candidate) => candidate === value);
}

export async function GET(request: Request) {
  const session = await getAcademySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "ledger";
  const cursor = url.searchParams.get("cursor");
  const requestedTake = Number(url.searchParams.get("take") ?? 25);
  const take = Number.isInteger(requestedTake) ? Math.min(Math.max(requestedTake, 1), 50) : 25;
  const date = url.searchParams.get("date") ?? "";
  const source = url.searchParams.get("source") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const payment = url.searchParams.get("payment") ?? "";
  if (view !== "ledger" && view !== "bookings") {
    return NextResponse.json({ error: "Invalid ledger view" }, { status: 400 });
  }
  if (view === "bookings" && (date || source || status || payment)) {
    return NextResponse.json(
      { error: "Bookings view does not accept Ledger filters" },
      { status: 400 },
    );
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid ledger date" }, { status: 400 });
  }
  if (source && !includesEnumValue(Object.values(SessionSource), source)) {
    return NextResponse.json({ error: "Invalid session type filter" }, { status: 400 });
  }
  if (status && !includesEnumValue(Object.values(SessionStatus), status)) {
    return NextResponse.json({ error: "Invalid session status filter" }, { status: 400 });
  }
  if (payment && !includesEnumValue(PAYMENT_STATUSES, payment)) {
    return NextResponse.json({ error: "Invalid payment status filter" }, { status: 400 });
  }

  let dayBounds: { start: Date; end: Date } | null = null;
  if (date) {
    try {
      dayBounds = academyDayUtcBounds(date);
    } catch {
      return NextResponse.json({ error: "Invalid ledger date" }, { status: 400 });
    }
  }

  await reconcileSessionLifecycle();
  const where: Prisma.SessionWhereInput = view === "bookings" ? { source: "ONLINE" } : {};
  if (dayBounds) where.startTime = { gte: dayBounds.start, lt: dayBounds.end };
  if (source) where.source = source as SessionSource;
  if (status) where.status = status as SessionStatus;
  if (payment) where.paymentStatus = payment;

  if (cursor) {
    const cursorRow = await prisma.session.findFirst({
      where: { AND: [where, { id: cursor }] },
      select: { id: true, createdAt: true },
    });
    if (!cursorRow) {
      return NextResponse.json({ error: "Invalid pagination cursor" }, { status: 400 });
    }

    const rows = await prisma.session.findMany({
      where: {
        AND: [
          where,
          {
            OR: [
              { createdAt: { lt: cursorRow.createdAt } },
              { createdAt: cursorRow.createdAt, id: { lt: cursorRow.id } },
            ],
          },
        ],
      },
      take: take + 1,
      include: { table: { select: { id: true, name: true, type: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const hasMore = rows.length > take;
    const sessions = hasMore ? rows.slice(0, take) : rows;
    return NextResponse.json(
      {
        sessions,
        nextCursor: hasMore ? (sessions[sessions.length - 1]?.id ?? null) : null,
        hasMore,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const rows = await prisma.session.findMany({
    where,
    take: take + 1,
    include: { table: { select: { id: true, name: true, type: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const hasMore = rows.length > take;
  const sessions = hasMore ? rows.slice(0, take) : rows;
  return NextResponse.json(
    {
      sessions,
      nextCursor: hasMore ? (sessions[sessions.length - 1]?.id ?? null) : null,
      hasMore,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
