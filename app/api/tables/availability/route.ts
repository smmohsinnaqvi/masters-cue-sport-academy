import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { academyDateKey, academyDayUtcBounds } from "@/lib/academy-time";
import { reconcileWalkInExtensions } from "@/lib/session-reconciliation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const tableId = url.searchParams.get("tableId");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  let bounds: { start: Date; end: Date };
  try {
    bounds = date
      ? academyDayUtcBounds(date)
      : { start: new Date(), end: new Date(Date.now() + 7 * 86_400_000) };
  } catch {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (date === academyDateKey()) {
    await reconcileWalkInExtensions();
  }
  const sessions = await prisma.session.findMany({
    where: {
      ...(tableId ? { tableId } : {}),
      OR: [
        { status: { in: ["CONFIRMED", "ONGOING"] } },
        { status: "HELD", holdExpiresAt: { gt: new Date() } },
      ],
      AND: [{ startTime: { lt: bounds.end } }, { plannedEnd: { gt: bounds.start } }],
    },
    select: {
      id: true,
      tableId: true,
      startTime: true,
      plannedEnd: true,
      source: true,
      status: true,
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ sessions }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
