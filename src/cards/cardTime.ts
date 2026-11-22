import type { WrappedData } from '../types';
import { fmtDay, fmtDuration, fmtInt, plural } from '../format';
import {
  box, CardOpts, CONTENT_W, footer, frame, heroWord, HEAD, MARGIN, pageLabel, strongBox, text, THEMES, wrap, INK_72,
} from './draw';

const HOUR = 3_600_000;
const MIN = 60_000;

export function timeAvailable(data: WrappedData): boolean {
  return data.time.conversations >= 10;
}

/** Número enorme ("412 horas", o minutos si hay menos de 1 h) y su equivalencia. */
export function timeHero(data: WrappedData): { word: string; phrase: string } {
  const ms = data.time.totalMs;
  const h = ms / HOUR;
  let word: string;
  if (h >= 1) {
    const n = Math.round(h);
    word = `${fmtInt(n)} ${plural(n, 'hora', 'horas')}`;
  } else {
    const m = Math.max(1, Math.round(ms / MIN));
    word = `${m} ${plural(m, 'minuto', 'minutos')}`;
  }
  const d = h / 24;
  let phrase: string;
  if (d >= 1) {
    // Una cifra decimal con coma (es-CO): 17,2; los enteros sin decimal.
    const rounded = Math.round(d * 10) / 10;
    const r = Number.isInteger(rounded) ? fmtInt(rounded) : String(rounded).replace('.', ',');
    phrase = `= ${r} ${r === '1' ? 'día entero' : 'días enteros'}`;
  } else {
    const films = Math.round(h / 2);
    phrase = films < 1 ? '= menos de una película' : `= ${films} ${plural(films, 'película', 'películas')}`;
  }
  return { word, phrase };
}

/** Tarjeta del reporte completo: Cuánto tiempo hablaron. */
export function drawCardTime(ctx: CanvasRenderingContext2D, data: WrappedData, opts: CardOpts = {}): void {
  const t = opts.theme ?? THEMES.dark;
  frame(ctx, t, data.year);
  const { word, phrase } = timeHero(data);
  heroWord(ctx, t, 'Cuánto tiempo hablaron', word, phrase);

  const pad = 29;
  const soft = t.dark ? t.sub : INK_72;

  // Charla más larga
  const y1 = 540;
  const h1 = 240;
  strongBox(ctx, t, MARGIN, y1, CONTENT_W, h1, 28);
  const longest = data.time.longest;
  text(ctx, 'Su charla más larga', MARGIN + pad, y1 + 50, {
    weight: 500, size: 21, color: t.strongSub, baseline: 'middle',
  });
  if (longest) {
    text(ctx, `${fmtDuration(longest.ms)} seguidas`, MARGIN + pad, y1 + 135, {
      weight: 800, size: 60, family: HEAD, color: t.strongFg, tracking: -0.04, maxWidth: CONTENT_W - pad * 2,
    });
    text(
      ctx,
      `el ${fmtDay(longest.iso)} · ${fmtInt(longest.messages)} ${plural(longest.messages, 'mensaje', 'mensajes')}`,
      MARGIN + pad,
      y1 + 195,
      { weight: 600, size: 25, color: t.strongAccent, maxWidth: CONTENT_W - pad * 2 },
    );
  }

  // Fila de dos cajas
  const gap = 18;
  const cw = (CONTENT_W - gap) / 2;
  const y2 = y1 + h1 + 28;
  const h2 = 210;
  const cells: { big: string; label: string }[] = [
    {
      big: fmtInt(data.time.conversations),
      label: plural(data.time.conversations, 'conversación', 'conversaciones'),
    },
    { big: fmtDuration(data.time.avgMs), label: 'por charla, en promedio' },
  ];
  cells.forEach((c, i) => {
    const x = MARGIN + i * (cw + gap);
    box(ctx, t, x, y2, cw, h2, 28);
    text(ctx, c.big, x + 24, y2 + 100, {
      weight: 800, size: 58, family: HEAD, color: t.fg, tracking: -0.04, maxWidth: cw - 48,
    });
    wrap(ctx, c.label, cw - 48, 500, 22).slice(0, 2).forEach((l, k) => {
      text(ctx, l, x + 24, y2 + 140 + k * 28, { weight: 500, size: 22, color: soft, baseline: 'middle', maxWidth: cw - 48 });
    });
  });

  footer(ctx, t, pageLabel(opts, 1));
}
