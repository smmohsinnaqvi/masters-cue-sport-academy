const ACADEMY_TIME_ZONE = "Asia/Kolkata";
const ACADEMY_OFFSET_MINUTES = 5 * 60 + 30;

function partsFor(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACADEMY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function academyDateKey(date = new Date()) {
  const parts = partsFor(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function academyDateKeyForOffset(offset: number, now = new Date()) {
  const [year, month, day] = academyDateKey(now).split("-").map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + offset));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function academyDateOffset(value: Date | string, now = new Date()) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid date");
  const target = academyDateKey(parsed).split("-").map(Number);
  const today = academyDateKey(now).split("-").map(Number);
  const targetDay = Date.UTC(target[0]!, target[1]! - 1, target[2]!);
  const todayDay = Date.UTC(today[0]!, today[1]! - 1, today[2]!);
  return Math.round((targetDay - todayDay) / 86_400_000);
}

export function academyMinutesOfDay(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACADEMY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error("Invalid date");
  }
  return hour * 60 + minute;
}

export function academyDateTimeToUtc(dateKey: string, time: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !timeMatch) throw new Error("Invalid academy date or time");

  const [, year, month, day] = match;
  const [, hour, minute] = timeMatch;
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const numericHour = Number(hour);
  const numericMinute = Number(minute);
  if (
    numericMonth < 1 ||
    numericMonth > 12 ||
    numericDay < 1 ||
    numericDay > 31 ||
    numericHour > 23 ||
    numericMinute > 59
  ) {
    throw new Error("Invalid academy date or time");
  }
  const check = new Date(Date.UTC(Number(year), numericMonth - 1, numericDay));
  if (
    check.getUTCFullYear() !== Number(year) ||
    check.getUTCMonth() !== numericMonth - 1 ||
    check.getUTCDate() !== numericDay
  ) {
    throw new Error("Invalid academy date or time");
  }

  return new Date(
    Date.UTC(Number(year), numericMonth - 1, numericDay, numericHour, numericMinute) -
      ACADEMY_OFFSET_MINUTES * 60_000,
  );
}

export function academyDayUtcBounds(dateKey: string) {
  const start = academyDateTimeToUtc(dateKey, "00:00");
  return { start, end: new Date(start.getTime() + 86_400_000) };
}
