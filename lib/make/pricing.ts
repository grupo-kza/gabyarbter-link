// Pagamento é sempre no dia, com a Gaby. O preço-base (price_cents) é o valor
// em DINHEIRO; PIX e cartão têm um acréscimo fixo (custo da maquininha/PIX).
// Esta é a fonte única do acréscimo — mudou aqui, muda no app inteiro.
// (As cópias estáticas da landing e do JSON-LD espelham este valor à mão.)
export const CARD_SURCHARGE_CENTS = 1000; // R$ 10,00

/** Valor no PIX/cartão a partir do preço em dinheiro (em centavos). */
export function cardPriceCents(cashCents: number): number {
  return cashCents + CARD_SURCHARGE_CENTS;
}

/** Voucher de evento (make_campaigns): desconto % sobre o preço em dinheiro;
 *  PIX/cartão seguem com o acréscimo fixo por cima. */
export type MakeVoucher = {
  code: string;
  name: string;
  serviceSlug: string;
  discountPct: number;
};

export function voucherDiscountCents(cashCents: number, pct: number): number {
  return Math.round((cashCents * pct) / 100);
}

/** Preço em dinheiro já com o voucher, quando ele vale pro serviço. */
export function priceWithVoucher(
  service: { slug: string; price_cents: number },
  voucher: MakeVoucher | null,
): number {
  if (!voucher || voucher.serviceSlug !== service.slug) return service.price_cents;
  return service.price_cents - voucherDiscountCents(service.price_cents, voucher.discountPct);
}

/** Teto do valor manual: pega erro de digitação sem limitar atendimento real. */
export const MAX_MANUAL_TOTAL_CENTS = 5_000_000; // R$ 50.000,00

/** Lê um valor digitado em reais ("250", "250,50", "1.250,50") e devolve centavos. */
export function parseBRLToCents(raw: string): number | null {
  const clean = raw.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(clean)) return null;
  const [whole, fraction = ""] = clean.replace(/\./g, "").split(",");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** Centavos no formato que a Gaby digita ("250,00"). */
export function centsToBRLInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export type ManualTotalCheck =
  | { ok: true; remainingCents: number }
  | { ok: false; error: string };

/**
 * Regra do valor manual: muda só o total do atendimento. Entrada já paga fica
 * como está, o restante é recalculado e o total nunca fica abaixo da entrada,
 * porque devolver dinheiro é outra decisão, feita fora daqui.
 */
export function checkManualTotal(input: {
  totalCents: number;
  depositCents: number;
  finalPaid: boolean;
}): ManualTotalCheck {
  if (!Number.isInteger(input.totalCents) || input.totalCents < 0) {
    return { ok: false, error: "Informe um valor válido." };
  }
  if (input.totalCents > MAX_MANUAL_TOTAL_CENTS) {
    return { ok: false, error: "Esse valor passou do limite. Confira o que foi digitado." };
  }
  if (input.finalPaid) {
    return { ok: false, error: "O pagamento já foi marcado. Desfaça o pagamento para mudar o valor." };
  }
  if (input.totalCents < input.depositCents) {
    return { ok: false, error: "O valor não pode ficar abaixo da entrada já paga." };
  }
  return { ok: true, remainingCents: input.totalCents - input.depositCents };
}
