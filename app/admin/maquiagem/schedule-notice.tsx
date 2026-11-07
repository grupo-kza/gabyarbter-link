"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Clock3, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeRangeBR } from "@/lib/make/calendar";
import type { NeighborGap, ScheduleGaps } from "@/lib/make/manual-overlap";
import { previewScheduleWindow } from "./actions";

type Preview = { gaps: ScheduleGaps; blockedError: string | null };

/** Busca o aviso de minutos sempre que data, horário ou duração mudam. */
export function useSchedulePreview(input: {
  dateYmd: string;
  startTime: string;
  durationMin: number;
  appointmentId?: string;
  enabled?: boolean;
}) {
  const { dateYmd, startTime, durationMin, appointmentId, enabled = true } = input;
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const ready = enabled && Boolean(dateYmd) && Boolean(startTime) && durationMin > 0;

  useEffect(() => {
    if (!ready) {
      setPreview(null);
      setFailed(false);
      return;
    }
    let stale = false;
    setLoading(true);
    setFailed(false);
    const timer = setTimeout(async () => {
      const res = await previewScheduleWindow({ dateYmd, startTime, durationMin, appointmentId }).catch(
        () => null,
      );
      if (stale) return;
      setPreview(res?.ok ? { gaps: res.gaps, blockedError: res.blockedError } : null);
      setFailed(!res?.ok);
      setLoading(false);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [ready, dateYmd, startTime, durationMin, appointmentId]);

  return { preview, loading: ready && loading, failed: ready && failed };
}

function gapLabel(gapMin: number): string {
  if (gapMin < 0) return `cruza ${Math.abs(gapMin)} min`;
  if (gapMin === 0) return "sem intervalo";
  return `${gapMin} min de intervalo`;
}

function NeighborRow({
  label,
  neighbor,
  startWord,
}: {
  label: string;
  neighbor: NeighborGap | null;
  startWord: string;
}) {
  if (!neighbor) {
    return (
      <p className="text-sm text-ink-soft">
        <span className="font-medium text-ink">{label}:</span> nenhuma cliente nesse dia
      </p>
    );
  }
  const crosses = neighbor.gapMin < 0;
  return (
    <div className="text-sm">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="min-w-0 break-words text-ink">
          <span className="font-medium">{label}:</span> {neighbor.clientName}
        </span>
        <span className={cn("shrink-0 font-medium tabular-nums", crosses ? "text-terra" : "text-sage-700")}>
          {gapLabel(neighbor.gapMin)}
        </span>
      </p>
      <p className="text-xs text-ink-soft tabular-nums">
        {timeRangeBR(neighbor.startsAt, neighbor.endsAt)} · começa {neighbor.startDiffMin} min {startWord}
      </p>
    </div>
  );
}

/** Mostra a diferença em minutos para a cliente de antes e a de depois. */
export function ScheduleNotice({
  preview,
  loading,
  failed,
}: {
  preview: Preview | null;
  loading: boolean;
  failed: boolean;
}) {
  if (failed) {
    return (
      <p className="text-sm text-terra inline-flex items-start gap-1.5">
        <AlertCircle className="size-4 mt-px shrink-0" />
        Não consegui conferir a agenda do dia. O choque ainda é checado ao salvar.
      </p>
    );
  }
  if (!preview) {
    if (!loading) return null;
    return (
      <p className="text-sm text-ink-soft inline-flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Conferindo a agenda do dia…
      </p>
    );
  }

  const { gaps, blockedError } = preview;
  const shownIds = new Set([gaps.before?.id, gaps.after?.id]);
  const extraConflicts = gaps.conflicts.filter((c) => !shownIds.has(c.id));
  const hasConflict = gaps.conflicts.length > 0;

  return (
    <div
      aria-live="polite"
      className={cn(
        "rounded-[0.9rem] hairline p-3 space-y-2",
        hasConflict ? "bg-terra-soft/[0.10]" : "bg-sage-50",
      )}
    >
      <p className="text-xs font-medium text-ink-soft inline-flex items-center gap-1.5">
        <Clock3 className="size-3.5" /> Diferença para as clientes do dia
      </p>
      <NeighborRow label="Antes" neighbor={gaps.before} startWord="antes" />
      <NeighborRow label="Depois" neighbor={gaps.after} startWord="depois" />
      {extraConflicts.map((c) => (
        <p key={c.id} className="text-xs text-terra tabular-nums">
          Também cruza com {c.clientName} ({timeRangeBR(c.startsAt, c.endsAt)})
        </p>
      ))}
      {blockedError && (
        <p className="text-sm text-terra inline-flex items-start gap-1.5">
          <AlertCircle className="size-4 mt-px shrink-0" />
          {blockedError}
        </p>
      )}
    </div>
  );
}

export type ConflictPromptData = {
  clientName: string;
  startsAt: string;
  endsAt: string;
  requestedDurationMin: number;
  suggestedDurationMin: number | null;
};

/** Confirmação do encaixe: reduzir o tempo ou salvar as duas clientes juntas. */
export function ConflictPrompt({
  prompt,
  pending,
  onUseSuggested,
  onOverlap,
  onBack,
  children,
}: {
  prompt: ConflictPromptData;
  pending: boolean;
  onUseSuggested: (durationMin: number) => void;
  onOverlap: () => void;
  onBack: () => void;
  children?: React.ReactNode;
}) {
  const suggested = prompt.suggestedDurationMin;
  return (
    <div className="rounded-[1rem] border border-terra-soft/60 bg-terra-soft/[0.10] p-4 space-y-3" role="alert">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="size-5 text-terra shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-ink">Já tem cliente nesse horário</p>
          <p className="mt-1 text-sm text-ink-soft">
            <strong className="text-ink">{prompt.clientName}</strong> está agendada de{" "}
            {timeRangeBR(prompt.startsAt, prompt.endsAt)}.
          </p>
        </div>
      </div>

      {children}

      {suggested != null && (
        <button
          type="button"
          onClick={() => onUseSuggested(suggested)}
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-2 rounded-[0.9rem] bg-paper hairline px-4 py-2.5 text-sm font-medium text-ink hover:bg-cream-soft transition disabled:opacity-50"
        >
          <Clock3 className="size-4" /> Ajustar para {suggested}min e salvar
        </button>
      )}

      <button
        type="button"
        onClick={onOverlap}
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-[0.9rem] bg-terra px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
        Encaixar duas clientes mesmo assim
      </button>
      <button type="button" onClick={onBack} className="w-full text-sm text-ink-soft hover:text-ink transition">
        Voltar e escolher outro horário
      </button>
    </div>
  );
}
