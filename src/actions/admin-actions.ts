"use server";

import { TableType } from "@prisma/client";
import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAcademyRole } from "@/lib/supabase-auth-server";

const PUBLIC_CONTENT_TAG = "public-academy-content";

function revalidatePublicContent() {
  revalidateTag(PUBLIC_CONTENT_TAG);
}

function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function nonNegativeAmount(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole number`);
  }
  return value;
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
  const tournament = await prisma.tournament.create({
    data: {
      title: requiredText(input.title, "Tournament name"),
      date: tournamentDate(input.date),
      entryFee: nonNegativeAmount(input.entryFee, "Entry fee"),
      prizePool: nonNegativeAmount(input.prizePool, "Prize pool"),
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
  const tournament = await prisma.tournament.update({
    where: { id: requiredText(input.id, "Tournament ID") },
    data: {
      title: requiredText(input.title, "Tournament name"),
      date: tournamentDate(input.date),
      entryFee: nonNegativeAmount(input.entryFee, "Entry fee"),
      prizePool: nonNegativeAmount(input.prizePool, "Prize pool"),
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
  const item = await prisma.cafeteriaItem.create({
    data: {
      name: requiredText(input.name, "Item name"),
      note: input.note?.trim() || null,
      price: nonNegativeAmount(input.price, "Price"),
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
  const item = await prisma.cafeteriaItem.update({
    where: { id: requiredText(input.id, "Item ID") },
    data: {
      name: requiredText(input.name, "Item name"),
      note: input.note?.trim() || null,
      price: nonNegativeAmount(input.price, "Price"),
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
  const snooker = nonNegativeAmount(rates.snooker, "Snooker rate");
  const pool = nonNegativeAmount(rates.pool, "Pool rate");
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
