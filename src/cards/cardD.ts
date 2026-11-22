import type { WrappedData } from '../types';
import { copyFor, weekdayPhraseFor } from '../copy';
import { fmtInt, WEEKDAYS } from '../format';
import {
  barRR, CardOpts, CONTENT_W, fillRR, footer, frame, heroWord, HEAD, MARGIN, pageLabel, text, THEMES, W,
} from './draw';

const INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function topWeekday(weekdays: number[]): number {
  let top = 0;
  weekdays.forEach((v, i) => {
    if (v > weekdays[top]) top = i;
  });
  return top;
}

/** Tarjeta D: Su día. */
export function drawCardWeekday(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.coral;
  frame(ctx, t, data.year);

  const top = topWeekday(data.weekdays);
  heroWord(ctx, t, copyFor(data.mode)['weekday.lead'], WEEKDAYS[top], weekdayPhraseFor(data.mode, top));

  // 7 barras horizontales L M X J V S D con conteo
  const max = Math.max(...data.weekdays, 1);
  const lx = MARGIN;
  const bx = MARGIN + 48;
  const countW = 92;
  const bwMax = W - MARGIN - countW - bx;
  const rowH = 66;
  const y0 = 560;
  data.weekdays.forEach((v, i) => {
    const cy = y0 + i * rowH + 22;
    text(ctx, INITIALS[i], lx, cy, { weight: 800, size: 30, family: HEAD, color: t.fg, baseline: 'middle', tracking: -0.02 });
    fillRR(ctx, bx, cy - 20, bwMax, 40, 12, t.track);
    barRR(ctx, t, bx, cy - 20, Math.max(16, (bwMax * v) / max), 40, 12, i === top);
    text(ctx, fmtInt(v), W - MARGIN, cy, {
      weight: i === top ? 800 : 600, size: 22, color: t.fg, align: 'right', baseline: 'middle',
    });
  });
  void CONTENT_W;

  footer(ctx, t, pageLabel(opts, 4));
}
