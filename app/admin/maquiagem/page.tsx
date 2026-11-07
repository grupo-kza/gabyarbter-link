import { requireTeacher } from "@/lib/admin-guard";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AgendaCalendar } from "./agenda-calendar";
import { getYogaClassesSince } from "@/lib/make/queries";

export const dynamic = "force-dynamic";

export default async function MaquiagemAgendaPage() {
  const { supabase } = await requireTeacher();

  // Agenda é forward-looking: recentes (90 dias) + futuros. O histórico migrado
  // (milhares de atendimentos antigos) vive no CRM/Faturamento, não aqui.
  const since = new Date(Date.now() - 90 * 24 * 3600_000).toISOString();

  const [{ data: appointments }, { data: services }, { data: blocks }, { data: recurring }, yogaClasses] =
    await Promise.all([
      supabase
        .from("make_appointments")
        .select(`
          id, client_name, client_phone, client_email,
          starts_at, ends_at, status,
          total_cents, deposit_cents, amount_cents,
          final_paid_at, final_payment_method,
          payment_method, notes, service_id,
          confirmed_at, source, campaign, discount_cents
        `)
        .in("status", ["confirmed", "pending_payment", "completed"])
        .gte("starts_at", since)
        .order("starts_at", { ascending: true }),
      supabase.from("make_services").select("id, name, price_cents"),
      supabase
        .from("make_blocked_dates")
        .select("id, date, all_day, start_time, end_time, reason, kind"),
      supabase
        .from("make_recurring_blocks")
        .select("id, weekday, start_time, end_time, reason, kind")
        .eq("active", true),
      getYogaClassesSince(since),
    ]);

  const serviceMap = new Map((services ?? []).map((s) => [s.id, s]));
  const appts = (appointments ?? []).map((a) => ({
    ...a,
    client_phone: a.client_phone ?? "", // migrados podem não ter telefone
    serviceName: serviceMap.get(a.service_id)?.name ?? "Maquiagem",
    servicePriceCents: serviceMap.get(a.service_id)?.price_cents ?? null,
  }));

  return (
    <div className="space-y-6 fade-up">
      <header className="flex items-start justify-between gap-3">
        <h1 className="font-serif text-[1.75rem] leading-tight tracking-tight text-ink">
          Agenda
        </h1>
        <Link
          href="/admin/maquiagem/novo"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-sage-gradient text-cream text-sm font-medium elev-1 hover:opacity-95 transition shrink-0"
        >
          <Plus className="size-4" /> Novo
        </Link>
      </header>

      <AgendaCalendar
        appointments={appts}
        oneOffBlocks={blocks ?? []}
        recurringBlocks={recurring ?? []}
        yogaClasses={yogaClasses}
      />
    </div>
  );
}
