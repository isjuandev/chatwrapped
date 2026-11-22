import type { WrappedData } from '../types';
import {
  BODY, box, C, CardOpts, CONTENT_W, fillRR, footer, frame, HEAD, MARGIN, measure, pageLabel, text, THEMES, wrap, INK_72,
} from './draw';

function medal(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 4);
  ctx.lineTo(x - 4.5, y + 11);
  ctx.lineTo(x, y + 8.5);
  ctx.lineTo(x + 4.5, y + 11);
  ctx.lineTo(x + 3, y + 4);
  ctx.stroke();
}

/** Tarjeta de premios: Los premios del año. */
export function drawCard5(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.cream;
  frame(ctx, t, data.year);

  text(ctx, 'Los premios', MARGIN, 208, {
    weight: 800, size: 72, family: HEAD, color: t.fg, tracking: -0.055, maxWidth: CONTENT_W,
  });
  text(ctx, 'del año', MARGIN, 278, { weight: 800, size: 72, family: HEAD, color: t.fg, tracking: -0.055 });

  const cw = 257;
  const ch = 196;
  const gx = CONTENT_W - cw * 2; // 18
  const gy = 19;
  const pad = 25;
  data.awards.slice(0, 6).forEach((a, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * (cw + gx);
    const y = 327 + row * (ch + gy);
    const filled = i === 0;
    // El primero va relleno: ink con texto de acento en fondos claros; lima con ink en oscuros.
    let fg = t.fg;
    let descColor = t.dark ? t.sub : INK_72;
    if (filled) {
      if (t.dark) {
        fillRR(ctx, x, y, cw, ch, 28, C.lime);
        fg = C.ink;
        descColor = C.ink;
      } else {
        fillRR(ctx, x, y, cw, ch, 28, t.strongBg);
        fg = t.strongAccent;
        descColor = t.strongAccent;
      }
    } else box(ctx, t, x, y, cw, ch, 28);

    const innerW = cw - pad * 2 + 2;
    const titleLines = wrap(ctx, a.title, innerW, 800, 30, HEAD, -0.03);
    const descLines = wrap(ctx, a.detail, innerW, 400, 20, BODY).slice(0, 3);
    const titleLH = 31;
    const descLH = 23;

    // Se apila desde abajo: ganador, descripción, título.
    let by = y + ch - 20;
    text(ctx, a.winner, x + pad, by - 4, { weight: 700, size: 24, color: fg, maxWidth: innerW });
    by -= 24 + 12;
    for (let k = descLines.length - 1; k >= 0; k--) {
      text(ctx, descLines[k], x + pad, by - (descLines.length - 1 - k) * descLH, {
        weight: 400, size: 20, color: descColor, maxWidth: innerW,
      });
    }
    by -= descLines.length * descLH + 6;
    for (let k = titleLines.length - 1; k >= 0; k--) {
      let size = 30;
      while (measure(ctx, titleLines[k], 800, size, HEAD, -0.03) > innerW && size > 16) size -= 1;
      text(ctx, titleLines[k], x + pad, by - (titleLines.length - 1 - k) * titleLH, {
        weight: 800, size, family: HEAD, color: fg, tracking: -0.03,
      });
    }
    const topOfStack = by - (titleLines.length - 1) * titleLH - 24;
    if (topOfStack > y + 46) medal(ctx, x + pad + 5, y + 31, fg);
  });

  footer(ctx, t, pageLabel(opts, 5));
}
