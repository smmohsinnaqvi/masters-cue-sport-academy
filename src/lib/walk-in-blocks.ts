export function getWalkInCutoff(closingTime: Date, nextBookingStart: Date | null) {
  return new Date(
    Math.min(closingTime.getTime(), nextBookingStart?.getTime() ?? Number.POSITIVE_INFINITY),
  );
}

export function getWalkInAvailableMinutes(start: Date, cutoff: Date) {
  return Math.floor((cutoff.getTime() - start.getTime()) / 60_000);
}

export function getWalkInBlockEnd(start: Date, durationMinutes: number, cutoff: Date) {
  return new Date(Math.min(start.getTime() + durationMinutes * 60_000, cutoff.getTime()));
}

export function getWalkInExtensionEnd(
  now: Date,
  plannedEnd: Date,
  cutoff: Date,
  extensionMinutes: number,
) {
  const extensionEnd = new Date(
    Math.max(now.getTime(), plannedEnd.getTime()) + extensionMinutes * 60_000,
  );
  return extensionEnd.getTime() <= cutoff.getTime() ? extensionEnd : null;
}
