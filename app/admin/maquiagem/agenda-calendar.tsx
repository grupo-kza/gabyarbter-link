"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Phone, CheckCircle2 } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { addMinutesIso, CALENDAR_KIND_META, timeRangeBR } from "@/lib/make/calendar";
import type { MakeCalendarKind, YogaClassEvent } from "@/lib/make/types";
import { AppointmentCard } from "./appointment-card";
import { EventCard } from "./event-card";

type Appt = {
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
  serviceName: string;
  servicePriceCents: number | null;
  confirmed_at: string | null;
  source: string;
  campaign?: string | null;
  discount_cents?: number | null;
};
type OneOff = {
  id: string;
  date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  kind?: Exclude<MakeCalendarKind, "make"> | null;
};
type Recurring = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  reason: string | null;
  kind?: Exclude<MakeCalendarKind, "make"> | null;
};

const TZ = "America/Sao_Paulo";
const WEEKDAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const WEEKDAYS_FULL = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado",
];

const EDITORIAL_REMINDERS = [
  {
    weekday: 0,
    sort: "20:00",
    routine: "domingo",
    title: "Abrir a semana com presença",
    subtitle: "Domingo à noite · reflexão para o grupo + Story",
  },
  {
    weekday: 1,
    sort: "09:00",
    routine: "segunda",
    title: "Traduzir uma ideia em conteúdo",
    subtitle: "Segunda · Reel ou carrossel de yoga, ayurveda ou filosofia",
  },
  {
    weekday: 4,
    sort: "09:00",
    routine: "quinta",
    title: "Fazer um convite gentil",
    subtitle: "Quinta · Story e convite para Sopro, make ou Automake",
  },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

function dayKeyBR(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso));
}
function timeKeyBR(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}
function todayYmd(): string {
  return dayKeyBR(new Date().toISOString());
}
/** Dia da semana (0=dom) a partir de 'YYYY-MM-DD', sem depender do fuso do browser. */
function weekdayOf(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}
function editorialReminderForDay(ymd: string) {
  return EDITORIAL_REMINDERS.find((reminder) => reminder.weekday === weekdayOf(ymd));
}
function hm(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}
function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month, 1, 12)));
}
function dayLabelFull(ymd: string): string {
  const today = todayYmd();
  const t = new Date(`${today}T12:00:00Z`);
  const tomorrow = `${new Date(t.getTime() + 86_400_000).toISOString().slice(0, 10)}`;
  if (ymd === today) return "Hoje";
  if (ymd === tomorrow) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  }).format(new Date(`${ymd}T12:00:00Z`));
}

/** "sáb, 22/08 · 12:15" — dia + hora compactos pro card de confirmado recente. */
function dayTimeShortBR(iso: string): string {
  const d = new Date(iso);
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit",
  }).format(d).replace(/\./g, "");
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit",
  }).format(d);
  return `${dia} · ${hora}`;
}

function buildCells(year: number, month: number): (string | null)[] {
  const firstDow = new Date(Date.UTC(year, month, 1, 12)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function AgendaCalendar({
  appointments,
  oneOffBlocks,
  recurringBlocks,
  yogaClasses,
}: {
  appointments: Appt[];
  oneOffBlocks: OneOff[];
  recurringBlocks: Recurring[];
  yogaClasses: YogaClassEvent[];
}) {
  const today = todayYmd();
  const [sel, setSel] = useState(today);
  const [anchor, setAnchor] = useState({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)) - 1,
  });
  // Seletor de mês/ano (abre ao tocar no título). Painel inline — robusto no iOS/PWA.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(anchor.year);

  // Calendário mostra só o que está confirmado/concluído. Pedidos vão pro topo.
  const apptsByDay = useMemo(() => {
    const m = new Map<string, Appt[]>();
    for (const a of appointments) {
      if (a.status !== "confirmed" && a.status !== "completed") continue;
      const k = dayKeyBR(a.starts_at);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    return m;
  }, [appointments]);

  // Pedidos aguardando a Gaby confirmar
  const pendingAppts = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "pending_payment")
        .slice()
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [appointments],
  );

  // Confirmados recentemente pela Gaby — só os do app (não os 2.300 migrados),
  // ordenados pela hora que ela confirmou. Referência rápida no topo.
  const recentlyConfirmed = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "confirmed" && a.source === "app" && a.confirmed_at)
        .slice()
        .sort((a, b) => (b.confirmed_at ?? "").localeCompare(a.confirmed_at ?? ""))
        .slice(0, 6),
    [appointments],
  );

  // Recorrência: quantas makes (confirmadas/concluídas) cada telefone já tem
  const realByPhone = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of appointments) {
      if (a.status === "confirmed" || a.status === "completed") {
        m.set(a.client_phone, (m.get(a.client_phone) ?? 0) + 1);
      }
    }
    return m;
  }, [appointments]);

  const visitNumberOf = (a: Appt): number => {
    const real = realByPhone.get(a.client_phone) ?? 0;
    const prior = real - (a.status === "confirmed" || a.status === "completed" ? 1 : 0);
    return prior + 1;
  };

  const oneOffByDay = useMemo(() => {
    const m = new Map<string, OneOff[]>();
    for (const b of oneOffBlocks) {
      if (!m.has(b.date)) m.set(b.date, []);
      m.get(b.date)!.push(b);
    }
    return m;
  }, [oneOffBlocks]);

  const recurringByWeekday = useMemo(() => {
    const m = new Map<number, Recurring[]>();
    for (const r of recurringBlocks) {
      if (!m.has(r.weekday)) m.set(r.weekday, []);
      m.get(r.weekday)!.push(r);
    }
    return m;
  }, [recurringBlocks]);

  const yogaByDay = useMemo(() => {
    const m = new Map<string, YogaClassEvent[]>();
    for (const c of yogaClasses) {
      const k = dayKeyBR(c.starts_at);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(c);
    }
    return m;
  }, [yogaClasses]);

  const cells = useMemo(() => buildCells(anchor.year, anchor.month), [anchor]);

  const selAppts = (apptsByDay.get(sel) ?? []).slice().sort((a, b) =>
    timeKeyBR(a.starts_at).localeCompare(timeKeyBR(b.starts_at)),
  );
  const selOneOff = oneOffByDay.get(sel) ?? [];
  const selRecurring = recurringByWeekday.get(weekdayOf(sel)) ?? [];
  const selYoga = (yogaByDay.get(sel) ?? []).slice().sort((a, b) =>
    timeKeyBR(a.starts_at).localeCompare(timeKeyBR(b.starts_at)),
  );
  const editorialReminder = editorialReminderForDay(sel);
  const dayCount = selAppts.length;
  const dayRevenue = selAppts.reduce((s, a) => s + (a.total_cents ?? a.amount_cents ?? 0), 0);
  const otherEventCount = selOneOff.length + selRecurring.length + selYoga.length + Number(Boolean(editorialReminder));

  type DayEntry = { sort: string; render: React.ReactNode };
  const entries: DayEntry[] = [
    ...selAppts.map((a) => ({
      sort: timeKeyBR(a.starts_at),
      render: <AppointmentCard key={a.id} appt={a} serviceName={a.serviceName} visitNumber={visitNumberOf(a)} />,
    })),
    ...selOneOff.map((b) => ({
      sort: b.all_day ? "00:00" : hm(b.start_time),
      render: (
        <EventCard
          key={b.id}
          id={b.id}
          kind={b.kind ?? "block"}
          title={b.reason || "Horário bloqueado"}
          subtitle={b.all_day ? "Dia inteiro" : `${hm(b.start_time)} até ${hm(b.end_time)}`}
        />
      ),
    })),
    ...selRecurring.map((r) => ({
      sort: hm(r.start_time),
      render: (
        <EventCard
          key={r.id}
          id={r.id}
          kind={r.kind ?? "block"}
          recurring
          title={r.reason || "Bloqueio fixo"}
          subtitle={`${hm(r.start_time)} até ${hm(r.end_time)} · toda semana`}
        />
      ),
    })),
    ...selYoga.map((c) => {
      const endsAt = addMinutesIso(c.starts_at, c.duration_minutes);
      return {
        sort: timeKeyBR(c.starts_at),
        render: (
          <EventCard
            key={`yoga-${c.id}`}
            id={c.id}
            kind="yoga"
            readonly
            title={c.title}
            subtitle={`${timeRangeBR(c.starts_at, endsAt)}${c.location ? ` · ${c.location}` : ""}`}
          />
        ),
      };
    }),
    ...(editorialReminder
      ? [{
          sort: editorialReminder.sort,
          render: (
            <EventCard
              key={`editorial-${editorialReminder.routine}`}
              id={`editorial-${editorialReminder.routine}`}
              kind="commitment"
              readonly
              eyebrow="Pauta editorial"
              title={editorialReminder.title}
              subtitle={editorialReminder.subtitle}
              actionHref={`/sopro/admin/conteudo?rotina=${editorialReminder.routine}`}
              actionLabel="Criar conteúdo"
            />
          ),
        }]
      : []),
  ].sort((a, b) => a.sort.localeCompare(b.sort));

  function shiftMonth(delta: number) {
    setAnchor((a) => {
      const d = new Date(Date.UTC(a.year, a.month + delta, 1, 12));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }

  // Anos oferecidos no seletor: os que têm agendamentos carregados (a agenda é
  // forward-looking: ~90 dias + futuro) + o ano atual e o próximo, como faixa contígua.
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const a of appointments) {
      const y = Number(dayKeyBR(a.starts_at).slice(0, 4));
      if (y) set.add(y);
    }
    const cur = Number(today.slice(0, 4));
    set.add(cur);
    set.add(cur + 1);
    const min = Math.min(...set, anchor.year);
    const max = Math.max(...set, anchor.year);
    const out: number[] = [];
    for (let y = min; y <= max; y++) out.push(y);
    return out;
  }, [appointments, today, anchor.year]);

  function openPicker() {
    setPickerYear(anchor.year);
    setPickerOpen(true);
  }
  function pickMonth(month: number) {
    setAnchor({ year: pickerYear, month });
    setPickerOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Pedidos aguardando confirmação — destaque no topo */}
      {pendingAppts.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] font-semibold mb-3 text-terra">
            Pedidos pra confirmar · {pendingAppts.length}
          </h2>
          <div className="space-y-3">
            {pendingAppts.map((a) => (
              <AppointmentCard
                key={a.id}
                appt={a}
                serviceName={a.serviceName}
                visitNumber={visitNumberOf(a)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Calendário */}
      <div className="rounded-[1.4rem] bg-paper hairline elev-soft p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="size-9 inline-flex items-center justify-center rounded-full hairline text-ink-soft hover:bg-sage-50 transition"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => (pickerOpen ? setPickerOpen(false) : openPicker())}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 hover:bg-sage-50 transition"
            aria-expanded={pickerOpen}
            aria-label="Selecionar mês e ano"
          >
            <span className="font-serif text-lg text-ink capitalize">
              {monthLabel(anchor.year, anchor.month)}
            </span>
            <ChevronDown
              className={cn(
                "size-4 text-ink-soft transition-transform",
                pickerOpen && "rotate-180",
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="size-9 inline-flex items-center justify-center rounded-full hairline text-ink-soft hover:bg-sage-50 transition"
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {pickerOpen ? (
          <div className="py-1">
            {/* Anos */}
            <div className="flex flex-wrap justify-center gap-1.5 mb-3">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setPickerYear(y)}
                  className={cn(
                    "min-w-[3.5rem] rounded-full px-3 py-1.5 text-sm tabular-nums transition",
                    y === pickerYear
                      ? "bg-sage-700 text-cream"
                      : "hairline text-ink hover:bg-sage-50",
                  )}
                  aria-pressed={y === pickerYear}
                >
                  {y}
                </button>
              ))}
            </div>
            {/* Meses */}
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_SHORT.map((label, m) => {
                const isCurrent = pickerYear === anchor.year && m === anchor.month;
                const isThisMonth =
                  pickerYear === Number(today.slice(0, 4)) &&
                  m === Number(today.slice(5, 7)) - 1;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pickMonth(m)}
                    className={cn(
                      "rounded-xl py-2.5 text-sm capitalize transition",
                      isCurrent
                        ? "bg-sage-700 text-cream"
                        : isThisMonth
                          ? "bg-sage-50 text-ink ring-1 ring-sage-300"
                          : "text-ink hover:bg-sage-50",
                    )}
                    aria-pressed={isCurrent}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-soft mb-1">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div key={i} className="py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((ymd, i) => {
            if (!ymd) return <div key={i} aria-hidden />;
            const count = apptsByDay.get(ymd)?.length ?? 0;
            const editorialReminder = editorialReminderForDay(ymd);
            const kinds = new Set<MakeCalendarKind>();
            if (count > 0) kinds.add("make");
            if ((yogaByDay.get(ymd)?.length ?? 0) > 0) kinds.add("yoga");
            for (const b of oneOffByDay.get(ymd) ?? []) kinds.add(b.kind ?? "block");
            for (const r of recurringByWeekday.get(weekdayOf(ymd)) ?? []) kinds.add(r.kind ?? "block");
            const dayEventCount =
              count +
              (yogaByDay.get(ymd)?.length ?? 0) +
              (oneOffByDay.get(ymd)?.length ?? 0) +
              (recurringByWeekday.get(weekdayOf(ymd))?.length ?? 0) +
              Number(Boolean(editorialReminder));
            const isToday = ymd === today;
            const isSelected = ymd === sel;
            const dayNum = Number(ymd.slice(8, 10));
            return (
              <button
                key={ymd}
                type="button"
                onClick={() => setSel(ymd)}
                className={cn(
                  "relative rounded-xl min-h-[3.25rem] p-1.5 flex flex-col items-center justify-start text-sm transition",
                  isSelected
                    ? "bg-sage-700 text-cream"
                    : isToday
                      ? "bg-sage-50 text-ink ring-1 ring-sage-300"
                      : "text-ink hover:bg-sage-50",
                )}
                aria-label={`Dia ${dayNum}${dayEventCount ? `, ${dayEventCount} evento(s)` : ""}`}
                aria-pressed={isSelected}
              >
                <span className="tabular-nums leading-none mt-0.5">{dayNum}</span>
                <span className="mt-auto flex items-center justify-center gap-1 h-4 max-w-full">
                  {count > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-full text-[10px] font-medium tabular-nums min-w-[1rem] h-4 px-1",
                        isSelected ? "bg-cream/25 text-cream" : "bg-sage-100 text-sage-700",
                      )}
                    >
                      {count}
                    </span>
                  )}
                  {Array.from(kinds).slice(0, 4).map((kind) => (
                    <span
                      key={kind}
                      className={cn(
                        "size-1.5 rounded-full",
                        CALENDAR_KIND_META[kind].dotClass,
                        isSelected && "ring-1 ring-cream/70",
                      )}
                    />
                  ))}
                  {editorialReminder && (
                    <span
                      className={cn(
                        "size-1.5 rounded-full bg-amber-400",
                        isSelected && "ring-1 ring-cream/70",
                      )}
                      title="Pauta editorial"
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
          </>
        )}
      </div>

      {/* Dia selecionado */}
      <section>
        <h2 className="font-serif text-xl text-ink capitalize mb-3">{dayLabelFull(sel)}</h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-[1.1rem] bg-cream-soft hairline p-3.5">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Makes</p>
            <p className="font-serif text-2xl text-ink mt-1 tabular-nums">{dayCount}</p>
          </div>
          <div className="rounded-[1.1rem] bg-cream-soft hairline p-3.5">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Faturamento do dia</p>
            <p className="font-serif text-2xl text-sage-700 mt-1 tabular-nums">{formatBRL(dayRevenue)}</p>
          </div>
        </div>

        {otherEventCount > 0 && (
          <p className="-mt-2 mb-4 text-sm text-ink-soft">
            {otherEventCount} outro{otherEventCount > 1 ? "s" : ""} compromisso{otherEventCount > 1 ? "s" : ""} no dia.
          </p>
        )}

        {entries.length === 0 ? (
          <div className="rounded-[1.25rem] bg-paper/60 hairline p-8 text-center">
            <p className="text-ink-soft mb-4">Dia livre.</p>
            <Link
              href="/admin/maquiagem/novo"
              className="inline-flex items-center gap-1.5 rounded-full bg-sage-gradient text-cream px-4 py-2.5 text-sm font-medium elev-soft hover:opacity-95 transition"
            >
              <Plus className="size-4" /> Novo agendamento
            </Link>
          </div>
        ) : (
          <div className="space-y-3">{entries.map((e) => e.render)}</div>
        )}
      </section>

      {/* Confirmados recentemente — referência rápida pra Gaby */}
      {recentlyConfirmed.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] font-semibold mb-3 text-sage-700 inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> Confirmados recentemente
          </h2>
          <div className="space-y-2">
            {recentlyConfirmed.map((a) => {
              const phoneDigits = String(a.client_phone).replace(/\D/g, "");
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-paper hairline elev-soft p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-sage-700 capitalize">
                      {dayTimeShortBR(a.starts_at)}
                    </p>
                    <p className="font-medium text-ink mt-0.5 truncate">{a.client_name}</p>
                    <p className="text-sm text-ink-soft mt-0.5 truncate">{a.serviceName}</p>
                  </div>
                  {phoneDigits && (
                    <a
                      href={`https://wa.me/${phoneDigits}`}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 text-sm text-sage-700 hover:text-sage-900 transition shrink-0"
                    >
                      <Phone className="size-4" /> WhatsApp
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
