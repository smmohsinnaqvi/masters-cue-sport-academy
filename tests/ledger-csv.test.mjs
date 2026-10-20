import assert from "node:assert/strict";
import test from "node:test";
import { ledgerCsvHeader, ledgerCsvRows } from "../src/lib/ledger-csv.ts";

const record = {
  id: "session-1",
  tableId: "table-1",
  table: { name: "Table, Alpha", type: "SNOOKER" },
  source: "WALKIN",
  status: "COMPLETED",
  startTime: new Date("2025-06-30T18:30:00.000Z"),
  plannedEnd: new Date("2025-06-30T20:30:00.000Z"),
  actualStart: null,
  actualEnd: new Date("2025-06-30T20:00:00.000Z"),
  holdExpiresAt: null,
  customerName: '=HYPERLINK("https://example.invalid","click")',
  customerPhone: "+919876543210",
  refCode: "BOOK-1",
  players: [{ name: 'A "Player"' }],
  gameFormat: "SINGLES",
  gameLabel: null,
  walkInOpenEnded: false,
  loserName: "Player",
  rateSnapshot: 600,
  durationMinutes: 90,
  grossAmount: 900,
  discountPercentBasisPoints: 1250,
  discountAmount: 112,
  settlementDiscountPercentBasisPoints: 500,
  settlementDiscountAmount: 39,
  amount: 749,
  payerShares: [{ name: "Player", amount: 749 }],
  paymentStatus: "PAID",
  paymentMethod: "CASH",
  payerName: "Player",
  paidAt: new Date("2025-06-30T20:00:00.000Z"),
  createdAt: new Date("2025-06-30T18:29:00.000Z"),
  updatedAt: new Date("2025-06-30T20:00:00.000Z"),
  createdById: "supervisor-1",
};

function parseCsvRow(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

test("exports all ledger columns and safely quotes values", () => {
  const header = ledgerCsvHeader();
  const row = ledgerCsvRows([record]);
  const headers = parseCsvRow(header);
  const values = parseCsvRow(row);
  const column = (name) => values[headers.indexOf(name)];

  assert.match(header, /"Players JSON"/);
  assert.match(header, /"Settlement Discount Amount \(INR\)"/);
  assert.match(header, /"Created By ID"/);
  assert.equal(column("Table Name"), record.table.name);
  assert.equal(column("Players JSON"), JSON.stringify(record.players));
  assert.equal(column("Customer Name"), `'${record.customerName}`);
  assert.match(column("Scheduled Start (Academy local)"), /^2025-07-01/);
});

test("returns no data rows for an empty export page", () => {
  assert.equal(ledgerCsvRows([]), "");
});
