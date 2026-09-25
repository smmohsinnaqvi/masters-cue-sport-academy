import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  const start = date ? new Date(`${date}T00:00:00.000`) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (Number.isNaN(start.getTime()))
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const sessions = await prisma.session.findMany({
    where: { startTime: { gte: start, lt: end } },
    include: { table: true },
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json({ sessions });
}
