"use client";

import { useState, useTransition } from "react";
import {
  markFinalPaid,
  unmarkFinalPaid,
  markCompleted,
  markNoShow,
  confirmBooking,
  declineBooking,
  cancelBooking,
  rescheduleAppointment,
  updateAppointmentTotal,
} from "./actions";
import { Check, Phone, Loader2, AlertCircle, CheckCheck, X, Sparkles, CalendarX, CalendarClock, Save, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeRangeBR } from "@/lib/make/calendar";
import { MAX_MANUAL_DURATION_MIN, MIN_MANUAL_DURATION_MIN } from "@/lib/make/manual-overlap";
import { cardPriceCents, centsToBRLInput, parseBRLToCents } from "@/lib/make/pricing";
import {
  ConflictPrompt,
  ScheduleNotice,
  useSchedulePreview,
  type ConflictPromptData,
} from "./schedule-notice";

const TZ = "America/Sao_Paulo";

type AppointmentRow = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  total_cents: number;
  deposit_cents: number;
  amount_cents: number;
  final_paid_at: string | null;
  final_payment_method: string | null;
  payment_method: string | null;
  notes: string | null;
  service_id: string;
  servicePriceCents?: number | null;
  campaign?: string | null;
  discount_cents?: number | null;
};

/** "terça-feira, 24/06" — dia por extenso pro card de pedido (que vive fora da
 *  seção do dia, então precisa carregar a data com ele). */
function dayBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit",
  }).format(new Date(iso));
}

function ymdBR(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function hmBR(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function durationOf(appt: { starts_at: string; ends_at: string }): number {
  return Math.round((new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()) / 60_000);
}

function methodLabel(m: string | null): string {
  switch (m) {
    case "cash": return "Dinheiro";
    case "pix": return "PIX";
    case "credit_card": return "Cartão";
    default: return "—";
  }
}

export function AppointmentCard({
  appt,
  serviceName,
  visitNumber,
}: {
  appt: AppointmentRow;
  serviceName: string;
  visitNumber?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [editDate, setEditDate] = useState(() => ymdBR(appt.starts_at));
  const [editTime, setEditTime] = useState(() => hmBR(appt.starts_at));
  const [editDuration, setEditDuration] = useState(() => durationOf(appt));
  const [conflictPrompt, setConflictPrompt] = useState<ConflictPromptData | null>(null);
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState("");
  const schedule = useSchedulePreview({
    dateYmd: editDate,
    startTime: editTime,
    durationMin: editDuration,
    appointmentId: appt.id,
    enabled: editingTime,
  });

  const totalCents = appt.total_cents ?? appt.amount_cents;
  const depositCents = appt.deposit_cents ?? appt.amount_cents;
  const remainingCents = Math.max(0, totalCents - depositCents);
  const finalPaid = appt.final_paid_at !== null;
  const hasDeposit = depositCents > 0 && remainingCents > 0;
  const dueOnDay = !finalPaid && remainingCents > 0;
  const isCompleted = appt.status === "completed";
  const isRequest = appt.status === "pending_payment"; // pedido aguardando a Gaby confirmar
  const canEditTime = isRequest || appt.status === "confirmed";
  const voucherStillApplies =
    appt.servicePriceCents == null ||
    totalCents === appt.servicePriceCents - (appt.discount_cents ?? 0);
  const newTotalCents = parseBRLToCents(valueInput);
  const newRemainingCents = newTotalCents === null ? null : newTotalCents - depositCents;

  const phoneDigits = String(appt.client_phone).replace(/\D/g, "");

  async function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro inesperado");
      }
    });
  }

  function saveTime(options?: { duration?: number; allowOverlap?: boolean }) {
    setError(null);
    startTransition(async () => {
      const res = await rescheduleAppointment({
        appointmentId: appt.id,
        dateYmd: editDate,
        startTime: editTime,
        durationMin: options?.duration ?? editDuration,
        allowOverlap: options?.allowOverlap === true,
      });
      if (res.ok) {
        setEditingTime(false);
        setConflictPrompt(null);
      } else if ("kind" in res && res.kind === "appointment_conflict") {
        setConflictPrompt({
          clientName: res.conflict.clientName,
          startsAt: res.conflict.startsAt,
          endsAt: res.conflict.endsAt,
          requestedDurationMin: res.requestedDurationMin,
          suggestedDurationMin: res.suggestedDurationMin,
        });
      } else {
        setConflictPrompt(null);
        setError(res.error);
      }
    });
  }

  function openValueEditor() {
    setValueInput(centsToBRLInput(totalCents));
    setError(null);
    setEditingValue((v) => !v);
  }

  function saveValue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (newTotalCents === null) {
      setError("Informe o valor em reais, por exemplo 250,00.");
      return;
    }
    startTransition(async () => {
      const res = await updateAppointmentTotal({ appointmentId: appt.id, totalCents: newTotalCents });
      if (res.ok) setEditingValue(false);
      else setError(res.error);
    });
  }

  return (
    <article
      className={cn(
        "rounded-[1.25rem] p-4 transition",
        isRequest ? "bg-terra-soft/[0.10] border border-terra-soft/45 elev-soft" : "bg-paper hairline elev-soft",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {isRequest && (
            <p className="text-sm font-medium text-terra capitalize mb-0.5">
              {dayBR(appt.starts_at)}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-xl tabular-nums text-ink">{timeRangeBR(appt.starts_at, appt.ends_at)}</span>
            {isRequest && (
              <span className="inline-flex items-center gap-1 text-xs text-terra bg-terra-soft/25 rounded-full px-2.5 py-0.5">
                <AlertCircle className="size-3" /> Pedido · confirme
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-xs text-sage-700 bg-sage-50 rounded-full px-2.5 py-0.5">
                <CheckCheck className="size-3" /> Concluído
              </span>
            )}
            {visitNumber != null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-0.5",
                  visitNumber <= 1
                    ? "text-sage-700 bg-sage-50"
                    : "text-ink-soft bg-sand/40",
                )}
              >
                {visitNumber <= 1 ? (
                  <><Sparkles className="size-3" /> cliente nova</>
                ) : (
                  `${visitNumber}ª vez`
                )}
              </span>
            )}
          </div>
          <p className="font-medium text-ink mt-1 truncate">{appt.client_name}</p>
          <p className="text-sm text-ink-soft mt-0.5">{serviceName}</p>
          {appt.campaign && (
            <p className="mt-1 inline-flex items-center rounded-full bg-sand/60 text-sage-700 text-[11px] font-medium px-2 py-0.5">
              Voucher {appt.campaign}
              {appt.discount_cents && voucherStillApplies ? ` · −${formatBRL(appt.discount_cents)}` : ""}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          {canEditTime && (
            <button
              type="button"
              onClick={() => setEditingTime((v) => !v)}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-full border border-sage-200 bg-sage-50 px-3 py-1.5 text-sm font-medium text-sage-700 hover:bg-sage-100 transition disabled:opacity-50"
            >
              <CalendarClock className="size-4" />
              Editar horário
            </button>
          )}
          {phoneDigits && (
            <a
              href={`https://wa.me/${phoneDigits}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-sm text-sage-700 hover:text-sage-900 transition"
            >
              <Phone className="size-4" />
              WhatsApp
            </a>
          )}
        </div>
      </header>

      {/* Valores */}
      <div className="mt-3 rounded-[0.9rem] bg-cream-soft hairline p-3 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-ink-soft">Total</span>
          <span className="font-medium tabular-nums text-ink">{formatBRL(totalCents)}</span>
        </div>
        {hasDeposit && (
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-ink-soft">Entrada (online) ✓</span>
            <span className="tabular-nums text-ink-soft">{formatBRL(depositCents)}</span>
          </div>
        )}
        {remainingCents > 0 && (
          <div className="flex items-baseline justify-between mt-1 pt-2 hairline-t">
            <span className={finalPaid ? "text-sage-700" : "text-terra"}>
              {finalPaid
                ? `${hasDeposit ? "Restante" : "Pago"} via ${methodLabel(appt.final_payment_method)} ✓`
                : hasDeposit
                  ? "Falta receber no dia"
                  : "A receber no dia"}
            </span>
            <span className={cn("font-medium tabular-nums", finalPaid ? "text-ink-mute line-through" : "text-terra")}>
              {formatBRL(remainingCents)}
            </span>
          </div>
        )}
        {remainingCents === 0 && totalCents > 0 && (
          <p className="text-xs text-ink-soft mt-1">Pago integralmente ✓</p>
        )}
        {canEditTime && (
          <button
            type="button"
            onClick={openValueEditor}
            disabled={pending}
            className="mt-2 inline-flex items-center gap-1.5 min-h-9 text-sm font-medium text-sage-700 hover:text-sage-900 transition disabled:opacity-50"
          >
            <Pencil className="size-3.5" /> Alterar valor
          </button>
        )}
      </div>

      {editingValue && (
        <form onSubmit={saveValue} className="mt-3 rounded-[0.9rem] bg-cream-soft hairline p-3 space-y-3">
          {finalPaid ? (
            <p className="text-sm text-ink-soft">
              O pagamento já foi marcado. Desfaça o pagamento para mudar o valor.
            </p>
          ) : (
            <>
              <label className="block">
                <span className="block text-xs font-medium text-ink-soft mb-1">Novo valor do atendimento (R$)</span>
                <input
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  inputMode="decimal"
                  required
                  className="w-full rounded-xl bg-paper hairline px-3 py-2 text-base text-ink outline-none focus:ring-2 focus:ring-sage-100"
                />
              </label>
              <div className="space-y-1 text-xs text-ink-soft">
                {appt.servicePriceCents != null && (
                  <p>Valor da tabela: {formatBRL(appt.servicePriceCents)}. A tabela não muda.</p>
                )}
                {depositCents > 0 && (
                  <p>A entrada de {formatBRL(depositCents)} continua paga e não pode ser maior que o novo valor.</p>
                )}
                {newRemainingCents === 0 && <p className="text-ink">Nada a receber no dia.</p>}
                {newRemainingCents !== null && newRemainingCents > 0 && (
                  <p className="text-ink">
                    {depositCents > 0 ? "Restante" : "A receber no dia"}: {formatBRL(newRemainingCents)} no dinheiro
                    ou {formatBRL(cardPriceCents(newRemainingCents))} no PIX e no cartão.
                  </p>
                )}
                {!isRequest && <p>A cliente não recebe aviso automático dessa mudança.</p>}
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {!finalPaid && (
              <ActionButton type="submit" pending={pending} tone="primary">
                <Save className="size-4" /> Salvar valor
              </ActionButton>
            )}
            <ActionButton onClick={() => setEditingValue(false)} pending={pending} tone="ghost">
              Voltar
            </ActionButton>
          </div>
        </form>
      )}

      {appt.notes && (
        <p className="mt-3 text-sm text-ink-soft italic">&ldquo;{appt.notes}&rdquo;</p>
      )}

      {editingTime && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveTime();
          }}
          className="mt-3 rounded-[0.9rem] bg-cream-soft hairline p-3 space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-xs font-medium text-ink-soft mb-1">Data</span>
              <input
                type="date"
                value={editDate}
                onChange={(e) => {
                  setEditDate(e.target.value);
                  setConflictPrompt(null);
                }}
                required
                className="w-full rounded-xl bg-paper hairline px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-100"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink-soft mb-1">Início</span>
              <input
                type="time"
                value={editTime}
                onChange={(e) => {
                  setEditTime(e.target.value);
                  setConflictPrompt(null);
                }}
                required
                className="w-full rounded-xl bg-paper hairline px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-100"
              />
            </label>
          </div>
          <label className="block">
            <span className="block text-xs font-medium text-ink-soft mb-1">Duração (min)</span>
            <input
              type="number"
              min={MIN_MANUAL_DURATION_MIN}
              max={MAX_MANUAL_DURATION_MIN}
              step={1}
              value={editDuration}
              onChange={(e) => {
                setEditDuration(Number(e.target.value));
                setConflictPrompt(null);
              }}
              required
              className="w-full rounded-xl bg-paper hairline px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-sage-100"
            />
          </label>
          <ScheduleNotice {...schedule} />
          {conflictPrompt && (
            <ConflictPrompt
              prompt={conflictPrompt}
              pending={pending}
              onUseSuggested={(suggested) => {
                setEditDuration(suggested);
                saveTime({ duration: suggested });
              }}
              onOverlap={() => saveTime({ allowOverlap: true })}
              onBack={() => setConflictPrompt(null)}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <ActionButton type="submit" pending={pending || schedule.loading} tone="primary">
              <Save className="size-4" /> Salvar horário
            </ActionButton>
            <ActionButton
              onClick={() => {
                setEditingTime(false);
                setConflictPrompt(null);
              }}
              pending={pending}
              tone="ghost"
            >
              Voltar
            </ActionButton>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-3 text-sm text-terra inline-flex items-start gap-1.5">
          <AlertCircle className="size-4 mt-px shrink-0" />
          {error}
        </p>
      )}

      {/* Ações */}
      {confirmingCancel ? (
        <div className="mt-3">
          <p className="text-sm text-ink-soft mb-2">
            Cancelar esse agendamento? O horário fica livre de novo.
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => run(() => cancelBooking(appt.id))} pending={pending} tone="danger">
              <CalendarX className="size-4" /> Sim, cancelar
            </ActionButton>
            <ActionButton onClick={() => setConfirmingCancel(false)} pending={pending} tone="ghost">
              Voltar
            </ActionButton>
          </div>
        </div>
      ) : isRequest ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton onClick={() => run(() => confirmBooking(appt.id))} pending={pending} tone="primary">
            <Check className="size-4" /> Confirmar
          </ActionButton>
          <ActionButton onClick={() => run(() => declineBooking(appt.id))} pending={pending} tone="danger">
            <X className="size-4" /> Recusar
          </ActionButton>
        </div>
      ) : !isCompleted ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {dueOnDay && (
            <>
              <ActionButton onClick={() => run(() => markFinalPaid(appt.id, "pix"))} pending={pending} tone="primary">
                <Check className="size-4" /> Pago via PIX
              </ActionButton>
              <ActionButton onClick={() => run(() => markFinalPaid(appt.id, "cash"))} pending={pending} tone="primary">
                <Check className="size-4" /> Pago em dinheiro
              </ActionButton>
            </>
          )}
          {finalPaid && (
            <ActionButton onClick={() => run(() => unmarkFinalPaid(appt.id))} pending={pending} tone="ghost">
              Desfazer pagamento
            </ActionButton>
          )}
          <ActionButton onClick={() => run(() => markCompleted(appt.id))} pending={pending} tone="secondary">
            <CheckCheck className="size-4" /> Concluir
          </ActionButton>
          <ActionButton onClick={() => run(() => markNoShow(appt.id))} pending={pending} tone="danger">
            <X className="size-4" /> No-show
          </ActionButton>
          <ActionButton onClick={() => setConfirmingCancel(true)} pending={pending} tone="ghost">
            <CalendarX className="size-4" /> Cancelar
          </ActionButton>
        </div>
      ) : null}
    </article>
  );
}

function ActionButton({
  children, onClick, pending, tone, type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  pending: boolean;
  tone: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-sage-gradient text-cream border-transparent hover:opacity-95",
    secondary: "bg-white hover:bg-cream-soft text-ink border-sand",
    danger: "bg-white hover:bg-terra-soft/10 text-terra border-terra-soft/50",
    ghost: "bg-transparent hover:bg-sand/40 text-ink-soft border-transparent",
  }[tone];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition disabled:opacity-50",
        styles,
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
