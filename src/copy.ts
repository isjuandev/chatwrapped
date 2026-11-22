import { normalizeMode } from './modes';
import type { Mode, Rel, Size } from './types';

/**
 * Textos de las tarjetas que dependen del tono. `COPY[rel][size]`.
 * `{n}` se reemplaza por el total de mensajes (ver `fill`).
 */
export const COPY_KEYS = [
  'cover.kicker',
  'cover.bubble1',
  'cover.bubble2',
  'hour.lead',
  'hour.dawn',
  'hour.morning',
  'hour.afternoon',
  'hour.evening',
  'hour.night',
  'weekday.lead',
  'weekday.0',
  'weekday.1',
  'weekday.2',
  'weekday.3',
  'weekday.4',
  'weekday.5',
  'weekday.6',
  'end.bubble1',
  'evolution.up',
  'evolution.down',
  'evolution.same',
  'phrases.title',
  'phrases.outro',
] as const;

export type CopyKey = (typeof COPY_KEYS)[number];
export type CopyTable = Record<CopyKey, string>;

/** Frases por franja horaria (madrugada < 5, mañana < 12, tarde < 18, noche temprana < 21, noche). */
const HOUR_PHRASES: Record<Rel, Pick<CopyTable, 'hour.dawn' | 'hour.morning' | 'hour.afternoon' | 'hour.evening' | 'hour.night'>> = {
  pareja: {
    'hour.dawn': 'De madrugada, cuando nadie más escribe, ustedes sí.',
    'hour.morning': 'Desde temprano, el primer pensamiento del día es el otro.',
    'hour.afternoon': 'La tarde es de ustedes: un mensajito entre pausas.',
    'hour.evening': 'Saliendo del trabajo, lo primero es contarse el día.',
    'hour.night': 'Cuando todos duermen, ustedes apenas arrancan.',
  },
  amigos: {
    'hour.dawn': 'A esa hora solo escribe el que no se aguanta el chisme.',
    'hour.morning': 'Mañaneros: el chisme arranca con el café.',
    'hour.afternoon': 'La tarde es de ustedes: entre pausas, almuerzos y memes.',
    'hour.evening': 'Saliendo del trabajo, el parche se prende.',
    'hour.night': 'Cuando todos duermen, ustedes apenas arrancan.',
  },
  familia: {
    'hour.dawn': 'De madrugada, cuando todos duermen, alguien sigue escribiendo.',
    'hour.morning': 'Mañaneros: llegan los buenos días y las bendiciones.',
    'hour.afternoon': 'La tarde es de la familia: entre almuerzos y pendientes.',
    'hour.evening': 'Llegando a casa, el chat de la familia se prende.',
    'hour.night': 'Antes de dormir, todos cuentan cómo les fue.',
  },
};

/** Una frase por día de la semana (lunes primero). */
const WEEKDAY_PHRASES: Record<Rel, Pick<CopyTable, 'weekday.0' | 'weekday.1' | 'weekday.2' | 'weekday.3' | 'weekday.4' | 'weekday.5' | 'weekday.6'>> = {
  pareja: {
    'weekday.0': 'Lunes de extrañarse desde temprano.',
    'weekday.1': 'Martes: un mensajito para no perder el ritmo.',
    'weekday.2': 'A mitad de semana el cariño no se aguanta.',
    'weekday.3': 'Jueves: ya casi es viernes y se nota.',
    'weekday.4': 'Viernes de planes para los dos.',
    'weekday.5': 'Sábado de salir juntos y contarlo todo.',
    'weekday.6': 'Domingo de ponerse al día, juntos.',
  },
  amigos: {
    'weekday.0': 'Arrancan la semana con todo.',
    'weekday.1': 'Martes: ya agarraron el ritmo.',
    'weekday.2': 'A mitad de semana el chat no se aguanta.',
    'weekday.3': 'Jueves: ya casi es viernes y se nota.',
    'weekday.4': 'Viernes de chisme.',
    'weekday.5': 'Sábado de planes, fotos y memes.',
    'weekday.6': 'Domingo de ponerse al día.',
  },
  familia: {
    'weekday.0': 'Lunes: la familia arranca la semana con todo.',
    'weekday.1': 'Martes: ¿ya almorzaste? ¿ya llegaste?',
    'weekday.2': 'A mitad de semana la familia se pone al día.',
    'weekday.3': 'Jueves: ya casi es viernes y se nota.',
    'weekday.4': 'Viernes de planes para el fin de semana.',
    'weekday.5': 'Sábado de familia: fotos, audios y memes.',
    'weekday.6': 'Domingo de almuerzo y de ponerse al día.',
  },
};

type FullCopy = Pick<CopyTable, 'evolution.up' | 'evolution.down' | 'evolution.same' | 'phrases.title' | 'phrases.outro'>;

/** Textos del reporte completo (cambian con el tono; el mismo para duo y grupo salvo donde se nombra al grupo). */
const FULL_COPY: Record<'pareja' | 'amigosDuo' | 'parche' | 'familiaDuo' | 'familiaGrupo', FullCopy> = {
  pareja: {
    'evolution.up': 'Cada vez hablan más.',
    'evolution.down': 'Se calmaron un poco… pero siguen aquí.',
    'evolution.same': 'Mismo ritmo de siempre.',
    'phrases.title': 'Lo que se dicen',
    'phrases.outro': 'Así suenan ustedes.',
  },
  amigosDuo: {
    'evolution.up': 'Cada vez hablan más.',
    'evolution.down': 'Se calmaron un poco… pero siguen aquí.',
    'evolution.same': 'Mismo ritmo de siempre.',
    'phrases.title': 'Lo que se dicen',
    'phrases.outro': 'Así suenan ustedes.',
  },
  parche: {
    'evolution.up': 'El parche cada vez habla más.',
    'evolution.down': 'El parche se calmó un poco… pero sigue aquí.',
    'evolution.same': 'Mismo ritmo de siempre.',
    'phrases.title': 'Lo que se dicen',
    'phrases.outro': 'Así suena el parche.',
  },
  familiaDuo: {
    'evolution.up': 'Cada vez hablan más.',
    'evolution.down': 'Se calmaron un poco… pero siguen aquí.',
    'evolution.same': 'Mismo ritmo de siempre.',
    'phrases.title': 'Lo que se dicen en familia',
    'phrases.outro': 'Así suenan ustedes.',
  },
  familiaGrupo: {
    'evolution.up': 'La familia cada vez habla más.',
    'evolution.down': 'La familia se calmó un poco… pero sigue aquí.',
    'evolution.same': 'Mismo ritmo de siempre.',
    'phrases.title': 'Lo que se dicen en familia',
    'phrases.outro': 'Así habla la familia.',
  },
};

const pareja: CopyTable = {
  ...FULL_COPY.pareja,
  'cover.kicker': 'Nuestro año en el chat',
  'cover.bubble1': 'te escribo en 5',
  'cover.bubble2': '{n} mensajes después...',
  'hour.lead': 'Su hora es la',
  ...HOUR_PHRASES.pareja,
  'weekday.lead': 'Su día es el',
  ...WEEKDAY_PHRASES.pareja,
  'end.bubble1': '¿y el tuyo con quién es?',
};

const amigosDuo: CopyTable = {
  ...FULL_COPY.amigosDuo,
  'cover.kicker': 'Nuestro año de chisme',
  'cover.bubble1': '¿ya viste?',
  'cover.bubble2': '{n} mensajes después...',
  'hour.lead': 'Su hora es la',
  ...HOUR_PHRASES.amigos,
  'weekday.lead': 'Su día es el',
  ...WEEKDAY_PHRASES.amigos,
  'end.bubble1': '¿y el tuyo con quién es?',
};

const familiaDuo: CopyTable = {
  ...FULL_COPY.familiaDuo,
  'cover.kicker': 'Nuestro año en el chat',
  'cover.bubble1': '¿ya almorzaste?',
  'cover.bubble2': '{n} mensajes después...',
  'hour.lead': 'Su hora es la',
  ...HOUR_PHRASES.familia,
  'weekday.lead': 'Su día es el',
  ...WEEKDAY_PHRASES.familia,
  'end.bubble1': '¿y el tuyo con quién es?',
};

const parche: CopyTable = {
  ...FULL_COPY.parche,
  'cover.kicker': 'El año del parche',
  'cover.bubble1': '¿quién se apunta?',
  'cover.bubble2': '{n} mensajes después...',
  'hour.lead': 'La hora del parche',
  ...HOUR_PHRASES.amigos,
  'weekday.lead': 'El día del parche es el',
  ...WEEKDAY_PHRASES.amigos,
  'end.bubble1': '¿y tu parche qué?',
};

const familiaGrupo: CopyTable = {
  ...FULL_COPY.familiaGrupo,
  'cover.kicker': 'Así se habló la familia',
  'cover.bubble1': 'buenos días familia 🌻',
  'cover.bubble2': '{n} mensajes después...',
  'hour.lead': 'La hora de la familia',
  ...HOUR_PHRASES.familia,
  'weekday.lead': 'El día de la familia es el',
  ...WEEKDAY_PHRASES.familia,
  'end.bubble1': '¿y tu familia qué?',
};

/** `pareja` solo existe en duo. */
export const COPY: { pareja: { duo: CopyTable }; amigos: Record<Size, CopyTable>; familia: Record<Size, CopyTable> } = {
  pareja: { duo: pareja },
  amigos: { duo: amigosDuo, group: parche },
  familia: { duo: familiaDuo, group: familiaGrupo },
};

/** Textos del modo (una combinación inexistente se lleva a la más cercana). */
export function copyFor(mode: Mode): CopyTable {
  const m = normalizeMode(mode);
  if (m.rel === 'pareja') return COPY.pareja.duo;
  return COPY[m.rel][m.size];
}

/** Reemplaza `{n}` y demás marcadores. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_m, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function hourPhraseFor(mode: Mode, h: number): string {
  const c = copyFor(mode);
  if (h < 5) return c['hour.dawn'];
  if (h < 12) return c['hour.morning'];
  if (h < 18) return c['hour.afternoon'];
  if (h < 21) return c['hour.evening'];
  return c['hour.night'];
}

export function weekdayPhraseFor(mode: Mode, day: number): string {
  return copyFor(mode)[`weekday.${day}` as CopyKey];
}
