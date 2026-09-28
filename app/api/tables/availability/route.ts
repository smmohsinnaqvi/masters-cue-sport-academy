import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { academyDateKey, academyDayUtcBounds } from "@/lib/academy-time";
import { reconcileWalkInExtensions } from "@/lib/session-reconciliation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const daysParameter = url.searchParams.get("days");
  const tableId = url.searchParams.get("tableId");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const days = daysParameter === null ? 1 : Number(daysParameter);
  if (!Number.isInteger(days) || days < 1 || days > 7 || (!date && daysParameter !== null)) {
    return NextResponse.json({ error: "Invalid availability range" }, { status: 400 });
  }

  let bounds: { start: Date; end: Date };
  try {
    const start = date ? academyDayUtcBounds(date).start : new Date();
    bounds = {
      start,
      end: date
        ? new Date(start.getTime() + days * 86_400_000)
        : new Date(Date.now() + 7 * 86_400_000),
    };
  } catch {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const today = academyDayUtcBounds(academyDateKey());
  if (bounds.start < today.end && bounds.end > today.start) {
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
