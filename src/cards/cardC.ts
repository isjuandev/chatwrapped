import type { WrappedData } from '../types';
import { fmtInt, fmtRatio } from '../format';
import {
  barRR, CardOpts, CONTENT_W, footer, frame, heroWord, MARGIN, pageLabel, text, THEMES,
} from './draw';

/** Frase de la tarjeta "Su mes". */
export function monthPhrase(data: WrappedData): { top: number; text: string } {
  const months = data.monthly;
  let top = 0;
  months.forEach((m, i) => {
    if (m.count > months[top].count) top = i;
  });
  // El mes más callado solo se busca entre el primer y el último mes con mensajes:
  // antes de que el chat existiera no "dejaron de hablarse".
  const first = Math.max(0, months.findIndex((m) => m.count > 0));
  let last = months.length - 1;
  while (last > first && months[last].count === 0) last--;
  let low = first;
  for (let i = first; i <= last; i++) if (months[i].count < months[low].count) low = i;
  const a = months[top];
  const b = months[low];
  if (a.count === b.count) return { top, text: `${fmtInt(a.count)} mensajes, igual que cualquier otro mes.` };
  if (b.count === 0) {
    return { top, text: `${fmtInt(a.count)} mensajes, y en ${b.label} casi ni se hablaron.` };
  }
  return {
    top,
    text: `${fmtInt(a.count)} mensajes, ${fmtRatio(a.count / b.count)} veces más que ${b.label}, el mes más callado.`,
  };
}

/** Tarjeta C: Su mes. */
export function drawCardMonth(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.cream;
  frame(ctx, t, data.year);

  const { top, text: phrase } = monthPhrase(data);
  heroWord(ctx, t, 'Su mes fue', data.monthly[top].label, phrase);

  // 12 barras verticales con la inicial del mes, en el orden de la ventana
  const n = data.monthly.length;
  const bw = 32;
  const gap = (CONTENT_W - bw * n) / (n - 1);
  const baseY = 940;
  const maxH = 330;
  const max = Math.max(...data.monthly.map((m) => m.count), 1);
  data.monthly.forEach((m, i) => {
    const bh = Math.max(9, Math.round((m.count / max) * maxH));
    const x = MARGIN + i * (bw + gap);
    barRR(ctx, t, x, baseY - bh, bw, bh, 9, i === top);
    text(ctx, m.initial, x + bw / 2, baseY + 36, {
      weight: i === top ? 800 : 600, size: 21, color: t.fg, align: 'center', baseline: 'middle',
    });
  });

  footer(ctx, t, pageLabel(opts, 3));
}
