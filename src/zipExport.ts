import { BlobReader, BlobWriter, configure, ZipWriter } from '@zip.js/zip.js';
import type { CardId, Tier } from './cards';
import { buildDeck, canvasToPng, renderCardTo } from './cards';
import { FEATURES } from './config';
import { fullReportButton } from './fullReport';
import type { WrappedData } from './types';

/**
 * "Descargar todo": empaqueta la historia gratis, la respuesta del reto y (si se puede abrir)
 * el reporte completo en un solo .zip, sin importar desde qué mazo se pulse.
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

export interface ZipEntry {
  path: string;
  tier: Tier;
  /** Posición (desde 1) de la tarjeta dentro del mazo de su `tier`. */
  n: number;
  /** Versión respuesta del reto. */
  reveal: boolean;
}

/**
 * Archivos del zip, en orden y con su nombre (sin dibujar nada). Historia gratis con el reto
 * en versión pregunta; justo después, `NN-reto-respuesta.png` (mismo número, no renumera las
 * demás); y, con `includeFull`, la carpeta `reporte-completo/`.
 */
export function allEntries(data: WrappedData, opts: { includeFull: boolean }): ZipEntry[] {
  const base = `chat-wrapped-${data.year}`;
  const free = buildDeck(data, 'free');
  const out: ZipEntry[] = [];
  free.forEach((id, i) => {
    const path = zipEntryName(base, i + 1, free.length, CARD_SLUGS[id]);
    out.push({ path, tier: 'free', n: i + 1, reveal: false });
    if (id === 'quiz') {
      out.push({ path: path.replace(/\.png$/, '-respuesta.png'), tier: 'free', n: i + 1, reveal: true });
    }
  });
  if (opts.includeFull) {
    const full = buildDeck(data, 'full');
    full.forEach((id, i) => {
      out.push({
        path: zipEntryName(`${base}/reporte-completo`, i + 1, full.length, CARD_SLUGS[id]),
        tier: 'full',
        n: i + 1,
        reveal: false,
      });
    });
  }
  return out;
}

/** Mismo criterio que el botón del visor para abrir el reporte completo. */
export function canIncludeFullReport(data: WrappedData): boolean {
  const btn = fullReportButton(FEATURES, buildDeck(data, 'full').length);
  return btn.enabled && btn.action === 'open';
}

export interface DeckZipOptions {
  /** Igual que en el visor: nombres ocultos. */
  hide: boolean;
  onProgress?: (p: ZipProgress) => void;
}

export interface DeckZip {
  blob: Blob;
  /** `chat-wrapped-2026.zip`. */
  name: string;
  cards: number;
}

/** Todo (historia, respuesta del reto y reporte completo si se puede abrir) en un .zip. */
export async function deckToZip(data: WrappedData, opts: DeckZipOptions): Promise<DeckZip> {
  const entries = allEntries(data, { includeFull: canIncludeFullReport(data) });
  // Un solo canvas para todo: no acumula bitmaps de 1080×1920.
  const canvas = document.createElement('canvas');
  const blob = await zipBlobs(
    entries.map((e) => e.path),
    async (n) => {
      const e = entries[n - 1];
      await renderCardTo(canvas, e.n, data, opts.hide, e.reveal, e.tier);
      return canvasToPng(canvas);
    },
    opts.onProgress,
  );
  return { blob, name: `chat-wrapped-${data.year}.zip`, cards: entries.length };
}
