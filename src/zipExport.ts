import { BlobReader, BlobWriter, configure, ZipWriter } from '@zip.js/zip.js';
import type { CardId, Tier } from './cards';
import { buildDeck, canvasToPng, renderCardTo } from './cards';
import type { WrappedData } from './types';

/**
 * "Descargar todo": empaqueta el mazo que se está viendo en un solo .zip.
 *
 * - Secuencial a propósito: una tarjeta a la vez mantiene la memoria acotada (cada PNG
 *   pesa varios MB) y permite mostrar el progreso.
 * - Los PNG ya vienen comprimidos, así que se guardan tal cual (`level: 0`): recomprimirlos
 *   solo gastaría CPU y batería en el celular.
 * - Nada se sube a un servidor: todo ocurre en el navegador.
 */

// zip.js cargaría sus workers al comprimir; aquí no hacen falta.
configure({ useWebWorkers: false });

/** Nombre legible de cada tarjeta para los archivos del zip. */
export const CARD_SLUGS: Record<CardId, string> = {
  cover: 'portada',
  who: 'quien-escribe-mas',
  month: 'mes',
  weekday: 'dia',
  hour: 'hora',
  streaks: 'rachas',
  reply: 'respuesta',
  talk: 'asi-hablan',
  signature: 'firma',
  media: 'multimedia',
  stickers: 'stickers',
  pairs: 'parejas',
  awards: 'premios',
  quiz: 'reto',
  summary: 'resumen',
  end: 'final',
  time: 'tiempo',
  evolution: 'antes-y-ahora',
  phrases: 'lo-que-se-dicen',
};

/** Base de la carpeta y del archivo: `chat-wrapped-2026` o `chat-wrapped-2026-completo`. */
export function deckBaseName(year: number, tier: Tier): string {
  return `chat-wrapped-${year}${tier === 'full' ? '-completo' : ''}`;
}

/** Ruta de una tarjeta dentro del zip: `chat-wrapped-2026/01-portada.png`. */
export function zipEntryName(base: string, n: number, total: number, slug: string): string {
  const pad = String(total).length;
  return `${base}/${String(n).padStart(pad, '0')}-${slug}.png`;
}

export interface ZipProgress {
  done: number;
  total: number;
}

/** Cede el hilo para que React repinte el progreso entre tarjeta y tarjeta. */
function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Empaqueta `names.length` entradas pidiendo cada PNG a `render(n)` (n empieza en 1).
 * `onProgress` se llama antes de dibujar cada tarjeta y una vez al terminar.
 */
export async function zipBlobs(
  names: string[],
  render: (n: number) => Promise<Blob>,
  onProgress?: (p: ZipProgress) => void,
): Promise<Blob> {
  if (names.length === 0) throw new Error('No hay tarjetas para descargar');
  const writer = new BlobWriter('application/zip');
  const zip = new ZipWriter(writer, { level: 0, useWebWorkers: false });
  for (let i = 0; i < names.length; i++) {
    onProgress?.({ done: i, total: names.length });
    await yieldToUi();
    await zip.add(names[i], new BlobReader(await render(i + 1)));
  }
  onProgress?.({ done: names.length, total: names.length });
  await zip.close();
  return writer.getData();
}

export interface DeckZipOptions {
  /** Igual que en el visor: nombres ocultos. */
  hide: boolean;
  /** Solo afecta la tarjeta del reto (pregunta o respuesta), igual que en el visor. */
  reveal?: boolean;
  tier?: Tier;
  onProgress?: (p: ZipProgress) => void;
}

export interface DeckZip {
  blob: Blob;
  /** `chat-wrapped-2026.zip` o `chat-wrapped-2026-completo.zip`. */
  name: string;
  cards: number;
}

/** Nombres de los archivos de un mazo, en orden (sin dibujar nada). */
export function deckEntryNames(data: WrappedData, tier: Tier = 'free'): string[] {
  return entryNames(buildDeck(data, tier), data.year, tier);
}

function entryNames(deck: CardId[], year: number, tier: Tier): string[] {
  const base = deckBaseName(year, tier);
  return deck.map((id, i) => zipEntryName(base, i + 1, deck.length, CARD_SLUGS[id]));
}

/** Todo el mazo actual (gratis o reporte completo) en un .zip. */
export async function deckToZip(data: WrappedData, opts: DeckZipOptions): Promise<DeckZip> {
  const tier = opts.tier ?? 'free';
  const deck = buildDeck(data, tier);
  const base = deckBaseName(data.year, tier);
  const names = entryNames(deck, data.year, tier);
  // Un solo canvas para todo el mazo: no acumula bitmaps de 1080×1920.
  const canvas = document.createElement('canvas');
  const blob = await zipBlobs(
    names,
    async (n) => {
      await renderCardTo(canvas, n, data, opts.hide, opts.reveal ?? false, tier);
      return canvasToPng(canvas);
    },
    opts.onProgress,
  );
  return { blob, name: `${base}.zip`, cards: deck.length };
}
