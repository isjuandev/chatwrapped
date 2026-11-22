import type { WrappedData } from '../types';
import { copyFor, fill } from '../copy';
import { fmtInt } from '../format';
import {
  box, bubble, bubbleWidth, CardOpts, footer, frame, HEAD, MARGIN, CONTENT_W, text, THEMES, wrap,
} from './draw';

/** Tarjeta 1: portada. */
export function drawCard1(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.dark;
  frame(ctx, t, data.year);

  const copy = copyFor(data.mode);
  const b1 = copy['cover.bubble1'];
  const b2 = fill(copy['cover.bubble2'], { n: fmtInt(data.total) });
  bubble(ctx, b1, MARGIN, 193, bubbleWidth(ctx, b1), 62, t.bubbleA.fill, t.bubbleA.text, 'left');
  const w2 = bubbleWidth(ctx, b2);
  bubble(ctx, b2, MARGIN + CONTENT_W - w2, 270, w2, 62, t.bubbleB.fill, t.bubbleB.text, 'right');

  // Nombres: el bloque crece hacia arriba desde una línea base fija; la última línea va en acento.
  const BASE = 846;
  let lines: string[];
  let size = 92;
  if (data.mode.size === 'duo') {
    lines = [data.people[0]?.name ?? '', data.people[1] ? `& ${data.people[1].name}` : ''].filter(Boolean);
  } else {
    // Nombres de grupo largos ("ICBF (Instituto de …)"): buscar el tamaño más grande que
    // quepa en pocas líneas en vez de encoger una sola línea hasta volverla ilegible.
    const name = data.groupName.trim();
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 2) lines = words;
    else {
      lines = [name];
      for (size = 92; size >= 44; size -= 4) {
        lines = wrap(ctx, name, CONTENT_W, 800, size, HEAD, -0.05);
        if (lines.length <= (size >= 72 ? 2 : size >= 56 ? 3 : 4)) break;
      }
      size = Math.max(size, 44);
    }
  }
  const lh = Math.round(size * 0.96);
  const top = BASE - lh * (lines.length - 1);
  lines.forEach((ln, i) => {
    const last = i === lines.length - 1;
    text(ctx, ln, MARGIN, top + i * lh, {
      weight: 800, size, family: HEAD, color: last ? t.emph : t.fg, tracking: -0.05, maxWidth: CONTENT_W,
    });
  });
  text(ctx, copy['cover.kicker'], MARGIN, top - size * 0.72 - 40, {
    weight: 500, size: 26, color: t.sub, baseline: 'middle',
  });

  // Stats
  const stats: [string, string][] = [
    [fmtInt(data.total), 'mensajes'],
    [fmtInt(data.daysTalking), 'días hablando'],
    [fmtInt(data.maxStreak), 'días de racha'],
  ];
  const bw = 167;
  const gap = (CONTENT_W - bw * 3) / 2;
  stats.forEach(([n, label], i) => {
    const x = MARGIN + i * (bw + gap);
    box(ctx, t, x, 911, bw, 110, 26);
    text(ctx, n, x + 20, 972, {
      weight: 800, size: 44, family: HEAD, color: t.fg, tracking: -0.03, maxWidth: bw - 32,
    });
    text(ctx, label, x + 20, 999, { weight: 400, size: 19, color: t.sub });
  });

  footer(ctx, t, 'Desliza para ver más');
}
