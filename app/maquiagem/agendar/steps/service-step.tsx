"use client";

import Image from "next/image";
import Link from "next/link";
import type { MakeService } from "@/lib/make/types";
import { formatBRL } from "@/lib/utils";
import { cardPriceCents, SPECIAL_DAY_CASH_CENTS, SPECIAL_DAY_SERVICE_SLUGS } from "@/lib/make/pricing";

const WHATSAPP_URL = "https://wa.me/message/E6RZKY2Y72LEB1";

// Foto de exemplo por serviço (mesmas da landing). Fallback pra serviço novo.
const SERVICE_IMAGES: Record<string, string> = {
  express: "/maquiagem/cacheada-express.jpg",
  blindada: "/maquiagem/completa-tattoo.jpg",
};
const FALLBACK_IMAGE = "/maquiagem/hero-makes.jpg";

export function ServiceStep({
  services,
  selectedId,
  onSelect,
}: {
  services: MakeService[];
  selectedId: string | null;
  onSelect: (svc: MakeService) => void;
}) {
  return (
    <section className="fade-up">
      {/* Tranquiliza logo de cara: o medo nº1 é "vou ter que pagar agora?" */}
      <div className="flex items-start gap-3 rounded-[1.25rem] bg-sage-50 hairline p-4 mb-6">
        <Shield />
        <div>
          <p className="font-medium text-sage-900">Sem pagar nada agora</p>
          <p className="text-sm text-sage-700 mt-0.5">
            Você só reserva. O pagamento é no dia, com a Gaby — PIX, dinheiro ou cartão.
          </p>
        </div>
      </div>

      <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-ink">
        Qual make você quer?
      </h1>
      <p className="mt-2 text-ink-soft">Escolhe a técnica. Data e horário no próximo passo.</p>

      <div className="mt-6 space-y-4">
        {services.map((s) => {
          const featured = s.slug === "blindada";
          const img = SERVICE_IMAGES[s.slug] ?? FALLBACK_IMAGE;
          const isSelected = selectedId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className={`group block w-full text-left rounded-[1.5rem] bg-paper overflow-hidden elev-soft hover:elev-soft-lg transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-300 ${
                isSelected ? "ring-[1.5px] ring-sage-500" : "hairline"
              }`}
            >
              <div className="relative aspect-[16/10] bg-sand">
                <Image
                  src={img}
                  alt={`Exemplo de ${s.name}`}
                  fill
                  sizes="(min-width: 640px) 600px, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                {featured && (
                  <span className="absolute top-3 right-3 bg-sage-700 text-cream text-[11px] font-medium rounded-full px-2.5 py-1 elev-soft">
                    Mais escolhida
                  </span>
                )}
                {isSelected && (
                  <span className="absolute top-3 left-3 inline-flex items-center justify-center size-7 rounded-full bg-sage-600 text-cream elev-soft">
                    <CheckMark />
                  </span>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-ink leading-tight">{s.name}</h3>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-xl text-sage-700 leading-none">{formatBRL(s.price_cents)}</p>
                    <p className="text-[11px] text-ink-soft mt-1">
                      dinheiro · {formatBRL(cardPriceCents(s.price_cents))} pix/cartão
                    </p>
                  </div>
                </div>
                {s.description && (
                  <p className="mt-2 text-sm text-ink-soft leading-relaxed">{s.description}</p>
                )}
                <div className="mt-3 flex items-center gap-2.5 text-xs text-ink-soft">
                  <span className="inline-flex items-center gap-1">
                    <Clock />~{s.duration_min} min
                  </span>
                  <span aria-hidden className="h-3 w-px bg-sand" />
                  <span>sem pagar agora</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {services.some((s) => SPECIAL_DAY_SERVICE_SLUGS.includes(s.slug)) && (
        <p className="mt-4 rounded-[1.1rem] bg-cream-soft/70 hairline px-4 py-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">Domingo e feriado:</span>{" "}
          {formatBRL(SPECIAL_DAY_CASH_CENTS)} no dinheiro · {formatBRL(cardPriceCents(SPECIAL_DAY_CASH_CENTS))} no
          pix/cartão. Aos domingos, a Gaby atende até as 11h.
        </p>
      )}

      <div className="mt-6 text-center">
        <Link
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 text-sm text-sage-700 hover:text-sage-900 transition"
        >
          <Whatsapp />
          Não sabe qual? Chama a Gaby no WhatsApp
        </Link>
      </div>
    </section>
  );
}

function Shield() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-sage-700 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 2.5 4 5v5c0 4 6 7.5 6 7.5s6-3.5 6-7.5V5l-6-2.5z" />
      <path d="M7.5 10l1.8 1.8L13 8" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10.5l4 4L16 6" />
    </svg>
  );
}

function Clock() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 1.5" />
    </svg>
  );
}

function Whatsapp() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
      <path d="M10 2a8 8 0 0 0-6.9 12L2 18l4.1-1.1A8 8 0 1 0 10 2zm0 14.5a6.5 6.5 0 0 1-3.4-1l-.2-.1-2.4.6.6-2.3-.2-.2A6.5 6.5 0 1 1 10 16.5zm3.6-4.6c-.2-.1-1.1-.5-1.3-.6s-.3-.1-.4.1-.5.6-.6.7-.2.1-.4 0a5.3 5.3 0 0 1-1.6-1 6 6 0 0 1-1.1-1.4c-.1-.2 0-.3.1-.4l.3-.3.1-.3v-.3l-.5-1.3c-.2-.4-.3-.3-.4-.3h-.4a.8.8 0 0 0-.5.2A2.3 2.3 0 0 0 6 9.6a4 4 0 0 0 .8 2 9 9 0 0 0 3.4 3 4.2 4.2 0 0 0 2.4.5 2 2 0 0 0 1.3-.9 1.7 1.7 0 0 0 .1-.9c-.1-.1-.2-.2-.4-.3z" />
    </svg>
  );
}
