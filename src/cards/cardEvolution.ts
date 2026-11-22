import type { HalfStats, WrappedData } from '../types';
import { copyFor } from '../copy';
import { fmtRatio, fmtResponse, MONTHS_SHORT } from '../format';
import {
  CardOpts, CONTENT_W, fillRR, footer, frame, HEAD, MARGIN, measure, pageLabel, strokeRR, strongBox, text, THEMES,
  title2, W, INK_72,
} from './draw';

export function evolutionAvailable(data: WrappedData): boolean {
  return data.spanDays >= 120;
}

/** "ene–jun"; si la ventana cruza de año, con el año: "oct ’25–mar ’26". */
export function halfRange(h: HalfStats, withYear: boolean): string {
  const fmt = (iso: string): string => {
    const [y, m] = iso.split('-').map(Number);
    return withYear ? `${MONTHS_SHORT[m - 1]} ’${String(y).slice(2)}` : MONTHS_SHORT[m - 1];
  };
  const a = fmt(h.startIso);
  const b = fmt(h.endIso);
  return a === b ? a : `${a}–${b}`;
}

/** Cambio de mensajes por día entre mitades, en % (redondeado). */
export function evolutionChange(data: WrappedData): number {
  const { first, second } = data.evolution;
  if (first.perDay <= 0) return 0;
  return Math.round(((second.perDay - first.perDay) / first.perDay) * 100);
}

/** Frase resumen: ≥ +20 % sube, ≤ −20 % baja, si no igual (con variante por modo). */
export function evolutionSummary(data: WrappedData): string {
  const c = copyFor(data.mode);
  const { first, second } = data.evolution;
  const ratio = first.perDay > 0 ? second.perDay / first.perDay : 1;
  if (ratio >= 1.2) return c['evolution.up'];
  if (ratio <= 0.8) return c['evolution.down'];
  return c['evolution.same'];
}

/** Quién escribe más en una mitad: nombre y % (null si no hay mensajes). */
export function topWriter(data: WrappedData, h: HalfStats): { name: string; pct: number } | null {
  let best = -1;
  h.shares.forEach((s, i) => {
    if (best < 0 || s > h.shares[best]) best = i;
  });
  if (best < 0 || !data.people[best] || h.messages === 0) return null;
  return { name: data.people[best].name, pct: Math.round(h.shares[best] * 100) };
}

/** Tarjeta del reporte completo: Antes vs. ahora. */
export function drawCardEvolution(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.cream;
  frame(ctx, t, data.year);
  title2(ctx, t, 'Antes vs.', 'ahora');

  const { first, second, newWords } = data.evolution;
  const soft = t.dark ? t.sub : INK_72;
  const gap = 24;
  const colW = (CONTENT_W - gap) / 2;
  const xs = [MARGIN, MARGIN + colW + gap];
  const halves = [first, second];
  const withYear = first.startIso.slice(0, 4) !== second.endIso.slice(0, 4);
  const shift = newWords.length > 0 ? 0 : 40;

  // Cabeceras de columna
  const hy = 350 + shift;
  ['Antes', 'Ahora'].forEach((label, i) => {
    text(ctx, label, xs[i], hy, {
      weight: 800, size: 34, family: HEAD, color: t.fg, tracking: -0.04, baseline: 'middle',
    });
    text(ctx, halfRange(halves[i], withYear), xs[i], hy + 30, {
      weight: 500, size: 19, color: soft, baseline: 'middle', maxWidth: colW,
    });
  });

  const sep = (y: number): void => fillRR(ctx, MARGIN, y, CONTENT_W, 2, 1, t.track);
  const rowLabel = (label: string, y: number): void => {
    text(ctx, label, MARGIN, y + 20, { weight: 500, size: 20, color: soft, baseline: 'middle' });
  };

  // Fila 1: mensajes por día, con el cambio en %
  let y = hy + 62;
  sep(y);
  rowLabel('Mensajes por día', y + 4);
  const change = evolutionChange(data);
  if (change !== 0) {
    const up = change > 0;
    const label = `${up ? '↑' : '↓'} ${Math.abs(change)} %`;
    const pw = measure(ctx, label, 700, 18) + 24;
    const px = W - MARGIN - pw;
    if (up) {
      fillRR(ctx, px, y + 8, pw, 30, 15, t.strongBg);
      text(ctx, label, px + pw / 2, y + 23, { weight: 700, size: 18, color: t.strongAccent, align: 'center', baseline: 'middle' });
    } else {
      strokeRR(ctx, px, y + 8, pw, 30, 15, t.line ?? t.fg, 2);
      text(ctx, label, px + pw / 2, y + 23, { weight: 700, size: 18, color: t.fg, align: 'center', baseline: 'middle' });
    }
  }
  halves.forEach((h, i) => {
    text(ctx, fmtRatio(h.perDay), xs[i], y + 88, {
      weight: 800, size: 54, family: HEAD, color: t.fg, tracking: -0.04, maxWidth: colW,
    });
  });

  // Fila 2: quién escribe más
  y += 116;
  sep(y);
  rowLabel('Quién escribe más', y + 4);
  halves.forEach((h, i) => {
    const w = topWriter(data, h);
    if (!w) return;
    text(ctx, w.name, xs[i], y + 72, { weight: 700, size: 30, color: t.fg, maxWidth: colW });
    text(ctx, `${w.pct} %`, xs[i], y + 104, { weight: 800, size: 28, family: HEAD, color: t.fg, tracking: -0.03, maxWidth: colW });
  });

  // Fila 3: respuesta típica
  y += 130;
  sep(y);
  rowLabel('Respuesta típica', y + 4);
  halves.forEach((h, i) => {
    text(ctx, h.medianResponseMs === null ? '—' : fmtResponse(h.medianResponseMs), xs[i], y + 88, {
      weight: 800, size: 54, family: HEAD, color: t.fg, tracking: -0.04, maxWidth: colW,
    });
  });
  sep(y + 116);

  // Palabras nuevas (se oculta si no hay)
  if (newWords.length > 0) {
    const wy = y + 150;
    text(ctx, 'Este año empezaron a decir:', MARGIN, wy, { weight: 500, size: 22, color: soft, baseline: 'middle' });
    let px = MARGIN;
    let py = wy + 24;
    for (const w of newWords) {
      const size = 24;
      const pw = Math.min(CONTENT_W, measure(ctx, w.word, 700, size) + 36);
      if (px > MARGIN && px + pw > MARGIN + CONTENT_W) {
        px = MARGIN;
        py += 50;
      }
      fillRR(ctx, px, py, pw, 42, 21, t.strongBg);
      text(ctx, w.word, px + pw / 2, py + 21, {
        weight: 700, size, color: t.strongAccent, align: 'center', baseline: 'middle', maxWidth: pw - 24,
      });
      px += pw + 10;
    }
  }

  // Frase resumen
  strongBox(ctx, t, MARGIN, 960, CONTENT_W, 90, 28);
  text(ctx, evolutionSummary(data), MARGIN + 28, 1005, {
    weight: 700, size: 27, color: t.strongFg, baseline: 'middle', maxWidth: CONTENT_W - 56,
  });

  footer(ctx, t, pageLabel(opts, 2));
}
