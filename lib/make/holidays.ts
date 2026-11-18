// Feriados que valem para a Gaby (Erechim/RS), conferidos em 18/11/2026:
// - Nacionais: Lei 662/1949, Lei 6.802/1980 (12/10), Lei 14.759/2023 (20/11)
//   e Sexta-feira da Paixão (Lei 9.093/1995).
// - RS: 20 de setembro, Constituição do RS art. 6º § 1º.
// - Erechim: Decreto 5.799/2024, alterado pelo 5.904/2025: 19/03 (São José,
//   padroeiro), Corpus Christi e Sexta-feira da Paixão.
// Carnaval é ponto facultativo, não feriado, e fica de fora.
// Datas em 'YYYY-MM-DD', sempre no calendário local (sem fuso).

const FIXED: Record<string, string> = {
  "01-01": "Confraternização Universal",
  "03-19": "São José, padroeiro de Erechim",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "09-07": "Independência do Brasil",
  "09-20": "Revolução Farroupilha",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Dia Nacional de Zumbi e da Consciência Negra",
  "12-25": "Natal",
};

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), como 'YYYY-MM-DD'. */
export function easterYmd(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Nome do feriado naquela data, ou null quando é dia comum. */
export function holidayName(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const fixed = FIXED[ymd.slice(5)];
  if (fixed) return fixed;
  const easter = easterYmd(Number(ymd.slice(0, 4)));
  if (ymd === addDaysYmd(easter, -2)) return "Sexta-feira da Paixão";
  if (ymd === addDaysYmd(easter, 60)) return "Corpus Christi";
  return null;
}

/** Dia da semana de uma data local (0 = domingo). */
export function weekdayOfYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Domingo ou feriado: dia de preço especial da make. */
export function isSundayOrHoliday(ymd: string): boolean {
  return weekdayOfYmd(ymd) === 0 || holidayName(ymd) !== null;
}
