import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Lotus } from "@/components/lotus";
import { JsonLd, beautySalon, gabyPerson, maquiagemFaqs, buildFaqSchema } from "@/lib/seo/jsonld";
import { Faq } from "@/components/faq";

// Fluxo de agendamento INTERNO (substituiu o TuaAgenda em 23/06/2026).
const BOOKING_URL = "/maquiagem/agendar";
const WHATSAPP_URL = "https://wa.me/message/E6RZKY2Y72LEB1";
const INSTAGRAM_URL = "https://www.instagram.com/gabyarbter/";

export const metadata: Metadata = {
  title: "Maquiagem em Erechim/RS — Gaby Arbter (Express e Blindada)",
  description:
    "Maquiagem profissional em Erechim/RS. Express R$ 175-185 (~30min) e Blindada R$ 200-210 (~45min); domingo e feriado R$ 230-240. Agendamento online e pagamento presencial (PIX, dinheiro ou cartão).",
  alternates: { canonical: "/maquiagem" },
  keywords: [
    "maquiagem Erechim",
    "maquiadora Erechim",
    "maquiagem RS",
    "maquiagem profissional Erechim",
    "maquiagem blindada Erechim",
    "Gaby Arbter maquiagem",
  ],
  openGraph: {
    title: "Maquiagem em Erechim/RS — Gaby Arbter",
    description:
      "Express R$ 175-185 e Blindada R$ 200-210; domingo e feriado R$ 230-240. Estúdio em Erechim. Agendamento online, pagamento presencial.",
    url: "https://gabyarbter.com.br/maquiagem",
    images: [
      {
        url: "/maquiagem/hero-makes.jpg",
        width: 1200,
        height: 630,
        alt: "Maquiagem Gaby Arbter em Erechim",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maquiagem em Erechim/RS — Gaby Arbter",
    description: "Express R$ 175-185 · Blindada R$ 200-210 · domingo e feriado R$ 230-240. Em Erechim.",
    images: ["/maquiagem/hero-makes.jpg"],
  },
};

const GALLERY = [
  { src: "/maquiagem/editorial-ruiva.jpg", alt: "Make editorial com batom marsala" },
  { src: "/maquiagem/curto-vermelho.jpg", alt: "Make com batom vermelho terra" },
  { src: "/maquiagem/blush-suave.jpg", alt: "Make com blush rosado e acabamento natural" },
  { src: "/maquiagem/sorriso-suave.jpg", alt: "Make natural com sorriso suave e luminosidade" },
];

export default function MaquiagemPage() {
  return (
    <main className="flex-1 pb-24 sm:pb-0">
      <JsonLd
        data={[
          beautySalon,
          gabyPerson,
          buildFaqSchema(maquiagemFaqs, "https://gabyarbter.com.br/maquiagem"),
        ]}
      />
      <SiteHeader />
      <Hero />
      <Servicos />
      <ComoFunciona />
      <Galeria />
      <SobreGaby />
      <Faq items={maquiagemFaqs} />
      <CtaFinal />
      <SiteFooter />
      <StickyMobileCta />
    </main>
  );
}

/* ---------- Header ---------- */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-cream/95 border-b border-sand/50">
      <div className="mx-auto max-w-6xl px-5 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/maquiagem" className="flex items-center gap-2 text-ink">
          <Lotus className="size-6 sm:size-7" />
          <span className="font-serif text-base sm:text-lg leading-none tracking-tight">
            Gaby Arbter
          </span>
        </Link>
        <Link
          href={BOOKING_URL}
          className="hidden sm:inline-flex h-9 items-center rounded-full px-5 text-sm font-medium bg-sage-gradient text-cream elev-1 hover:opacity-95 active:opacity-90 transition"
        >
          Agendar
        </Link>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-12 sm:pt-16 sm:pb-20 md:pt-24 md:pb-28">
        <div className="grid md:grid-cols-[1.05fr,1fr] gap-10 md:gap-14 items-center">
          <div className="order-2 md:order-1 fade-up">
            <p className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-[0.22em] text-sage-700 mb-5">
              <span className="size-1.5 rounded-full bg-sage-500" />
              Maquiagem · Erechim
            </p>
            <h1 className="font-serif text-[44px] leading-[1.02] sm:text-[56px] md:text-[72px] md:leading-[1.0] tracking-tight text-ink">
              Beleza
              <br />
              como <span className="italic text-sage-700">ritual</span>.
            </h1>
            <p className="mt-6 text-base sm:text-lg md:text-xl text-ink-soft max-w-xl leading-relaxed">
              Make que não transforma — apenas realça o que já é{" "}
              <span className="italic">extremamente belo</span>. Pra noivas,
              madrinhas, formandas e quem quer se sentir inteira em um dia
              que importa.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={BOOKING_URL}
                className="inline-flex h-12 items-center gap-2 rounded-full pl-6 pr-5 text-base font-medium bg-sage-gradient text-cream elev-2 hover:opacity-95 active:opacity-90 transition"
              >
                Agendar minha make
                <Arrow />
              </Link>
              <Link
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex h-12 items-center rounded-full px-6 text-base font-medium text-sage-700 border border-sage-200 hover:bg-sage-50 active:bg-sage-100 transition"
              >
                Tirar uma dúvida
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-5 text-xs sm:text-sm text-ink-soft">
              <Stat n="6,8k+" label="seguidores no @gabyarbter" />
              <Divider />
              <Stat n="100+" label="noivas, madrinhas e formandas" />
            </div>
          </div>

          <div className="order-1 md:order-2 relative">
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rounded-[2rem] bg-sage-100/50 blur-3xl"
            />
            <div className="relative aspect-[4/5] rounded-[1.75rem] overflow-hidden elev-3 scale-in">
              <Image
                src="/maquiagem/hero-makes.jpg"
                alt="Make por Gaby Arbter em cenário de flores azuis"
                fill
                priority
                sizes="(min-width: 768px) 48vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="hidden sm:flex absolute -bottom-5 -left-5 bg-cream elev-2 rounded-2xl px-4 py-3 items-center gap-3 max-w-[260px]">
              <Lotus className="size-7 shrink-0" />
              <p className="text-xs text-ink-soft leading-snug">
                Cuidado ancestral, presença encarnada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <span className="font-serif text-base sm:text-lg text-ink mr-1.5">{n}</span>
      <span className="text-ink-soft">{label}</span>
    </div>
  );
}

function Divider() {
  return <span className="h-3 w-px bg-sand" aria-hidden />;
}

/* ---------- Serviços ---------- */

const SERVICES = [
  {
    id: "express",
    name: "Maquiagem Express",
    tagline: "A queridinha. Realce natural com pele resistente.",
    description:
      "Pra quem quer se sentir linda e segura em um evento social, com os traços valorizados — sem parecer que acabou de sair de um banho de salão. Beleza com leveza.",
    pricing: [
      { label: "Dinheiro", value: "R$ 175" },
      { label: "Pix / cartão", value: "R$ 185" },
    ],
    specialDay: "Domingo e feriado: R$ 230 no dinheiro · R$ 240 no pix/cartão",
    duration: "30 min",
    highlights: [
      { icon: Sparkle, text: "Foco no realce natural" },
      { icon: Sun, text: "Pele luminosa e duradoura" },
      { icon: Heart, text: "Ideal pra eventos sociais" },
    ],
    note: "Sem construção de esfumado",
    image: "/maquiagem/cacheada-express.jpg",
    imageAlt: "Maquiagem Express por Gaby Arbter — pele natural e luminosa",
    accent: "default" as const,
  },
  {
    id: "blindada",
    name: "Maquiagem Blindada",
    tagline: "A escolha à prova de tudo. Água, suor, lágrimas de emoção.",
    description:
      "A técnica ideal pra grandes celebrações onde a durabilidade extrema é prioridade. Pele preparada pra atravessar horas e horas — sem retoque, sem susto.",
    pricing: [
      { label: "Dinheiro", value: "R$ 200" },
      { label: "Pix / cartão", value: "R$ 210" },
    ],
    specialDay: "Domingo e feriado: R$ 230 no dinheiro · R$ 240 no pix/cartão",
    duration: "40-45 min",
    highlights: [
      { icon: Drop, text: "À prova d'água, suor e lágrimas" },
      { icon: Shield, text: "Durabilidade extrema" },
      { icon: Crown, text: "Pra grandes celebrações" },
    ],
    note: "Inclui construção de esfumado",
    image: "/maquiagem/completa-tattoo.jpg",
    imageAlt: "Maquiagem Blindada por Gaby Arbter — make duradoura",
    accent: "featured" as const,
  },
];

function Servicos() {
  return (
    <section id="servicos" className="bg-cream-soft/70 border-y border-sand/50">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20 md:py-28">
        <div className="max-w-2xl mb-10 sm:mb-14">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-sage-700 mb-3">
            Os serviços
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight">
            Duas técnicas. Uma <span className="italic text-sage-700">presença</span>.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-ink-soft leading-relaxed">
            A resposta tá no seu objetivo e no tipo de evento. Uma é leveza
            e realce. A outra, blindagem pra durar o dia inteiro.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          {SERVICES.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>

        <p className="mt-8 text-center text-xs sm:text-sm text-ink-soft">
          Atendimento em estúdio · Erechim · RS
        </p>
      </div>
    </section>
  );
}

function ServiceCard({ service }: { service: (typeof SERVICES)[number] }) {
  const isFeatured = service.accent === "featured";
  return (
    <article
      className={[
        "group rounded-3xl overflow-hidden border bg-cream flex flex-col",
        "elev-1 hover:elev-2 transition-shadow duration-500",
        isFeatured ? "border-sage-300" : "border-sand",
      ].join(" ")}
    >
      <div className="relative aspect-[5/4] sm:aspect-[5/4]">
        <Image
          src={service.image}
          alt={service.imageAlt}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        />
        {isFeatured && (
          <span className="absolute top-4 right-4 bg-sage-700 text-cream text-[10px] sm:text-[11px] uppercase tracking-[0.16em] px-2.5 py-1 rounded-full elev-1">
            Mais escolhida
          </span>
        )}
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-cream/95 text-ink text-[11px] px-2.5 py-1 rounded-full">
          <Clock />
          {service.duration}
        </div>
      </div>

      <div className="p-6 sm:p-8 flex flex-col flex-1">
        <h3 className="font-serif text-2xl sm:text-[26px] md:text-[28px] tracking-tight">
          {service.name}
        </h3>
        <p className="mt-1.5 text-sm sm:text-[15px] text-sage-700/90 leading-snug">
          {service.tagline}
        </p>

        {/* Preços */}
        <div className="mt-5 -mx-1 flex flex-wrap gap-2">
          {service.pricing.map((p) => (
            <div
              key={p.label}
              className="flex-1 min-w-[120px] bg-sage-50/80 border border-sage-100 rounded-xl px-3.5 py-2.5"
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                {p.label}
              </p>
              <p className="font-serif text-xl sm:text-2xl text-sage-700 leading-tight">
                {p.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">{service.specialDay}</p>

        <p className="mt-5 text-ink-soft leading-relaxed text-[15px] sm:text-base">
          {service.description}
        </p>

        <ul className="mt-5 space-y-3">
          {service.highlights.map((h) => (
            <li key={h.text} className="flex items-start gap-3 text-sm sm:text-[15px] text-ink">
              <span className="mt-0.5 size-7 shrink-0 rounded-full bg-sage-50 text-sage-700 inline-flex items-center justify-center">
                <h.icon />
              </span>
              <span className="leading-snug">{h.text}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs text-ink-soft italic">{service.note}</p>

        <Link
          href={`/maquiagem/agendar?service=${service.id}`}
          className={[
            "mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition",
            isFeatured
              ? "bg-sage-gradient text-cream elev-1 hover:opacity-95 active:opacity-90"
              : "border border-sage-300 text-sage-700 hover:bg-sage-50 active:bg-sage-100",
          ].join(" ")}
        >
          Agendar {service.name.replace("Maquiagem ", "")}
          <Arrow />
        </Link>
      </div>
    </article>
  );
}

/* ---------- Como funciona ---------- */

function ComoFunciona() {
  const steps = [
    {
      n: "01",
      title: "Escolhe a técnica",
      body: "Express pra eventos sociais. Blindada pra grandes celebrações. Na dúvida, manda mensagem.",
    },
    {
      n: "02",
      title: "Agenda online",
      body: "Reserva data e horário aqui mesmo. A Gaby confirma rapidinho no WhatsApp.",
    },
    {
      n: "03",
      title: "Vem no dia",
      body: "Chega de cara lavada, com cabelo pronto. Você sai radiante, no horário.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20 md:py-28">
      <p className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-sage-700 mb-3">
        Como funciona
      </p>
      <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight max-w-2xl">
        Três passos. Sem <span className="italic text-sage-700">mistério</span>.
      </h2>
      <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mt-10 sm:mt-14">
        {steps.map((s, i) => (
          <div
            key={s.n}
            className="bg-cream-soft/50 rounded-2xl p-6 sm:p-7 border border-sand/70 elev-1 hover:elev-2 transition-shadow duration-500"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-serif text-3xl sm:text-4xl text-sage-300 leading-none">
                {s.n}
              </span>
              {i === steps.length - 1 && <Lotus className="size-6 opacity-60" />}
            </div>
            <h3 className="font-serif text-xl sm:text-2xl mt-1 mb-2">{s.title}</h3>
            <p className="text-ink-soft leading-relaxed text-[15px]">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Galeria ---------- */

function Galeria() {
  return (
    <section className="bg-cream-soft/40 border-y border-sand/50">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20 md:py-28">
        <div className="flex items-end justify-between gap-6 mb-8 sm:mb-12">
          <div>
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-sage-700 mb-3">
              Trabalhos
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight">
              Mulheres com <span className="italic text-sage-700">personalidade</span>.
            </h2>
          </div>
          <Link
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener"
            className="hidden sm:inline-flex shrink-0 text-sm text-sage-700 hover:text-sage-900 transition group items-center gap-1"
          >
            Ver mais no Instagram
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {GALLERY.map((img, i) => (
            <div
              key={img.src}
              className={[
                "relative aspect-[4/5] rounded-2xl overflow-hidden bg-sand elev-1 hover:elev-2 transition-shadow duration-500",
                i === 0 ? "md:row-span-2 md:aspect-auto" : "",
              ].join(" ")}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.04]"
              />
            </div>
          ))}
        </div>
        <Link
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener"
          className="sm:hidden mt-6 inline-flex text-sm text-sage-700"
        >
          Ver mais no Instagram →
        </Link>
      </div>
    </section>
  );
}

/* ---------- Sobre Gaby ---------- */

function SobreGaby() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20 md:py-28">
      <div className="grid md:grid-cols-[1fr,1.2fr] gap-10 md:gap-16 items-center">
        <div className="relative aspect-[4/5] rounded-[1.75rem] overflow-hidden elev-2 mx-auto md:mx-0 max-w-md w-full">
          <Image
            src="/maquiagem/blush-suave.jpg"
            alt="Trabalho de Gaby Arbter — make natural com blush rosado"
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-sage-700 mb-3">
            Sobre a Gaby
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight">
            Maquiagem é só <em>uma</em> das maneiras de cuidar de você.
          </h2>
          <div className="mt-6 space-y-4 text-ink-soft text-[16px] sm:text-lg leading-relaxed">
            <p>
              Gaby Arbter é maquiadora, professora de yoga e estudiosa de
              ayurveda. Atende em Erechim há anos, e cada uma dessas
              práticas é uma tradução do mesmo fio: <em>presença</em>.
            </p>
            <p>
              Por isso a make não tenta esconder, transformar ou virar
              máscara. Realça o que já tá ali — e te entrega no dia
              importante sentindo que aquela é você mesma, só mais
              inteira.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-sage-700 border border-sage-200 hover:bg-sage-50 active:bg-sage-100 transition"
            >
              <Instagram />
              @gabyarbter
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full px-5 text-sm font-medium text-sage-700 border border-sage-200 hover:bg-sage-50 active:bg-sage-100 transition"
            >
              Conhecer o Sopro Yoga
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA final ---------- */

function CtaFinal() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-5xl px-5 py-20 sm:py-24 md:py-32 text-center relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60 pointer-events-none"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 size-[480px] rounded-full bg-sage-200/40 blur-3xl" />
        </div>
        <Lotus className="size-10 sm:size-12 mx-auto mb-6 breathe" />
        <h2 className="font-serif text-3xl sm:text-4xl md:text-[56px] leading-[1.05] tracking-tight">
          Reserva a sua data.
          <br className="hidden sm:block" />
          <span className="italic text-sage-700">A sua versão mais inteira te espera.</span>
        </h2>
        <p className="mt-5 text-ink-soft text-base sm:text-lg max-w-xl mx-auto">
          Erechim · RS · Atendimento em estúdio
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={BOOKING_URL}
            className="inline-flex h-12 items-center gap-2 rounded-full pl-6 pr-5 text-base font-medium bg-sage-gradient text-cream elev-2 hover:opacity-95 active:opacity-90 transition"
          >
            Agendar minha make
            <Arrow />
          </Link>
          <Link
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-base font-medium text-sage-700 border border-sage-200 hover:bg-sage-50 active:bg-sage-100 transition"
          >
            <Whatsapp />
            Falar no WhatsApp
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function SiteFooter() {
  return (
    <footer className="border-t border-sand/60 bg-cream-soft/40">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-sm text-ink-soft">
        <div className="flex items-center gap-3">
          <Lotus className="size-7 sm:size-8" />
          <div>
            <p className="font-serif text-lg sm:text-xl text-ink leading-none">Gaby Arbter</p>
            <p className="mt-1">Maquiagem · Yoga · Ayurveda · Erechim/RS</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href={BOOKING_URL} className="hover:text-sage-700 transition">
            Agendar
          </Link>
          <Link href={WHATSAPP_URL} target="_blank" rel="noopener" className="hover:text-sage-700 transition">
            WhatsApp
          </Link>
          <Link href={INSTAGRAM_URL} target="_blank" rel="noopener" className="hover:text-sage-700 transition">
            Instagram
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Sticky bottom CTA (mobile only) ---------- */

function StickyMobileCta() {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden safe-bottom">
      <div className="mx-3 mb-3 rounded-2xl bg-cream border border-sand elev-3 px-3 py-2.5 flex items-center gap-2">
        <Link
          href={BOOKING_URL}
          className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium bg-sage-gradient text-cream"
        >
          Agendar minha make
          <Arrow />
        </Link>
        <Link
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener"
          aria-label="WhatsApp"
          className="size-11 inline-flex items-center justify-center rounded-xl text-sage-700 border border-sage-200"
        >
          <Whatsapp />
        </Link>
      </div>
    </div>
  );
}

/* ---------- Icons (inline SVG, no extra deps) ---------- */

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10h12M11 5l5 5-5 5" />
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
function Drop() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 3c2.5 3 5 6 5 9a5 5 0 1 1-10 0c0-3 2.5-6 5-9z" />
    </svg>
  );
}
function Shield() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 2.5 4 5v5c0 4 6 7.5 6 7.5s6-3.5 6-7.5V5l-6-2.5z" />
    </svg>
  );
}
function Crown() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7l3 3 4-5 4 5 3-3-1.5 8h-11L3 7z" />
    </svg>
  );
}
function Sparkle() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 3v3M10 14v3M3 10h3M14 10h3M5.5 5.5l2 2M12.5 12.5l2 2M5.5 14.5l2-2M12.5 7.5l2-2" />
    </svg>
  );
}
function Sun() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M4.5 15.5l1.4-1.4M14.1 5.9l1.4-1.4" />
    </svg>
  );
}
function Heart() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 16s-6-3.5-6-8a3.5 3.5 0 0 1 6-2.5A3.5 3.5 0 0 1 16 8c0 4.5-6 8-6 8z" />
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
function Instagram() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="3" width="14" height="14" rx="4" />
      <circle cx="10" cy="10" r="3" />
      <circle cx="14.5" cy="5.5" r=".6" fill="currentColor" />
    </svg>
  );
}
