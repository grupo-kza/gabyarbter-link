import assert from "node:assert/strict";
import test from "node:test";

import { buildScheduleGaps, resolveManualAppointmentWindow } from "./manual-overlap.ts";

const conflict = {
  id: "existing-1",
  clientName: "Ana",
  startsAt: "2026-07-18T16:00:00.000Z",
  endsAt: "2026-07-18T17:30:00.000Z",
};

test("asks for confirmation when another client overlaps the requested window", () => {
  const result = resolveManualAppointmentWindow({
    startsAt: new Date("2026-07-18T15:30:00.000Z"),
    durationMin: 90,
    appointmentConflict: conflict,
    allowOverlap: false,
  });

  assert.deepEqual(result, {
    ok: false,
    kind: "appointment_conflict",
    conflict,
    requestedDurationMin: 90,
    suggestedDurationMin: 30,
  });
});

test("accepts a shorter duration when it ends before the existing client", () => {
  const result = resolveManualAppointmentWindow({
    startsAt: new Date("2026-07-18T15:30:00.000Z"),
    durationMin: 30,
    appointmentConflict: null,
    allowOverlap: false,
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.endsAt.toISOString(), "2026-07-18T16:00:00.000Z");
});

test("allows the overlap only after explicit confirmation", () => {
  const result = resolveManualAppointmentWindow({
    startsAt: new Date("2026-07-18T15:30:00.000Z"),
    durationMin: 90,
    appointmentConflict: conflict,
    allowOverlap: true,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.endsAt.toISOString(), "2026-07-18T17:00:00.000Z");
    assert.equal(result.isOverlap, true);
  }
});

test("rejects durations shorter than 15 minutes", () => {
  const result = resolveManualAppointmentWindow({
    startsAt: new Date("2026-07-18T15:30:00.000Z"),
    durationMin: 10,
    appointmentConflict: null,
    allowOverlap: false,
  });

  assert.deepEqual(result, {
    ok: false,
    kind: "invalid_duration",
    error: "O atendimento precisa ter pelo menos 15 minutos.",
  });
});

const ana = { id: "a", clientName: "Ana", startsAt: "2026-07-18T13:00:00.000Z", endsAt: "2026-07-18T14:00:00.000Z" };
const bia = { id: "b", clientName: "Bia", startsAt: "2026-07-18T16:00:00.000Z", endsAt: "2026-07-18T17:00:00.000Z" };

test("shows the free minutes to the client before and after", () => {
  const gaps = buildScheduleGaps({
    startsAt: new Date("2026-07-18T14:30:00.000Z"),
    endsAt: new Date("2026-07-18T15:30:00.000Z"),
    others: [bia, ana],
  });

  assert.equal(gaps.before?.clientName, "Ana");
  assert.equal(gaps.before?.gapMin, 30);
  assert.equal(gaps.before?.startDiffMin, 90);
  assert.equal(gaps.after?.clientName, "Bia");
  assert.equal(gaps.after?.gapMin, 30);
  assert.equal(gaps.after?.startDiffMin, 90);
  assert.deepEqual(gaps.conflicts, []);
});

test("reports a negative gap when the previous client overlaps", () => {
  const gaps = buildScheduleGaps({
    startsAt: new Date("2026-07-18T13:40:00.000Z"),
    endsAt: new Date("2026-07-18T14:40:00.000Z"),
    others: [ana, bia],
  });

  assert.equal(gaps.before?.gapMin, -20);
  assert.equal(gaps.before?.startDiffMin, 40);
  assert.equal(gaps.after?.gapMin, 80);
  assert.deepEqual(gaps.conflicts.map((c) => c.id), ["a"]);
});

test("reports a negative gap when the next client overlaps", () => {
  const gaps = buildScheduleGaps({
    startsAt: new Date("2026-07-18T15:30:00.000Z"),
    endsAt: new Date("2026-07-18T16:15:00.000Z"),
    others: [ana, bia],
  });

  assert.equal(gaps.after?.gapMin, -15);
  assert.equal(gaps.after?.startDiffMin, 30);
  assert.deepEqual(gaps.conflicts.map((c) => c.id), ["b"]);
});

test("treats back to back clients as no gap and no conflict", () => {
  const gaps = buildScheduleGaps({
    startsAt: new Date("2026-07-18T14:00:00.000Z"),
    endsAt: new Date("2026-07-18T16:00:00.000Z"),
    others: [ana, bia],
  });

  assert.equal(gaps.before?.gapMin, 0);
  assert.equal(gaps.after?.gapMin, 0);
  assert.deepEqual(gaps.conflicts, []);
});

test("lists every overlapping client, even beyond the nearest ones", () => {
  const cris = { id: "c", clientName: "Cris", startsAt: "2026-07-18T13:30:00.000Z", endsAt: "2026-07-18T14:30:00.000Z" };
  const gaps = buildScheduleGaps({
    startsAt: new Date("2026-07-18T13:45:00.000Z"),
    endsAt: new Date("2026-07-18T16:30:00.000Z"),
    others: [bia, cris, ana],
  });

  assert.equal(gaps.before?.clientName, "Cris");
  assert.deepEqual(gaps.conflicts.map((c) => c.id), ["a", "c", "b"]);
});

test("handles an empty day", () => {
  const gaps = buildScheduleGaps({
    startsAt: new Date("2026-07-18T14:00:00.000Z"),
    endsAt: new Date("2026-07-18T15:00:00.000Z"),
    others: [],
  });

  assert.deepEqual(gaps, { before: null, after: null, conflicts: [] });
});

test("rejects durations above the 12 hour limit", () => {
  const result = resolveManualAppointmentWindow({
    startsAt: new Date("2026-07-18T15:30:00.000Z"),
    durationMin: 721,
    appointmentConflict: null,
    allowOverlap: false,
  });

  assert.deepEqual(result, {
    ok: false,
    kind: "invalid_duration",
    error: "O atendimento pode ter no máximo 720 minutos.",
  });
});
