import type { WrappedData } from '../types';
import { fmtInt } from '../format';
import {
  box, CardOpts, CONTENT_W, EMOJI, fillRR, footer, frame, HEAD, MARGIN, pageLabel, rich, text, THEMES, W,
} from './draw';

/** Tarjeta de emojis y palabras: Así hablan ustedes. */
export function drawCard4(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.dark;
  frame(ctx, t, data.year);

  text(ctx, 'Así hablan', MARGIN, 226, {
    weight: 800, size: 68, family: HEAD, color: t.fg, tracking: -0.05, maxWidth: CONTENT_W,
  });
  text(ctx, 'ustedes', MARGIN, 296, { weight: 800, size: 68, family: HEAD, color: t.emph, tracking: -0.05 });

  // Emojis
  text(ctx, 'Top emojis', MARGIN, 355, { weight: 500, size: 22, color: t.sub, baseline: 'middle' });
  const bw = 97;
  const gap = (CONTENT_W - bw * 5) / 4;
  data.topEmojis.slice(0, 5).forEach((e, i) => {
    const x = MARGIN + i * (bw + gap);
    box(ctx, t, x, 392, bw, 120, 22);
    ctx.font = `52px ${EMOJI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = t.fg;
    ctx.fillText(e.emoji, x + bw / 2, 438);
    text(ctx, fmtInt(e.count), x + bw / 2, 485, {
      weight: 700, size: 19, color: t.fg, align: 'center', baseline: 'middle', maxWidth: bw - 12,
    });
  });
  if (data.topEmojis.length === 0) {
    text(ctx, 'Sin emojis por aquí', MARGIN, 450, { weight: 500, size: 22, color: t.sub });
  }

  // Palabras
  text(ctx, 'Las palabras que más usan', MARGIN, 574, { weight: 500, size: 22, color: t.sub, baseline: 'middle' });
  const maxC = data.topWords[0]?.count ?? 1;
  const tx = 231;
  const tw = 264;
  data.topWords.slice(0, 5).forEach((w, i) => {
    const cy = 631 + i * 53.25;
    text(ctx, w.word, MARGIN, cy + 1, {
      weight: 800, size: 33, family: HEAD, color: t.fg, tracking: -0.03, baseline: 'middle', maxWidth: tx - MARGIN - 14,
    });
    fillRR(ctx, tx, cy - 17, tw, 34, 9, t.track);
    fillRR(ctx, tx, cy - 17, Math.max(18, (tw * w.count) / maxC), 34, 9, t.barFill);
    text(ctx, fmtInt(w.count), W - MARGIN, cy, { weight: 700, size: 22, color: t.fg, align: 'right', baseline: 'middle' });
  });

  // Jajajas
  rich(
    ctx,
    [
      { t: 'Se dijeron ' },
      { t: `${fmtInt(data.jajaCount)} jajajas`, color: t.accent, weight: 800 },
      { t: '. Algunos fueron de verdad.' },
    ],
    MARGIN, 1000, CONTENT_W, 34, 29, t.fg, 500,
  );

  footer(ctx, t, pageLabel(opts, 4));
}
