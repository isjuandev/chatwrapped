import type { PersonStats, Rel, WrappedData } from '../types';

/** "El reto": una pregunta con una respuesta clara sacada de los datos del chat. */
export interface Quiz {
  /** Identificador de la pregunta del banco (para pruebas). */
  id: string;
  question: string;
  /** Opciones en orden fijo por nombre (la posición no delata al ganador). */
  options: { name: string; value: number }[];
  winner: string;
  /** "veces", "stickers", "min", "s"… */
  unit: string;
}

interface Def {
  id: string;
  question: string;
  /** `null` = vale para todos los modos. */
  rels: Rel[] | null;
  unit: string;
  value: (p: PersonStats) => number | null;
  /** Gana el menor valor. */
  lower?: boolean;
}

const hasResp = (p: PersonStats): boolean => p.medianResponseMs !== null && p.responses >= 5;

export const QUIZ_BANK: Def[] = [
  // Generales
  { id: 'stickers', question: '¿Quién manda más stickers?', rels: null, unit: 'stickers', value: (p) => p.stickers },
  { id: 'audios', question: '¿Quién manda más audios?', rels: null, unit: 'audios', value: (p) => p.audios },
  {
    id: 'rapido',
    question: '¿Quién responde más rápido?',
    rels: null,
    unit: 'min',
    lower: true,
    value: (p) => (hasResp(p) ? p.medianResponseMs : null),
  },
  { id: 'noche', question: '¿Quién escribe más después de medianoche?', rels: null, unit: 'mensajes', value: (p) => p.quiz.night },
  { id: 'risa', question: '¿Quién se ríe más?', rels: null, unit: 'mensajes', value: (p) => p.quiz.laughMsgs },
  { id: 'borra', question: '¿Quién borra más mensajes?', rels: null, unit: 'borrados', value: (p) => p.deleted },
  { id: 'emojis', question: '¿Quién manda más emojis?', rels: null, unit: 'emojis', value: (p) => p.quiz.emojis },
  // Pareja
  { id: 'teamo', question: '¿Quién dijo más “te amo”?', rels: ['pareja'], unit: 'veces', value: (p) => p.quiz.teAmo },
  { id: 'teextrano', question: '¿Quién dijo más “te extraño”?', rels: ['pareja'], unit: 'veces', value: (p) => p.quiz.teExtrano },
  { id: 'perdon', question: '¿Quién pide más “perdón”?', rels: ['pareja'], unit: 'veces', value: (p) => p.quiz.perdon },
  // Amigos
  { id: 'parce', question: '¿Quién dice más “parce”?', rels: ['amigos'], unit: 'veces', value: (p) => p.quiz.parce },
  { id: 'planes', question: '¿Quién propone más planes?', rels: ['amigos'], unit: 'planes', value: (p) => p.quiz.planes },
  // Familia
  { id: 'buenosdias', question: '¿Quién manda más “buenos días”?', rels: ['familia'], unit: 'veces', value: (p) => p.quiz.buenosDias },
  { id: 'gracias', question: '¿Quién da más las gracias?', rels: ['familia'], unit: 'veces', value: (p) => p.quiz.gracias },
];

const byName = (a: string, b: string): number => a.localeCompare(b, 'es', { numeric: true });

interface Valid {
  def: Def;
  winner: PersonStats;
  /** Ganador / segundo (o segundo / ganador si menor es mejor). */
  margin: number;
  /** Personas con dato, de más a menos mensajes (orden de `data.people`). */
  eligible: { p: PersonStats; v: number }[];
}

function evaluate(def: Def, data: WrappedData): Valid | null {
  const eligible = data.people
    .map((p) => ({ p, v: def.value(p) }))
    .filter((x): x is { p: PersonStats; v: number } => x.v !== null);
  if (eligible.length < 2) return null;
  const sorted = [...eligible].sort(
    (x, y) => (def.lower ? x.v - y.v : y.v - x.v) || byName(x.p.name, y.p.name),
  );
  const [w, s] = sorted;
  let margin: number;
  if (def.lower) {
    if (w.v <= 0 || s.v < 1.25 * w.v) return null;
    margin = s.v / w.v;
  } else {
    if (w.v < 3 || w.v < 1.25 * s.v) return null;
    margin = s.v === 0 ? 1000 + w.v : w.v / s.v;
  }
  return { def, winner: w.p, margin, eligible };
}

/**
 * Elige la pregunta del reto. Determinista: entre las válidas (ganador ≥ 3 y ≥ 25 % sobre el segundo)
 * prefiere las propias del modo y luego la de mayor margen; el empate lo rompe el orden del banco.
 */
export function pickQuiz(data: WrappedData): Quiz | null {
  const valid: Valid[] = [];
  for (const def of QUIZ_BANK) {
    if (def.rels && !def.rels.includes(data.mode.rel)) continue;
    const v = evaluate(def, data);
    if (v) valid.push(v);
  }
  if (valid.length === 0) return null;
  const own = valid.filter((v) => v.def.rels !== null);
  const pool = own.length > 0 ? own : valid;
  let best = pool[0];
  for (const v of pool) if (v.margin > best.margin) best = v;

  const { def, winner, eligible } = best;
  // Opciones: dúo = las 2 personas; grupo = top 4 por mensajes con el ganador siempre incluido.
  let chosen = data.mode.size === 'duo' ? eligible.slice(0, 2) : eligible.slice(0, 4);
  if (!chosen.some((x) => x.p === winner)) {
    chosen = [...chosen.slice(0, chosen.length - 1), eligible.find((x) => x.p === winner)!];
  }
  chosen = [...chosen].sort((a, b) => byName(a.p.name, b.p.name));

  let unit = def.unit;
  let toValue = (v: number): number => v;
  if (def.id === 'rapido') {
    const useSeconds = Math.max(...chosen.map((x) => x.v)) < 90_000;
    unit = useSeconds ? 's' : 'min';
    toValue = useSeconds ? (v) => Math.max(1, Math.round(v / 1000)) : (v) => Math.round(v / 6000) / 10;
  }
  return {
    id: def.id,
    question: def.question,
    options: chosen.map((x) => ({ name: x.p.name, value: toValue(x.v) })),
    winner: winner.name,
    unit,
  };
}

const SINGULAR: Record<string, string> = {
  veces: 'vez',
  stickers: 'sticker',
  audios: 'audio',
  mensajes: 'mensaje',
  borrados: 'borrado',
  emojis: 'emoji',
  planes: 'plan',
};

/** "214 veces", "1 vez", "3 min". */
export function quizValueLabel(value: number, unit: string, fmt: (n: number) => string): string {
  return `${fmt(value)} ${value === 1 ? SINGULAR[unit] ?? unit : unit}`;
}
