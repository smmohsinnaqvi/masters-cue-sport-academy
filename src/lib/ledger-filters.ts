import type { Prisma } from "@prisma/client";

export type LedgerPaymentFilter = "ALL" | "PAID" | "UNPAID";
export type LedgerTableTypeFilter = "ALL" | "SNOOKER" | "POOL";

export function isLedgerPaymentFilter(value: string): value is LedgerPaymentFilter {
  return value === "ALL" || value === "PAID" || value === "UNPAID";
}

export function isLedgerTableTypeFilter(value: string): value is LedgerTableTypeFilter {
  return value === "ALL" || value === "SNOOKER" || value === "POOL";
}

export function buildLedgerFilterWhere(
  paymentStatus: LedgerPaymentFilter,
  tableType: LedgerTableTypeFilter,
): Prisma.SessionWhereInput {
  const where: Prisma.SessionWhereInput = {};
  if (paymentStatus !== "ALL") where.paymentStatus = paymentStatus;
  if (tableType !== "ALL") where.table = { is: { type: tableType } };
  return where;
}
