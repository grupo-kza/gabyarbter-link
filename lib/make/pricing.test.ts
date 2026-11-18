import assert from "node:assert/strict";
import test from "node:test";

import {
  cardPriceCents,
  checkManualTotal,
  MAX_MANUAL_TOTAL_CENTS,
  parseBRLToCents,
  priceForDate,
  priceWithVoucher,
  SPECIAL_DAY_CASH_CENTS,
  specialDayCashCents,
} from "./pricing.ts";

test("reads the ways a value is typed in reais", () => {
  assert.equal(parseBRLToCents("250"), 25_000);
  assert.equal(parseBRLToCents("250,5"), 25_050);
  assert.equal(parseBRLToCents("250,50"), 25_050);
  assert.equal(parseBRLToCents("1.250,50"), 125_050);
  assert.equal(parseBRLToCents("R$ 1.250,00"), 125_000);
  assert.equal(parseBRLToCents("0"), 0);
});

test("rejects what is not a value", () => {
  for (const raw of ["", "abc", "-10", "10,123", "1.25", "12.34,00", "10,"]) {
    assert.equal(parseBRLToCents(raw), null, raw);
  }
});

test("recalculates the remainder and keeps the paid deposit", () => {
  assert.deepEqual(checkManualTotal({ totalCents: 40_000, depositCents: 9_000, finalPaid: false }), {
    ok: true,
    remainingCents: 31_000,
  });
});

test("accepts a total equal to the paid deposit", () => {
  assert.deepEqual(checkManualTotal({ totalCents: 9_000, depositCents: 9_000, finalPaid: false }), {
    ok: true,
    remainingCents: 0,
  });
});

test("never goes below the paid deposit", () => {
  const result = checkManualTotal({ totalCents: 8_999, depositCents: 9_000, finalPaid: false });
  assert.equal(result.ok, false);
});

test("locks the value once the payment is marked", () => {
  const result = checkManualTotal({ totalCents: 40_000, depositCents: 0, finalPaid: true });
  assert.equal(result.ok, false);
});

test("rejects negative, fractional and absurd totals", () => {
  for (const totalCents of [-1, 10.5, MAX_MANUAL_TOTAL_CENTS + 1]) {
    assert.equal(checkManualTotal({ totalCents, depositCents: 0, finalPaid: false }).ok, false);
  }
});

test("Sunday and holiday price for Express and Blindada", () => {
  const express = { slug: "express", price_cents: 17_500 };
  const blindada = { slug: "blindada", price_cents: 20_000 };
  assert.equal(priceForDate(express, "2026-11-22"), 23_000); // domingo
  assert.equal(priceForDate(blindada, "2026-11-22"), 23_000);
  assert.equal(priceForDate(blindada, "2026-12-25"), 23_000); // Natal numa sexta
  assert.equal(cardPriceCents(priceForDate(blindada, "2026-12-25")), 24_000);
  assert.equal(priceForDate(express, "2026-11-21"), 17_500); // sábado comum
  assert.equal(priceForDate(blindada, "2026-11-23"), 20_000); // segunda comum
  assert.equal(priceForDate(blindada, null), 20_000); // sem dia escolhido
});

test("other services keep their table price on Sundays", () => {
  assert.equal(priceForDate({ slug: "outro-migrado", price_cents: 15_000 }, "2026-11-22"), 15_000);
  assert.equal(specialDayCashCents({ slug: "outro-migrado" }), null);
  assert.equal(specialDayCashCents({ slug: "express" }), SPECIAL_DAY_CASH_CENTS);
});

test("voucher discount applies over the Sunday price", () => {
  const blindada = { slug: "blindada", price_cents: priceForDate({ slug: "blindada", price_cents: 20_000 }, "2026-11-22") };
  const voucher = { code: "x", name: "x", serviceSlug: "blindada", discountPct: 10 };
  assert.equal(priceWithVoucher(blindada, voucher), 20_700);
});
