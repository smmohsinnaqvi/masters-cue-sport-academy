import type { Prisma } from "@prisma/client";

export type LedgerCsvRecord = Prisma.SessionGetPayload<{
  include: { table: { select: { name: true; type: true } } };
}>;

const academyDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const COLUMNS: { label: string; value: (record: LedgerCsvRecord) => unknown; text?: boolean }[] = [
  { label: "Session ID", value: (record) => record.id, text: true },
  { label: "Table ID", value: (record) => record.tableId, text: true },
  { label: "Table Name", value: (record) => record.table.name, text: true },
  { label: "Table Type", value: (record) => record.table.type, text: true },
  { label: "Source", value: (record) => record.source, text: true },
  { label: "Status", value: (record) => record.status, text: true },
  { label: "Scheduled Start (Academy local)", value: (record) => localDateTime(record.startTime) },
  { label: "Planned End (Academy local)", value: (record) => localDateTime(record.plannedEnd) },
  { label: "Actual Start (Academy local)", value: (record) => localDateTime(record.actualStart) },
  { label: "Actual End (Academy local)", value: (record) => localDateTime(record.actualEnd) },
  {
    label: "Hold Expires At (Academy local)",
    value: (record) => localDateTime(record.holdExpiresAt),
  },
  { label: "Customer Name", value: (record) => record.customerName, text: true },
  { label: "Customer Phone", value: (record) => record.customerPhone, text: true },
  { label: "Booking Reference", value: (record) => record.refCode, text: true },
  { label: "Players JSON", value: (record) => json(record.players), text: true },
  { label: "Game Format", value: (record) => record.gameFormat, text: true },
  { label: "Game Label", value: (record) => record.gameLabel, text: true },
  { label: "Open-ended Walk-in", value: (record) => record.walkInOpenEnded },
  { label: "Losing Player", value: (record) => record.loserName, text: true },
  { label: "Rate Snapshot (INR/hour)", value: (record) => record.rateSnapshot },
  { label: "Duration (minutes)", value: (record) => record.durationMinutes },
  { label: "Gross Amount (INR)", value: (record) => record.grossAmount },
  {
    label: "Session Discount (%)",
    value: (record) => percent(record.discountPercentBasisPoints),
  },
  { label: "Session Discount Amount (INR)", value: (record) => record.discountAmount },
  {
    label: "Settlement Discount (%)",
    value: (record) => percent(record.settlementDiscountPercentBasisPoints),
  },
  { label: "Settlement Discount Amount (INR)", value: (record) => record.settlementDiscountAmount },
  { label: "Final Amount (INR)", value: (record) => record.amount },
  { label: "Payer Shares JSON", value: (record) => json(record.payerShares), text: true },
  { label: "Payment Status", value: (record) => record.paymentStatus, text: true },
  { label: "Payment Method", value: (record) => record.paymentMethod, text: true },
  { label: "Payer Name", value: (record) => record.payerName, text: true },
  { label: "Paid At (Academy local)", value: (record) => localDateTime(record.paidAt) },
  { label: "Created At (Academy local)", value: (record) => localDateTime(record.createdAt) },
  { label: "Updated At (Academy local)", value: (record) => localDateTime(record.updatedAt) },
  { label: "Created By ID", value: (record) => record.createdById, text: true },
];

function localDateTime(value: Date | null) {
  if (!value) return "";
  return academyDateTimeFormatter.format(value).replace(",", "");
}

function percent(basisPoints: number) {
  return basisPoints / 100;
}

function json(value: unknown) {
  return value === null || value === undefined ? "" : JSON.stringify(value);
}

function csvCell(value: unknown, text = false) {
  if (value === null || value === undefined) return "";
  let normalized = typeof value === "string" ? value : String(value);
  if (text) {
    let firstMeaningfulCharacter = 0;
    while (
      firstMeaningfulCharacter < normalized.length &&
      normalized.charCodeAt(firstMeaningfulCharacter) <= 32
    ) {
      firstMeaningfulCharacter += 1;
    }
    if ("=+-@".includes(normalized[firstMeaningfulCharacter] ?? "")) normalized = `'${normalized}`;
  }
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function ledgerCsvHeader() {
  return COLUMNS.map(({ label }) => csvCell(label)).join(",");
}

export function ledgerCsvRows(records: LedgerCsvRecord[]) {
  return records
    .map((record) => COLUMNS.map(({ value, text }) => csvCell(value(record), text)).join(","))
    .join("\r\n");
}
