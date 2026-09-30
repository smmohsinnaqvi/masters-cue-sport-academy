import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reconcileSessionLifecycle } from "@/lib/session-reconciliation";
import { getAcademySession } from "@/lib/supabase-auth-server";

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
  if (view !== "ledger" && view !== "bookings" && view !== "dues") {
    return NextResponse.json({ error: "Invalid ledger view" }, { status: 400 });
  }
  if (search.length > 100) {
    return NextResponse.json(
      { error: "Search text must be 100 characters or fewer" },
      { status: 400 },
    );
  }
  if (
    ["date", "tableId", "group", "source", "status", "payment"].some((filter) =>
      url.searchParams.has(filter),
    )
  ) {
    return NextResponse.json({ error: "Only text search is supported" }, { status: 400 });
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
  if (search) {
    where.AND = [
      {
        OR: [
          { customerName: { contains: search, mode: "insensitive" } },
          { customerPhone: { contains: search, mode: "insensitive" } },
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
