import type { PersonStats, WrappedData } from '../types';
import { fmtInt, plural } from '../format';
import {
  box, CardOpts, CONTENT_W, footer, frame, HEAD, MARGIN, pageLabel, strongBox, text, THEMES, title2, wrap,
} from './draw';

export function signatureRows(data: WrappedData): PersonStats[] {
  const max = data.mode.size === 'duo' ? 2 : 4;
  return data.people.filter((p) => p.signature).slice(0, max);
}

/** Tarjeta G: La palabra de cada uno. */
export function drawCardSignature(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.coral;
  frame(ctx, t, data.year);
  title2(ctx, t, 'La palabra', 'de cada uno');

  const rows = signatureRows(data);
  const drawBox = (p: PersonStats, i: number, x: number, y: number, w: number, h: number, wordSize: number): void => {
    const strong = i === 0;
    if (strong) strongBox(ctx, t, x, y, w, h, 28);
    else box(ctx, t, x, y, w, h, 28);
    const fg = strong ? t.strongFg : t.fg;
    const accent = strong ? t.strongAccent : t.fg;
    const sub = strong ? t.strongSub : t.fg;
    const pad = 26;
    text(ctx, p.name, x + pad, y + 40, { weight: 600, size: 21, color: sub, baseline: 'middle', maxWidth: w - pad * 2 });
    const sig = p.signature!;
    text(ctx, `«${sig.word}»`, x + pad, y + h / 2 + wordSize * 0.28, {
      weight: 800, size: wordSize, family: HEAD, color: accent, tracking: -0.04, maxWidth: w - pad * 2,
    });
    const phrase = `la dijo ${fmtInt(sig.count)} ${plural(sig.count, 'vez', 'veces')}`;
    wrap(ctx, phrase, w - pad * 2, 500, 22).forEach((l, k) => {
      text(ctx, l, x + pad, y + h - 36 - (wrap(ctx, phrase, w - pad * 2, 500, 22).length - 1 - k) * 28, {
        weight: 500, size: 22, color: fg, baseline: 'middle',
      });
    });
  };

  if (data.mode.size === 'duo') {
    const h = 330;
    rows.forEach((p, i) => drawBox(p, i, MARGIN, 345 + i * (h + 28), CONTENT_W, h, 92));
  } else {
    const cw = 257;
    const gx = CONTENT_W - cw * 2;
    const ch = 330;
    rows.forEach((p, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      drawBox(p, i, MARGIN + col * (cw + gx), 345 + row * (ch + 28), cw, ch, 48);
    });
  }

  footer(ctx, t, pageLabel(opts, 9));
}
