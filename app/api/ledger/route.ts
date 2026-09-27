import { NextResponse } from "next/server";
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
  if (view !== "ledger" && view !== "bookings") {
    return NextResponse.json({ error: "Invalid ledger view" }, { status: 400 });
  }

  await reconcileSessionLifecycle();
  if (cursor) {
    const cursorRow = await prisma.session.findUnique({
      where: { id: cursor },
      select: { source: true },
    });
    if (!cursorRow || (view === "bookings" && cursorRow.source !== "ONLINE")) {
      return NextResponse.json({ error: "Invalid pagination cursor" }, { status: 400 });
    }
  }

  const rows = await prisma.session.findMany({
    where: view === "bookings" ? { source: "ONLINE" } : {},
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
