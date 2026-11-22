import type { StickerStat, WrappedData } from '../types';
import { hideNames } from '../metrics';
import { buildDeck, deckThemes, drawerOf } from './deck';
import type { Tier } from './deck';
import { H, OUT_H, OUT_W, THEMES, W } from './draw';

export { drawCard1 } from './card1';
export { drawCard2 } from './card2';
export { drawCard3 } from './card3';
export { drawCard4 } from './card4';
export { drawCard5 } from './card5';
export { drawCard6 } from './card6';
export { drawCardMedia } from './cardA';
export { drawCardStickers } from './cardB';
export { drawCardMonth } from './cardC';
export { drawCardWeekday } from './cardD';
export { drawCardStreaks } from './cardE';
export { drawCardReply } from './cardF';
export { drawCardSignature } from './cardG';
export { drawCardPairs } from './cardH';
export { drawCardQuiz } from './cardQuiz';
export { drawCardSummary } from './cardSummary';
export { drawCardTime } from './cardTime';
export { drawCardEvolution } from './cardEvolution';
export { drawCardPhrases } from './cardPhrases';
export { buildDeck, deckThemes } from './deck';
export type { CardId, Tier } from './deck';

let fontsPromise: Promise<void> | null = null;

/** Carga explícitamente las fuentes que usa el canvas (autoalojadas con @fontsource). */
export function loadCardFonts(): Promise<void> {
  if (!fontsPromise) {
    const sample = 'Aa áéíóúñ ¿¡ 0123456789 %&.·';
    const specs = [
      '800 40px "Inter Tight"',
      '400 20px Inter',
      '500 20px Inter',
      '600 20px Inter',
      '700 20px Inter',
    ];
    fontsPromise = (async () => {
      try {
        await Promise.all(specs.map((s) => document.fonts.load(s, sample)));
        await document.fonts.ready;
      } catch {
        /* si falla, el canvas usa la fuente de respaldo */
      }
    })();
  }
  return fontsPromise;
}

const bitmapCache = new WeakMap<Uint8Array, Promise<ImageBitmap | null>>();

/** Decodifica un sticker (primer cuadro si es animado). Si falla, null y se omite. */
function decodeSticker(s: StickerStat): Promise<ImageBitmap | null> {
  let p = bitmapCache.get(s.bytes);
  if (!p) {
    p = (async () => {
      try {
        return await createImageBitmap(new Blob([s.bytes as BlobPart], { type: s.mime }));
      } catch {
        return null;
      }
    })();
    bitmapCache.set(s.bytes, p);
  }
  return p;
}

/** Dibuja la tarjeta `n` (1..largo del mazo) en un canvas de 1080×1920. */
export async function renderCardTo(
  canvas: HTMLCanvasElement,
  n: number,
  data: WrappedData,
  hide: boolean,
  reveal = false,
  tier: Tier = 'free',
): Promise<void> {
  await loadCardFonts();
  const d = hide ? hideNames(data) : data;
  const deck = buildDeck(d, tier);
  const id = deck[n - 1];
  if (!id) throw new Error('Tarjeta fuera del mazo');
  const theme = THEMES[deckThemes(deck)[n - 1]];
  const bitmaps = id === 'stickers' || id === 'summary' ? await Promise.all(d.topStickers.map(decodeSticker)) : undefined;
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.save();
  ctx.scale(OUT_W / W, OUT_H / H);
  drawerOf(id)(ctx, d, { index: n, total: deck.length, theme, bitmaps, reveal: id === 'quiz' && reveal, tier });
  ctx.restore();
}

export async function cardToBlob(
  n: number, data: WrappedData, hide: boolean, reveal = false, tier: Tier = 'free',
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  await renderCardTo(canvas, n, data, hide, reveal, tier);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo crear el PNG'))), 'image/png');
  });
}
