"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { combineDateTime, weekdayInBR } from "@/lib/make/slots";
import { notifyClientConfirmed } from "@/lib/make/notify";
import { toE164 } from "@/lib/make/phone";
import {
  buildScheduleGaps,
  resolveManualAppointmentWindow,
  type AppointmentConflict,
  type ScheduleGaps,
} from "@/lib/make/manual-overlap";
import { checkManualTotal } from "@/lib/make/pricing";

type PaymentMethod = "cash" | "pix" | "credit_card";
type ManualEventKind = "block" | "commitment" | "party" | "yoga";

type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | {
      ok: false;
      kind: "appointment_conflict";
      error: string;
      conflict: AppointmentConflict;
      requestedDurationMin: number;
      suggestedDurationMin: number | null;
    };

type SchedulePreview =
  | { ok: true; gaps: ScheduleGaps; blockedError: string | null }
  | { ok: false; error: string };

const EDITABLE_STATUSES = ["pending_payment", "confirmed"];
const MANUAL_EVENT_KINDS = new Set<ManualEventKind>(["block", "commitment", "party", "yoga"]);

export async function markFinalPaid(appointmentId: string, method: PaymentMethod) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase
    .from("make_appointments")
    .update({
      final_paid_at: new Date().toISOString(),
      final_payment_method: method,
    })
    .eq("id", appointmentId);

  if (error) throw error;
  revalidatePath("/admin/maquiagem");
}

export async function unmarkFinalPaid(appointmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase
    .from("make_appointments")
    .update({
      final_paid_at: null,
      final_payment_method: null,
    })
    .eq("id", appointmentId);

  if (error) throw error;
  revalidatePath("/admin/maquiagem");
}

export async function markCompleted(appointmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase
    .from("make_appointments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);

  if (error) throw error;
  revalidatePath("/admin/maquiagem");
}

export async function markNoShow(appointmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase
    .from("make_appointments")
    .update({
      status: "no_show",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);

  if (error) throw error;
  revalidatePath("/admin/maquiagem");
}

/**
 * Gaby CONFIRMA o pedido do cliente → status confirmed + dispara o WhatsApp
 * automático de confirmação pra cliente (a automação do fluxo).
 */
export async function confirmBooking(appointmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase
    .from("make_appointments")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", appointmentId);
  if (error) throw error;

  // Automação: avisa a cliente que tá confirmada (à prova de falha — nunca lança).
  await notifyClientConfirmed(appointmentId);
  revalidatePath("/admin/maquiagem");
}

/** Gaby RECUSA o pedido → cancela e libera o horário. */
export async function declineBooking(appointmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase
    .from("make_appointments")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", appointmentId);
  if (error) throw error;
  revalidatePath("/admin/maquiagem");
}

/**
 * Cancela um agendamento JÁ CONFIRMADO (cliente desmarcou, imprevisto da Gaby…).
 * Vira status 'cancelled' → sai da agenda e LIBERA o horário pro online
 * (make_busy_slots só conta pending_payment/confirmed).
 */
export async function cancelBooking(appointmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase
    .from("make_appointments")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", appointmentId);
  if (error) throw error;
  revalidatePath("/admin/maquiagem");
}

/**
 * Busca clientes JÁ cadastrados por nome (parcial) ou telefone (normalizado),
 * pra Gaby reaproveitar em vez de criar duplicado no novo agendamento.
 * Lê a view make_client_overview (uma linha por cliente). Nunca lança: retorna
 * [] em qualquer erro/sessão inválida.
 */
export async function searchMakeClients(input: {
  name?: string;
  phone?: string;
}): Promise<
  { key: string; name: string; phone: string | null; visits: number; isMigrated: boolean }[]
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Sanitiza pro filtro .or() do PostgREST (vírgula/parênteses/curinga são sintaxe).
  const name = (input.name ?? "").trim().replace(/[%,()*]/g, " ").trim();
  const phone = toE164(input.phone ?? "");

  const filters: string[] = [];
  if (name.length >= 2) filters.push(`name.ilike.*${name}*`);
  if (phone) filters.push(`phone.eq.${phone}`);
  if (filters.length === 0) return [];

  const { data, error } = await supabase
    .from("make_client_overview")
    .select("client_key, name, phone, visits, is_migrated")
    .or(filters.join(","))
    .order("most_recent", { ascending: false })
    .limit(6);

  if (error) {
    console.warn("[make] searchMakeClients:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    key: r.client_key as string,
    name: r.name as string,
    phone: (r.phone as string | null) ?? null,
    visits: (r.visits as number) ?? 0,
    isMigrated: Boolean(r.is_migrated),
  }));
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

function dayYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Clientes ativas do dia do horário escolhido, mais quem cruza a janela caso ela
 * passe da meia-noite. A lista alimenta o aviso de minutos e a checagem de choque.
 */
async function loadDayAppointments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  startsAt: Date,
  endsAt: Date,
  excludeAppointmentId?: string,
): Promise<AppointmentConflict[]> {
  const dayStart = combineDateTime(dayYmd(startsAt), "00:00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);
  const rangeEnd = endsAt > dayEnd ? endsAt : dayEnd;

  let query = supabase
    .from("make_appointments")
    .select("id, client_name, starts_at, ends_at")
    .in("status", ["pending_payment", "confirmed"])
    .lt("starts_at", rangeEnd.toISOString())
    .gt("ends_at", dayStart.toISOString());

  if (excludeAppointmentId) query = query.neq("id", excludeAppointmentId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((a) => ({
    id: String(a.id),
    clientName: String(a.client_name),
    startsAt: String(a.starts_at),
    endsAt: String(a.ends_at),
  }));
}

/** Evento, bloqueio ou aula no horário. Isso a Gaby não encaixa por cima. */
async function findMakeBlockConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  startsAt: Date,
  endsAt: Date,
): Promise<string | null> {
  const ymd = dayYmd(startsAt);
  const { data: blocks, error: blockErr } = await supabase
    .from("make_blocked_dates")
    .select("all_day, start_time, end_time, reason")
    .eq("date", ymd);
  if (blockErr) throw blockErr;

  for (const b of blocks ?? []) {
    if (b.all_day) return "Esse dia tem outro evento de dia inteiro.";
    if (!b.start_time || !b.end_time) continue;
    const bStart = combineDateTime(ymd, b.start_time);
    const bEnd = combineDateTime(ymd, b.end_time);
    if (overlaps(startsAt, endsAt, bStart, bEnd)) {
      return "Esse horário cruza com outro evento da agenda.";
    }
  }

  const weekday = weekdayInBR(ymd);
  const { data: recurring, error: recErr } = await supabase
    .from("make_recurring_blocks")
    .select("start_time, end_time, reason")
    .eq("weekday", weekday)
    .eq("active", true);
  if (recErr) throw recErr;

  for (const r of recurring ?? []) {
    const rStart = combineDateTime(ymd, r.start_time);
    const rEnd = combineDateTime(ymd, r.end_time);
    if (overlaps(startsAt, endsAt, rStart, rEnd)) {
      return "Esse horário cruza com um evento fixo da agenda.";
    }
  }

  const { data: yoga, error: yogaErr } = await supabase
    .from("classes")
    .select("starts_at, duration_minutes")
    .gte("starts_at", combineDateTime(ymd, "00:00:00").toISOString())
    .lt("starts_at", combineDateTime(ymd, "23:59:59").toISOString());

  if (yogaErr) {
    console.warn("[make] conflito com yoga não checado:", yogaErr.message);
    return null;
  }

  for (const c of yoga ?? []) {
    const cStart = new Date(c.starts_at);
    const cEnd = new Date(cStart.getTime() + Number(c.duration_minutes) * 60_000);
    if (overlaps(startsAt, endsAt, cStart, cEnd)) {
      return "Esse horário cruza com uma aula de yoga.";
    }
  }

  return null;
}

/**
 * Aviso que a Gaby vê antes de salvar: a cliente de antes, a de depois e os
 * minutos entre elas, mais o evento que impede o horário, se houver.
 */
export async function previewScheduleWindow(input: {
  dateYmd: string;
  startTime: string;
  durationMin: number;
  appointmentId?: string;
}): Promise<SchedulePreview> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada, entre de novo." };

  const startsAt = combineDateTime(input.dateYmd, input.startTime);
  if (isNaN(startsAt.getTime()) || !(input.durationMin > 0)) {
    return { ok: false, error: "Data ou horário inválidos." };
  }
  const endsAt = new Date(startsAt.getTime() + input.durationMin * 60_000);

  const [others, blockedError] = await Promise.all([
    loadDayAppointments(supabase, startsAt, endsAt, input.appointmentId),
    findMakeBlockConflict(supabase, startsAt, endsAt),
  ]);

  return { ok: true, gaps: buildScheduleGaps({ startsAt, endsAt, others }), blockedError };
}

/**
 * Agendamento manual feito pela Gaby (cliente que veio pelo Insta/WhatsApp).
 * Entra confirmado, sem cobrança online — recebe tudo no dia (deposit = 0).
 * Grava na MESMA agenda que o fluxo online lê, então a exclusion constraint
 * impede marcar em cima de outro agendamento.
 */
export async function createManualAppointment(input: {
  serviceId: string;
  clientName: string;
  clientPhone: string;
  dateYmd: string;
  startTime: string; // 'HH:MM'
  durationMin?: number;
  allowOverlap?: boolean;
  /** Valor personalizado deste atendimento. Sem ele, vale o preço do serviço. */
  totalCents?: number;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada — entre de novo." };

  const name = input.clientName.trim();
  const phone = toE164(input.clientPhone);
  if (!name) return { ok: false, error: "Informe o nome da cliente." };
  if (!phone) return { ok: false, error: "Informe um telefone válido (com DDD)." };
  if (!input.serviceId) return { ok: false, error: "Escolha o serviço." };
  if (!input.dateYmd || !input.startTime) return { ok: false, error: "Escolha data e horário." };

  const { data: service, error: svcErr } = await supabase
    .from("make_services")
    .select("id, price_cents, duration_min")
    .eq("id", input.serviceId)
    .single();
  if (svcErr || !service) return { ok: false, error: "Serviço não encontrado." };

  const startsAt = combineDateTime(input.dateYmd, input.startTime);
  if (isNaN(startsAt.getTime())) return { ok: false, error: "Data/horário inválidos." };
  const durationMin = input.durationMin ?? Number(service.duration_min);
  const totalCents = input.totalCents ?? Number(service.price_cents);
  const totalCheck = checkManualTotal({ totalCents, depositCents: 0, finalPaid: false });
  if (!totalCheck.ok) return { ok: false, error: totalCheck.error };

  const requestedEndsAt = new Date(startsAt.getTime() + durationMin * 60_000);
  const blockedError = await findMakeBlockConflict(supabase, startsAt, requestedEndsAt);
  if (blockedError) return { ok: false, error: blockedError };

  const others = await loadDayAppointments(supabase, startsAt, requestedEndsAt);
  const { conflicts } = buildScheduleGaps({ startsAt, endsAt: requestedEndsAt, others });

  const window = resolveManualAppointmentWindow({
    startsAt,
    durationMin,
    appointmentConflict: conflicts[0] ?? null,
    allowOverlap: input.allowOverlap === true,
  });
  if (!window.ok) {
    if (window.kind === "invalid_duration") return { ok: false, error: window.error };
    return {
      ok: false,
      kind: "appointment_conflict",
      error: "Já existe uma cliente nesse horário.",
      conflict: window.conflict,
      requestedDurationMin: window.requestedDurationMin,
      suggestedDurationMin: window.suggestedDurationMin,
    };
  }
  const endsAt = window.endsAt;

  const { data: appt, error } = await supabase
    .from("make_appointments")
    .insert({
      service_id: service.id,
      client_name: name,
      client_phone: phone,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "confirmed",
      total_cents: totalCents,
      deposit_cents: 0,
      amount_cents: 0,
      payment_method: null,
      confirmed_at: new Date().toISOString(),
      notes: input.notes?.trim() || null,
      allow_overlap: window.isOverlap,
    })
    .select("id")
    .single();

  if (error || !appt) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23P01") return { ok: false, error: "Já existe um agendamento nesse horário." };
    return { ok: false, error: error?.message ?? "Não consegui salvar o agendamento." };
  }

  revalidatePath("/admin/maquiagem");
  return { ok: true, id: appt.id };
}

/**
 * Muda data, horário e duração de um agendamento. Choque com outra cliente só
 * passa com allowOverlap, que a Gaby confirma depois de ver os minutos. Evento,
 * bloqueio e aula continuam barrando.
 */
export async function rescheduleAppointment(input: {
  appointmentId: string;
  dateYmd: string;
  startTime: string;
  durationMin: number;
  allowOverlap?: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada — entre de novo." };

  if (!input.appointmentId) return { ok: false, error: "Agendamento não encontrado." };
  if (!input.dateYmd || !input.startTime) return { ok: false, error: "Escolha data e horário." };

  const { data: appt, error: apptErr } = await supabase
    .from("make_appointments")
    .select("id, status")
    .eq("id", input.appointmentId)
    .single();

  if (apptErr || !appt) return { ok: false, error: "Agendamento não encontrado." };
  if (!EDITABLE_STATUSES.includes(String(appt.status))) {
    return { ok: false, error: "Só dá pra editar horário de pedido ou make confirmada." };
  }

  const startsAt = combineDateTime(input.dateYmd, input.startTime);
  if (isNaN(startsAt.getTime())) return { ok: false, error: "Data/horário inválidos." };

  const requestedEndsAt = new Date(startsAt.getTime() + input.durationMin * 60_000);
  const blockedError = await findMakeBlockConflict(supabase, startsAt, requestedEndsAt);
  if (blockedError) return { ok: false, error: blockedError };

  const others = await loadDayAppointments(supabase, startsAt, requestedEndsAt, input.appointmentId);
  const { conflicts } = buildScheduleGaps({ startsAt, endsAt: requestedEndsAt, others });

  const window = resolveManualAppointmentWindow({
    startsAt,
    durationMin: input.durationMin,
    appointmentConflict: conflicts[0] ?? null,
    allowOverlap: input.allowOverlap === true,
  });
  if (!window.ok) {
    if (window.kind === "invalid_duration") return { ok: false, error: window.error };
    return {
      ok: false,
      kind: "appointment_conflict",
      error: "Já existe uma cliente nesse horário.",
      conflict: window.conflict,
      requestedDurationMin: window.requestedDurationMin,
      suggestedDurationMin: window.suggestedDurationMin,
    };
  }

  const { data: updated, error } = await supabase
    .from("make_appointments")
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: window.endsAt.toISOString(),
      allow_overlap: window.isOverlap,
    })
    .eq("id", input.appointmentId)
    .select("id")
    .single();

  if (error || !updated) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23P01") return { ok: false, error: "Já existe um agendamento nesse horário." };
    return { ok: false, error: error?.message ?? "Não consegui alterar o horário." };
  }

  revalidatePath("/admin/maquiagem");
  return { ok: true, id: updated.id };
}

/**
 * Valor personalizado de um atendimento. Muda só total_cents deste agendamento:
 * make_services, entrada paga e qualquer cobrança no Asaas ficam como estão, e o
 * restante sai da conta total menos entrada. Nada é enviado à cliente aqui.
 */
export async function updateAppointmentTotal(input: {
  appointmentId: string;
  totalCents: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada, entre de novo." };

  const { data: appt, error: apptErr } = await supabase
    .from("make_appointments")
    .select("id, status, deposit_cents, final_paid_at")
    .eq("id", input.appointmentId)
    .single();

  if (apptErr || !appt) return { ok: false, error: "Agendamento não encontrado." };
  if (!EDITABLE_STATUSES.includes(String(appt.status))) {
    return { ok: false, error: "Só dá pra mudar o valor de pedido ou make confirmada." };
  }

  const check = checkManualTotal({
    totalCents: input.totalCents,
    depositCents: Number(appt.deposit_cents ?? 0),
    finalPaid: appt.final_paid_at !== null,
  });
  if (!check.ok) return { ok: false, error: check.error };

  // Os filtros repetem a checagem: se o pagamento foi marcado no meio, nada muda.
  const { data: updated, error } = await supabase
    .from("make_appointments")
    .update({ total_cents: input.totalCents })
    .eq("id", input.appointmentId)
    .in("status", EDITABLE_STATUSES)
    .is("final_paid_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: "O agendamento mudou. Atualize a agenda e tente de novo." };

  revalidatePath("/admin/maquiagem");
  return { ok: true, id: updated.id };
}

/**
 * Bloqueio de horário (folga, yoga, almoço…).
 *  - recurring=false → make_blocked_dates (data única).
 *  - recurring=true  → make_recurring_blocks (toda semana no mesmo dia/horário,
 *    ex.: yoga toda terça 07:00–08:30). Sempre com faixa de horário.
 * O cálculo de slots já respeita as duas tabelas — derruba o horário no
 * agendamento online na hora.
 */
export async function createBlock(input: {
  dateYmd: string;
  allDay: boolean;
  startTime?: string; // 'HH:MM'
  endTime?: string;
  reason?: string;
  kind?: ManualEventKind;
  recurring?: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada — entre de novo." };
  if (!input.dateYmd) return { ok: false, error: "Escolha a data." };
  const kind = input.kind && MANUAL_EVENT_KINDS.has(input.kind) ? input.kind : "block";

  // Recorrente: sempre por faixa de horário, num dia da semana.
  if (input.recurring) {
    if (!input.startTime || !input.endTime) {
      return { ok: false, error: "Informe início e fim do bloqueio." };
    }
    if (input.endTime <= input.startTime) {
      return { ok: false, error: "O fim precisa ser depois do início." };
    }
    const { data: block, error } = await supabase
      .from("make_recurring_blocks")
      .insert({
        weekday: weekdayInBR(input.dateYmd),
        start_time: input.startTime,
        end_time: input.endTime,
        reason: input.reason?.trim() || null,
        kind,
      })
      .select("id")
      .single();
    if (error || !block) {
      return { ok: false, error: error?.message ?? "Não consegui salvar o bloqueio." };
    }
    revalidatePath("/admin/maquiagem");
    return { ok: true, id: block.id };
  }

  let start_time: string | null = null;
  let end_time: string | null = null;
  if (!input.allDay) {
    if (!input.startTime || !input.endTime) {
      return { ok: false, error: "Informe início e fim, ou marque dia inteiro." };
    }
    if (input.endTime <= input.startTime) {
      return { ok: false, error: "O fim precisa ser depois do início." };
    }
    start_time = input.startTime;
    end_time = input.endTime;
  }

  const { data: block, error } = await supabase
    .from("make_blocked_dates")
    .insert({
      date: input.dateYmd,
      all_day: input.allDay,
      start_time,
      end_time,
      reason: input.reason?.trim() || null,
      kind,
    })
    .select("id")
    .single();

  if (error || !block) return { ok: false, error: error?.message ?? "Não consegui salvar o bloqueio." };

  revalidatePath("/admin/maquiagem");
  return { ok: true, id: block.id };
}

export async function deleteBlock(blockId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase.from("make_blocked_dates").delete().eq("id", blockId);
  if (error) throw error;
  revalidatePath("/admin/maquiagem");
}

export async function deleteRecurringBlock(blockId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase.from("make_recurring_blocks").delete().eq("id", blockId);
  if (error) throw error;
  revalidatePath("/admin/maquiagem");
}
