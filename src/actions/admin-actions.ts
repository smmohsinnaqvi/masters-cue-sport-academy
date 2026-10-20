"use server";

import { TableType } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAcademyRole } from "@/lib/supabase-auth-server";
import {
  cafeteriaItemFormSchema,
  ratesFormSchema,
  tournamentFormSchema,
} from "@/lib/form-validation";

const PUBLIC_CONTENT_TAG = "public-academy-content";

function revalidatePublicContent() {
  revalidateTag(PUBLIC_CONTENT_TAG);
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== "string") throw new Error(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > 120) throw new Error(`${label} must be 120 characters or fewer`);
  return normalized;
}

function tournamentDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose a valid tournament date");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Choose a valid tournament date");
  }
  return date;
}

export async function getAdminSettingsAction() {
  await requireAcademyRole("admin");
  const [tournaments, cafeteriaItems, tables] = await Promise.all([
    prisma.tournament.findMany({ orderBy: [{ date: "asc" }, { title: "asc" }] }),
    prisma.cafeteriaItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.table.findMany({ select: { type: true, hourlyRate: true } }),
  ]);
  const firstRate = (type: TableType) =>
    tables.find((table) => table.type === type)?.hourlyRate ?? 0;
  return {
    tournaments: tournaments.map((item) => ({
      ...item,
      date: item.date.toISOString().slice(0, 10),
    })),
    cafeteriaItems,
    rates: { snooker: firstRate("SNOOKER"), pool: firstRate("POOL") },
  };
}

export async function createTournamentAction(input: {
  title: string;
  date: string;
  entryFee: number;
  prizePool: number;
}) {
  await requireAcademyRole("admin");
  if (!input || typeof input !== "object") throw new Error("Tournament details are required");
  const validation = tournamentFormSchema.safeParse({
    ...input,
    entryFee: String(input.entryFee),
    prizePool: String(input.prizePool),
  });
  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Check tournament details");
  }
  const tournament = await prisma.tournament.create({
    data: {
      title: validation.data.title,
      date: tournamentDate(validation.data.date),
      entryFee: validation.data.entryFee,
      prizePool: validation.data.prizePool,
    },
  });
  revalidatePublicContent();
  return tournament;
}

export async function updateTournamentAction(input: {
  id: string;
  title: string;
  date: string;
  entryFee: number;
  prizePool: number;
}) {
  await requireAcademyRole("admin");
  if (!input || typeof input !== "object") throw new Error("Tournament details are required");
  const validation = tournamentFormSchema.safeParse({
    ...input,
    entryFee: String(input.entryFee),
    prizePool: String(input.prizePool),
  });
  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Check tournament details");
  }
  const tournament = await prisma.tournament.update({
    where: { id: requiredText(input.id, "Tournament ID") },
    data: {
      title: validation.data.title,
      date: tournamentDate(validation.data.date),
      entryFee: validation.data.entryFee,
      prizePool: validation.data.prizePool,
    },
  });
  revalidatePublicContent();
  return tournament;
}

export async function deleteTournamentAction(id: string) {
  await requireAcademyRole("admin");
  await prisma.tournament.delete({ where: { id: requiredText(id, "Tournament ID") } });
  revalidatePublicContent();
}

export async function createCafeteriaItemAction(input: {
  name: string;
  note?: string;
  price: number;
}) {
  await requireAcademyRole("admin");
  if (!input || typeof input !== "object") throw new Error("Cafeteria item details are required");
  const validation = cafeteriaItemFormSchema.safeParse({
    ...input,
    note: input.note ?? "",
    price: String(input.price),
  });
  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Check cafeteria item details");
  }
  const item = await prisma.cafeteriaItem.create({
    data: {
      name: validation.data.name,
      note: validation.data.note || null,
      price: validation.data.price,
    },
  });
  revalidatePublicContent();
  return item;
}

export async function updateCafeteriaItemAction(input: {
  id: string;
  name: string;
  note?: string | null;
  price: number;
}) {
  await requireAcademyRole("admin");
  if (!input || typeof input !== "object") throw new Error("Cafeteria item details are required");
  const validation = cafeteriaItemFormSchema.safeParse({
    ...input,
    note: input.note ?? "",
    price: String(input.price),
  });
  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Check cafeteria item details");
  }
  const item = await prisma.cafeteriaItem.update({
    where: { id: requiredText(input.id, "Item ID") },
    data: {
      name: validation.data.name,
      note: validation.data.note || null,
      price: validation.data.price,
    },
  });
  revalidatePublicContent();
  return item;
}

export async function deleteCafeteriaItemAction(id: string) {
  await requireAcademyRole("admin");
  await prisma.cafeteriaItem.delete({ where: { id: requiredText(id, "Item ID") } });
  revalidatePublicContent();
}

export async function updateHourlyRatesAction(rates: { snooker: number; pool: number }) {
  await requireAcademyRole("admin");
  if (!rates || typeof rates !== "object") throw new Error("Table rates are required");
  const validation = ratesFormSchema.safeParse({
    snooker: String(rates.snooker),
    pool: String(rates.pool),
  });
  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Check table rates");
  }
  const { snooker, pool } = validation.data;
  await prisma.$transaction(async (tx) => {
    const [snookerCount, poolCount] = await Promise.all([
      tx.table.count({ where: { type: "SNOOKER" } }),
      tx.table.count({ where: { type: "POOL" } }),
    ]);
    if (snookerCount === 0 || poolCount === 0) {
      throw new Error("No tables found for one or more table types");
    }
    await Promise.all([
      tx.table.updateMany({ where: { type: "SNOOKER" }, data: { hourlyRate: snooker } }),
      tx.table.updateMany({ where: { type: "POOL" }, data: { hourlyRate: pool } }),
    ]);
  });
  revalidatePublicContent();
  return { snooker, pool };
}
