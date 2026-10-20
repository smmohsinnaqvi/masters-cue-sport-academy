import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSettlementDiscount,
  closeoutPayerShares,
  discountPercentFromBasisPoints,
  discountPercentToBasisPoints,
  discountedSessionCharge,
  sessionCharge,
  sessionDurationMinutes,
  sessionPlayerNames,
  playerNamesForTeam,
  splitSessionCharge,
  validateSessionPlayers,
} from "../src/lib/session-pricing.ts";
import {
  bookingCustomerSchema,
  cafeteriaItemFormSchema,
  normalizeIndianMobile,
  ratesFormSchema,
  sanitizeIndianMobileInput,
  shopProductFormSchema,
  tournamentFormSchema,
} from "../src/lib/form-validation.ts";
import {
  getWalkInPlannedEnd,
  getWalkInAvailableMinutes,
  getWalkInBlockEnd,
  getWalkInExtensionEnd,
  validateWalkInHold,
} from "../src/lib/walk-in-blocks.ts";

test("bills only completed minutes", () => {
  const start = new Date("2025-01-01T00:00:00.000Z");
  assert.equal(sessionDurationMinutes(start, new Date(start.getTime() + 59_999)), 0);
  assert.equal(sessionDurationMinutes(start, new Date(start.getTime() + 60_000)), 1);
  assert.equal(sessionDurationMinutes(start, new Date(start.getTime() + 119_999)), 1);
  assert.equal(sessionDurationMinutes(start, new Date(start.getTime() + 120_000)), 2);
  assert.equal(sessionDurationMinutes(start, new Date(start.getTime() - 1)), 0);
});

test("calculates whole-minute charges and applies discount to gross amount", () => {
  assert.equal(sessionCharge(600, 0), 0);
  assert.equal(sessionCharge(600, 1), 10);
  assert.equal(sessionCharge(600, 3), 30);
  assert.equal(discountedSessionCharge(101, 25), 76);
  assert.equal(discountedSessionCharge(101, 0.5), 100);
  assert.equal(discountedSessionCharge(1000, 12.75), 873);
  assert.equal(discountedSessionCharge(101, 100), 0);
});

test("accepts bounded percentage discounts with up to two decimal places", () => {
  assert.equal(discountPercentToBasisPoints("0"), 0);
  assert.equal(discountPercentToBasisPoints("0.5"), 50);
  assert.equal(discountPercentToBasisPoints("12.75"), 1275);
  assert.equal(discountPercentToBasisPoints("100"), 10_000);
  assert.equal(discountPercentFromBasisPoints(50), 0.5);
  for (const invalid of ["-0.01", "100.01", "1.234", "abc", ""]) {
    assert.throws(() => discountPercentToBasisPoints(invalid), /between 0 and 100/);
  }
});

test("applies dues settlement discounts to outstanding balances with a no-stacking guard", () => {
  assert.deepEqual(calculateSettlementDiscount(1001, 12.5, 0), {
    amount: 876,
    discountAmount: 125,
    discountBasisPoints: 1250,
  });
  assert.deepEqual(calculateSettlementDiscount(100, 0, 1500), {
    amount: 100,
    discountAmount: 0,
    discountBasisPoints: 0,
  });
  assert.throws(() => calculateSettlementDiscount(100, 5, 1500), /cannot receive another discount/);
});

test("normalizes valid Indian mobile numbers and rejects invalid inputs", () => {
  assert.equal(normalizeIndianMobile("98765 43210"), "+919876543210");
  assert.equal(normalizeIndianMobile("+91 (98765) 43210"), "+919876543210");
  assert.equal(normalizeIndianMobile("91-98765-43210"), "+919876543210");
  for (const invalid of ["987654321", "1234567890", "98765432100", "abcd9876543210"]) {
    assert.throws(() => normalizeIndianMobile(invalid), /valid|digits/);
  }
});

test("keeps phone entry autofill-friendly while filtering letters and supports walk-ins past closing", () => {
  assert.equal(sanitizeIndianMobileInput("+91 abc 98765-43210"), "+91 98765-43210");

  const start = new Date("2026-10-17T23:30:00.000Z");
  const end = getWalkInBlockEnd(start, 60, null);
  assert.equal(end.toISOString(), "2026-10-18T00:30:00.000Z");
  assert.equal(getWalkInAvailableMinutes(start, null), Number.POSITIVE_INFINITY);
  assert.equal(
    getWalkInExtensionEnd(end, end, null, 30)?.toISOString(),
    "2026-10-18T01:00:00.000Z",
  );

  const nextBooking = new Date("2026-10-18T00:15:00.000Z");
  assert.equal(getWalkInBlockEnd(start, 60, nextBooking).toISOString(), nextBooking.toISOString());
});

test("validates customer and admin form schemas", () => {
  assert.deepEqual(bookingCustomerSchema.parse({ name: "  Cue Player ", phone: "98765 43210" }), {
    name: "Cue Player",
    phone: "+919876543210",
  });
  assert.equal(cafeteriaItemFormSchema.parse({ name: "Tea", note: "", price: "" }).price, 0);
  assert.deepEqual(ratesFormSchema.parse({ snooker: "500", pool: "250" }), {
    snooker: 500,
    pool: 250,
  });
  assert.equal(
    tournamentFormSchema.parse({
      title: "Open",
      date: "2026-12-01",
      entryFee: "",
      prizePool: "1000",
    }).entryFee,
    0,
  );
  assert.equal(
    shopProductFormSchema.parse({
      name: "Cue",
      description: "Good cue",
      category: "CUES",
      price: "1000",
      discountPercent: "15",
    }).discountPercent,
    15,
  );
  assert.equal(ratesFormSchema.safeParse({ snooker: "", pool: "250" }).success, false);
  assert.equal(
    tournamentFormSchema.safeParse({
      title: "Open",
      date: "2026-02-30",
      entryFee: "",
      prizePool: "",
    }).success,
    false,
  );
});

test("splits rupee remainders in payer selection order", () => {
  assert.deepEqual(splitSessionCharge(10, ["A", "B", "C"]), [
    { name: "A", amount: 4 },
    { name: "B", amount: 3 },
    { name: "C", amount: 3 },
  ]);
  assert.deepEqual(splitSessionCharge(0, ["A", "B"]), [
    { name: "A", amount: 0 },
    { name: "B", amount: 0 },
  ]);
  assert.deepEqual(splitSessionCharge(10, ["A", "a", "B"]), [
    { name: "A", amount: 5 },
    { name: "B", amount: 5 },
  ]);
  assert.equal(
    splitSessionCharge(100, ["A", "B", "C"]).reduce((total, share) => total + share.amount, 0),
    100,
  );
});

test("selects the chosen doubles team and permits empty payers only for zero-balance closeout", () => {
  const players = [
    { name: "A1", team: "A" },
    { name: "A2", team: "A" },
    { name: "B1", team: "B" },
    { name: "B2", team: "B" },
  ];
  assert.deepEqual(playerNamesForTeam(players, "A"), ["A1", "A2"]);
  assert.deepEqual(playerNamesForTeam(players, "B"), ["B1", "B2"]);
  assert.deepEqual(closeoutPayerShares(0, []), []);
  assert.deepEqual(closeoutPayerShares(61, ["B1", "B2"]), [
    { name: "B1", amount: 31 },
    { name: "B2", amount: 30 },
  ]);
  assert.throws(() => closeoutPayerShares(61, []), /Select at least one payer/);
});

test("validates singles, balanced doubles, and three-to-six-player groups", () => {
  assert.equal(validateSessionPlayers("SINGLES", [{ name: "A" }, { name: "B" }]).players.length, 2);
  assert.equal(
    validateSessionPlayers("SOLO", [{ name: "A" }], "Line Drills").gameLabel,
    "Line Drills",
  );
  assert.throws(() => validateSessionPlayers("SOLO", []), /between 1 and 1 players/);
  assert.equal(
    validateSessionPlayers("DOUBLES", [
      { name: "A", team: "A" },
      { name: "B", team: "A" },
      { name: "C", team: "B" },
      { name: "D", team: "B" },
    ]).players.length,
    4,
  );
  assert.equal(
    validateSessionPlayers("GROUP", [{ name: "A" }, { name: "B" }, { name: "C" }], "Century")
      .gameLabel,
    "Century",
  );
  assert.throws(
    () =>
      validateSessionPlayers("DOUBLES", [
        { name: "A", team: "A" },
        { name: "B", team: "A" },
        { name: "C", team: "A" },
        { name: "D", team: "B" },
      ]),
    /two players on each team/,
  );
  assert.throws(
    () => validateSessionPlayers("GROUP", [{ name: "A" }, { name: "B" }]),
    /between 3 and 6 players/,
  );
  assert.throws(
    () => validateSessionPlayers("SINGLES", [{ name: "Alex" }, { name: " alex " }]),
    /distinct name/,
  );
});

test("validates timed, custom, and open walk-in holds without closing-time restrictions", () => {
  validateWalkInHold("TIMED", 60);
  validateWalkInHold("CUSTOM", 90);
  validateWalkInHold("OPEN", 0);
  for (const duration of [0, 29, 45, 1_470]) {
    assert.throws(() => validateWalkInHold("CUSTOM", duration), /30-minute increments/);
  }

  const start = new Date("2026-10-17T23:30:00.000Z");
  const nextBooking = new Date("2026-10-18T01:00:00.000Z");
  assert.equal(
    getWalkInPlannedEnd(start, 60, null, true).toISOString(),
    "9999-12-31T23:59:59.999Z",
  );
  assert.equal(
    getWalkInPlannedEnd(start, 60, nextBooking, true).toISOString(),
    nextBooking.toISOString(),
  );
  assert.equal(
    getWalkInPlannedEnd(start, 120, nextBooking, false).toISOString(),
    nextBooking.toISOString(),
  );
});

test("extracts distinct payer names and falls back for sessions without players", () => {
  assert.deepEqual(sessionPlayerNames([{ name: "Alex" }, { name: "alex" }, { name: "Sam" }]), [
    "Alex",
    "Sam",
  ]);
  assert.deepEqual(sessionPlayerNames(null, "Online guest"), ["Online guest"]);
});
