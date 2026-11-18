"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { MakeService, MakeSettings, MakeSlot } from "@/lib/make/types";
import { formatBRL } from "@/lib/utils";
import { ServiceStep } from "./steps/service-step";
import { DateStep } from "./steps/date-step";
import { TimeStep } from "./steps/time-step";
import { DataStep } from "./steps/data-step";
import { priceForDate, priceWithVoucher, type MakeVoucher } from "@/lib/make/pricing";

type Step = 1 | 2 | 3 | 4;

export type AgendarState = {
  service: MakeService | null;
  date: string | null; // YYYY-MM-DD
  slot: { startsIso: string; endsIso: string } | null;
  clientName: string;
  clientPhone: string;
};

const STEP_LABELS = ["Serviço", "Data", "Horário", "Dados"] as const;

export function AgendarClient({
  services: rawServices,
  settings,
  preselectedSlug,
  voucher = null,
}: {
  services: MakeService[];
  settings: MakeSettings;
  preselectedSlug: string | null;
  voucher?: MakeVoucher | null;
}) {
  // Com voucher, o preço exibido já sai com desconto no serviço da campanha.
  // O valor que vale é recalculado no checkout (servidor).
  const services = useMemo(
    () => rawServices.map((s) => ({ ...s, price_cents: priceWithVoucher(s, voucher) })),
    [rawServices, voucher],
  );
  const voucherService = voucher ? rawServices.find((s) => s.slug === voucher.serviceSlug) : null;

  const preselected = preselectedSlug
    ? services.find((s) => s.slug === preselectedSlug) ?? null
    : null;

  const [step, setStep] = useState<Step>(preselected ? 2 : 1);
  const [state, setState] = useState<AgendarState>({
    service: preselected,
    date: null,
    slot: null,
    clientName: "",
    clientPhone: "",
  });

  // Depois de escolher o dia, o preço é o daquele dia (domingo e feriado têm
  // valor próprio). Sem dia ainda, vale o da tabela.
  const rawSelected = state.service ? rawServices.find((s) => s.id === state.service!.id) ?? null : null;
  const dayOriginalCents = rawSelected ? priceForDate(rawSelected, state.date) : 0;
  const pricedService: MakeService | null =
    state.service && rawSelected
      ? { ...state.service, price_cents: priceWithVoucher({ slug: rawSelected.slug, price_cents: dayOriginalCents }, voucher) }
      : state.service;

  const update = useCallback((patch: Partial<AgendarState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const goNext = useCallback(() => setStep((s) => Math.min(4, s + 1) as Step), []);
  const goBack = useCallback(() => setStep((s) => Math.max(1, s - 1) as Step), []);

  // Scroll to top a cada mudança de step (mobile)
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  return (
    <main className="min-h-dvh flex flex-col safe-bottom">
      <Header step={step} />

      <div className="flex-1 mx-auto w-full max-w-2xl px-5 pt-8 pb-28 sm:py-12">
        {voucher && voucherService && (
          <div className="mb-6 rounded-[1.25rem] bg-sand/40 hairline p-4 fade-up">
            <p className="text-[11px] uppercase tracking-wider text-ink-soft">Presente · {voucher.name}</p>
            <p className="font-serif text-xl text-sage-700 mt-1">
              {voucher.discountPct}% na {voucherService.name}
            </p>
            <p className="text-sm text-ink-soft mt-1">
              O desconto já está no valor. Você só reserva agora e paga no dia, com a Gaby.
            </p>
          </div>
        )}

        {step === 1 && (
          <ServiceStep
            services={services}
            selectedId={state.service?.id ?? null}
            onSelect={(svc) => {
              update({ service: svc });
              goNext();
            }}
          />
        )}

        {step === 2 && state.service && (
          <DateStep
            service={state.service}
            settings={settings}
            selectedDate={state.date}
            onSelect={(date) => {
              update({ date, slot: null });
              goNext();
            }}
            onBack={goBack}
          />
        )}

        {step === 3 && pricedService && state.date && (
          <TimeStep
            service={pricedService}
            settings={settings}
            dateYmd={state.date}
            selectedSlot={state.slot}
            onSelect={(slot) => {
              update({ slot });
              goNext();
            }}
            onBack={goBack}
          />
        )}

        {step === 4 && pricedService && state.slot && (
          <DataStep
            service={pricedService}
            originalPriceCents={dayOriginalCents || pricedService.price_cents}
            voucherCode={voucher && voucher.serviceSlug === pricedService.slug ? voucher.code : null}
            slot={state.slot}
            state={state}
            update={update}
            onBack={goBack}
          />
        )}
      </div>

      {pricedService && step > 1 && <ServicePill service={pricedService} step={step} />}
    </main>
  );
}

function Header({ step }: { step: Step }) {
  return (
    <header className="sticky top-0 z-30 bg-cream/95 border-b border-black/[0.06]">
      <div className="mx-auto max-w-2xl px-5 h-14 flex items-center justify-between">
        <Link
          href="/maquiagem"
          className="text-sm text-ink-soft hover:text-ink transition flex items-center gap-1"
        >
          ← Voltar
        </Link>
        <p className="text-xs text-ink-soft">
          {step} <span className="text-sage-300">/</span> 4 ·{" "}
          <span className="text-ink">{STEP_LABELS[step - 1]}</span>
        </p>
      </div>
      <div className="h-0.5 bg-sand/50">
        <div
          className="h-full bg-sage-gradient transition-all duration-500 ease-out"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>
    </header>
  );
}

function ServicePill({ service, step }: { service: MakeService; step: Step }) {
  if (step >= 4) return null;
  return (
    <div className="sticky bottom-0 inset-x-0 px-5 pb-4 pointer-events-none sm:hidden">
      <div className="pointer-events-auto rounded-[1.4rem] bg-cream hairline elev-soft-lg px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-ink-soft">Selecionado</p>
          <p className="text-sm text-ink truncate font-medium">{service.name}</p>
        </div>
        <p className="font-serif text-lg text-sage-700 shrink-0">
          {formatBRL(service.price_cents)}
        </p>
      </div>
    </div>
  );
}

export type SlotChoice = { startsIso: string; endsIso: string };

export function toSlotChoice(slot: MakeSlot): SlotChoice {
  return {
    startsIso: slot.starts_at.toISOString(),
    endsIso: slot.ends_at.toISOString(),
  };
}
