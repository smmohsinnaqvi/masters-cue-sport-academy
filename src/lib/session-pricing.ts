export function sessionDurationMinutes(start: Date, end: Date) {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 60_000));
}

export function sessionCharge(ratePerHour: number, durationMinutes: number) {
  return Math.round((ratePerHour * durationMinutes) / 60);
}
