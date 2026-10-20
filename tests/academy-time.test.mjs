import assert from "node:assert/strict";
import test from "node:test";
import { academyDateRangeUtcBounds } from "../src/lib/academy-time.ts";

test("converts an inclusive academy-local date range to UTC bounds", () => {
  const { start, end } = academyDateRangeUtcBounds("2025-07-01", "2025-07-07");

  assert.equal(start.toISOString(), "2025-06-30T18:30:00.000Z");
  assert.equal(end.toISOString(), "2025-07-06T18:30:00.000Z");
});

test("rejects invalid and reversed academy-local date ranges", () => {
  assert.throws(() => academyDateRangeUtcBounds("2025-02-29", "2025-03-01"));
  assert.throws(() => academyDateRangeUtcBounds("2025-07-02", "2025-07-01"));
});
