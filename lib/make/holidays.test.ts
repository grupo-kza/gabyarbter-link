import assert from "node:assert/strict";
import test from "node:test";

import { easterYmd, holidayName, isSundayOrHoliday, weekdayOfYmd } from "./holidays.ts";

test("Easter matches known dates", () => {
  assert.equal(easterYmd(2025), "2025-04-20");
  assert.equal(easterYmd(2026), "2026-04-05");
  assert.equal(easterYmd(2027), "2027-03-28");
  assert.equal(easterYmd(2028), "2028-04-16");
});

test("national, RS and Erechim holidays count", () => {
  for (const ymd of [
    "2026-01-01", "2026-04-21", "2026-05-01", "2026-09-07", "2026-10-12",
    "2026-11-02", "2026-11-15", "2026-11-20", "2026-12-25",
    "2026-09-20", // Farroupilha (RS)
    "2027-03-19", // São José, padroeiro de Erechim
    "2026-04-03", // Sexta-feira da Paixão 2026
    "2026-06-04", // Corpus Christi 2026 (prefeitura de Erechim)
    "2027-05-27", // Corpus Christi 2027
  ]) {
    assert.ok(holidayName(ymd), ymd);
  }
});

test("ordinary days and Carnaval are not holidays", () => {
  for (const ymd of ["2026-11-18", "2026-02-17", "2026-04-30", "2026-11-21", "bad"]) {
    assert.equal(holidayName(ymd), null, ymd);
  }
});

test("Sunday or holiday", () => {
  assert.equal(weekdayOfYmd("2026-11-22"), 0);
  assert.equal(isSundayOrHoliday("2026-11-22"), true); // domingo
  assert.equal(isSundayOrHoliday("2026-11-20"), true); // feriado numa sexta
  assert.equal(isSundayOrHoliday("2026-11-21"), false); // sábado comum
  assert.equal(isSundayOrHoliday("2026-11-23"), false); // segunda comum
});
