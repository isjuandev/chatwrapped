import { extractEmojis, stripAccents } from './text';

/**
 * Palabras clave de los premios propios de cada modo.
 * Se comparan sin tildes, en minúsculas y por palabra completa (o frase completa).
 */
export interface Keywords {
  phrases: string[];
  emojis: string[];
}

export const KEYWORDS = {
  /** Familia: saludo matutino. */
  buenosDias: {
    phrases: ['buenos dias', 'buen dia', 'bendiciones'],
    emojis: ['🌻', '☀️', '🙏'],
  },
  /** Pareja: mensajes cursis. */
  cursi: {
    phrases: ['amor', 'te amo', 'te quiero', 'mi vida'],
    emojis: ['❤️', '😍', '🥰', '😘'],
  },
  /** Pareja: despedida de la noche (solo cuenta entre 9 p. m. y 2 a. m.). */
  buenasNoches: {
    phrases: ['buenas noches', 'descansa', 'que sueñes', 'que suenes'],
    emojis: [],
  },
  /** Parche / mejor amigo/a: el que propone planes. */
  planes: {
    phrases: ['vamos', 'plan', 'quien se apunta', 'caigan', 'parchemos', 'hoy que'],
    emojis: [],
  },
  /** Parche / mejor amigo/a: el chismoso. */
  chisme: {
    phrases: ['ya supiste', 'chisme', 'no le digas a nadie', 'viste lo de'],
    emojis: [],
  },
  /** El reto (pareja): "te amo". */
  teAmo: { phrases: ['te amo'], emojis: [] },
  /** El reto (pareja): "te extraño". */
  teExtrano: { phrases: ['te extraño', 'te extrano'], emojis: [] },
  /** El reto (pareja): pedir perdón. */
  perdon: { phrases: ['perdon', 'perdoname', 'lo siento'], emojis: [] },
  /** El reto (amigos): "parce". */
  parce: { phrases: ['parce', 'parcero', 'parcera'], emojis: [] },
  /** El reto (familia): dar las gracias. */
  gracias: { phrases: ['gracias', 'mil gracias'], emojis: [] },
} satisfies Record<string, Keywords>;

/** Una frase del reporte completo ("Lo que se dicen"). */
export interface PhraseDef {
  id: string;
  /** Texto a mostrar. */
  label: string;
  phrases: string[];
  /** Cuenta mensajes con risa (jaja, jeje, jsjs, 😂) en vez de frases. */
  laugh?: boolean;
  /** Frase cariñosa: admite el pie "Se lo dijeron {n} veces. Una cada {x} días.". */
  tender?: boolean;
}

/** Listas por relación (reusan las de arriba cuando existen). */
export const PHRASE_SETS: Record<'pareja' | 'amigos' | 'familia', PhraseDef[]> = {
  pareja: [
    { id: 'teAmo', label: 'te amo', phrases: KEYWORDS.teAmo.phrases, tender: true },
    { id: 'teExtrano', label: 'te extraño', phrases: KEYWORDS.teExtrano.phrases, tender: true },
    { id: 'perdon', label: 'perdón', phrases: KEYWORDS.perdon.phrases },
    { id: 'buenasNoches', label: 'buenas noches', phrases: ['buenas noches'] },
    { id: 'dondeEstas', label: '¿dónde estás?', phrases: ['donde estas'] },
    { id: 'teQuiero', label: 'te quiero', phrases: ['te quiero'], tender: true },
  ],
  amigos: [
    { id: 'parce', label: 'parce', phrases: KEYWORDS.parce.phrases },
    { id: 'jajaja', label: 'jajaja', phrases: [], laugh: true },
    { id: 'queMas', label: '¿qué más?', phrases: ['que mas'] },
    { id: 'queHacemos', label: '¿qué hacemos?', phrases: ['que hacemos'] },
    { id: 'deUna', label: 'de una', phrases: ['de una'] },
    { id: 'quePereza', label: 'qué pereza', phrases: ['que pereza'] },
  ],
  familia: [
    { id: 'gracias', label: 'gracias', phrases: KEYWORDS.gracias.phrases },
    { id: 'bendiciones', label: 'bendiciones', phrases: ['bendiciones'] },
    { id: 'yaLlegaste', label: '¿ya llegaste?', phrases: ['ya llegaste'] },
    { id: 'yaComiste', label: '¿ya comiste?', phrases: ['ya comiste', 'ya almorzaste'] },
    { id: 'teQuiero', label: 'te quiero', phrases: ['te quiero'], tender: true },
    { id: 'diosBendiga', label: 'Dios te bendiga', phrases: ['dios te bendiga'] },
  ],
};

/** Minúsculas, sin tildes (la ñ se conserva), sin puntuación y con los espacios colapsados. */
export function normalizeForMatch(text: string): string {
  return stripAccents(text.toLowerCase())
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** ¿El texto (ya normalizado) contiene alguna de las frases como palabra(s) completa(s)? */
export function hasPhrase(normalized: string, phrases: string[]): boolean {
  if (!normalized) return false;
  const padded = ` ${normalized} `;
  return phrases.some((p) => padded.includes(` ${normalizeForMatch(p)} `));
}

/** ¿El texto contiene alguna de las frases o alguno de los emojis? */
export function matchesKeywords(text: string, kw: Keywords): boolean {
  if (hasPhrase(normalizeForMatch(text), kw.phrases)) return true;
  if (kw.emojis.length === 0) return false;
  const found = extractEmojis(text);
  if (found.length === 0) return false;
  const wanted = new Set(extractEmojis(kw.emojis.join('')));
  return found.some((e) => wanted.has(e));
}
