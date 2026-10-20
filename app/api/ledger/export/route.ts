import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { academyDateRangeUtcBounds } from "@/lib/academy-time";
import { getAcademySession } from "@/lib/supabase-auth-server";
import { isDateRangeKey } from "@/lib/date-range";
import { ledgerCsvHeader, ledgerCsvRows } from "@/lib/ledger-csv";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getAcademySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";
  if (!isDateRangeKey(dateFrom) || !isDateRangeKey(dateTo)) {
    return NextResponse.json({ error: "Choose a valid start and end date" }, { status: 400 });
  }
  if (dateFrom > dateTo) {
    return NextResponse.json(
      { error: "Start date must be before or equal to end date" },
      { status: 400 },
    );
  }

  let bounds: ReturnType<typeof academyDateRangeUtcBounds>;
  try {
    bounds = academyDateRangeUtcBounds(dateFrom, dateTo);
  } catch (reason) {
    return NextResponse.json(
      { error: reason instanceof Error ? reason.message : "Invalid date range" },
      { status: 400 },
    );
  }

  const where: Prisma.SessionWhereInput = {
    startTime: { gte: bounds.start, lt: bounds.end },
  };
  const encoder = new TextEncoder();
  let cursor: string | null = null;
  let finished = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`\uFEFF${ledgerCsvHeader()}\r\n`));
    },
    async pull(controller) {
      if (finished) return;
      try {
        const rows = await prisma.session.findMany({
          where,
          take: 500,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: { table: { select: { name: true, type: true } } },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        if (rows.length === 0) {
          finished = true;
          controller.close();
          return;
        }

        const lastRow = rows[rows.length - 1];
        if (lastRow) cursor = lastRow.id;
        const csv = ledgerCsvRows(rows);
        controller.enqueue(encoder.encode(`${csv}\r\n`));
        if (rows.length < 500) {
          finished = true;
          controller.close();
        }
      } catch (reason) {
        finished = true;
        controller.error(reason);
      }
    },
    cancel() {
      finished = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": `attachment; filename="ledger-${dateFrom}-to-${dateTo}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
