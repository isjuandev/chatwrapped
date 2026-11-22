import type { WrappedData } from '../types';
import { fmtInt, plural } from '../format';
import {
  box, CardOpts, CONTENT_W, fillRR, footer, frame, HEAD, MARGIN, pageLabel, text, THEMES, title2, W,
} from './draw';

export function pairsAvailable(data: WrappedData): boolean {
  return data.mode.size === 'group' && data.people.filter((p) => p.count > 0).length >= 3 && data.pairs.length >= 1;
}

/** Tarjeta H: Los que más se hablan. */
export function drawCardPairs(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.dark;
  frame(ctx, t, data.year);
  title2(ctx, t, 'Los que más', 'se hablan');

  const [top, ...rest] = data.pairs;
  if (!top) {
    footer(ctx, t, pageLabel(opts, 12));
    return;
  }

  // Par top, grande
  const by = 345;
  const bh = 250;
  box(ctx, t, MARGIN, by, CONTENT_W, bh, 28);
  const pad = 29;
  text(ctx, top.a, MARGIN + pad, by + 86, {
    weight: 800, size: 54, family: HEAD, color: t.fg, tracking: -0.04, maxWidth: CONTENT_W - pad * 2,
  });
  text(ctx, `& ${top.b}`, MARGIN + pad, by + 150, {
    weight: 800, size: 54, family: HEAD, color: t.dark ? t.emph : t.fg, tracking: -0.04, maxWidth: CONTENT_W - pad * 2,
  });
  text(ctx, `${fmtInt(top.count)} ${plural(top.count, 'respuesta', 'respuestas')} entre ellos`, MARGIN + pad, by + 207, {
    weight: 600, size: 24, color: t.fg, baseline: 'middle', maxWidth: CONTENT_W - pad * 2,
  });

  // Siguientes 3 pares
  const rowH = 96;
  const y0 = 630;
  const max = top.count || 1;
  rest.slice(0, 3).forEach((p, i) => {
    const y = y0 + i * rowH;
    text(ctx, `${p.a} & ${p.b}`, MARGIN, y + 20, {
      weight: 700, size: 24, color: t.fg, baseline: 'middle', maxWidth: CONTENT_W - 100,
    });
    text(ctx, fmtInt(p.count), W - MARGIN, y + 20, { weight: 700, size: 22, color: t.fg, align: 'right', baseline: 'middle' });
    fillRR(ctx, MARGIN, y + 42, CONTENT_W, 20, 10, t.track);
    fillRR(ctx, MARGIN, y + 42, Math.max(20, (CONTENT_W * p.count) / max), 20, 10, t.barFill);
  });

  text(ctx, 'Lo de ustedes ya es otro chat.', MARGIN, 1020, {
    weight: 600, size: 28, color: t.fg, baseline: 'middle', maxWidth: CONTENT_W,
  });

  footer(ctx, t, pageLabel(opts, 12));
}
