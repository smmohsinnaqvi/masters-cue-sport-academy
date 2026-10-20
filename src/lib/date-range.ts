import { academyDateKey, academyDateKeyForOffset } from "@/lib/academy-time";

export type DateRangePreset = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "CUSTOM";

export type DateRangeSelection = {
  preset: DateRangePreset;
  from: string;
  to: string;
};

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "CUSTOM", label: "Custom" },
];

export function dateRangeForPreset(preset: Exclude<DateRangePreset, "CUSTOM">, now = new Date()) {
  const today = academyDateKey(now);
  if (preset === "TODAY") return { from: today, to: today };
  if (preset === "YESTERDAY") {
    const yesterday = academyDateKeyForOffset(-1, now);
    return { from: yesterday, to: yesterday };
  }
  if (preset === "LAST_7_DAYS") {
    return { from: academyDateKeyForOffset(-6, now), to: today };
  }
  const [year, month] = today.split("-");
  const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function initialDateRange(now = new Date()): DateRangeSelection {
  return { preset: "TODAY", ...dateRangeForPreset("TODAY", now) };
}

export function isDateRangeKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isDateRangeValid(from: string, to: string) {
  return isDateRangeKey(from) && isDateRangeKey(to) && from <= to;
}

export function formatDateRangeKey(value: string) {
  if (!isDateRangeKey(value)) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

export function inclusiveDateCount(from: string, to: string) {
  if (!isDateRangeValid(from, to)) return 0;
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const end = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function shiftDateRange(selection: DateRangeSelection, direction: -1 | 1) {
  if (!isDateRangeValid(selection.from, selection.to)) return selection;
  const days = inclusiveDateCount(selection.from, selection.to);
  const from = new Date(`${selection.from}T12:00:00.000Z`);
  const to = new Date(`${selection.to}T12:00:00.000Z`);
  from.setUTCDate(from.getUTCDate() + direction * days);
  to.setUTCDate(to.getUTCDate() + direction * days);
  return {
    ...selection,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    preset: "CUSTOM" as const,
  };
}
