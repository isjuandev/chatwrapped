import type { PersonStats, WrappedData } from '../types';
import { fmtResponse } from '../format';
import {
  box, CardOpts, CONTENT_W, fillRR, footer, frame, HEAD, MARGIN, measure, pageLabel, rich, strongBox, text, THEMES, title2, W,
} from './draw';

/** Personas que se muestran: pareja 2; grupo top 5 por mensajes (ya vienen ordenadas), con respuestas medidas. */
export function replyRows(data: WrappedData): PersonStats[] {
  const max = data.mode.size === 'duo' ? 2 : 5;
  return data.people.filter((p) => p.medianResponseMs !== null && p.responses >= 5).slice(0, max);
}

export function replyAvailable(data: WrappedData): boolean {
  return data.people.filter((p) => p.medianResponseMs !== null && p.responses >= 5).length >= 2;
}

/** Tarjeta F: ¿Quién deja en visto? */
export function drawCardReply(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.cream;
  frame(ctx, t, data.year);
  title2(ctx, t, '¿Quién deja', 'en visto?');

  const rows = replyRows(data);
  if (rows.length === 0) {
    footer(ctx, t, pageLabel(opts, 7));
    return;
  }
  const med = (p: PersonStats): number => p.medianResponseMs ?? 0;
  const maxMed = Math.max(...rows.map(med), 1);
  const slowest = rows.reduce((a, p) => (med(p) > med(a) ? p : a), rows[0]);
  const fastest = rows.reduce((a, p) => (med(p) < med(a) ? p : a), rows[0]);

  const top = 345;
  const bottom = 930;
  const n = Math.max(rows.length, 1);
  const rowH = Math.min(200, (bottom - top) / n);
  const big = n <= 2 ? 62 : n <= 3 ? 48 : 38;
  rows.forEach((p, i) => {
    const y = top + i * rowH;
    const nameSize = n <= 2 ? 28 : 24;
    const nameW = Math.min(measure(ctx, p.name, 700, nameSize), CONTENT_W - 260);
    text(ctx, p.name, MARGIN, y + 22, { weight: 700, size: nameSize, color: t.fg, baseline: 'middle', maxWidth: CONTENT_W - 260 });
    // Solo se señala a alguien si de verdad tarda (≥ 1 min y 1,5× el más rápido);
    // con medianas de segundos la etiqueta sería injusta.
    if (p === slowest && rows.length > 1 && med(p) >= 60_000 && med(p) >= 1.5 * med(fastest)) {
      const label = 'deja en visto';
      const lw = measure(ctx, label, 700, 17) + 24;
      fillRR(ctx, MARGIN + nameW + 14, y + 22 - 15, lw, 30, 15, t.strongBg);
      text(ctx, label, MARGIN + nameW + 14 + lw / 2, y + 22, {
        weight: 700, size: 17, color: t.strongAccent, align: 'center', baseline: 'middle',
      });
    }
    text(ctx, fmtResponse(med(p)), W - MARGIN, y + 24, {
      weight: 800, size: big, family: HEAD, color: t.fg, tracking: -0.04, align: 'right', baseline: 'middle', maxWidth: 230,
    });
    const by = y + (n <= 2 ? 64 : 52);
    fillRR(ctx, MARGIN, by, CONTENT_W, 26, 13, t.track);
    fillRR(ctx, MARGIN, by, Math.max(26, (CONTENT_W * med(p)) / maxMed), 26, 13, p === slowest ? t.barFill : t.bar);
    if (n <= 2) {
      text(ctx, 'mediana de respuesta', MARGIN, by + 52, { weight: 500, size: 19, color: t.sub, baseline: 'middle' });
    }
  });

  // Pie: el más rápido
  strongBox(ctx, t, MARGIN, 950, CONTENT_W, 100, 28);
  const pct = Math.round((fastest.fastShare ?? 0) * 100);
  const segs =
    pct > 0
      ? [
          { t: `${fastest.name} responde en menos de 1 min el ` },
          { t: `${pct} %`, color: t.strongAccent, weight: 700 },
          { t: ' de las veces.' },
        ]
      : [
          { t: `${fastest.name} es quien responde más rápido: ` },
          { t: fmtResponse(med(fastest)), color: t.strongAccent, weight: 700 },
          { t: '.' },
        ];
  rich(ctx, segs, MARGIN + 26, 995, CONTENT_W - 52, 30, 23, t.strongFg, 500);
  void box;

  footer(ctx, t, pageLabel(opts, 7));
}
