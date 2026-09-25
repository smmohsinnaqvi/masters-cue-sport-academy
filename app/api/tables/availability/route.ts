import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const tableId = url.searchParams.get("tableId");
  const start = date ? new Date(`${date}T00:00:00.000`) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + (date ? 1 : 7));

  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const sessions = await prisma.session.findMany({
    where: {
      ...(tableId ? { tableId } : {}),
      status: { in: ["HELD", "CONFIRMED", "ONGOING"] },
      startTime: { lt: end },
      plannedEnd: { gt: start },
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

  return NextResponse.json({ sessions });
}
