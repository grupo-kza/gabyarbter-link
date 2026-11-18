"use client";

import { useEffect, useMemo, useState } from "react";
import type { MakeService, MakeSettings } from "@/lib/make/types";
import { formatBRL } from "@/lib/utils";
import { cardPriceCents, specialDayCashCents } from "@/lib/make/pricing";
import { formatYmdBR, weekdayInBR } from "@/lib/make/slots";

type DayAvailability = "open" | "closed" | "blocked" | "past";

type AvailabilityMap = Record<string, DayAvailability>; // 'YYYY-MM-DD' -> status

export function DateStep({
  service,
  settings,
  selectedDate,
  onSelect,
  onBack,
}: {
  service: MakeService;
  settings: MakeSettings;
  selectedDate: string | null;
  onSelect: (dateYmd: string) => void;
  onBack: () => void;
}) {
  const today = useMemo(() => new Date(), []);
  const todayYmd = useMemo(() => formatYmdBR(today), [today]);

  const initialMonth = useMemo(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [selectedDate]);

  const [monthAnchor, setMonthAnchor] = useState<Date>(initialMonth);
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [loading, setLoading] = useState(false);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
        timeZone: "America/Sao_Paulo",
      }).format(monthAnchor),
    [monthAnchor],
  );

  const cells = useMemo(() => buildMonthCells(monthAnchor), [monthAnchor]);
  const minYmd = todayYmd;
  const maxDate = new Date(today.getTime() + settings.max_advance_days * 86400_000);
  const maxYmd = formatYmdBR(maxDate);

  // Fetch availability do mês
  useEffect(() => {
    let cancelled = false;
    const fromYmd = formatYmdBR(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1));
    const toYmd = formatYmdBR(
      new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0),
    );
    setLoading(true);
    fetch(
      `/maquiagem/agendar/api/days?service=${service.slug}&from=${fromYmd}&to=${toYmd}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAvailability((data?.days ?? {}) as AvailabilityMap);
      })
      .catch(() => {
        /* silencioso: dia fica como "closed" */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [monthAnchor, service.slug]);

  const specialCents = specialDayCashCents(service);

  const canPrev = monthAnchor.getTime() > new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  const canNext = monthAnchor.getTime() < maxMonth.getTime();

  return (
    <section className="fade-up">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-ink-soft hover:text-ink mb-4"
      >
        ← {service.name} · {formatBRL(service.price_cents)}
      </button>

      <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-ink">
        Quando você quer vir?
      </h1>
      <p className="mt-2 text-ink-soft">
        Os dias verdes têm horário disponível. Toque pra ver os horários.
      </p>

      <div className="mt-7 rounded-[1.4rem] bg-paper hairline elev-soft p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() =>
              canPrev &&
              setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))
            }
            disabled={!canPrev}
            className="size-9 inline-flex items-center justify-center rounded-full hairline text-ink-soft hover:bg-sage-50 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Mês anterior"
          >
            ←
          </button>
          <p className="font-serif text-lg text-ink capitalize">{monthLabel}</p>
          <button
            type="button"
            onClick={() =>
              canNext &&
              setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))
            }
            disabled={!canNext}
            className="size-9 inline-flex items-center justify-center rounded-full hairline text-ink-soft hover:bg-sage-50 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Próximo mês"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-soft mb-2">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} className="aspect-square" aria-hidden />;
            const ymd = cell.ymd;
            const isPast = ymd < minYmd;
            const isOutOfRange = ymd > maxYmd;
            const status = availability[ymd];
            const isOpen = !isPast && !isOutOfRange && status === "open";
            const isSelected = ymd === selectedDate;
            return (
              <button
                key={i}
                type="button"
                disabled={!isOpen}
                onClick={() => isOpen && onSelect(ymd)}
                className={[
                  "aspect-square rounded-xl text-sm font-medium transition relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-300",
                  isSelected
                    ? "bg-sage-700 text-cream"
                    : isOpen
                      ? "bg-sage-50 text-sage-700 hover:bg-sage-100"
                      : "text-ink-soft/40 cursor-not-allowed",
                ].join(" ")}
                aria-label={`Dia ${cell.day}${isOpen ? " disponível" : ""}`}
              >
                {cell.day}
                {isOpen && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-sage-500" />
                )}
              </button>
            );
          })}
        </div>

        {loading && (
          <p className="mt-3 text-center text-xs text-ink-soft">Verificando horários…</p>
        )}
      </div>

      {specialCents !== null && (
        <p className="mt-4 text-sm text-ink-soft text-center">
          Domingo e feriado: {formatBRL(specialCents)} no dinheiro ·{" "}
          {formatBRL(cardPriceCents(specialCents))} no pix/cartão. Domingo, só até as 11h.
        </p>
      )}

      <p className="mt-4 text-xs text-ink-soft text-center">
        Dá pra marcar a partir de {settings.min_advance_hours}h de antecedência — e com toda a
        antecedência que precisar pra datas especiais.
      </p>
    </section>
  );
}

type Cell = { day: number; ymd: string } | null;

function buildMonthCells(monthAnchor: Date): Cell[] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Cell[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, ymd });
  }
  // pad até múltiplo de 7
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
