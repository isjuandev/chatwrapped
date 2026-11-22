export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Miles con punto (es-CO), también para 4 dígitos: 2.104 */
export function fmtInt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 0 -> "12 a. m.", 12 -> "12 m.", 23 -> "11 p. m." */
export function fmtHour(h: number): string {
  if (h === 0) return '12 a. m.';
  if (h === 12) return '12 m.';
  if (h < 12) return `${h} a. m.`;
  return `${h - 12} p. m.`;
}

/** "2025-02-14" -> "14 de febrero" */
export function fmtDay(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
}

export function fmtDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'menos de 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

const FRACTIONS: [number, number][] = [];
for (const d of [2, 3, 4, 5, 10]) {
  for (let n = 1; n < d; n++) {
    const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
    if (g(n, d) === 1) FRACTIONS.push([n, d]);
  }
}

/** Aproxima una proporción a una fracción simple: 0.62 -> [3, 5]. */
export function simpleFraction(p: number): [number, number] {
  let best = FRACTIONS[0];
  let bestScore = Infinity;
  for (const [n, d] of FRACTIONS) {
    const score = Math.abs(p - n / d) + 0.004 * d;
    if (score < bestScore) {
      bestScore = score;
      best = [n, d];
    }
  }
  return best;
}

/** "6 de cada 10" / "1 de cada 4" para una proporción 0..1. */
export function ofEach(p: number): string {
  if (p >= 0.5) return `${Math.min(10, Math.max(1, Math.round(p * 10)))} de cada 10`;
  return `1 de cada ${Math.max(2, Math.round(1 / Math.max(p, 0.001)))}`;
}

export const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** "2025-03-07" -> mes en minúscula ("marzo"). */
export function monthOfIso(iso: string): string {
  return MONTHS[Number(iso.split('-')[1]) - 1];
}

/** Duración de una respuesta: "40 s", "3 min", "1 h 5 min". */
export function fmtResponse(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))} s`;
  return fmtDuration(ms);
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** 2,5 / 12 (coma decimal es-CO, un decimal por debajo de 10). */
export function fmtRatio(x: number): string {
  if (x >= 10) return fmtInt(x);
  return (Math.round(x * 10) / 10).toString().replace('.', ',');
}
