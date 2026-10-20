export const WALKIN_BLOCK_OPTIONS = [30, 60, 90, 120, 180] as const;
export const WALKIN_CUSTOM_DURATION_MINUTES = 30;
export const WALKIN_CUSTOM_DURATION_MAX_MINUTES = 24 * 60;
export const WALKIN_CUSTOM_DURATION_STEP_MINUTES = 30;

export const OPEN_WALKIN_PLANNED_END = new Date("9999-12-31T23:59:59.999Z");

export type WalkInHoldMode = "OPEN" | "TIMED" | "CUSTOM";

export function getWalkInCutoff(nextBookingStart: Date | null) {
  return nextBookingStart;
}

export function validateWalkInHold(mode: WalkInHoldMode, durationMinutes: number) {
  if (mode === "OPEN") return;
  if (mode === "TIMED" && WALKIN_BLOCK_OPTIONS.some((value) => value === durationMinutes)) {
    return;
  }
  if (
    mode === "CUSTOM" &&
    Number.isInteger(durationMinutes) &&
    durationMinutes >= WALKIN_CUSTOM_DURATION_MINUTES &&
    durationMinutes <= WALKIN_CUSTOM_DURATION_MAX_MINUTES &&
    durationMinutes % WALKIN_CUSTOM_DURATION_STEP_MINUTES === 0
  ) {
    return;
  }
  throw new Error(
    mode === "CUSTOM"
      ? "Custom holds must be 30-minute increments between 30 minutes and 24 hours"
      : "Choose a valid walk-in hold duration",
  );
}

export function getWalkInAvailableMinutes(start: Date, cutoff: Date | null) {
  return cutoff
    ? Math.floor((cutoff.getTime() - start.getTime()) / 60_000)
    : Number.POSITIVE_INFINITY;
}

export function getWalkInBlockEnd(start: Date, durationMinutes: number, cutoff: Date | null) {
  const desiredEnd = start.getTime() + durationMinutes * 60_000;
  return new Date(cutoff ? Math.min(desiredEnd, cutoff.getTime()) : desiredEnd);
}

export function getWalkInPlannedEnd(
  start: Date,
  durationMinutes: number,
  cutoff: Date | null,
  openEnded: boolean,
) {
  if (openEnded) return cutoff ?? OPEN_WALKIN_PLANNED_END;
  return getWalkInBlockEnd(start, durationMinutes, cutoff);
}

export function getWalkInExtensionEnd(
  now: Date,
  plannedEnd: Date,
  cutoff: Date | null,
  extensionMinutes: number,
) {
  const extensionEnd = new Date(
    Math.max(now.getTime(), plannedEnd.getTime()) + extensionMinutes * 60_000,
  );
  return !cutoff || extensionEnd.getTime() <= cutoff.getTime() ? extensionEnd : null;
}
