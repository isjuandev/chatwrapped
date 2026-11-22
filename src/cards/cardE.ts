import type { WrappedData } from '../types';
import { fmtDay, fmtInt, monthOfIso, plural } from '../format';
import {
  box, CardOpts, CONTENT_W, footer, frame, HEAD, MARGIN, pageLabel, strongBox, text, THEMES, title2, wrap,
} from './draw';

export function streakRange(start: string, end: string): string {
  return start === end ? `el ${fmtDay(start)}` : `del ${fmtDay(start)} al ${fmtDay(end)}`;
}

/** "en marzo" o "entre marzo y abril" según dónde cae el silencio. */
export function silenceWhere(from: string, to: string): string {
  const a = monthOfIso(from);
  const b = monthOfIso(to);
  return a === b ? `en ${a}` : `entre ${a} y ${b}`;
}

/** Tarjeta E: Rachas y silencios. */
export function drawCardStreaks(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.lime;
  frame(ctx, t, data.year);
  title2(ctx, t, 'Rachas y', 'silencios');

  // Caja 1: racha
  // Dos cajas de alto fijo, centradas en el espacio libre (antes la segunda se estiraba
  // hasta el pie y dejaba un hueco grande entre el dato y la frase final).
  const h1 = 270;
  const h2 = 300;
  const y1 = 345 + Math.round((1050 - 345 - (h1 + 28 + h2)) / 2);
  strongBox(ctx, t, MARGIN, y1, CONTENT_W, h1, 28);
  const s = data.streak;
  text(ctx, 'Su racha más larga', MARGIN + 29, y1 + 50, { weight: 500, size: 21, color: t.strongSub, baseline: 'middle' });
  text(ctx, `${fmtInt(s.days)} ${plural(s.days, 'día seguido', 'días seguidos')}`, MARGIN + 29, y1 + 135, {
    weight: 800, size: 62, family: HEAD, color: t.strongFg, tracking: -0.04, maxWidth: CONTENT_W - 58,
  });
  text(ctx, streakRange(s.start, s.end), MARGIN + 29, y1 + 195, {
    weight: 600, size: 27, color: t.strongAccent, maxWidth: CONTENT_W - 58,
  });

  // Caja 2: silencio
  const y2 = y1 + h1 + 28;
  box(ctx, t, MARGIN, y2, CONTENT_W, h2, 28);
  text(ctx, 'El silencio más largo', MARGIN + 29, y2 + 50, { weight: 500, size: 21, color: t.fg, baseline: 'middle' });
  const sil = data.silence;
  if (!sil || sil.days < 2) {
    wrap(ctx, 'Nunca pasaron más de un día sin hablar.', CONTENT_W - 58, 800, 52, HEAD, -0.04).forEach((l, i) => {
      text(ctx, l, MARGIN + 29, y2 + 130 + i * 56, {
        weight: 800, size: 52, family: HEAD, color: t.fg, tracking: -0.04, maxWidth: CONTENT_W - 58,
      });
    });
  } else {
    text(ctx, `${fmtInt(sil.days)} días sin hablar`, MARGIN + 29, y2 + 135, {
      weight: 800, size: 62, family: HEAD, color: t.fg, tracking: -0.04, maxWidth: CONTENT_W - 58,
    });
    text(ctx, silenceWhere(sil.from, sil.to), MARGIN + 29, y2 + 192, {
      weight: 600, size: 27, color: t.fg, maxWidth: CONTENT_W - 58,
    });
    text(ctx, '…y volvieron como si nada.', MARGIN + 29, y2 + 250, {
      weight: 500, size: 25, color: t.fg, baseline: 'middle', maxWidth: CONTENT_W - 58,
    });
  }

  footer(ctx, t, pageLabel(opts, 6));
}
