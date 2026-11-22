import type { Message, Phrase, Rel } from '../types';
import { BASELINE_ES } from './baseline-es';
import { PHRASE_SETS, normalizeForMatch } from './keywords';
import { EXCLUDED_WORDS, STOPWORDS } from './stopwords';
import { isLaughWord, stripAccents } from './text';

/**
 * Descubre las expresiones propias de un chat (reporte completo, "Lo que se dicen").
 * No usa listas fijas como fuente: cuenta n-gramas de 1 a 3 palabras dentro de cada mensaje y los
 * puntúa por cohesión (bi/trigramas) o distintividad frente a un español genérico (unigramas).
 * Las listas por modo solo dan un empujón ×1,3 a lo que el chat de verdad usa.
 * Es O(n) sobre los tokens: dos pasadas, un Map de conteos con poda de los n-gramas de conteo 1.
 */

export interface DiscoverOpts {
  rel: Rel;
  /** Claves (sin tildes) que no deben salir, p. ej. el top de la tarjeta "Así hablan ustedes". */
  excludeKeys?: Set<string>;
  /** Máximo de expresiones (por defecto 5). */
  limit?: number;
}

const DAY = 86_400_000;
const MIN = 60_000;
const PRUNE_EVERY = 20_000;
const PRUNE_OVER = 300_000;

/** Palabras de función que no cierran una expresión ("voy a", "de la"). */
const END_PURE = new Set(
  'de del la las el los lo y e o u en a al con por para sin sobre se que un unos mi tu su me te le'.split(' '),
);
/** Palabras de función que abren expresiones solo si están muy pegadas a lo que sigue ("de una"). */
const START_PURE = new Set(
  'de del la las el los lo y e o u en a al con por para sin sobre se'.split(' '),
);
/** Stopwords que sí pueden ser una expresión por sí solas. */
const UNI_OK = new Set(['pues', 'vaina', 'listo', 'tipo']);

/** Muletillas que aparecen en STOPWORDS pero que sí caracterizan a quien las usa. */
const COLLOQUIAL = new Set(['pues', 'vaina', 'listo', 'tipo', 'hola', 'buenas', 'buenos', 'bueno', 'buena']);
const isGeneric = (w: string): boolean =>
  BASELINE_ES.has(w) || START_PURE.has(w) || END_PURE.has(w) || (STOPWORDS.has(w) && !COLLOQUIAL.has(w));

const URL_RE = /(https?:\/\/\S+|www\.\S+)/gi;
const BREAK_RE = /[^\p{L}\p{M}\p{Zs}\t]+/u;
const SPACE_RE = /[\p{Zs}\t]+/u;
const ELONG_RE = /(\p{L})\1{2,}/gu;

interface Tok {
  /** Clave: sin tildes, alargamientos colapsados. */
  k: string;
  /** Forma de superficie: minúsculas con tildes, alargamientos colapsados. */
  s: string;
}

/** Corridas de palabras de un mensaje (los signos, números, emojis, risas y nombres cortan la corrida). */
function runsOf(text: string, skip: Set<string>): Tok[][] {
  const runs: Tok[][] = [];
  for (const clause of text.replace(URL_RE, ' ').toLowerCase().split(BREAK_RE)) {
    let run: Tok[] = [];
    for (const raw of clause.split(SPACE_RE)) {
      if (!raw) continue;
      const s = raw.replace(ELONG_RE, '$1');
      const k = stripAccents(s);
      if (isLaughWord(stripAccents(raw)) || isLaughWord(k) || skip.has(k)) {
        if (run.length) runs.push(run);
        run = [];
        continue;
      }
      run.push({ k, s });
    }
    if (run.length) runs.push(run);
  }
  return runs;
}

/** Visita cada n-grama (1 a 3) de las corridas: `fn(key, surface, n)`. */
function eachGram(runs: Tok[][], fn: (key: string, surface: string, n: number) => void): void {
  for (const run of runs) {
    for (let i = 0; i < run.length; i++) {
      let key = run[i].k;
      let surf = run[i].s;
      fn(key, surf, 1);
      for (let n = 2; n <= 3 && i + n <= run.length; n++) {
        key += ' ' + run[i + n - 1].k;
        surf += ' ' + run[i + n - 1].s;
        fn(key, surf, n);
      }
    }
  }
}

interface Acc {
  n: number;
  byPerson: number[];
  /** Hasta 3 días distintos por persona. */
  days: number[][];
  forms: Map<string, number>;
}

const TENDER = new Set(['te amo', 'te quiero', 'te extrano', 'te extraño']);

/** ¿La expresión es una frase cariñosa (admite el pie "Se lo dijeron…")? */
export function isTender(key: string): boolean {
  return TENDER.has(key);
}

/**
 * Palabras que casi siempre se escriben con mayúscula inicial en mitad de una frase → nombres propios.
 * Se ignora la primera palabra de cada oración (el celular la pone en mayúscula sola). O(n).
 */
export function properNouns(messages: Message[], pIdx: Map<string, number>): Set<string> {
  const mid = new Map<string, number>();
  const cap = new Map<string, number>();
  const WORD = /\p{L}+/gu;
  for (const m of messages) {
    if (m.type !== 'text' || !pIdx.has(m.author)) continue;
    const t = m.text;
    for (const match of t.matchAll(WORD)) {
      const i = match.index ?? 0;
      // ¿Empieza oración? (inicio del mensaje o tras . ! ? ¿ ¡ o salto de línea, ignorando espacios)
      let j = i - 1;
      while (j >= 0 && (t[j] === ' ' || t[j] === ' ')) j--;
      if (j < 0 || '.!?¿¡\n'.includes(t[j])) continue;
      const w = match[0];
      const k = stripAccents(w.toLowerCase());
      mid.set(k, (mid.get(k) ?? 0) + 1);
      if (w[0] !== w[0].toLowerCase()) cap.set(k, (cap.get(k) ?? 0) + 1);
    }
  }
  const out = new Set<string>();
  for (const [k, n] of mid) if (n >= 3 && (cap.get(k) ?? 0) / n >= 0.6) out.add(k);
  return out;
}

export function discoverPhrases(messages: Message[], people: string[], opts: DiscoverOpts): Phrase[] {
  const limit = opts.limit ?? 5;
  const skip = new Set<string>(EXCLUDED_WORDS);
  for (const n of people) for (const t of n.toLowerCase().split(/[^\p{L}\p{N}]+/u)) if (t.length >= 2) skip.add(stripAccents(t));
  const pIdx = new Map(people.map((n, i) => [n, i]));
  // Nombres propios de terceros ("Sofía", "Medellín"): la tarjeta se comparte, así que no deben salir.
  for (const k of properNouns(messages, pIdx)) skip.add(k);
  const seeds = new Set<string>();
  for (const def of PHRASE_SETS[opts.rel]) for (const p of def.phrases) seeds.add(normalizeForMatch(p));

  // ---- Pasada 1: conteos (una vez por mensaje)
  const counts = new Map<string, number>();
  let texts = 0;
  const seen = new Set<string>();
  for (const m of messages) {
    if (m.type !== 'text' || !pIdx.has(m.author)) continue;
    texts++;
    seen.clear();
    eachGram(runsOf(m.text, skip), (key) => {
      if (seen.has(key)) return;
      seen.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    if (texts % PRUNE_EVERY === 0 && counts.size > PRUNE_OVER) {
      // Los n-gramas (con espacio) de conteo 1 no llegarán al mínimo: se podan. Las palabras no.
      for (const [k, c] of counts) if (c === 1 && k.includes(' ')) counts.delete(k);
    }
  }
  if (texts === 0) return [];

  // ---- Candidatos
  const minCount = Math.max(5, Math.ceil(texts * 0.0005));
  const cand = new Map<string, { score: number; seeded: boolean; acc: Acc }>();
  for (const [key, c] of counts) {
    if (c < minCount) continue;
    const words = key.split(' ');
    const n = words.length;
    const seeded = seeds.has(key);
    let score: number;
    if (n === 1) {
      if (key.length < 3) continue;
      if (STOPWORDS.has(key) && !UNI_OK.has(key) && !seeded) continue;
      if (/^\p{N}+$/u.test(key)) continue;
      score = c * (BASELINE_ES.has(key) ? 0.15 : 1);
    } else {
      let minWord = Infinity;
      for (const w of words) minWord = Math.min(minWord, counts.get(w) ?? c);
      const cohesion = c / Math.max(1, minWord);
      score = c * cohesion * (1 + 0.3 * (n - 1));
      if (!seeded) {
        if (cohesion < 0.25) continue;
        if (words.every((w) => END_PURE.has(w))) continue;
        if (END_PURE.has(words[n - 1])) continue;
        // Empieza con palabra de función: solo vale si está muy pegada a algo que no sea genérico ("de una" sí, "a la casa" no).
        if (START_PURE.has(words[0]) && (cohesion < 0.4 || words.slice(1).every((w) => BASELINE_ES.has(w) || START_PURE.has(w)))) continue;
        // Todo genérico ("voy a ir", "yo no"): los trigramas se descartan; los bigramas solo si abren con palabra de función ("de una").
        if (words.every(isGeneric)) {
          if (n === 3 || !START_PURE.has(words[0])) continue;
          score *= 0.4;
        }
      }
    }
    if (seeded) score *= 1.3;
    cand.set(key, { score, seeded, acc: { n, byPerson: people.map(() => 0), days: people.map(() => []), forms: new Map() } });
  }
  if (cand.size === 0) return [];

  // ---- Pasada 2: por persona, días distintos y forma de superficie (solo candidatos)
  for (const m of messages) {
    const pi = pIdx.get(m.author);
    if (m.type !== 'text' || pi === undefined) continue;
    let day = -1;
    seen.clear();
    eachGram(runsOf(m.text, skip), (key, surf) => {
      const c = cand.get(key);
      if (!c || seen.has(key)) return;
      seen.add(key);
      c.acc.byPerson[pi]++;
      if (day < 0) day = Math.floor((m.ts - new Date(m.ts).getTimezoneOffset() * MIN) / DAY);
      const ds = c.acc.days[pi];
      if (ds.length < 3 && !ds.includes(day)) ds.push(day);
      c.acc.forms.set(surf, (c.acc.forms.get(surf) ?? 0) + 1);
    });
  }

  // ---- Mínimo de días distintos (≥ 3 para al menos una persona) y orden por puntaje
  const ranked: { key: string; score: number; seeded: boolean; count: number; acc: Acc }[] = [];
  for (const [key, c] of cand) {
    if (!c.acc.days.some((d) => d.length >= 3)) continue;
    const count = c.acc.byPerson.reduce((s, v) => s + v, 0);
    ranked.push({ key, score: c.score, seeded: c.seeded, count, acc: c.acc });
  }
  ranked.sort((a, b) => b.score - a.score || b.count - a.count || a.key.localeCompare(b.key));

  // ---- Deduplicar por inclusión y por palabra principal
  const mainWord = (key: string): string => key.split(' ').reduce((a, w) => (w.length > a.length ? w : a), '');
  const contains = (big: string, small: string): boolean => ` ${big} `.includes(` ${small} `);
  let chosen: typeof ranked = [];
  for (const c of ranked.slice(0, 300)) {
    const inside = chosen.find((s) => s.key !== c.key && contains(s.key, c.key) && s.count >= 0.7 * c.count);
    if (inside) continue;
    // Si `c` contiene a otras ya elegidas (y concentra ≥ 70 % de sus usos), las reemplaza todas.
    const outers = chosen.filter((s) => s.key !== c.key && contains(c.key, s.key) && c.count >= 0.7 * s.count);
    if (outers.length > 0) {
      chosen = chosen.filter((s) => !outers.includes(s));
      chosen.push(c);
      continue;
    }
    const mw = mainWord(c.key);
    if (chosen.some((s) => mainWord(s.key) === mw)) continue;
    chosen.push(c);
  }
  chosen.sort((a, b) => b.score - a.score || b.count - a.count || a.key.localeCompare(b.key));

  // ---- Excluir lo que ya sale en "Así hablan ustedes" (si deja < 3, se permiten)
  const toPhrase = (c: (typeof ranked)[number]): Phrase => ({
    text: [...c.acc.forms.entries()].sort((a, b) => b[1] - a[1])[0][0],
    key: c.key,
    count: c.count,
    byPerson: people.map((name, i) => ({ name, count: c.acc.byPerson[i] })),
    seeded: c.seeded,
  });
  const ex = opts.excludeKeys;
  const filtered = ex && ex.size ? chosen.filter((c) => !ex.has(c.key)) : chosen;
  return (filtered.length >= 3 ? filtered : chosen).slice(0, limit).map(toPhrase);
}
