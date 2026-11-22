import type { WrappedData } from '../types';
import { copyFor, hourPhraseFor } from '../copy';
import { fmtDay, fmtHour, fmtInt } from '../format';
import {
  barRR, BODY, CardOpts, CONTENT_W, footer, frame, HEAD, MARGIN, measure, pageLabel, strongBox, text, THEMES, wrap,
} from './draw';

/** Tarjeta de la hora: Su hora. */
export function drawCard3(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.coral;
  frame(ctx, t, data.year);

  text(ctx, copyFor(data.mode)['hour.lead'], MARGIN, 213, { weight: 500, size: 32, color: t.fg });
  text(ctx, fmtHour(data.peakHour), MARGIN - 2, 385, {
    weight: 800, size: 168, family: HEAD, color: t.fg, tracking: -0.06, maxWidth: CONTENT_W + 4,
  });

  const lines = wrap(ctx, hourPhraseFor(data.mode, data.peakHour), 500, 500, 28);
  lines.forEach((l, i) => text(ctx, l, MARGIN, 448 + i * 36, { weight: 500, size: 28, color: t.fg }));

  // Histograma
  const n = 24;
  const bw = 16;
  const gap = (CONTENT_W - bw * n) / (n - 1);
  const baseY = 790;
  const maxH = 252;
  const max = Math.max(...data.hourHist, 1);
  data.hourHist.forEach((v, h) => {
    const bh = Math.max(7, Math.round((v / max) * maxH));
    const x = MARGIN + h * (bw + gap);
    barRR(ctx, t, x, baseY - bh, bw, bh, h === data.peakHour ? 6 : 5, h === data.peakHour);
  });

  // Ejes (space-between)
  const labels = ['12 a. m.', '6 a. m.', '12 m.', '6 p. m.', '11 p. m.'];
  const widths = labels.map((l) => measure(ctx, l, 600, 17, BODY));
  const free = CONTENT_W - widths.reduce((a, b) => a + b, 0);
  let x = MARGIN;
  labels.forEach((l, i) => {
    text(ctx, l, x, 824, { weight: 600, size: 17, color: t.fg, baseline: 'middle' });
    x += widths[i] + free / (labels.length - 1);
  });

  // Día más intenso
  strongBox(ctx, t, MARGIN, 882, CONTENT_W, 168, 28);
  text(ctx, 'Día más intenso', MARGIN + 29, 923, { weight: 500, size: 19, color: t.strongSub, baseline: 'middle' });
  text(ctx, data.busiestDay.iso ? fmtDay(data.busiestDay.iso) : '—', MARGIN + 29, 977, {
    weight: 800, size: 40, family: HEAD, color: t.strongFg, tracking: -0.03, maxWidth: CONTENT_W - 58,
  });
  text(ctx, `${fmtInt(data.busiestDay.count)} mensajes en un día`, MARGIN + 29, 1007, {
    weight: 600, size: 22, color: t.strongAccent, baseline: 'middle',
  });

  footer(ctx, t, pageLabel(opts, 3));
}
