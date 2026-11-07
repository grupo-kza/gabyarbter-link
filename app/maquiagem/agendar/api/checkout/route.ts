import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveMakeVoucher, getMakeServiceBySlug, getMakeSettings } from "@/lib/make/queries";
import { voucherDiscountCents } from "@/lib/make/pricing";
import { notifyGabyNewBooking } from "@/lib/make/notify";
import { toE164 } from "@/lib/make/phone";

export const dynamic = "force-dynamic";

type Body = {
  serviceSlug?: string;
  startsAtIso?: string;
  clientName?: string;
  clientPhone?: string;
  campaign?: string | null; // voucher de evento (make_campaigns)
};

// Sem cobrança online: a Gaby prefere receber no dia (PIX, dinheiro ou cartão).
// O pedido entra como `pending_payment` = AGUARDANDO A GABY CONFIRMAR. Já reserva
// o horário (a exclusion constraint cobre pending_payment) e avisa a Gaby; quando
// ela confirma no painel, dispara o WhatsApp automático pra cliente.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.serviceSlug || !body?.startsAtIso || !body?.clientName || !body?.clientPhone) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const service = await getMakeServiceBySlug(body.serviceSlug);
  if (!service) {
    return NextResponse.json({ ok: false, error: "service_not_found" }, { status: 404 });
  }
  const settings = await getMakeSettings();

  const startsAt = new Date(body.startsAtIso);
  if (isNaN(startsAt.getTime())) {
    return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
  }
  const minAdvanceMs = settings.min_advance_hours * 3600_000;
  if (startsAt.getTime() < Date.now() + minAdvanceMs - 60_000) {
    return NextResponse.json({ ok: false, error: "too_soon" }, { status: 400 });
  }
  // Teto de antecedência: o front respeita, mas um POST direto não. +1 dia de folga
  // pra não barrar o último dia da janela por arredondamento.
  const maxAdvanceMs = settings.max_advance_days * 86400_000;
  if (startsAt.getTime() > Date.now() + maxAdvanceMs + 86400_000) {
    return NextResponse.json({ ok: false, error: "too_far" }, { status: 400 });
  }

  const clientPhone = toE164(body.clientPhone);
  if (!clientPhone) {
    return NextResponse.json({ ok: false, error: "invalid_phone" }, { status: 400 });
  }

  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);

  // Voucher: só vale ativo, no prazo e no serviço da campanha. Fora disso a
  // reserva segue normal, sem desconto e sem vínculo.
  const voucher = body.campaign ? await getActiveMakeVoucher(body.campaign) : null;
  const applyVoucher = voucher && voucher.serviceSlug === service.slug ? voucher : null;
  const discountCents = applyVoucher ? voucherDiscountCents(service.price_cents, applyVoucher.discountPct) : 0;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured" },
      { status: 500 },
    );
  }

  // A exclusion constraint não enxerga encaixes (allow_overlap) nem o histórico
  // migrado, então o choque com eles é barrado aqui. A constraint segue cobrindo
  // a corrida entre duas reservas online.
  const { data: taken, error: takenError } = await admin
    .from("make_appointments")
    .select("id")
    .in("status", ["pending_payment", "confirmed"])
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString())
    .limit(1);
  if (takenError) {
    console.error("checkout conflict check failed:", takenError.message);
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }
  if (taken && taken.length > 0) {
    return NextResponse.json({ ok: false, error: "slot_taken" }, { status: 409 });
  }

  if (applyVoucher) {
    // um uso por WhatsApp por campanha (reserva cancelada libera)
    const { count } = await admin
      .from("make_appointments")
      .select("id", { count: "exact", head: true })
      .eq("campaign", applyVoucher.code)
      .eq("client_phone", clientPhone)
      .in("status", ["pending_payment", "confirmed", "completed"]);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ ok: false, error: "voucher_used" }, { status: 409 });
    }
  }

  const { data: appt, error: insertError } = await admin
    .from("make_appointments")
    .insert({
      service_id: service.id,
      client_name: body.clientName.trim(),
      client_phone: clientPhone,
      client_email: null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "pending_payment", // aguardando a Gaby confirmar
      total_cents: service.price_cents - discountCents,
      deposit_cents: 0, // nada pago online — recebe tudo no dia
      amount_cents: 0,
      payment_method: null,
      ...(applyVoucher ? { campaign: applyVoucher.code, discount_cents: discountCents } : {}),
    })
    .select()
    .single();

  if (insertError || !appt) {
    // exclusion constraint (slot já ocupado) gera 23P01
    const code = (insertError as { code?: string } | null)?.code;
    if (code === "23P01") {
      return NextResponse.json({ ok: false, error: "slot_taken" }, { status: 409 });
    }
    // detalhe do Postgres fica no log do servidor, nunca na resposta pública
    console.error("checkout insert failed:", insertError?.message);
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  await notifyGabyNewBooking(appt.id);

  return NextResponse.json({ ok: true, appointmentId: appt.id });
}
