export const MIN_MANUAL_DURATION_MIN = 15;

export type AppointmentConflict = {
  id: string;
  clientName: string;
  startsAt: string;
  endsAt: string;
};

/** Cliente vizinha na agenda e a distância em minutos até o horário escolhido. */
export type NeighborGap = AppointmentConflict & {
  /** Intervalo livre entre as duas. Negativo = minutos em que elas se cruzam. */
  gapMin: number;
  /** Diferença entre os dois inícios, sempre positiva. */
  startDiffMin: number;
};

export type ScheduleGaps = {
  before: NeighborGap | null;
  after: NeighborGap | null;
  /** Todas as clientes que cruzam com o horário, da primeira à última. */
  conflicts: AppointmentConflict[];
};

const minutesBetween = (later: Date, earlier: Date) =>
  Math.round((later.getTime() - earlier.getTime()) / 60_000);

/**
 * Calcula a cliente de antes e a de depois de um horário. "Antes" é quem começa
 * até o mesmo minuto; "depois" é quem começa mais tarde.
 */
export function buildScheduleGaps(input: {
  startsAt: Date;
  endsAt: Date;
  others: AppointmentConflict[];
}): ScheduleGaps {
  const { startsAt, endsAt } = input;
  const sorted = [...input.others].sort(
    (a, b) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() ||
      new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime(),
  );

  const earlier = sorted.filter((o) => new Date(o.startsAt) <= startsAt);
  const beforeAppt = earlier[earlier.length - 1] ?? null;
  const afterAppt = sorted.find((o) => new Date(o.startsAt) > startsAt) ?? null;

  return {
    before: beforeAppt && {
      ...beforeAppt,
      gapMin: minutesBetween(startsAt, new Date(beforeAppt.endsAt)),
      startDiffMin: minutesBetween(startsAt, new Date(beforeAppt.startsAt)),
    },
    after: afterAppt && {
      ...afterAppt,
      gapMin: minutesBetween(new Date(afterAppt.startsAt), endsAt),
      startDiffMin: minutesBetween(new Date(afterAppt.startsAt), startsAt),
    },
    conflicts: sorted.filter(
      (o) => new Date(o.startsAt) < endsAt && new Date(o.endsAt) > startsAt,
    ),
  };
}

type WindowResult =
  | { ok: true; endsAt: Date; isOverlap: boolean }
  | {
      ok: false;
      kind: "appointment_conflict";
      conflict: AppointmentConflict;
      requestedDurationMin: number;
      suggestedDurationMin: number | null;
    }
  | { ok: false; kind: "invalid_duration"; error: string };

export function resolveManualAppointmentWindow(input: {
  startsAt: Date;
  durationMin: number;
  appointmentConflict: AppointmentConflict | null;
  allowOverlap: boolean;
}): WindowResult {
  if (!Number.isInteger(input.durationMin) || input.durationMin < MIN_MANUAL_DURATION_MIN) {
    return {
      ok: false,
      kind: "invalid_duration",
      error: `O atendimento precisa ter pelo menos ${MIN_MANUAL_DURATION_MIN} minutos.`,
    };
  }

  const endsAt = new Date(input.startsAt.getTime() + input.durationMin * 60_000);
  if (input.appointmentConflict && !input.allowOverlap) {
    const availableMinutes = Math.floor(
      (new Date(input.appointmentConflict.startsAt).getTime() - input.startsAt.getTime()) / 60_000,
    );
    return {
      ok: false,
      kind: "appointment_conflict",
      conflict: input.appointmentConflict,
      requestedDurationMin: input.durationMin,
      suggestedDurationMin:
        availableMinutes >= MIN_MANUAL_DURATION_MIN ? availableMinutes : null,
    };
  }

  return { ok: true, endsAt, isOverlap: Boolean(input.appointmentConflict) };
}
