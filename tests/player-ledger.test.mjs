import assert from "node:assert/strict";
import test from "node:test";
import {
  allocatePaymentOldestFirst,
  outstandingAmount,
} from "../src/lib/player-ledger.ts";

test("allocates partial account payments to the oldest sessions first", () => {
  assert.deepEqual(
    allocatePaymentOldestFirst(
      [
        { id: "old", outstandingAmount: 400 },
        { id: "newer", outstandingAmount: 700 },
      ],
      650,
    ),
    [
      { dueId: "old", amount: 400 },
      { dueId: "newer", amount: 250 },
    ],
  );
});

test("allocates a full payment across dues without exceeding any charge", () => {
  assert.deepEqual(
    allocatePaymentOldestFirst(
      [
        { id: "first", outstandingAmount: 250 },
        { id: "second", outstandingAmount: 0 },
        { id: "third", outstandingAmount: 450 },
      ],
      700,
    ),
    [
      { dueId: "first", amount: 250 },
      { dueId: "third", amount: 450 },
    ],
  );
});

test("rejects invalid and over-balance payments", () => {
  const dues = [{ id: "one", outstandingAmount: 500 }];
  assert.throws(() => allocatePaymentOldestFirst(dues, 0));
  assert.throws(() => allocatePaymentOldestFirst(dues, 501));
  assert.throws(() => allocatePaymentOldestFirst([{ id: "bad", outstandingAmount: -1 }], 1));
});

test("derives charge balance and rejects invalid allocation totals", () => {
  assert.equal(outstandingAmount(800, 250), 550);
  assert.throws(() => outstandingAmount(100, 120));
});
