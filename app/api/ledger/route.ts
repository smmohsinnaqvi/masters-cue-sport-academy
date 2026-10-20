import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reconcileSessionLifecycle } from "@/lib/session-reconciliation";
import { getAcademySession } from "@/lib/supabase-auth-server";
import { discountPercentFromBasisPoints } from "@/lib/session-pricing";
import {
  buildLedgerFilterWhere,
  isLedgerPaymentFilter,
  isLedgerTableTypeFilter,
} from "@/lib/ledger-filters";
import { academyDateRangeUtcBounds } from "@/lib/academy-time";
import { isDateRangeKey } from "@/lib/date-range";

function presentSessions<
  T extends {
    discountPercentBasisPoints: number;
    settlementDiscountPercentBasisPoints: number;
  },
>(sessions: T[]) {
  return sessions.map(
    ({ discountPercentBasisPoints, settlementDiscountPercentBasisPoints, ...session }) => ({
      ...session,
      discountPercent: discountPercentFromBasisPoints(discountPercentBasisPoints),
      settlementDiscountPercent: discountPercentFromBasisPoints(
        settlementDiscountPercentBasisPoints,
      ),
    }),
  );
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
  const search = url.searchParams.get("search")?.trim() ?? "";
  const paymentFilter = url.searchParams.get("payment") ?? "ALL";
  const tableTypeFilter = url.searchParams.get("tableType") ?? "ALL";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";
  if (view !== "ledger" && view !== "bookings" && view !== "dues") {
    return NextResponse.json({ error: "Invalid ledger view" }, { status: 400 });
  }
  if (search.length > 100) {
    return NextResponse.json(
      { error: "Search text must be 100 characters or fewer" },
      { status: 400 },
    );
  }
  if (!isLedgerPaymentFilter(paymentFilter)) {
    return NextResponse.json({ error: "Invalid payment filter" }, { status: 400 });
  }
  if (!isLedgerTableTypeFilter(tableTypeFilter)) {
    return NextResponse.json({ error: "Invalid table type filter" }, { status: 400 });
  }
  if (
    Boolean(dateFrom) !== Boolean(dateTo) ||
    (dateFrom && (!isDateRangeKey(dateFrom) || !isDateRangeKey(dateTo)))
  ) {
    return NextResponse.json({ error: "Choose a valid start and end date" }, { status: 400 });
  }
  if (dateFrom && dateFrom > dateTo) {
    return NextResponse.json(
      { error: "Start date must be before or equal to end date" },
      { status: 400 },
    );
  }
  if (
    ["date", "tableId", "group", "source", "status"].some((filter) => url.searchParams.has(filter))
  ) {
    return NextResponse.json({ error: "Only text search is supported" }, { status: 400 });
  }
  if (view !== "ledger" && (url.searchParams.has("payment") || url.searchParams.has("tableType"))) {
    return NextResponse.json(
      { error: "Filters are only supported for ledger view" },
      { status: 400 },
    );
  }
  if (view === "dues" && (dateFrom || dateTo)) {
    return NextResponse.json(
      { error: "Date filters are supported only for ledger and bookings views" },
      { status: 400 },
    );
  }

  await reconcileSessionLifecycle();
  const where: Prisma.SessionWhereInput =
    view === "bookings"
      ? { source: "ONLINE" }
      : view === "dues"
        ? {
            source: { in: ["ONLINE", "WALKIN"] },
            status: "COMPLETED",
            paymentStatus: "UNPAID",
          }
        : {};
  if (view === "ledger") {
    Object.assign(where, buildLedgerFilterWhere(paymentFilter, tableTypeFilter));
  }
  if (dateFrom && dateTo) {
    try {
      const { start, end } = academyDateRangeUtcBounds(dateFrom, dateTo);
      where.startTime = { gte: start, lt: end };
    } catch (reason) {
      return NextResponse.json(
        { error: reason instanceof Error ? reason.message : "Invalid date range" },
        { status: 400 },
      );
    }
  }
  if (search) {
    const phoneDigits = search.replace(/\D/g, "");
    where.AND = [
      {
        OR: [
          { customerName: { contains: search, mode: "insensitive" } },
          { customerPhone: { contains: search, mode: "insensitive" } },
          ...(phoneDigits.length >= 3 && phoneDigits !== search
            ? [{ customerPhone: { contains: phoneDigits, mode: "insensitive" as const } }]
            : []),
          { payerName: { contains: search, mode: "insensitive" } },
          { refCode: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

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
        sessions: presentSessions(sessions),
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
      sessions: presentSessions(sessions),
      nextCursor: hasMore ? (sessions[sessions.length - 1]?.id ?? null) : null,
      hasMore,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
