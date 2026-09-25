import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const secret = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await prisma.session.updateMany({
    where: { status: "HELD", holdExpiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });

  const extending = await prisma.session.findMany({
    where: {
      source: "WALKIN",
      status: "ONGOING",
      plannedEnd: { lte: new Date(Date.now() + 10 * 60_000) },
    },
  });

  let extended = 0;
  for (const session of extending) {
    await prisma.session.update({
      where: { id: session.id, status: "ONGOING" },
      data: { plannedEnd: new Date(session.plannedEnd.getTime() + 60 * 60_000) },
    });
    extended += 1;
  }

  return NextResponse.json({ expired: expired.count, extended });
}
