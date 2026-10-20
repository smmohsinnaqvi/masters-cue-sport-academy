import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLedgerFilterWhere,
  isLedgerPaymentFilter,
  isLedgerTableTypeFilter,
} from "../src/lib/ledger-filters.ts";

test("builds no ledger constraints for all-status and all-table filters", () => {
  assert.deepEqual(buildLedgerFilterWhere("ALL", "ALL"), {});
});

test("combines payment status and table type ledger filters", () => {
  assert.deepEqual(buildLedgerFilterWhere("UNPAID", "POOL"), {
    paymentStatus: "UNPAID",
    table: { is: { type: "POOL" } },
  });
});

test("accepts only supported ledger filter values", () => {
  assert.equal(isLedgerPaymentFilter("PAID"), true);
  assert.equal(isLedgerPaymentFilter("ALL"), true);
  assert.equal(isLedgerPaymentFilter("PENDING"), false);
  assert.equal(isLedgerTableTypeFilter("SNOOKER"), true);
  assert.equal(isLedgerTableTypeFilter("POOL"), true);
  assert.equal(isLedgerTableTypeFilter("ENGLISH"), false);
});
