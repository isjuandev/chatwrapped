export type MessageType =
  | 'text'
  | 'audio'
  | 'sticker'
  | 'image'
  | 'video'
  | 'gif'
  | 'document'
  | 'location'
  | 'contact'
  | 'poll'
  | 'viewonce'
  /** Multimedia genérica sin tipo (Android «Sin archivos»). */
  | 'media'
  | 'deleted';

export interface Message {
  /** Milisegundos, hora local del archivo. */
  ts: number;
  author: string;
  text: string;
  type: MessageType;
  /** Tenía el sufijo «Se editó este mensaje». */
  edited: boolean;
  /** El texto tiene una URL (el mensaje sigue siendo `text`). */
  link: boolean;
  /** Nombre del archivo adjunto cuando el export trae archivos. */
  file?: string;
}

/** Tamaño del chat (lógica) y relación (tono). Válidas: duo+pareja/amigos/familia, group+amigos/familia. */
export type Size = 'duo' | 'group';
export type Rel = 'pareja' | 'amigos' | 'familia';
export interface Mode {
  size: Size;
  rel: Rel;
}

export interface WordStat {
  word: string;
  count: number;
}

/** Conteos por persona que usa "El reto" (mensajes que cumplen cada criterio). */
export interface QuizCounts {
  /** Mensajes entre 00:00 y 04:59. */
  night: number;
  /** Mensajes de texto con risa. */
  laughMsgs: number;
  /** Emojis en mensajes de texto. */
  emojis: number;
  teAmo: number;
  teExtrano: number;
  perdon: number;
  parce: number;
  planes: number;
  /** Saludos de buenos días a cualquier hora. */
  buenosDias: number;
  gracias: number;
}

export interface PersonStats {
  /** Conteos para "El reto". */
  quiz: QuizCounts;
  name: string;
  count: number;
  /** 0..1 */
  share: number;
  audios: number;
  /** null si no hay datos */
  avgResponseMs: number | null;
  stickers: number;
  images: number;
  videos: number;
  gifs: number;
  documents: number;
  /** Multimedia genérica (Android «Sin archivos»). */
  generic: number;
  links: number;
  deleted: number;
  edited: number;
  /** Longitud media de los mensajes de texto, en caracteres. */
  avgLength: number;
  /** Mediana del tiempo de respuesta; null si no hay respuestas. */
  medianResponseMs: number | null;
  /** Número de respuestas medidas (cambio de autor, hueco ≤ 12 h). */
  responses: number;
  /** Proporción 0..1 de respuestas en menos de 1 min; null si no hay respuestas. */
  fastShare: number | null;
  /** Palabra característica; null si no hay. */
  signature: WordStat | null;
}

export interface Award {
  id: string;
  title: string;
  /** Texto con el dato, p. ej. "14 mensajes seguidos sin respuesta". */
  detail: string;
  winner: string;
}

export interface MonthBucket {
  /** "2025-02" */
  key: string;
  /** "febrero" */
  label: string;
  /** "F" */
  initial: string;
  count: number;
}

export interface MediaTotals {
  stickers: number;
  images: number;
  videos: number;
  gifs: number;
  documents: number;
  audios: number;
  generic: number;
  links: number;
  deleted: number;
  edited: number;
}

export interface ReplyPair {
  a: string;
  b: string;
  /** Respuestas A→B más B→A. */
  count: number;
}

export interface StickerStat {
  bytes: Uint8Array;
  mime: string;
  count: number;
  topSender: string;
}

/** Reporte completo · "Cuánto tiempo hablaron": conversaciones = mensajes con huecos < 30 min. */
export interface TimeStats {
  conversations: number;
  /** Suma de duraciones (cada conversación dura al menos 1 min). */
  totalMs: number;
  /** Duración media por conversación. */
  avgMs: number;
  /** Conversación más larga (fecha ISO de inicio y nº de mensajes); null si no hay. */
  longest: { ms: number; iso: string; messages: number } | null;
}

/** Una mitad de la ventana (por tiempo). Los arreglos por persona van alineados con `people`. */
export interface HalfStats {
  /** ISO del primer y último día de la mitad. */
  startIso: string;
  endIso: string;
  messages: number;
  perDay: number;
  /** Proporción 0..1 de cada persona (alineada con `people`). */
  shares: number[];
  /** Mediana de respuesta del chat en esa mitad; null si no hay respuestas. */
  medianResponseMs: number | null;
}

export interface Evolution {
  first: HalfStats;
  second: HalfStats;
  /** Palabras con ≥ 5 usos en la 2.ª mitad y ≤ 1 en la 1.ª (top 3 por uso). */
  newWords: WordStat[];
}

/** Reporte completo · "Lo que se dicen": una expresión descubierta del propio chat. */
export interface Phrase {
  /** Forma de superficie más frecuente ("qué chimba"). */
  text: string;
  /** Clave sin tildes ("que chimba"). */
  key: string;
  /** Mensajes que la contienen. */
  count: number;
  byPerson: { name: string; count: number }[];
  /** Coincide con una semilla del modo (solo empuja el puntaje). */
  seeded: boolean;
}

export interface WrappedData {
  mode: Mode;
  groupName: string;
  /** Personas con mensajes en la ventana, antes de recortar a 2 en modo duo. */
  participants: number;
  /** Año del último mensaje. */
  year: number;
  total: number;
  /** Ordenado por mensajes, descendente. */
  people: PersonStats[];
  daysTalking: number;
  /** Días calendario entre el primer y el último mensaje de la ventana (inclusive). */
  spanDays: number;
  maxStreak: number;
  /** Racha máxima con fechas ISO de inicio y fin. */
  streak: { days: number; start: string; end: string };
  /** Mayor hueco sin mensajes (días completos sin hablar) con fechas ISO; null si no hay. */
  silence: { days: number; from: string; to: string } | null;
  hourHist: number[];
  peakHour: number;
  busiestDay: { iso: string; count: number };
  /** 12 cubetas, en el orden de la ventana (el último es el mes del último mensaje). */
  monthly: MonthBucket[];
  /** Lunes primero. */
  weekdays: number[];
  topEmojis: { emoji: string; count: number }[];
  topWords: { word: string; count: number }[];
  jajaCount: number;
  mediaTotals: MediaTotals;
  /** replyMatrix[i][j] = respuestas de people[i] a people[j] (hueco < 30 min). */
  replyMatrix: number[][];
  /** Pares con más respuestas mutuas, de mayor a menor (máx. 4). */
  pairs: ReplyPair[];
  /** Hasta 3 stickers (solo con .zip con archivos). */
  topStickers: StickerStat[];
  /** Los (hasta) 6 premios que muestra la tarjeta de premios. */
  awards: Award[];
  /** Todos los premios posibles (dato > 0) con su notoriedad, antes de elegir los 6. */
  awardCandidates: (Award & { notoriety?: number })[];
  /** Reporte completo: tiempo hablado. */
  time: TimeStats;
  /** Reporte completo: antes vs. ahora. */
  evolution: Evolution;
  /** Reporte completo: expresiones descubiertas del chat, de mayor a menor puntaje (máx. 5). */
  phrases: Phrase[];
  warnings: string[];
}

/** Stickers extraídos del zip: nombre de archivo (minúsculas, sin carpeta) -> hash. */
export interface StickerAsset {
  hash: string;
  bytes: Uint8Array;
  mime: string;
}

export interface StickerIndex {
  byFile: Map<string, string>;
  assets: Map<string, StickerAsset>;
}

export type ReadRequest = {
  fileName: string;
  /** Archivo original (Blob/File); el worker lo lee con acceso aleatorio. */
  file?: Blob;
  bytes?: ArrayBuffer;
  text?: string;
  mode: Mode;
};

/** Recalcula con otro modo el último chat leído (el worker guarda los mensajes; no se relee el archivo). */
export type RecomputeRequest = { recompute: true; mode: Mode };

export type WorkerRequest = ReadRequest | RecomputeRequest;

export type WorkerErrorCode = 'unrecognized' | 'empty' | 'zip_no_txt' | 'zip_too_big' | 'other';

export type WorkerProgress = { progress: 'stickers' };

export type WorkerResponse =
  | { ok: true; data: WrappedData }
  | { ok: false; error: string; code: WorkerErrorCode };
