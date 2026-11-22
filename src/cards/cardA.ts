import type { PersonStats, WrappedData } from '../types';
import { fmtInt, plural } from '../format';
import {
  box, CardOpts, CONTENT_W, footer, frame, HEAD, MARGIN, pageLabel, strongBox, text, THEMES, title2, wrap,
} from './draw';

interface Item {
  key: string;
  n: number;
  one: string;
  many: string;
  of: (p: PersonStats) => number;
}

const ITEMS: Omit<Item, 'n'>[] = [
  { key: 'images', one: 'foto', many: 'fotos', of: (p) => p.images },
  { key: 'stickers', one: 'sticker', many: 'stickers', of: (p) => p.stickers },
  { key: 'audios', one: 'audio', many: 'audios', of: (p) => p.audios },
  { key: 'videos', one: 'video', many: 'videos', of: (p) => p.videos },
  { key: 'gifs', one: 'GIF', many: 'GIF', of: (p) => p.gifs },
  { key: 'links', one: 'link', many: 'links', of: (p) => p.links },
  { key: 'documents', one: 'documento', many: 'documentos', of: (p) => p.documents },
];

function totalFor(data: WrappedData, key: string): number {
  return data.mediaTotals[key as keyof typeof data.mediaTotals] ?? 0;
}

/** Multimedia total (sin links). */
export function mediaCount(data: WrappedData): number {
  const m = data.mediaTotals;
  return m.stickers + m.images + m.videos + m.gifs + m.documents + m.audios + m.generic;
}

/** ≥ 10 mensajes multimedia o links. */
export function mediaAvailable(data: WrappedData): boolean {
  return mediaCount(data) + data.mediaTotals.links >= 10;
}

/** Más del 50 % del multimedia es genérico (Android «Sin archivos»). */
export function mediaIsGeneric(data: WrappedData): boolean {
  const total = mediaCount(data);
  return total > 0 && data.mediaTotals.generic / total > 0.5;
}

function topPerson(data: WrappedData, of: (p: PersonStats) => number): string {
  let best = data.people[0];
  for (const p of data.people) if (of(p) > of(best)) best = p;
  return best?.name ?? '';
}

function cell(
  ctx: CanvasRenderingContext2D, t: NonNullable<CardOpts['theme']>, x: number, y: number, w: number, h: number,
  n: number, label: string, more: string, strong: boolean,
): void {
  if (strong) strongBox(ctx, t, x, y, w, h, 28);
  else box(ctx, t, x, y, w, h, 28);
  const fg = strong ? t.strongAccent : t.fg;
  const pad = 24;
  text(ctx, fmtInt(n), x + pad, y + h * 0.5, {
    weight: 800, size: 58, family: HEAD, color: fg, tracking: -0.04, maxWidth: w - pad * 2,
  });
  text(ctx, label, x + pad, y + h * 0.5 + 34, {
    weight: 700, size: 24, color: strong ? t.strongFg : t.fg, maxWidth: w - pad * 2,
  });
  if (more) {
    text(ctx, `más: ${more}`, x + pad, y + h - 24, {
      weight: 500, size: 19, color: strong ? t.strongSub : t.fg, baseline: 'middle', maxWidth: w - pad * 2,
    });
  }
}

/** Tarjeta A: Lo que se mandaron. */
export function drawCardMedia(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.cream;
  frame(ctx, t, data.year);
  title2(ctx, t, 'Lo que se', 'mandaron');

  const cw = 257;
  const gx = CONTENT_W - cw * 2;
  const gy = 19;
  const x0 = (col: number): number => MARGIN + col * (cw + gx);

  if (mediaIsGeneric(data)) {
    // Android «Sin archivos»: no distingue tipos. Caja grande + lo que sí se sabe.
    const total = mediaCount(data);
    strongBox(ctx, t, MARGIN, 335, CONTENT_W, 220, 28);
    text(ctx, fmtInt(total), MARGIN + 29, 440, {
      weight: 800, size: 92, family: HEAD, color: t.strongAccent, tracking: -0.05, maxWidth: CONTENT_W - 58,
    });
    text(ctx, 'multimedia', MARGIN + 29, 500, { weight: 700, size: 28, color: t.strongFg });

    type Extra = { n: number; one: string; many: string; of: (p: PersonStats) => number };
    const extras = ([
      { n: data.mediaTotals.audios, one: 'audio', many: 'audios', of: (p) => p.audios },
      { n: data.mediaTotals.links, one: 'link', many: 'links', of: (p) => p.links },
      { n: data.mediaTotals.deleted, one: 'mensaje eliminado', many: 'mensajes eliminados', of: (p) => p.deleted },
    ] as Extra[])
      .filter((e) => e.n > 0)
      .slice(0, 4);
    const ch = 170;
    extras.forEach((e, i) => {
      cell(ctx, t, x0(i % 2), 574 + Math.floor(i / 2) * (ch + gy), cw, ch, e.n, plural(e.n, e.one, e.many), topPerson(data, e.of), false);
    });
    wrap(ctx, 'Android no dice qué era cada archivo.', CONTENT_W, 500, 20).forEach((l, i) => {
      text(ctx, l, MARGIN, 1018 + i * 26, { weight: 500, size: 20, color: t.fg, baseline: 'middle' });
    });
  } else {
    const items: Item[] = ITEMS.map((it) => ({ ...it, n: totalFor(data, it.key) }))
      .filter((it) => it.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
    // Las celdas crecen para llenar el espacio (con 4 tipos quedaba media tarjeta vacía);
    // si el número es impar, la última ocupa todo el ancho.
    const rows = Math.max(1, Math.ceil(items.length / 2));
    const ch = Math.min(260, Math.floor((1040 - 335 - gy * (rows - 1)) / rows));
    items.forEach((it, i) => {
      const wide = items.length % 2 === 1 && i === items.length - 1;
      cell(
        ctx, t, x0(wide ? 0 : i % 2), 335 + Math.floor(i / 2) * (ch + gy), wide ? CONTENT_W : cw, ch,
        it.n, plural(it.n, it.one, it.many), topPerson(data, it.of), i === 0,
      );
    });
  }

  footer(ctx, t, pageLabel(opts, 10));
}
