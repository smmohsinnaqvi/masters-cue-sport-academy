import "server-only";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { academyDayUtcBounds, academyDateKey } from "@/lib/academy-time";

const getCachedPublicAcademyContent = unstable_cache(
  async (dateKey: string) => {
    const today = academyDayUtcBounds(dateKey).start;
    const [cafeteriaItems, tournaments] = await Promise.all([
      prisma.cafeteriaItem.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, note: true, price: true },
      }),
      prisma.tournament.findMany({
        where: { date: { gte: today } },
        orderBy: [{ date: "asc" }, { title: "asc" }],
        select: { id: true, title: true, date: true, entryFee: true, prizePool: true },
      }),
    ]);
    return { cafeteriaItems, tournaments };
  },
  ["public-academy-content"],
  { revalidate: 3600, tags: ["public-academy-content"] },
);

export async function getPublicAcademyContent() {
  const [tables, cachedContent] = await Promise.all([
    prisma.table.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, hourlyRate: true },
    }),
    getCachedPublicAcademyContent(academyDateKey()),
  ]);
  return { tables, ...cachedContent };
}
