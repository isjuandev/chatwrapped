import type { WrappedData } from '../types';
import { copyFor } from '../copy';
import { SITE_DOMAIN } from '../config';
import {
  bubble, bubbleWidth, CardOpts, CONTENT_W, fillRR, footer, frame, HEAD, lockIcon, MARGIN, pageLabel, text, THEMES, W,
} from './draw';

/** Tarjeta final: Ahora te toca. */
export function drawCard6(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.lime;
  frame(ctx, t, data.year);

  const b1 = copyFor(data.mode)['end.bubble1'];
  const b2 = 'mándaselo ya';
  bubble(ctx, b1, MARGIN, 205, bubbleWidth(ctx, b1), 62, t.bubbleA.fill, t.bubbleA.text, 'left');
  const w2 = bubbleWidth(ctx, b2);
  bubble(ctx, b2, MARGIN + CONTENT_W - w2, 282, w2, 63, t.bubbleB.fill, t.bubbleB.text, 'right');

  text(ctx, 'Ahora', MARGIN - 3, 655, {
    weight: 800, size: 120, family: HEAD, color: t.fg, tracking: -0.06, maxWidth: CONTENT_W,
  });
  text(ctx, 'te toca.', MARGIN - 3, 765, {
    weight: 800, size: 120, family: HEAD, color: t.fg, tracking: -0.06, maxWidth: CONTENT_W,
  });

  text(ctx, 'Haz el Wrapped de tu chat con tu', MARGIN, 832, { weight: 500, size: 30, color: t.fg, maxWidth: CONTENT_W });
  text(ctx, 'pareja, tu parche o tu familia.', MARGIN, 870, { weight: 500, size: 30, color: t.fg, maxWidth: CONTENT_W });

  // Botón
  fillRR(ctx, MARGIN, 914, CONTENT_W, 88, 44, t.cta.bg);
  text(ctx, SITE_DOMAIN, MARGIN + 33, 959, {
    weight: 800, size: 32, family: HEAD, color: t.cta.fg, tracking: -0.02, baseline: 'middle', maxWidth: CONTENT_W - 130,
  });
  // Flecha
  const ax = W - MARGIN - 37;
  ctx.strokeStyle = t.cta.arrow;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(ax - 14, 958);
  ctx.lineTo(ax + 14, 958);
  ctx.moveTo(ax + 4, 947);
  ctx.lineTo(ax + 15, 958);
  ctx.lineTo(ax + 4, 969);
  ctx.stroke();

  lockIcon(ctx, MARGIN, 1029, 21, t.fg, 2.4);
  text(ctx, 'Tu chat nunca sale de tu celular.', MARGIN + 34, 1039, {
    weight: 600, size: 21, color: t.fg, baseline: 'middle',
  });

  footer(ctx, t, pageLabel(opts, 6));
}
